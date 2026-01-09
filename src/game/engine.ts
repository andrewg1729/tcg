// src/game/engine.ts
import {
  GameState,
  PlayerState,
  BoardCreature,
  MainDeckCard,
  CreatureCard,
  EvolutionCard,
  Phase,
  RelicCard,
  LocationCard,
    SpellCard,
  StackItem,
  SpellTarget,
  TargetingRule,
} from "./types";
  import { spirateMainDeck, spirateEvolutions } from "./spirateCards";
  import { neonjaMainDeck, neonjaEvolutions } from "./neonjaCards";
import { cardRegistry } from "./cardRegistry";
import { effectExecutor } from "./effectExecutor";
import { areEvolutionConditionsMet } from "./evolutionConditions";

// Small helper to deep-clone state (for functional-style updates)
export function cloneState<T>(obj: T): T {
  return structuredClone(obj);
}

// ---------------------------------------------------------------------------
// Keyword / ability helpers (now using registry)
// ---------------------------------------------------------------------------

function hasKeyword(card: any, keyword: string): boolean {
  // If card is a string (card name), look up from registry
  if (typeof card === 'string') {
    const keywords = cardRegistry.getKeywords(card);
    return keywords.some(k => k.keyword === keyword);
  }
  
  // If card is an object, check its keywords array first (includes relic-granted)
  if (card.keywords) {
    return card.keywords.some((k: any) => k.keyword === keyword);
  }
  
  // Fallback to registry lookup by name
  const keywords = cardRegistry.getKeywords(card.name);
  return keywords.some(k => k.keyword === keyword);
}

function getKeywordValue(card: any, keyword: string): number {
  let keywords: any[];
  
  // If card is a string (card name), look up from registry
  if (typeof card === 'string') {
    keywords = cardRegistry.getKeywords(card);
  } 
  // If card is an object, check its keywords array first (includes relic-granted)
  else if (card.keywords) {
    keywords = card.keywords;
  }
  // Fallback to registry lookup by name
  else {
    keywords = cardRegistry.getKeywords(card.name);
  }
  
  const kw = keywords.find(k => k.keyword === keyword);
  
  switch (keyword) {
    case "ARMOR":
      return kw?.armor || 0;
    case "REGEN":
      return kw?.regen || 0;
    case "SURGE":
      return kw?.surge || 0;
    case "THORNS":  // ADD THIS
      return kw?.thorns || 0;
    default:
      return 0;
  }
}

// Wrapper functions for common keywords
function hasGuard(cardName: string): boolean {
  return hasKeyword(cardName, "GUARD");
}

function hasLifetap(cardName: string): boolean {
  return hasKeyword(cardName, "LIFETAP");
}

function hasSwift(cardName: string): boolean {
  return hasKeyword(cardName, "SWIFT");
}

function hasPiercing(cardName: string): boolean {
  return hasKeyword(cardName, "PIERCING");
}

function hasDoubleStrike(cardName: string): boolean {
  return hasKeyword(cardName, "DOUBLE_STRIKE");
}

function hasFirstStrike(cardName: string): boolean {
  return hasKeyword(cardName, "FIRST_STRIKE");
}

function hasSurge(cardName: string): boolean {
  return hasKeyword(cardName, "SURGE");
}

function hasSpellShield(cardName: string): boolean {
  return hasKeyword(cardName, "SPELL_SHIELD");
}

function hasAwaken(cardName: string): boolean {
  return hasKeyword(cardName, "AWAKEN");
}

function hasEvasion(card: any): boolean {
  return hasKeyword(card, "EVASION");
}

function getRelicCountOnSlotByTag(player: PlayerState, slotIndex: number, tag: string): number {
  return player.relics.filter(r => 
    r.slotIndex === slotIndex && 
    r.relic.name.toLowerCase().includes(tag.toLowerCase())
  ).length;
}

function parseSelfRelicBuff(text: string): {
  relicTag: string;
  atkBonus: number;
  hpBonus: number;
  requiredCount?: number;
} | null {
  // Match: "If this has 2 or more Runeblade relics attached, this gains +2 ATK"
  const countMatch = text.match(/If this has (\d+) or more (\w+) relics attached.*?gains?\s+\+(\d+)(?:\/\+(\d+))?\s*ATK/i);
  
  if (countMatch) {
    return {
      relicTag: countMatch[2],
      atkBonus: parseInt(countMatch[3], 10),
      hpBonus: countMatch[4] ? parseInt(countMatch[4], 10) : 0,
      requiredCount: parseInt(countMatch[1], 10)
    };
  }
  
  // Match: "If this has a Runeblade relic attached, this gains +1 ATK"
  const match = text.match(/If this has a (\w+) relic attached.*?gains?\s+\+(\d+)(?:\/\+(\d+))?(?:\s+ATK)?/i);
  
  if (!match) return null;
  
  return {
    relicTag: match[1],
    atkBonus: parseInt(match[2], 10),
    hpBonus: match[3] ? parseInt(match[3], 10) : 0,
    requiredCount: 1 // Default to requiring at least 1
  };
}

function relicNameMatchesTag(relic: RelicCard, tag: string): boolean {
  // Check if the relic's name contains the tag (case-insensitive)
  return relic.name.toLowerCase().includes(tag.toLowerCase());
}

function getRelicCountOnSlot(player: PlayerState, slotIndex: number): number {
  return player.relics.filter(r => r.slotIndex === slotIndex).length;
}

function applyRelicToCreature(bc: BoardCreature, relic: RelicCard) {
  const text = relic.text;
  const card = bc.card as any;

  // Ensure card has keywords array
  if (!card.keywords) card.keywords = [];

  // Track what this relic added (for removal later)
  if (!card.relicAddedKeywords) card.relicAddedKeywords = [];
  if (!card.relicAddedStats) card.relicAddedStats = { atk: 0, hp: 0 };

  if (!card.effects) card.effects = [];

  // Track what this relic added (for removal later)
  if (!card.relicAddedEffects) card.relicAddedEffects = [];

  // ----------------------- BASIC STAT BONUSES -----------------------
  // Parse stat bonuses: "+X ATK" or "+X HP"
  if (text.startsWith("+")) {
    const atkMatch = text.match(/\+(\d+)\s*ATK/i);
    const hpMatch = text.match(/\+(\d+)\s*HP/i);

    if (atkMatch) {
      const bonus = parseInt(atkMatch[1], 10);
      card.atk = (card.atk || 0) + bonus;
      card.relicAddedStats.atk += bonus;
    }
    if (hpMatch) {
      const bonus = parseInt(hpMatch[1], 10);
      card.hp = (card.hp || 0) + bonus;
      bc.currentHp += bonus;
      card.relicAddedStats.hp += bonus;
    }
  }

  // ----------------------- GRANTED KEYWORDS -----------------------
  // Parse granted keywords: "Grant X"
  if (text.startsWith("Grant")) {
    const grantMatch = text.match(/Grant\s+(.+?)(?:\.|$)/i);

    if (grantMatch) {
      const grantedEffect = grantMatch[1].trim();

      // Keyword with value (e.g., "Armor 2", "Regen 1", "Surge 2")
      const keywordWithValueMatch = grantedEffect.match(/^(\w+(?:\s+\w+)?)\s+(\d+)$/);
      // Keyword without value (e.g., "Double Strike", "Guard")
      const keywordOnlyMatch = grantedEffect.match(/^(\w+(?:\s+\w+)?)$/);

      if (keywordWithValueMatch) {
        const keyword = keywordWithValueMatch[1].toUpperCase().replace(/\s+/g, "_");
        const value = parseInt(keywordWithValueMatch[2], 10);

        const keywordObj: any = { keyword };
        if (keyword === "ARMOR") keywordObj.armor = value;
        else if (keyword === "REGEN") keywordObj.regen = value;
        else if (keyword === "SURGE") keywordObj.surge = value;
        else if (keyword === "THORNS") keywordObj.thorns = value;

        card.keywords.push(keywordObj);
        card.relicAddedKeywords.push(keywordObj);
      } else if (keywordOnlyMatch) {
        const keyword = keywordOnlyMatch[1].toUpperCase().replace(/\s+/g, "_");
        const keywordObj = { keyword };
        card.keywords.push(keywordObj);
        card.relicAddedKeywords.push(keywordObj);
      }
    }
  }

    // ----------------------- EFFECTS FROM RELIC DEFINITION -----------------------
  // If relic defines effects (e.g., ON_BOUNCE), attach them to the equipped creature at runtime.
  const relicEffects = (relic as any).effects;
  if (Array.isArray(relicEffects) && relicEffects.length > 0) {
    for (const eff of relicEffects) {
      if (!eff?.timing) continue;

      // Avoid exact duplicates (basic guard)
      const alreadyHas = card.effects.some((e: any) =>
        JSON.stringify(e) === JSON.stringify(eff)
      );
      if (alreadyHas) continue;

      const effClone = { ...eff, _grantedByRelicId: relic.id };
      card.effects.push(effClone);
      card.relicAddedEffects.push(effClone);
    }
  }

  // ----------------------- CREATURE-SIDE SYNERGY -----------------------
  // e.g. creature text:
  //  "If this has a Runeblade relic attached, this gains +1 ATK."
  //  "If this has a Dragon relic attached, this gains +1/+1."
// In applyRelicToCreature, replace the creature-side synergy section:
const creatureText = (card.text || "") as string;
const relicBuff = parseSelfRelicBuff(creatureText);
if (relicBuff) {
  const { relicTag, atkBonus, hpBonus, requiredCount = 1 } = relicBuff;
  
  // Count matching relics on this slot
  const matchingRelicCount = player.relics.filter(r => 
    r.slotIndex === slotIndex && 
    relicNameMatchesTag(r.relic, relicTag)
  ).length;
  
  // Check if we meet the count requirement
  if (matchingRelicCount >= requiredCount) {
    if (atkBonus > 0) {
      card.atk = (card.atk || 0) + atkBonus;
      card.relicAddedStats.atk += atkBonus;
    }
    if (hpBonus > 0) {
      card.hp = (card.hp || 0) + hpBonus;
      bc.currentHp += hpBonus;
      card.relicAddedStats.hp += hpBonus;
    }
  }
}
}


function removeAllRelicsFromCreature(bc: BoardCreature) {
  const card = bc.card as any;
  
  if (card.relicAddedStats) {
    card.atk = (card.atk || 0) - card.relicAddedStats.atk;
    card.hp = (card.hp || 0) - card.relicAddedStats.hp;
    bc.currentHp = Math.max(1, bc.currentHp - card.relicAddedStats.hp);
    card.relicAddedStats = { atk: 0, hp: 0 };
  }
  
  if (card.relicAddedKeywords) {
    card.relicAddedKeywords.forEach((kw: any) => {
      const index = card.keywords.findIndex((k: any) => k.keyword === kw.keyword);
      if (index !== -1) card.keywords.splice(index, 1);
    });
    card.relicAddedKeywords = [];
  }

    if (card.relicAddedEffects && Array.isArray(card.effects)) {
    card.relicAddedEffects.forEach((eff: any) => {
      const idx = card.effects.findIndex((e: any) => e === eff || e._grantedByRelicId === eff._grantedByRelicId && e.timing === eff.timing);
      if (idx !== -1) card.effects.splice(idx, 1);
    });
    card.relicAddedEffects = [];
  }
}

function getEffectsForBoardCreature(bc: BoardCreature): any[] {
  const cardAny: any = bc.card;
  if (Array.isArray(cardAny.effects) && cardAny.effects.length > 0) return cardAny.effects;
  return cardRegistry.getEffects(bc.card.name);
}


export function applyRegenHealing(gs: GameState, playerIndex: number, slotIndex: number, amount: number): void {
  effectExecutor.executeEffect(gs, {
    timing: "IMMEDIATE",
    targetType: "TARGET_CREATURE",
    heal: amount
  }, playerIndex, {
    type: "CREATURE",
    playerIndex: playerIndex,
    slotIndex: slotIndex
  });
}

// ---------------------------------------------------------------------------
// Tier / turn gating (new rules)
// ---------------------------------------------------------------------------

// Map global turnNumber → max Tier you’re allowed to summon
function getMaxTierForTurn(turnNumber: number): number {
  // Turns 1–4 (each player gets two turns) → Tier 1 only
  if (turnNumber <= 4) return 1;

  // Turns 5–8 → Tier 2 unlocked (each player has now had four turns total)
  if (turnNumber <= 8) return 2;

  // Turns 9–12 → Tier 3 unlocked
  if (turnNumber <= 12) return 3;

  // Turn 13+ → Tier 4 unlocked
  return 4;
}

// Used for log messages like “Tier 2 is locked until turn 5.”
function getEarliestTurnForTier(tier: number): number {
  switch (tier) {
    case 1: return 1;   // Tier 1 available from turn 1
    case 2: return 5;   // Tier 2 from turn 5
    case 3: return 9;   // Tier 3 from turn 9
    default: return 13; // Tier 4+ from turn 13
  }
}

// New rule: can you summon this creature right now, ignoring board slots?
function canSummonCreatureByTier(
  gs: GameState,
  creature: CreatureCard
): { ok: boolean; reason?: string } {
  const tier = creature.tier; // using rank as Tier
  const maxTier = getMaxTierForTurn(gs.turnNumber);

  if (tier <= maxTier) {
    return { ok: true };
  }

  const earliestTurn = getEarliestTurnForTier(tier);
  return {
    ok: false,
    reason: `Cannot summon ${creature.name}: Tier ${tier} is locked until turn ${earliestTurn}.`,
  };
}

// Check if a target is valid based on the rule
function isValidTarget(
  gs: GameState,
  rule: TargetingRule,
  targetPlayerIndex: number,
  targetSlotIndex?: number,
  sourcePlayerIndex?: number,
  sourceSlotIndex?: number
): boolean {
  if (rule.type === "ANY_PLAYER") return targetSlotIndex === undefined;
  if (rule.type === "SELF_PLAYER") return targetSlotIndex === undefined && targetPlayerIndex === sourcePlayerIndex;
  if (rule.type === "ENEMY_PLAYER") return targetSlotIndex === undefined && targetPlayerIndex !== sourcePlayerIndex;

  // Creature targeting below
  if (targetSlotIndex === undefined) return false;

  // Exclude self (source creature) if requested
  if (
    rule.excludeSelf &&
    sourcePlayerIndex !== undefined &&
    sourceSlotIndex !== undefined &&
    targetPlayerIndex === sourcePlayerIndex &&
    targetSlotIndex === sourceSlotIndex
  ) {
    return false;
  }

    // Tier filter (optional)
  const targetBC = gs.players[targetPlayerIndex].board[targetSlotIndex];
  if (!targetBC) return false;

  const targetTier = (targetBC.card as any).tier ?? 0;
  const minTier = (rule as any).minTier;
  const maxTier = (rule as any).maxTier;

  if (typeof minTier === "number" && targetTier < minTier) return false;
  if (typeof maxTier === "number" && targetTier > maxTier) return false;

  const isFriendly = sourcePlayerIndex !== undefined && targetPlayerIndex === sourcePlayerIndex;
  const isEnemy = sourcePlayerIndex !== undefined && targetPlayerIndex !== sourcePlayerIndex;

  switch (rule.type) {
    case "ANY_CREATURE":
      return true;

    case "FRIENDLY_CREATURES":
      return !!isFriendly;

    case "ENEMY_CREATURES":
      return !!isEnemy;

    case "ALL_CREATURES":
      return true;

    default:
      return false;
  }
}

export function getValidTargets(
  gs: GameState,
  playerIndex: number,
  rule: TargetingRule,
  sourcePlayerIndex?: number,
  sourceSlotIndex?: number
): Array<{ playerIndex: number; slotIndex?: number }> {
  const targets: Array<{ playerIndex: number; slotIndex?: number }> = [];

  // Player targets
  if (rule.type === "ANY_PLAYER" || rule.type === "SELF_PLAYER" || rule.type === "ENEMY_PLAYER") {
    for (let p = 0; p < gs.players.length; p++) {
      if (isValidTarget(gs, rule, p, undefined, sourcePlayerIndex, sourceSlotIndex)) {
        targets.push({ playerIndex: p });
      }
    }
    return targets;
  }

  // Creature targets
  for (let p = 0; p < gs.players.length; p++) {
    const board = gs.players[p].board;
    for (let s = 0; s < board.length; s++) {
      if (!board[s]) continue;
      if (isValidTarget(gs, rule, p, s, sourcePlayerIndex, sourceSlotIndex)) {
        targets.push({ playerIndex: p, slotIndex: s });
      }
    }
  }

  return targets;
}

export function cancelPendingTarget(state: GameState): GameState {
  const gs = cloneState(state);
  
  if (gs.pendingTarget && gs.pendingTarget.sourceType === "SPELL" && gs.pendingTarget.sourceCardId) {
    // Return the spell card to hand
    const player = gs.players[gs.pendingTarget.sourcePlayerIndex];
    const card = player.graveyard.find(c => c.id === gs.pendingTarget!.sourceCardId);
    
    if (card) {
      player.graveyard = player.graveyard.filter(c => c.id !== gs.pendingTarget!.sourceCardId);
      player.hand.push(card as any);
      gs.log.push(`${card.name} returned to hand.`);
    }
  }
  
  // Clear the pending target and pending sacrifice
  gs.pendingTarget = undefined;
  gs.pendingSacrificeSummon = null; // if you’re still keeping that field in GameState
  
  return gs;
}

// ---------------------------------------------------------------------------
// Runtime per-creature flags (stored directly on BoardCreature as extra props)
// ---------------------------------------------------------------------------

function ensureRuntimeFields(creature: BoardCreature) {
  const c = creature as any;

  if (c.tempAtkBuff === undefined) c.tempAtkBuff = 0;
    if (c.permAtkBuff === undefined) c.permAtkBuff = 0;
  if (c.preventedDamage === undefined) c.preventedDamage = 0;
  if (c.stunnedForTurns === undefined) c.stunnedForTurns = 0;
  if (c.attacksThisTurn === undefined) c.attacksThisTurn = 0;
  if (c.spellShield === undefined) c.spellShield = hasSpellShield(creature.card.name);

  // Already in your code:
  if (c.hasEvadedThisDuel === undefined) c.hasEvadedThisDuel = false;

  // NEW: “first time attacked each duel” charge usage
  if (c.autoEvasionUsedThisDuel === undefined) c.autoEvasionUsedThisDuel = false;

  // NEW: “evade next battle damage this turn” (Frame Skip, Smoke Bomb, etc.)
  if (c.tempEvadeThisTurn === undefined) c.tempEvadeThisTurn = false;
}

// Effective attack considering relics, surge, buffs
function getEffectiveAtk(state: GameState, playerIndex: number, slotIndex: number): number {
  const player = state.players[playerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return 0;
  ensureRuntimeFields(bc);
  const baseAtk = (bc.card as any).atk || 0;
  const name = bc.card.name;

  const tempBuff = (bc as any).tempAtkBuff || 0;

  const awakenBonus = hasAwaken(name) && player.life < state.players[1 - playerIndex].life ? 1 : 0;
  
  // Surge is already applied to tempAtkBuff at start of turn, don't double count!
  const permBuff = (bc as any).permAtkBuff || 0;
  return baseAtk + permBuff + tempBuff + awakenBonus;
}

function getArmor(state: GameState, playerIndex: number, slotIndex: number): number {
  const player = state.players[playerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return 0;
  
  return getKeywordValue(bc.card, "ARMOR");
}

function getRegen(gs: GameState, playerIndex: number, slotIndex: number): number {
  const player = gs.players[playerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return 0;
  
  const value = getKeywordValue(bc.card, "REGEN");
  return value;
}

// ---------------------------------------------------------------------------
// Deck utils
// ---------------------------------------------------------------------------

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCard(player: PlayerState) {
  const card = player.deck.shift();
  if (card) {
    player.hand.push(card);
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

function createInitialPlayer(
  name: string,
  deckList: MainDeckCard[],
  evoList: EvolutionCard[]
): PlayerState {
  const shuffled = shuffle(deckList);
  return {
    name,
    life: 20,
    deck: shuffled,
    hand: [],
    board: [null, null, null],
    graveyard: [],
    relics: [],
    location: null,
    evolutionDeck: evoList.slice(),
    spellsCastThisTurn: 0,
  };
}

export function createInitialGameState(): GameState {
  const p1 = createInitialPlayer("Player 1", spirateMainDeck, spirateEvolutions);
  const p2 = createInitialPlayer("Player 2", neonjaMainDeck, neonjaEvolutions);

    (p1 as any).loot = 0;
  (p2 as any).loot = 0;

  // Draw 5 cards each (starting hand)
  for (let i = 0; i < 5; i++) {
    drawCard(p1);
    drawCard(p2);
  }

const state: GameState = {
  players: [p1, p2],
  activePlayerIndex: 0,
  phase: "MAIN",
  turnNumber: 1,
  log: ["Game start."],
  pendingDiscard: null,
  pendingCombat: null,
  stack: [],
  priorityPlayerIndex: 0,
  priorityPassCount: 0,
};


  // Start the first turn: extra draw + upkeep, but stay in MAIN
  startTurn(state);

  return state;
}

// ---------------------------------------------------------------------------
// Turn / phase handling
// ---------------------------------------------------------------------------

function startTurn(gs: GameState): void {
  const current = gs.players[gs.activePlayerIndex];

  // Reset per-turn counters
  current.spellsCastThisTurn = 0;
  (current as any).lootGainedThisTurn = 0;  // ← ADD THIS
  (current as any).lootSpentThisTurn = 0;   // ← ADD THIS
  (current as any).evadedThisTurn = new Set<number>();
(current as any).bouncedThisTurn = new Set<number>();
(current as any).enemyAttackMissedThisTurn = false;

  // Draw for turn
  drawCard(current);
  gs.log.push(`Turn ${gs.turnNumber}: ${current.name} draws a card.`);

  // Reset summoning sickness, attacks, apply Regen and Surge, decrement freeze
current.board.forEach((bc, idx) => {
  if (!bc) return;
  ensureRuntimeFields(bc);
  bc.hasSummoningSickness = false;
  (bc as any).dealtDamageThisTurn = false;
  (bc as any).killedCreatureThisTurn = false;
  (bc as any).attacksThisTurn = 0;
    (bc as any).tempEvadeThisTurn = false; // NEW

const regen = getRegen(gs, gs.activePlayerIndex, idx);

if (regen > 0) {
  applyRegenHealing(gs, gs.activePlayerIndex, idx, regen);
}

    // Surge - apply temporary ATK buff
    const surgeValue = getKeywordValue(bc.card, "SURGE");
    if (surgeValue > 0) {
      (bc as any).tempAtkBuff = ((bc as any).tempAtkBuff || 0) + surgeValue;
      gs.log.push(`${bc.card.name} gains Surge +${surgeValue} ATK this turn.`);
    }

// Stun duration
if ((bc as any).stunnedForTurns > 0) {
  (bc as any).stunnedForTurns -= 1;
}
  });

  (current as any).healedThisTurn = false;

  // Reset location usage tracking for once-per-turn effects
  const currAny = current as any;
  if (currAny.locationUsedThisTurn) {
    currAny.locationUsedThisTurn.clear();
  }

  // Trigger start of turn effects
  triggerStartOfTurnEffects(gs, gs.activePlayerIndex);

  // Decrement location durations
  if (currAny.locationTurnsRemaining != null) {
    currAny.locationTurnsRemaining -= 1;
    if (currAny.locationTurnsRemaining <= 0) {
      if (current.location) {
        gs.log.push(`${current.location.name} expires.`);
        current.graveyard.push(current.location);
      }
      current.location = null;
      currAny.locationTurnsRemaining = null;
    }
  }
}

export function endPhase(state: GameState): GameState {
  const gs = cloneState(state);
  const p = gs.phase;

  if (p === "DRAW") {
    gs.phase = "MAIN";
  } else if (p === "MAIN") {
    // Move into the Battle / Declare Attacks phase
    gs.phase = "BATTLE_DECLARE";
  } else if (p === "BATTLE_DECLARE") {
    // Done with combat → End Phase
    gs.phase = "END";
  } else if (p === "END") {
    const current = gs.players[gs.activePlayerIndex];

    triggerEndOfTurnEffects(gs, gs.activePlayerIndex);

    current.board.forEach((bc) => {
      if (!bc) return;
      ensureRuntimeFields(bc);
      (bc as any).tempAtkBuff = 0;
    });

    gs.turnNumber += 1;
    gs.activePlayerIndex = gs.activePlayerIndex === 0 ? 1 : 0;

    startTurn(gs);
    gs.phase = "MAIN";
  }

  return gs;
}

// ---------------------------------------------------------------------------
// Condition Evaluation
// ---------------------------------------------------------------------------

type Condition =
  | { type: "SELF_HAS_EVADED_THIS_DUEL" }
  | { type: "ANY_FRIENDLY_EVADED_THIS_TURN" }
  | { type: "ANY_FRIENDLY_EVADED_THIS_DUEL" }
  | { type: "ENEMY_ATTACK_MISSED_THIS_TURN" }
  | { type: "ANY_FRIENDLY_BOUNCED_THIS_TURN" };

function conditionMet(
  gs: GameState,
  controllerIndex: number,
  sourceSlotIndex: number,
  condition?: Condition
): boolean {
  if (!condition) return true;

  const controller = gs.players[controllerIndex] as any;
  const source = gs.players[controllerIndex].board[sourceSlotIndex];
  if (!source) return false;
  ensureRuntimeFields(source);

  switch (condition.type) {
    case "SELF_HAS_EVADED_THIS_DUEL":
      return !!(source as any).hasEvadedThisDuel;

    case "ANY_FRIENDLY_EVADED_THIS_TURN":
      return controller.evadedThisTurn && controller.evadedThisTurn.size > 0;

    case "ANY_FRIENDLY_EVADED_THIS_DUEL":
      return gs.players[controllerIndex].board.some((bc) => bc && (bc as any).hasEvadedThisDuel);

    case "ENEMY_ATTACK_MISSED_THIS_TURN":
      return !!controller.enemyAttackMissedThisTurn;

    case "ANY_FRIENDLY_BOUNCED_THIS_TURN":
      return controller.bouncedThisTurn && controller.bouncedThisTurn.size > 0;

    default:
      return false;
  }
}

type EvadeContext = {
  defenderPlayerIndex: number;
  defenderSlotIndex: number;
  attackerPlayerIndex: number;
  attackerSlotIndex: number;
};

function triggerOnEvadeEffects(gs: GameState, ctx: EvadeContext) {
  if (!gs || !gs.players) return;

  const defenderPlayer = gs.players[ctx.defenderPlayerIndex];
  const defenderBC = defenderPlayer?.board?.[ctx.defenderSlotIndex] ?? null;

  // ✅ Set triggering target for the duration of this trigger window
  // (effects can now reference "the creature that evaded")
  (gs as any).triggeringTarget = {
    type: "CREATURE" as const,
    playerIndex: ctx.defenderPlayerIndex,
    slotIndex: ctx.defenderSlotIndex,
  };

  console.log("[ON_EVADE] triggerOnEvadeEffects called", {
    turnNumber: gs.turnNumber,
    attackerPlayerIndex: ctx.attackerPlayerIndex,
    attackerSlotIndex: ctx.attackerSlotIndex,
    defenderPlayerIndex: ctx.defenderPlayerIndex,
    defenderSlotIndex: ctx.defenderSlotIndex,
    defenderCard: defenderBC?.card?.name ?? null,
    defenderBaseAtk: defenderBC?.card ? (defenderBC.card as any).atk : null,
    defenderPermAtkBuffBefore: defenderBC ? (defenderBC as any).permAtkBuff : null,
    defenderTempAtkBuffBefore: defenderBC ? (defenderBC as any).tempAtkBuff : null,
    triggeringTarget: (gs as any).triggeringTarget,
  });

  // Mark per-duel / per-turn evade state for condition checks
  if (defenderBC) {
    (defenderBC as any).hasEvadedThisDuel = true;
  }

  const defAny = defenderPlayer as any;
  if (!(defAny.evadedThisTurn instanceof Set)) defAny.evadedThisTurn = new Set<number>();
  defAny.evadedThisTurn.add(ctx.defenderSlotIndex);
  defAny.enemyAttackMissedThisTurn = true;

  let executedCount = 0;
  let jitterExecuted = 0;

  try {
    // Execute ON_EVADE effects from all creatures currently in play
    for (let p = 0; p < gs.players.length; p++) {
      const player = gs.players[p];

      for (let s = 0; s < player.board.length; s++) {
        const bc = player.board[s];
        if (!bc) continue;

        const cardAny: any = bc.card;
        const effects: any[] = Array.isArray(cardAny?.effects) ? cardAny.effects : [];

        if (bc.card?.name === "Neonja Jitter") {
          console.log("[ON_EVADE] Jitter effects snapshot", { p, s, effects });
        }

        for (const eff of effects) {
          if (!eff || eff.timing !== "ON_EVADE") continue;

          const selfTarget = { type: "CREATURE" as const, playerIndex: p, slotIndex: s };

          console.log("[ON_EVADE] executing effect", {
            ownerPlayerIndex: p,
            ownerSlotIndex: s,
            ownerCard: bc.card?.name,
            eff,
            target: selfTarget,
            triggeringTarget: (gs as any).triggeringTarget,
            targetHasEvadedThisDuel: !!((gs.players[p].board[s] as any)?.hasEvadedThisDuel),
            targetPermAtkBuffBefore: (gs.players[p].board[s] as any)?.permAtkBuff ?? null,
          });

          executedCount++;
          if (bc.card?.name === "Neonja Jitter") jitterExecuted++;

          effectExecutor.executeEffect(gs, eff, p, selfTarget);

          console.log("[ON_EVADE] after executeEffect", {
            ownerCard: bc.card?.name,
            targetPermAtkBuffAfter: (gs.players[p].board[s] as any)?.permAtkBuff ?? null,
            targetTempAtkBuffAfter: (gs.players[p].board[s] as any)?.tempAtkBuff ?? null,
            targetEffectiveAtkAfter: getEffectiveAtk(gs, p, s),
          });
        }
      }
    }

    console.log("[ON_EVADE] summary", {
      executedCount,
      jitterExecuted,
      defenderPermAtkBuffAfter: defenderBC ? (defenderBC as any).permAtkBuff : null,
      defenderEffectiveAtkAfter: defenderBC ? getEffectiveAtk(gs, ctx.defenderPlayerIndex, ctx.defenderSlotIndex) : null,
    });
  } finally {
    // ✅ Always clear triggering target even if something throws
    (gs as any).triggeringTarget = undefined;
  }
}

// ---------------------------------------------------------------------------
// Loot system
// ---------------------------------------------------------------------------

function gainLoot(gs: GameState, playerIndex: number, amount: number): void {
  const player = gs.players[playerIndex] as any;
  if (!player.loot) player.loot = 0;
  if (!player.lootGainedThisTurn) player.lootGainedThisTurn = 0;
  
  // Check for Coin Master bonus (first loot each turn gets +1)
  const hasCoinMaster = player.board.some((bc: any) => 
    bc && bc.card.name === "Spirate Coin Master"
  );
  
  if (hasCoinMaster && player.lootGainedThisTurn === 0) {
    amount += 1;
    gs.log.push(`Coin Master bonus: +1 Loot`);
  }
  
  player.loot += amount;
  player.lootGainedThisTurn += amount;
  gs.log.push(`${player.name} gains ${amount} Loot (total: ${player.loot}).`);
  
  // Trigger "on loot gain" effects
  triggerLootGainEffects(gs, playerIndex, amount);
}

function spendLoot(gs: GameState, playerIndex: number, amount: number): boolean {
  const player = gs.players[playerIndex] as any;
  if (!player.loot) player.loot = 0;
  
  if (player.loot < amount) {
    gs.log.push(`Not enough Loot (need ${amount}, have ${player.loot}).`);
    return false;
  }
  
  player.loot -= amount;
  if (!player.lootSpentThisTurn) player.lootSpentThisTurn = 0;
  player.lootSpentThisTurn += amount;
  
  gs.log.push(`${player.name} spends ${amount} Loot (remaining: ${player.loot}).`);
  
  // Trigger "on loot spend" effects
  triggerLootSpendEffects(gs, playerIndex, amount);
  
  return true;
}

function triggerLootGainEffects(gs: GameState, playerIndex: number, amount: number): void {
  const player = gs.players[playerIndex];
  
  player.board.forEach((bc, slotIdx) => {
    if (!bc) return;
    
    // Spirate First Mate: +1 ATK when gaining loot
    if (bc.card.name === "Spirate First Mate") {
      (bc as any).tempAtkBuff = ((bc as any).tempAtkBuff || 0) + amount;
      gs.log.push(`${bc.card.name} gains +${amount} ATK this turn.`);
    }
    
    // Admiral/Quartermaster: damage on loot gain
    if (bc.card.name === "Spirate Admiral" || bc.card.name === "Spirate Quartermaster") {
      // These would need targeting, so set up pendingTarget
      // For now, just deal damage to opponent
      gs.players[1 - playerIndex].life -= amount;
      gs.log.push(`${bc.card.name}: ${amount} damage to opponent.`);
    }
  });
}

function triggerLootSpendEffects(gs: GameState, playerIndex: number, amount: number): void {
  const player = gs.players[playerIndex];
  
  player.board.forEach((bc) => {
    if (!bc) return;
    
    // Spirate Captain: damage on loot spend
    if (bc.card.name === "Spirate Captain") {
      gs.players[1 - playerIndex].life -= amount;
      gs.log.push(`${bc.card.name}: ${amount} damage to opponent.`);
    }
    
    // Admiral: damage on loot spend
    if (bc.card.name === "Spirate Admiral") {
      gs.players[1 - playerIndex].life -= amount;
      gs.log.push(`${bc.card.name}: ${amount} damage to opponent.`);
    }
  });
}

// ---------------------------------------------------------------------------
// Bounce handling
// ---------------------------------------------------------------------------

export function bounceCreatureToHand(
  gs: GameState,
  ownerPlayerIndex: number,
  slotIndex: number,
  sourcePlayerIndex?: number
): boolean {
  const owner = gs.players[ownerPlayerIndex];
  const bc = owner.board[slotIndex];
  if (!bc) return false;

  // Snapshot effects from THIS creature (including relic-granted runtime effects)
  const cardAny: any = bc.card;
  const effectsSnapshot: any[] = Array.isArray(cardAny.effects) && cardAny.effects.length > 0
    ? [...cardAny.effects]
    : cardRegistry.getEffects(bc.card.name);

  // Snapshot attached relics (we still send them to graveyard after bounce)
  const attachedRelics = owner.relics.filter(r => r.slotIndex === slotIndex);

  // Perform the bounce
  owner.hand.push(bc.card as any);
  owner.board[slotIndex] = null;

  // Track “bounced this turn”
  const oAny = owner as any;
  if (!oAny.bouncedThisTurn) oAny.bouncedThisTurn = new Set<number>();
  oAny.bouncedThisTurn.add(slotIndex);

  gs.log.push(`${bc.card.name} is returned to ${owner.name}'s hand.`);

  // Make bounce context available for generic effects like "summon into bounced slot"
  (gs as any).lastBounceContext = {
    bouncedOwnerIndex: ownerPlayerIndex,
    bouncedSlotIndex: slotIndex,
    bouncedCardName: bc.card.name,
    sourcePlayerIndex: sourcePlayerIndex ?? null,
  };

  // ✅ 1) Execute ON_BOUNCE effects that belonged to the bounced creature itself
  for (const eff of effectsSnapshot) {
    if (!eff || eff.timing !== "ON_BOUNCE") continue;
    effectExecutor.executeEffect(gs, eff, ownerPlayerIndex, undefined);
  }

  // ✅ 2) Execute global ON_BOUNCE triggers from other creatures still in play (your existing system)
  triggerBounceEffects(gs, ownerPlayerIndex, {
    bouncedOwnerIndex: ownerPlayerIndex,
    bouncedSlotIndex: slotIndex,
    bouncedCardName: bc.card.name,
    sourcePlayerIndex: sourcePlayerIndex ?? null,
  });

  // Detach relics to graveyard (your current rule)
  attachedRelics.forEach(r => {
    owner.graveyard.push(r.relic);
    gs.log.push(`${r.relic.name} goes to the graveyard (bounced creature).`);
  });
  owner.relics = owner.relics.filter(r => r.slotIndex !== slotIndex);

  return true;
}

type BounceContext = {
  bouncedOwnerIndex: number;   // whose creature got bounced
  bouncedSlotIndex: number;    // slot it left from
  bouncedCardName: string;
  sourcePlayerIndex: number | null; // who caused it (optional)
};

function triggerBounceEffects(gs: GameState, ownerIndex: number, ctx: BounceContext) {
  gs.players.forEach((p: any) => {
    if (!p.triggerUsedThisTurn) p.triggerUsedThisTurn = new Set<string>();
  });

  for (let pIdx = 0; pIdx < gs.players.length; pIdx++) {
    const player = gs.players[pIdx] as any;

    for (let sIdx = 0; sIdx < player.board.length; sIdx++) {
      const bc = player.board[sIdx];
      if (!bc) continue;

const effects = getEffectsForBoardCreature(bc);
      const bounceEffects = effects.filter((e: any) => e.timing === "ON_BOUNCE");
      if (bounceEffects.length === 0) continue;

      bounceEffects.forEach((effect: any) => {
        if (effect.oncePerTurn) {
          const key = `${bc.card.name}|ON_BOUNCE|${sIdx}`;
          if (player.triggerUsedThisTurn.has(key)) return;
          player.triggerUsedThisTurn.add(key);
        }

        if (!conditionMet(gs, pIdx, sIdx, effect.condition)) return;

        // Common Neonja requirement: “another creature you control was returned”
        if (effect.requiresFriendlyBounce === true) {
          if (ctx.bouncedOwnerIndex !== pIdx) return;
        }

        let target: SpellTarget | undefined;

        if (effect.targetType === "SELF") {
          target = { type: "CREATURE", playerIndex: pIdx, slotIndex: sIdx };
        } else if (effect.targetType === "ENEMY_PLAYER") {
          target = { type: "PLAYER", playerIndex: 1 - pIdx };
        }

        effectExecutor.executeEffect(gs, effect, pIdx, target);
      });
    }
  }
}

// ---------------------------------------------------------------------------
// HP Sacrifice Summoning
// ---------------------------------------------------------------------------

export function summonTokenIntoSlot(
  gs: GameState,
  playerIndex: number,
  slotIndex: number,
  tokenCardId: string
): boolean {
  const player = gs.players[playerIndex];
  if (!player) return false;

  // Must be empty
  if (player.board[slotIndex]) return false;

  const token = cardRegistry.createCard(tokenCardId);
  if (!token || token.kind !== "CREATURE") return false;

  const creature = token as any;

  const bc: BoardCreature = {
    card: creature,
    currentHp: creature.hp ?? 1,
    hasSummoningSickness: true,
  };

  ensureRuntimeFields(bc);
  player.board[slotIndex] = bc;

  gs.log.push(`${creature.name} is summoned.`);
  return true;
}

export function playCreature(
  state: GameState,
  handCardId: string,
  slotIndex: number
): GameState {
  const gs = cloneState(state);
  const playerIndex = gs.activePlayerIndex;
  const player = gs.players[playerIndex];

  // Board bounds
  if (slotIndex < 0 || slotIndex > 2) return gs;

  const card = player.hand.find((c) => c.id === handCardId);
  if (!card || card.kind !== "CREATURE") return gs;

  const creature = card as CreatureCard;

  // New rule: you can only summon into an EMPTY slot.
  // Overwriting is handled by Evolutions, not summoning.
  if (player.board[slotIndex]) {
    gs.log.push(`Slot ${slotIndex + 1} is not empty.`);
    return gs;
  }

  // New rule: Tier-gated summoning (no HP sacrifice).
  const tierCheck = canSummonCreatureByTier(gs, creature);
  if (!tierCheck.ok) {
    if (tierCheck.reason) {
      gs.log.push(tierCheck.reason);
    } else {
      gs.log.push(`Cannot summon ${creature.name}: Tier restrictions not met.`);
    }
    return gs;
  }

  // Summon the creature
const bc: BoardCreature = {
  card: creature,
  currentHp: creature.hp,
  hasSummoningSickness: !hasKeyword(creature, "SWIFT"), 
};

  ensureRuntimeFields(bc);

  player.hand = player.hand.filter((c) => c.id !== card.id);
  player.board[slotIndex] = bc;
  gs.log.push(`Summoned ${creature.name} (Tier ${creature.rank}).`);

  // Apply on-summon keyword effects
  applySurge(gs, bc);
  applySpellShield(bc);

  // Trigger ON_PLAY card effects (if any)
  const playerIdx = playerIndex;
  triggerOnPlayEffects(gs, playerIdx, slotIndex);

  return gs;
}


// ---------------------------------------------------------------------------
// Helper functions for effect triggers
// ---------------------------------------------------------------------------

function applySurge(gs: GameState, bc: BoardCreature) {
  const surgeValue = getKeywordValue(bc.card.name, "SURGE");
  if (surgeValue > 0) {
    (bc as any).tempAtkBuff += surgeValue;
    gs.log.push(`${bc.card.name} gains Surge +${surgeValue} ATK this turn.`);
  }
}

function applySpellShield(bc: BoardCreature) {
  if (hasSpellShield(bc.card.name)) {
    (bc as any).spellShield = true;
  }
}

export function resolveChoice(state: GameState, optionIndex: number): GameState {
  const gs = cloneState(state);
  const pc = (gs as any).pendingChoice;
  if (!pc) return gs;

  const opt = pc.options?.[optionIndex];
  if (!opt) return gs;

  // Clear pending choice before executing (prevents re-entrancy bugs)
  (gs as any).pendingChoice = undefined;

  // Execute each effect in the chosen option
  for (const eff of opt.effects) {
    // If the effect needs a target selection, your existing targeting flow should handle it.
    // For simple effects like draw/atkBuff this will just run.
    effectExecutor.executeEffect(gs, eff, pc.sourcePlayerIndex, undefined);
  }

  return gs;
}

export function resolveSpellTargeting(
  state: GameState,
  spellCardId?: string,
  target?: SpellTarget
): GameState {
  const gs = cloneState(state);

  // -------------------------------------------------------------------------
  // STEP 1: Start casting (we have a spellCardId, but no target yet)
  // -------------------------------------------------------------------------
  if (spellCardId && !target) {
    const activePlayerIndex = gs.activePlayerIndex;
    const player = gs.players[activePlayerIndex];
    const card = player.hand.find((c) => c.id === spellCardId);

    if (!card || (card.kind !== "FAST_SPELL" && card.kind !== "SLOW_SPELL")) {
      return gs;
    }

    const spellCard = card as SpellCard;

    // Re-check timing
    const timing = canCastSpellNow(gs, activePlayerIndex, spellCard);
    if (!timing.ok) {
      gs.log.push(timing.reason || "You cannot cast this spell now.");
      return gs;
    }

    // Prefer runtime effects if present, otherwise fall back to registry by name
    const effects: any[] = Array.isArray((spellCard as any).effects)
      ? (spellCard as any).effects
      : cardRegistry.getEffects(spellCard.name);

    // Find whether this spell needs a chosen target
    const targetingEffect = effects.find(
      (e) => e && (e.targetType === "TARGET_CREATURE" || e.targetType === "TARGET_PLAYER")
    );

    const needsTarget = !!targetingEffect;

    // -------------------- NO TARGET NEEDED --------------------
    if (!needsTarget) {
      if (spellCard.kind === "FAST_SPELL") {
        // Fast spell: put on stack immediately (no target)
        pushFastSpellToStack(gs, activePlayerIndex, spellCard, undefined);
        gs.log.push(`${spellCard.name} is cast as a Fast spell.`);
        // Card remains in hand until the stack resolves (per your existing pattern)
      } else {
        // Slow spell: resolve immediately
        effects.forEach((eff) => {
          effectExecutor.executeEffect(gs, eff, activePlayerIndex, undefined);
        });

        // Move to graveyard
        player.hand = player.hand.filter((c) => c.id !== spellCardId);
        player.graveyard.push(card);
        markSpellCastAndTriggerCatalyst(gs, activePlayerIndex);
        gs.log.push(`${spellCard.name} resolves.`);
      }
      return gs;
    }

    // -------------------- TARGET NEEDED --------------------
    // ✅ DO NOT push onto stack yet. We must wait until the target is chosen.
    // Build rule (default based on targetType)
    let rule: TargetingRule =
      targetingEffect.targetingRule ??
      (targetingEffect.targetType === "TARGET_PLAYER"
        ? ({ type: "ANY_PLAYER" } as const)
        : ({ type: "ANY_CREATURE" } as const));

    // Back-compat for old cards (keep this so older defs don’t break)
    if (!targetingEffect.targetingRule) {
      if (targetingEffect.customScript === "TARGET_ENEMY_CREATURE") rule = { type: "ENEMY_CREATURES" };
      if (targetingEffect.customScript === "TARGET_FRIENDLY_CREATURE") rule = { type: "FRIENDLY_CREATURES" };
    }

    gs.pendingTarget = {
      source: spellCard.name,
      rule,
      sourcePlayerIndex: activePlayerIndex,
      sourceCardId: spellCardId,
      sourceType: "SPELL",
      optional: targetingEffect.optional ?? false,
      // If your PendingTarget type doesn’t include this, it’s still safe at runtime:
      effects: effects,
    } as any;

    gs.log.push(`${spellCard.name} needs a target. Click a valid target.`);
    return gs;
  }

  // -------------------------------------------------------------------------
  // STEP 2: Finish casting (target chosen)
  // -------------------------------------------------------------------------
  if (!gs.pendingTarget || gs.pendingTarget.sourceType !== "SPELL" || !target) {
    return gs;
  }

  const { sourcePlayerIndex, sourceCardId, source } = gs.pendingTarget as any;

  if (!sourceCardId) {
    gs.pendingTarget = undefined;
    return gs;
  }

  const caster = gs.players[sourcePlayerIndex];
  const spellInHand = caster.hand.find((c) => c.id === sourceCardId);

  if (!spellInHand || (spellInHand.kind !== "FAST_SPELL" && spellInHand.kind !== "SLOW_SPELL")) {
    gs.pendingTarget = undefined;
    return gs;
  }

  const spellCard = spellInHand as SpellCard;

  // Re-check timing (state might have changed while picking target)
  const timing = canCastSpellNow(gs, sourcePlayerIndex, spellCard);
  if (!timing.ok) {
    gs.log.push(timing.reason || "You cannot cast this spell now.");
    gs.pendingTarget = undefined;
    return gs;
  }

  // Validate target against rule
  const rule = (gs.pendingTarget as any).rule as TargetingRule | undefined;
  if (!rule) {
    gs.log.push(`No targeting rule found for ${spellCard.name}.`);
    gs.pendingTarget = undefined;
    return gs;
  }

  const valid = getValidTargets(gs, sourcePlayerIndex, rule, sourcePlayerIndex, undefined).some((t) => {
    if (target.type === "PLAYER") return t.playerIndex === target.playerIndex && t.slotIndex === undefined;
    return t.playerIndex === target.playerIndex && t.slotIndex === target.slotIndex;
  });

  if (!valid) {
    gs.log.push(`Invalid target for ${spellCard.name}.`);
    return gs;
  }

  // Determine effects (prefer what we stashed in pendingTarget, else registry)
  const effects: any[] =
    Array.isArray((gs.pendingTarget as any).effects) && (gs.pendingTarget as any).effects.length > 0
      ? (gs.pendingTarget as any).effects
      : cardRegistry.getEffects(source);

  // Clear pending target BEFORE doing anything else
  gs.pendingTarget = undefined;

  // -------------------- FAST SPELL: put on stack WITH target --------------------
  if (spellCard.kind === "FAST_SPELL") {
    pushFastSpellToStack(gs, sourcePlayerIndex, spellCard, target);
    gs.log.push(`${spellCard.name} is cast as a Fast spell.`);
    // Card stays in hand until stack resolves (per your engine’s existing behavior)
    return gs;
  }

  // -------------------- SLOW SPELL: resolve immediately --------------------
  effects.forEach((eff) => {
    if (eff.targetType === "TARGET_PLAYER") {
      // Default: enemy player
      const enemyPlayerIndex = 1 - sourcePlayerIndex;
      const enemyTarget: SpellTarget = { type: "PLAYER", playerIndex: enemyPlayerIndex };
      effectExecutor.executeEffect(gs, eff, sourcePlayerIndex, enemyTarget);
    } else if (eff.targetType === "SELF_PLAYER") {
      effectExecutor.executeEffect(gs, eff, sourcePlayerIndex, undefined);
    } else {
      // TARGET_CREATURE or NONE or other: use chosen target
      effectExecutor.executeEffect(gs, eff, sourcePlayerIndex, target);
    }
  });

  // Zone change + Catalyst
  caster.hand = caster.hand.filter((c) => c.id !== sourceCardId);
  caster.graveyard.push(spellInHand);
  markSpellCastAndTriggerCatalyst(gs, sourcePlayerIndex);
  gs.log.push(`${spellCard.name} resolves.`);

  return gs;
}

export function resolveRelicTargeting(
  state: GameState,
  targetSlotIndex: number
): GameState {
  const gs = cloneState(state);
  
  if (!gs.pendingTarget || gs.pendingTarget.sourceType !== "RELIC") {
    return gs;
  }
  
  const { sourcePlayerIndex, sourceCardId } = gs.pendingTarget;
  
  if (!sourceCardId) {
    gs.pendingTarget = undefined;
    return gs;
  }
  
  // Use the existing playRelic function
  const result = playRelic(gs, sourceCardId, targetSlotIndex);
  
  // Clear pending target
  result.pendingTarget = undefined;
  
  return result;
}

function getCatalystMultiplier(gs: GameState, playerIndex: number): number {
  const player = gs.players[playerIndex];
  const hasDoubler = player.board.some(
    (bc) => bc && bc.card && bc.card.name === "Runeblade Ascendant"
  );
  return hasDoubler ? 2 : 1;
}


function markSpellCastAndTriggerCatalyst(gs: GameState, playerIndex: number) {
  const player = gs.players[playerIndex];
  player.spellsCastThisTurn += 1;

  if (player.spellsCastThisTurn === 1) {
    const multiplier = getCatalystMultiplier(gs, playerIndex);

    player.board.forEach((bc, slotIdx) => {
      if (!bc) return;
      const effects = cardRegistry.getEffects(bc.card.name);
      const catalystEffects = effects.filter((e) => e.timing === "CATALYST");

      for (let i = 0; i < multiplier; i++) {
        catalystEffects.forEach((eff) => {
          effectExecutor.executeEffect(gs, eff, playerIndex, {
            type: "CREATURE",
            playerIndex,
            slotIndex,
          });
        });
      }
    });
  }
}


function triggerLocationEffects(
  gs: GameState, 
  playerIndex: number, 
  timing: string,
  context?: { damageDealt?: number; source?: BoardCreature; slotIndex?: number }
) {
  const player = gs.players[playerIndex];
  if (!player.location) return;
  
  const effects = cardRegistry.getEffects(player.location.name);
  const matchingEffects = effects.filter(e => e.timing === timing);
  
  matchingEffects.forEach(effect => {
    // Check if this is a once-per-turn effect
    const isOncPerTurn = player.location!.text.toLowerCase().includes("once each turn") ||
                         player.location!.text.toLowerCase().includes("once per turn");
    
    if (isOncPerTurn) {
      const pAny = player as any;
      const locationKey = player.location!.name;
      
      if (!pAny.locationUsedThisTurn) pAny.locationUsedThisTurn = new Set();
      const usageKey = `${locationKey}-${context?.slotIndex}`;
      
      if (pAny.locationUsedThisTurn.has(usageKey)) {
        return; // Already used this turn
      }
      pAny.locationUsedThisTurn.add(usageKey);
    }
    
    // Execute the effect
    effectExecutor.executeEffect(gs, effect, playerIndex, {
      playerIndex: 1 - playerIndex,
      slotIndex: "PLAYER"
    });
  });
}

function triggerOnPlayEffects(gs: GameState, playerIndex: number, slotIndex: number) {
  const player = gs.players[playerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return;

  const effects = cardRegistry.getEffects(bc.card.name);
  const onPlayEffects = effects.filter(e => e.timing === "ON_PLAY");

  // Find the first ON_PLAY effect that requires a target
  const targetingEffect = onPlayEffects.find(
    e => e.targetType === "TARGET_CREATURE" || e.targetType === "TARGET_PLAYER"
  );

  if (!targetingEffect) {
    // No targeting needed: run all ON_PLAY effects immediately
    onPlayEffects.forEach(effect => {
      effectExecutor.executeEffect(gs, effect, playerIndex, undefined);
    });
    return;
  }

  // OPTIONAL -> show Yes/No modal instead of going straight to targeting
  if ((targetingEffect as any).optional) {
    (gs as any).pendingOptionalEffect = {
      prompt: `Activate ${bc.card.name} effect?`,
      source: bc.card.name,
      sourcePlayerIndex: playerIndex,
      sourceSlotIndex: slotIndex,
      effect: targetingEffect,
    };
    return;
  }

  // Non-optional -> go straight to pendingTarget
  const rule: TargetingRule =
    targetingEffect.targetingRule ??
    (targetingEffect.targetType === "TARGET_PLAYER" ? { type: "ANY_PLAYER" } : { type: "ANY_CREATURE" });

  gs.pendingTarget = {
    source: bc.card.name,
    rule,
    sourcePlayerIndex: playerIndex,
    sourceSlotIndex: slotIndex,
    sourceType: "ON_PLAY",
    optional: false,
    effects: [targetingEffect], // ✅ run only this effect after target selection
  };

  gs.log.push(`${bc.card.name} needs a target. Click a valid target.`);
}

function triggerEndOfTurnEffects(gs: GameState, playerIndex: number) {
  const player = gs.players[playerIndex];
  
  player.board.forEach((bc) => {
    if (!bc) return;
    
    const effects = cardRegistry.getEffects(bc.card.name);
    const endEffects = effects.filter(e => e.timing === "END_OF_TURN");
    
    endEffects.forEach(effect => {
      effectExecutor.executeEffect(gs, effect, playerIndex, undefined);
    });
  });
}

export function resolveOptionalEffect(state: GameState, accept: boolean): GameState {
  const gs = cloneState(state);
  const poe = (gs as any).pendingOptionalEffect;
  if (!poe) return gs;

  // Clear first to avoid double clicks / re-entrancy
  (gs as any).pendingOptionalEffect = null;

  if (!accept) {
    gs.log.push(`${poe.source} effect declined.`);
    return gs;
  }

  const eff: any = poe.effect;

  // If targeting required -> open pendingTarget
  if (eff.targetType === "TARGET_CREATURE" || eff.targetType === "TARGET_PLAYER") {
    const rule =
      eff.targetingRule ??
      (eff.targetType === "TARGET_PLAYER"
        ? ({ type: "ANY_PLAYER" } as const)
        : ({ type: "ANY_CREATURE" } as const));

    gs.pendingTarget = {
      source: poe.source,
      rule, // ✅ ALWAYS defined now
      sourcePlayerIndex: poe.sourcePlayerIndex,
      sourceSlotIndex: poe.sourceSlotIndex,
      sourceType: "ON_PLAY",
      optional: false,
      effects: [eff],
    };

    gs.log.push(`${poe.source} effect activated. Choose a target.`);
    return gs;
  }

  // Non-targeting optional effects
  effectExecutor.executeEffect(gs, eff, poe.sourcePlayerIndex, undefined);
  gs.log.push(`${poe.source} effect activated.`);
  return gs;
}

export function resolveOnPlayTargeting(
  state: GameState,
  targetPlayerIndex: number,
  targetSlotIndex: number
): GameState {
  const gs = cloneState(state);

  const pt = gs.pendingTarget;
  if (!pt) return gs;

  // Must be ON_PLAY targeting
  if (pt.sourceType !== "ON_PLAY") return gs;

  const source = pt.source;
  const sourcePlayerIndex = pt.sourcePlayerIndex;
  const sourceSlotIndex = pt.sourceSlotIndex;

  // ✅ Build target FIRST (prevents TDZ error)
  const target = {
    type: "CREATURE" as const,
    playerIndex: targetPlayerIndex,
    slotIndex: targetSlotIndex,
  };

  // Validate target
  if (!pt.rule) {
    gs.log.push(`No targeting rule found for ${source}.`);
    gs.pendingTarget = undefined;
    return gs;
  }

  const valid = getValidTargets(gs, sourcePlayerIndex, pt.rule, sourcePlayerIndex, sourceSlotIndex)
    .some(t => t.playerIndex === targetPlayerIndex && t.slotIndex === targetSlotIndex);

  if (!valid) {
    gs.log.push(`Invalid target for ${source}.`);
    return gs;
  }

  // ✅ Determine exactly which effects to run
  const effectsToRun: any[] =
    Array.isArray(pt.effects) && pt.effects.length > 0
      ? pt.effects
      : cardRegistry.getEffects(source).filter((e: any) => e.timing === "ON_PLAY");

  // Clear pending target BEFORE executing to avoid re-entrancy issues
  gs.pendingTarget = undefined;

  // Execute
  effectsToRun.forEach((effect: any) => {
    effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, target);
  });

  return gs;
}

function triggerDeathEffects(gs: GameState, playerIndex: number, slotIndex: number) {
  const player = gs.players[playerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return;

  const effects = cardRegistry.getEffects(bc.card.name);
  const deathEffects = effects.filter(e => e.timing === "DEATH");
  
  if (deathEffects.length === 0) return;

  deathEffects.forEach(effect => {
    const item: StackItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: "TRIGGER",
      sourceCardName: bc.card.name,
      sourcePlayerIndex: playerIndex,
      effects: [effect],
      target: undefined,
    };
    gs.stack.push(item);
    gs.log.push(`Death trigger from ${bc.card.name} is placed on the stack.`);
  });

  // After putting death triggers on stack, give priority to the active player to respond
  gs.priorityPassCount = 0;
  givePriorityTo(gs, gs.activePlayerIndex);
}

function triggerOnAttackEffects(gs: GameState, playerIndex: number, slotIndex: number) {
  const player = gs.players[playerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return;

  const effects = cardRegistry.getEffects(bc.card.name);
  const onAttackEffects = effects.filter(e => e.timing === "ON_ATTACK");
  
  // Execute all ON_ATTACK effects
  onAttackEffects.forEach(effect => {
    effectExecutor.executeEffect(gs, effect, playerIndex, undefined);
  });
}

function triggerStartOfTurnEffects(gs: GameState, playerIndex: number) {
  const player = gs.players[playerIndex];
  
  player.board.forEach((bc, slotIndex) => {
    if (!bc) return;
    
    const effects = cardRegistry.getEffects(bc.card.name);
    const startEffects = effects.filter(e => e.timing === "START_OF_TURN");
    
    startEffects.forEach(effect => {
      // For random friendly targeting
      if (effect.customScript === "RANDOM_FRIENDLY" && effect.heal) {
        const friendlyCreatures = player.board
          .map((creature, idx) => ({ creature, idx }))
          .filter(c => c.creature !== null);
        
        if (friendlyCreatures.length > 0) {
          const randomIndex = Math.floor(Math.random() * friendlyCreatures.length);
          const target = friendlyCreatures[randomIndex];
          
          effectExecutor.executeEffect(gs, effect, playerIndex, {
            type: "CREATURE",
            playerIndex: playerIndex,
            slotIndex: target.idx
          });
        }
      } else {
        effectExecutor.executeEffect(gs, effect, playerIndex, undefined);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Damage & Healing helpers
// ---------------------------------------------------------------------------

function applyCreatureDamage(
  gs: GameState,
  targetPlayerIndex: number,
  slotIndex: number,
  amount: number,
  sourceIsSpell: boolean
): void {
  const player = gs.players[targetPlayerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return;
  ensureRuntimeFields(bc);

  // Spell Shield
  if (sourceIsSpell && (bc as any).spellShield) {
    (bc as any).spellShield = false;
    gs.log.push(`${bc.card.name}'s Spell Shield negates the spell.`);
    return;
  }

  // Armor
  const armor = getArmor(gs, targetPlayerIndex, slotIndex);
  let dmg = Math.max(amount - armor, 0);

  // Prevented damage
  const prevented = (bc as any).preventedDamage || 0;
  if (prevented > 0) {
    const used = Math.min(dmg, prevented);
    dmg -= used;
    (bc as any).preventedDamage = prevented - used;
    gs.log.push(`${bc.card.name} prevents ${used} damage.`);
  }

if (dmg <= 0) return;
bc.currentHp -= dmg;
gs.log.push(`${bc.card.name} takes ${dmg} damage.`);

// Trigger ON_DAMAGED effects
const effects = cardRegistry.getEffects(bc.card.name);
const onDamagedEffects = effects.filter(e => e.timing === "ON_DAMAGED");
onDamagedEffects.forEach(effect => {
  effectExecutor.executeEffect(gs, effect, targetPlayerIndex, undefined);
});

if (bc.currentHp <= 0) {
    // Trigger death effects
    triggerDeathEffects(gs, targetPlayerIndex, slotIndex);
    
    // Track which creature killed it (if from combat)
    if (!sourceIsSpell) {
      // Mark all creatures that dealt damage this turn as having killed
      const attackingPlayer = gs.players[gs.activePlayerIndex];
      attackingPlayer.board.forEach(atkCreature => {
        if (atkCreature && (atkCreature as any).dealtDamageThisTurn) {
          (atkCreature as any).killedCreatureThisTurn = true;
        }
      });
    }
    
    // Remove relics and their bonuses
    const attachedRelics = player.relics.filter(r => r.slotIndex === slotIndex);
    attachedRelics.forEach(relicData => {
      player.graveyard.push(relicData.relic);
      gs.log.push(`${relicData.relic.name} goes to the graveyard.`);
    });
    player.relics = player.relics.filter(r => r.slotIndex !== slotIndex);
    
    // Send creature to graveyard
    player.graveyard.push(bc.card);
    player.board[slotIndex] = null;
    gs.log.push(`${bc.card.name} dies.`);
  }
}

function dealPlayerDamage(
  gs: GameState,
  targetPlayerIndex: number,
  amount: number,
  sourcePlayerIndex: number | null,
  fromSpell: boolean
): void {
  const targetPlayer = gs.players[targetPlayerIndex];

  // Optionally apply location damage boosts from the source player
  let dmg = amount;
  if (sourcePlayerIndex !== null) {
    const modifiers = getLocationModifiers(gs, sourcePlayerIndex);
    dmg += modifiers.damageBoost;
  }

  if (dmg <= 0) return;

  const before = targetPlayer.life;
  // Clamp at 0 so life never goes negative
  targetPlayer.life = Math.max(0, targetPlayer.life - dmg);
  const actual = before - targetPlayer.life;

  if (actual > 0) {
    gs.log.push(`${targetPlayer.name} takes ${actual} damage.`);
  }
}

function healPlayer(gs: GameState, playerIndex: number, amount: number, fromSpell: boolean): void {
  const player = gs.players[playerIndex];
  
  const modifiers = getLocationModifiers(gs, playerIndex);
  let heal = amount + modifiers.healBoost;
  
  const old = player.life;
  player.life = Math.min(20, player.life + heal);
  const actualHeal = player.life - old;
  
  if (actualHeal > 0) {
    (player as any).healedThisTurn = true;
    gs.log.push(`${player.name} heals ${actualHeal} HP.`);
  }
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export function declareGuardBlock(state: GameState, blockerSlotIndex: number): GameState {
  const gs = cloneState(state);
  const combat = gs.pendingCombat;

  if (!combat) {
    gs.log.push("There is no attack to block.");
    return gs;
  }

  const defPlayerIndex = combat.targetPlayerIndex;
  const blockerController = gs.priorityPlayerIndex;

  // Only the defending player can declare blocks
  if (blockerController !== defPlayerIndex) {
    gs.log.push("Only the defending player can declare a block.");
    return gs;
  }

  const defenderPlayer = gs.players[defPlayerIndex];

  if (
    blockerSlotIndex < 0 ||
    blockerSlotIndex >= defenderPlayer.board.length
  ) {
    gs.log.push("Invalid blocker slot.");
    return gs;
  }

  const blocker = defenderPlayer.board[blockerSlotIndex];
  if (!blocker) {
    gs.log.push("No creature in that slot to block with.");
    return gs;
  }

  // Must have Guard keyword
  if (!hasGuard(blocker.card.name)) {
    gs.log.push(`${blocker.card.name} cannot block; it does not have Guard.`);
    return gs;
  }

  // Can't block if Stunned
  ensureRuntimeFields(blocker);
  if ((blocker as any).stunnedForTurns > 0) {
    gs.log.push(`${blocker.card.name} is Stunned and cannot block.`);
    return gs;
  }

  // Record the block (the Guard becomes the new combat target)
  combat.blockerSlotIndex = blockerSlotIndex;
  gs.priorityPassCount = 0; // new action, reset the pass streak
  gs.log.push(`${blocker.card.name} blocks the attack.`);

  return gs;
}

function shouldEvadeThisAttack(defender: BoardCreature): boolean {
  ensureRuntimeFields(defender);

  const defAny = defender as any;

  // Temp “evade next battle damage this turn” takes priority
  if (defAny.tempEvadeThisTurn) return true;

  // Built-in evasion: first time attacked each duel
if (hasEvasion(defender.card) && !defAny.autoEvasionUsedThisDuel) return true;

  return false;
}

function consumeEvade(defender: BoardCreature): { usedTemp: boolean; usedAuto: boolean } {
  ensureRuntimeFields(defender);
  const defAny = defender as any;

  if (defAny.tempEvadeThisTurn) {
    defAny.tempEvadeThisTurn = false;
    defAny.hasEvadedThisDuel = true;
    return { usedTemp: true, usedAuto: false };
  }

if (hasEvasion(defender.card) && !defAny.autoEvasionUsedThisDuel) {
    defAny.autoEvasionUsedThisDuel = true;
    defAny.hasEvadedThisDuel = true;
    return { usedTemp: false, usedAuto: true };
  }

  return { usedTemp: false, usedAuto: false };
}

function resolvePendingCombat(gs: GameState): void {
  const combat = gs.pendingCombat;
  if (!combat) return;

  const {
    attackerPlayerIndex: atkPlayerIndex,
    attackerSlotIndex,
    targetPlayerIndex: defPlayerIndex,
    targetSlotIndex,
    blockerSlotIndex,
  } = combat;

  const attackerPlayer = gs.players[atkPlayerIndex];
  const defenderPlayer = gs.players[defPlayerIndex];

  const attacker = attackerPlayer.board[attackerSlotIndex];
  if (!attacker) {
    gs.log.push("Attack fizzles: attacker is no longer on the battlefield.");
    gs.pendingCombat = null;
    return;
  }
  ensureRuntimeFields(attacker);

  const bcAny = attacker as any;
  const doubleStrike = hasDoubleStrike(attacker.card.name);
  if (!bcAny.attacksThisTurn) bcAny.attacksThisTurn = 0;

  const attackerAtk = getEffectiveAtk(gs, atkPlayerIndex, attackerSlotIndex);

  // --------------------------------------------
  // Determine who actually gets hit (blocker or original target)
  // --------------------------------------------
  let effectiveDefenderSlot: number | null = null;

  // 1) If a blocker was declared and is still on the field, it becomes the target.
  if (typeof blockerSlotIndex === "number") {
    const blk = defenderPlayer.board[blockerSlotIndex];
    if (blk) {
      effectiveDefenderSlot = blockerSlotIndex;
    }
  }

  // 2) If no valid blocker, fall back to the original target
  if (effectiveDefenderSlot === null) {
    if (targetSlotIndex === "PLAYER") {
      // Direct attack (no block): handle player damage path below.
    } else {
      effectiveDefenderSlot = targetSlotIndex as number;
    }
  }

  // -------------------- Attacking the player with NO block --------------------
  if (targetSlotIndex === "PLAYER" && effectiveDefenderSlot === null) {
    dealPlayerDamage(gs, defPlayerIndex, attackerAtk, atkPlayerIndex, false);
    gs.log.push(
      `${attacker.card.name} deals ${attackerAtk} damage to ${defenderPlayer.name}.`
    );

    if (attackerAtk > 0) {
      bcAny.dealtDamageThisTurn = true;
    }

    if (attackerPlayer.location) {
      triggerLocationEffects(gs, atkPlayerIndex, "ON_DAMAGE", {
        damageDealt: attackerAtk,
        source: attacker,
        slotIndex: attackerSlotIndex,
      });
    }

    if (hasLifetap(attacker.card.name)) {
      healPlayer(gs, atkPlayerIndex, 1, false);
    }

    bcAny.attacksThisTurn += 1;
    gs.pendingCombat = null;
    return;
  }

  // -------------------- Creature vs creature combat (original target or Guard) --------------------
  const defSlot = effectiveDefenderSlot!;
  const defender = defenderPlayer.board[defSlot];
  if (!defender) {
    gs.log.push(`No defender in that slot (attack fizzles).`);
    gs.pendingCombat = null;
    return;
  }
  ensureRuntimeFields(defender);

  const defenderAtk = getEffectiveAtk(gs, defPlayerIndex, defSlot);
  const attackerName = attacker.card.name;
  const defenderName = defender.card.name;

  // -------------------- EVASION CHECK (defender dodges attacker damage) --------------------
const defenderEvades = shouldEvadeThisAttack(defender);

if (defenderEvades) {
  consumeEvade(defender);

  // Mark per-turn tracking for the defender’s controller
  const defControllerAny = gs.players[defPlayerIndex] as any;
  if (!defControllerAny.evadedThisTurn) defControllerAny.evadedThisTurn = new Set<number>();
  defControllerAny.evadedThisTurn.add(defSlot);

  gs.log.push(`${defenderName} evades the attack from ${attackerName}.`);

  // Trigger scalable evade effects (Deadlink, Framespike, Backdoor, etc.)
  triggerOnEvadeEffects(gs, {
    defenderPlayerIndex: defPlayerIndex,
    defenderSlotIndex: defSlot,
    attackerPlayerIndex: atkPlayerIndex,
    attackerSlotIndex: attackerSlotIndex
  });
}

  const attackerFirst = hasFirstStrike(attackerName);
  const attackerHasPiercing = hasPiercing(attackerName);

  const attackerHitsFirst = attackerFirst;

  function dealCombatDamageToDefender(amount: number) {
      if (defenderEvades) amount = 0;
    const defenderHpBefore = defender.currentHp;

    applyCreatureDamage(gs, defPlayerIndex, defSlot, amount, false);

    if (amount > 0) {
      bcAny.dealtDamageThisTurn = true;
    }

// Thorns should trigger if damage was dealt, even if the defender dies.
if (amount > 0) {
  const thornsValue = getKeywordValue(defender.card, "THORNS");
  const attackerStillAlive = attackerPlayer.board[attackerSlotIndex] !== null;

  if (attackerStillAlive && thornsValue > 0) {
    applyCreatureDamage(gs, atkPlayerIndex, attackerSlotIndex, thornsValue, false);
    gs.log.push(`${defenderName} Thorns: ${thornsValue} damage to ${attackerName}.`);
  }
}

    if (attackerHasPiercing) {
      const defenderAfter = defenderPlayer.board[defSlot];
      if (!defenderAfter) {
        const excessDamage = amount - defenderHpBefore;
        if (excessDamage > 0) {
          dealPlayerDamage(gs, defPlayerIndex, excessDamage, atkPlayerIndex, false);
          gs.log.push(
            `Piercing: ${excessDamage} excess damage dealt to ${defenderPlayer.name}.`
          );
        }
      }
    }

    const defenderAfter = defenderPlayer.board[defSlot];
    if (!defenderAfter && defenderHpBefore > 0) {
      bcAny.killedCreatureThisTurn = true;
      const effects = cardRegistry.getEffects(attacker.card.name);
      const atkBuffEffect = effects.find(
        e => e.customScript === "ATK_BUFF_ON_KILL"
      );
      if (atkBuffEffect && atkBuffEffect.atkBuff) {
        bcAny.tempAtkBuff = (bcAny.tempAtkBuff || 0) + atkBuffEffect.atkBuff;
        gs.log.push(`${attackerName} gains +${atkBuffEffect.atkBuff} ATK!`);
      }
    }
  }

  function dealCombatDamageToAttacker(amount: number) {
    applyCreatureDamage(gs, atkPlayerIndex, attackerSlotIndex, amount, false);

    const attackerStillAlive = attackerPlayer.board[attackerSlotIndex] !== null;
    if (attackerStillAlive && amount > 0) {
      const thornsValue = getKeywordValue(attacker.card, "THORNS");
      if (thornsValue > 0) {
        applyCreatureDamage(gs, defPlayerIndex, defSlot, thornsValue, false);
        gs.log.push(`${attackerName} Thorns: ${thornsValue} damage to ${defenderName}.`);
      }
    }
  }

  if (attackerHitsFirst) {
    dealCombatDamageToDefender(attackerAtk);
    if (!defenderPlayer.board[defSlot]) {
      gs.log.push(
        `${attackerName} (First Strike) kills ${defenderName} before it can strike back.`
      );
    } else {
      dealCombatDamageToAttacker(defenderAtk);
    }
  } else {
    dealCombatDamageToDefender(attackerAtk);
    dealCombatDamageToAttacker(defenderAtk);
  }

  bcAny.attacksThisTurn += 1;
  gs.pendingCombat = null;
}

export function attack(
  state: GameState,
  attackerSlotIndex: number,
  target: { playerIndex: number; slotIndex: number | "PLAYER" }
): GameState {
  const gs = cloneState(state);
  const atkPlayerIndex = gs.activePlayerIndex;
  const defPlayerIndex = target.playerIndex;

  if (gs.phase !== "BATTLE_DECLARE") {
    gs.log.push("You can only declare attacks during the Battle phase.");
    return gs;
  }

  const attackerPlayer = gs.players[atkPlayerIndex];
  const defenderPlayer = gs.players[defPlayerIndex];

  const attacker = attackerPlayer.board[attackerSlotIndex];
  if (!attacker) return gs;
  ensureRuntimeFields(attacker);

  if (attacker.hasSummoningSickness) {
    gs.log.push(`${attacker.card.name} has summoning sickness and cannot attack.`);
    return gs;
  }

  if ((attacker as any).stunnedForTurns > 0) {
    gs.log.push(`${attacker.card.name} is Stunned and cannot attack.`);
    return gs;
  }

  const bcAny = attacker as any;
  const doubleStrike = hasDoubleStrike(attacker.card.name);
  if (!bcAny.attacksThisTurn) bcAny.attacksThisTurn = 0;

  if (!doubleStrike && bcAny.attacksThisTurn >= 1) {
    gs.log.push(`${attacker.card.name} has already attacked this turn.`);
    return gs;
  }
  if (doubleStrike && bcAny.attacksThisTurn >= 2) {
    gs.log.push(`${attacker.card.name} has already attacked twice this turn.`);
    return gs;
  }

  // Trigger ON_ATTACK effects BEFORE combat damage
  triggerOnAttackEffects(gs, atkPlayerIndex, attackerSlotIndex);

  // Record the pending combat
  gs.pendingCombat = {
    attackerPlayerIndex: atkPlayerIndex,
    attackerSlotIndex,
    targetPlayerIndex: defPlayerIndex,
    targetSlotIndex: target.slotIndex,
  };

  // Open a Fast-spell response window: defender gets priority first
  gs.priorityPassCount = 0;
  givePriorityTo(gs, defPlayerIndex);
  gs.log.push(
    `${attacker.card.name} attacks ${
      target.slotIndex === "PLAYER" ? defenderPlayer.name : "an enemy creature"
    }. Waiting for Fast spell responses...`
  );

  // DO NOT call resolvePendingCombat here. Combat will resolve only after:
  // - stack is empty, AND
  // - both players pass priority (handled in passPriority).
  return gs;
}

// ---------------------------------------------------------------------------
// Priority / stack helpers
// ---------------------------------------------------------------------------

function givePriorityTo(gs: GameState, playerIndex: number): void {
  // Just set who currently has priority; do NOT touch priorityPassCount here.
  gs.priorityPlayerIndex = playerIndex;
}

function getOpponentIndex(playerIndex: number): number {
  return playerIndex === 0 ? 1 : 0;
}

function resolveTopOfStack(gs: GameState): void {
  const item = gs.stack.pop();
  if (!item) return;

  // New: resolving something breaks the current "pass streak"
  gs.priorityPassCount = 0;

  const { type, sourceCardId, sourceCardName, sourcePlayerIndex, effects, target } = item;
  const player = gs.players[sourcePlayerIndex];

  if (type === "FAST_SPELL") {
    // Move spell from hand to graveyard if it’s still there
    const cardInHand = player.hand.find(c => c.id === sourceCardId);
    if (cardInHand) {
      player.hand = player.hand.filter(c => c.id !== sourceCardId);
      player.graveyard.push(cardInHand);
    }

    effects.forEach(effect => {
      effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, target);
    });

    markSpellCastAndTriggerCatalyst(gs, sourcePlayerIndex);
  } else if (type === "TRIGGER") {
    effects.forEach(effect => {
      effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, target);
    });
  }

  // After resolving, active player gets priority again
  givePriorityTo(gs, gs.activePlayerIndex);
}

export function passPriority(state: GameState): GameState {
  const gs = cloneState(state);
  const current = gs.priorityPlayerIndex;
  const opponent = getOpponentIndex(current);

  // One more pass in this response window
  gs.priorityPassCount += 1;

  // CASE 1: Stack has items, and both players have now passed → resolve top-of-stack
  if (gs.stack.length > 0 && gs.priorityPassCount >= 2) {
    resolveTopOfStack(gs);
    // resolveTopOfStack already reset priorityPassCount and gave priority to activePlayer
    return gs;
  }

  // CASE 2: Stack is empty, both players passed → either resolve combat or just close window
  if (gs.stack.length === 0 && gs.priorityPassCount >= 2) {
    if (gs.pendingCombat) {
      // Finish the combat that was waiting for a Fast-spell window
      resolvePendingCombat(gs);
    }
    // Close the window: reset pass count and return priority to active player
    gs.priorityPassCount = 0;
    givePriorityTo(gs, gs.activePlayerIndex);
    return gs;
  }

  // CASE 3: Only one pass so far → hand priority to the opponent
  givePriorityTo(gs, opponent);
  return gs;
}

// ---------------------------------------------------------------------------
// Spell timing rules: Fast vs Slow
// ---------------------------------------------------------------------------

function canCastSpellNow(
  gs: GameState,
  playerIndex: number,
  card: SpellCard
): { ok: boolean; reason?: string } {
  const isActivePlayer = playerIndex === gs.activePlayerIndex;

  // ✅ Tier gate (same idea as creatures)
  const spellTier = (card as any).tier ?? 1;
  const maxTier = getMaxTierForTurn(gs.turnNumber);
  if (spellTier > maxTier) {
    const earliestTurn = getEarliestTurnForTier(spellTier);
    return {
      ok: false,
      reason: `Cannot cast ${card.name}: Tier ${spellTier} is locked until turn ${earliestTurn}.`,
    };
  }

  if (card.kind === "SLOW_SPELL") {
    // Slow: only active player, only Main Phase, no stack
    if (!isActivePlayer) {
      return { ok: false, reason: "You can only cast Slow spells on your own turn." };
    }
    if (gs.phase !== "MAIN") {
      return { ok: false, reason: "Slow spells can only be cast during your Main Phase." };
    }
    return { ok: true };
  }

if (card.kind === "FAST_SPELL") {
  const isActivePlayer = playerIndex === gs.activePlayerIndex;

  // ✅ Allow Fast spells during your own Main Phase
  if (isActivePlayer && gs.phase === "MAIN") {
    return { ok: true };
  }

  // ✅ Otherwise require priority (responses, combat, stack)
  if (gs.priorityPlayerIndex !== playerIndex) {
    return {
      ok: false,
      reason: "You can only cast Fast spells when you have priority.",
    };
  }

  return { ok: true };
}

  return { ok: false, reason: "This card is not a spell." };
}

// ---------------------------------------------------------------------------
// Fast spell → stack helper
// ---------------------------------------------------------------------------

function pushFastSpellToStack(
  gs: GameState,
  playerIndex: number,
  card: SpellCard,
  target: SpellTarget | undefined
): void {
  const effects = cardRegistry.getEffects(card.name);

  const item: StackItem = {
    id: `${Date.now()}-${Math.random()}`,
    type: "FAST_SPELL",
    sourceCardId: card.id,
    sourceCardName: card.name,
    sourcePlayerIndex: playerIndex,
    effects,
    target,
  };

  gs.stack.push(item);
  gs.log.push(`${card.name} is placed on the stack.`);
}


// ---------------------------------------------------------------------------
// RELICS
// ---------------------------------------------------------------------------

export function playRelic(state: GameState, relicCardId: string, targetSlotIndex: number): GameState {
  const gs = cloneState(state);
  const playerIndex = gs.activePlayerIndex;
  const player = gs.players[playerIndex];

  // 🔒 Relic timing: Relics are Slow spells
  if (gs.phase !== "MAIN") {
    gs.log.push("You can only play Relics during your Main Phase.");
    return gs;
  }

  // (Optional stricter version if you want true sorcery speed)
  // if (gs.stack.length > 0) {
  //   gs.log.push("You can't play Relics while the stack is not empty.");
  //   return gs;
  // }

  const relicCard = player.hand.find(c => c.id === relicCardId);
  if (!relicCard || relicCard.kind !== "RELIC") return gs;

  // Must target one of your own creatures
  if (targetSlotIndex < 0 || targetSlotIndex > 2) {
    gs.log.push("Invalid relic target slot.");
    return gs;
  }

  const target = player.board[targetSlotIndex];
  if (!target) {
    gs.log.push("No creature in that slot to attach the relic.");
    return gs;
  }

  // NEW: enforce max 2 relics per creature
  const existingRelicCount = getRelicCountOnSlot(player, targetSlotIndex);
  if (existingRelicCount >= 2) {
    gs.log.push(`${target.card.name} already has 2 relics and cannot hold more.`);
    return gs;
  }

  // Apply relic bonuses to the creature (stats + keywords)
  applyRelicToCreature(target, relicCard as RelicCard);

  // Track the attachment
  player.relics.push({
    relic: relicCard as RelicCard,
    slotIndex: targetSlotIndex,
  });

  // Move relic from hand to "in play"
  player.hand = player.hand.filter(c => c.id !== relicCardId);

  gs.log.push(`${relicCard.name} attached to ${target.card.name}.`);

  // Relics count as spells cast for Catalyst
  markSpellCastAndTriggerCatalyst(gs, playerIndex);

  return gs;
}

// ---------------------------------------------------------------------------
// LOCATIONS
// ---------------------------------------------------------------------------

export function getLocationModifiers(gs: GameState, playerIndex: number): {
  healBoost: number;
  damageBoost: number;
  drawBoost: number;
} {
  const player = gs.players[playerIndex];
  const modifiers = {
    healBoost: 0,
    damageBoost: 0,
    drawBoost: 0,
  };
  
  if (!player.location) return modifiers;
  
  const text = player.location.text.toLowerCase();
  
  // Parse "all healing effects heal X extra"
  const healMatch = text.match(/all healing.*?(\d+)\s+extra/);
  if (healMatch) {
    modifiers.healBoost = parseInt(healMatch[1]);
  }
  
  // Parse "all damage effects deal X extra"
  const damageMatch = text.match(/all damage.*?(\d+)\s+extra/);
  if (damageMatch) {
    modifiers.damageBoost = parseInt(damageMatch[1]);
  }
  
  // Parse "all draw effects draw X extra"
  const drawMatch = text.match(/all draw.*?(\d+)\s+extra/);
  if (drawMatch) {
    modifiers.drawBoost = parseInt(drawMatch[1]);
  }
  
  return modifiers;
}

export function playLocation(state: GameState, handCardId: string): GameState {
  const gs = cloneState(state);
  const player = gs.players[gs.activePlayerIndex];
  const card = player.hand.find(c => c.id === handCardId);

  if (!card || card.kind !== "LOCATION") return gs;

  const location = card as LocationCard;
  const pAny = player as any;

  if (player.location) {
    gs.log.push(`${player.location.name} is replaced by ${location.name}.`);
    player.graveyard.push(player.location);
  }

  player.location = location;
  pAny.locationTurnsRemaining = 2;

  player.hand = player.hand.filter(c => c.id !== card.id);

  markSpellCastAndTriggerCatalyst(gs, gs.activePlayerIndex);

  return gs;
}

export function chooseDiscardFromHand(state: GameState, handCardId: string): GameState {
  const gs = cloneState(state);

  if (!gs.pendingDiscard) {
    return gs;
  }

  const { playerIndex, source } = gs.pendingDiscard;
  const player = gs.players[playerIndex];

  const cardIndex = player.hand.findIndex(c => c.id === handCardId);
  if (cardIndex === -1) {
    return gs;
  }

  const [discarded] = player.hand.splice(cardIndex, 1);
  player.graveyard.push(discarded);

  gs.log.push(`${source}: you discard ${discarded.name}.`);

  // Check if more Catalyst discards are pending
  const gsAny = gs as any;
  if (gsAny.pendingCatalystDiscards) {
    gsAny.pendingCatalystDiscards--;
    
    if (gsAny.pendingCatalystDiscards > 0 && player.hand.length > 0) {
      // Keep the discard prompt active for the next card
      return gs;
    } else {
      // All discards complete
      delete gsAny.pendingCatalystDiscards;
      gs.pendingDiscard = null;
    }
  } else {
    gs.pendingDiscard = null;
  }

  return gs;
}

// ---------------------------------------------------------------------------
// EVOLUTIONS
// ---------------------------------------------------------------------------

function canPlayEvolution(gs: GameState, evo: EvolutionCard, slotIndex: number): boolean {
  const player = gs.players[gs.activePlayerIndex];
  const bc = player.board[slotIndex];

  // Must have a creature to evolve
  if (!bc) return false;

  // 1) Must evolve from correct base
  if (evo.baseName && bc.card.name !== evo.baseName) return false;

  // 2) Tier requirement (your game uses tiers only)
  // requiredTier refers to minimum tier of the BASE creature being evolved
  const baseTier = (bc.card as any).tier ?? 1;
  if (typeof evo.requiredTier === "number" && baseTier < evo.requiredTier) return false;

  // 3) Evolution conditions (NEW)
  if (!areEvolutionConditionsMet(gs, gs.activePlayerIndex, slotIndex, (evo as any).conditions)) {
    return false;
  }

  // 4) Optional legacy text parsing fallback
  // Keep this ONLY if you still have old evolutions that rely on text-based rules.
  // If not needed, delete this block.
  const text = (evo.text || "").toLowerCase();

  if (text.includes("has taken damage")) {
    const maxHp = (bc.card as any).hp || 0;
    const damageTaken = maxHp - bc.currentHp;
    if (damageTaken <= 0) return false;
  }

  if (text.includes("has full hp")) {
    const maxHp = (bc.card as any).hp || 0;
    if (bc.currentHp !== maxHp) return false;
  }

  return true;
}


export function playDropInEvolution(
  state: GameState,
  evoCardId: string,
  slotIndex: number,
  _overwriteExisting: boolean = false // kept for API compatibility, but not used
): GameState {
  const gs = cloneState(state);
  const player = gs.players[gs.activePlayerIndex];

  // Find the evolution card in the evolution deck
  const evo = player.evolutionDeck.find(e => e.id === evoCardId);
  if (!evo) return gs;

  // You must have a creature in this slot to evolve
  const existing = player.board[slotIndex];
  if (!existing) {
    gs.log.push(`Cannot play ${evo.name}: there is no creature in slot ${slotIndex + 1} to evolve.`);
    return gs;
  }

  // Check if existing creature is Stunned
if ((existing as any).stunnedForTurns > 0) {
  gs.log.push(`${existing.card.name} is Stunned and cannot be evolved.`);
  return gs;
}

  // Check if evolution conditions are met
  if (!canPlayEvolution(gs, evo, slotIndex)) {
    gs.log.push(`Cannot play ${evo.name}: evolution conditions not met.`);
    return gs;
  }

  // TRANSFORM LOGIC
  const oldName = existing.card.name;
  const prevCurrentHp = existing.currentHp;
  const prevMaxHp = (existing.card as any).hp || prevCurrentHp;
  const hadSummoningSickness = existing.hasSummoningSickness;

  // Replace the card with the evolution card
  existing.card = evo;

  // Ensure runtime fields exist (temp buffs, shields, etc.)
  ensureRuntimeFields(existing);

  // SPECIAL HP RULINGS:
  // 1) Damage remains (we keep prevCurrentHp).
  // 2) If current HP exceeds the Evolution's printed max HP, 
  //    its current HP becomes the new max HP.
  const evoPrintedMax = (evo as any).hp || prevCurrentHp;

  if (prevCurrentHp > evoPrintedMax) {
    // Current HP becomes the new max HP for this evolved form
    (existing.card as any).hp = prevCurrentHp;
    existing.currentHp = prevCurrentHp;
  } else {
    // Otherwise, keep damage as-is but don't exceed printed max HP
    existing.currentHp = Math.min(prevCurrentHp, evoPrintedMax);
  }

  // IMPORTANT: Do NOT give it summoning sickness.
  // We keep whatever it had before.
  existing.hasSummoningSickness = hadSummoningSickness;

  // Relics stay attached to this slot; we do NOT remove or move them.
  // player.relics already points at slotIndex, so nothing to change.

  // Remove the evolution card from the evolution deck
  player.evolutionDeck = player.evolutionDeck.filter(e => e.id !== evo.id);

  gs.log.push(
    `${player.name} evolves ${oldName} into ${evo.name}.`
  );

  return gs;
}

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
import { runebladeEvolutions,runebladeMainDeck } from "./cards";
import { cardRegistry } from "./cardRegistry";
import { effectExecutor } from "./effectExecutor";

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
export function isValidTarget(
  state: GameState,
  rule: TargetingRule,
  targetPlayerIndex: number,
  targetSlotIndex?: number
): boolean {
  const activePlayerIndex = state.activePlayerIndex;
  const enemyIndex = activePlayerIndex === 0 ? 1 : 0;

  switch (rule.type) {
    case "ENEMY_CREATURES":
      return targetPlayerIndex === enemyIndex && 
             targetSlotIndex !== undefined && 
             state.players[targetPlayerIndex].board[targetSlotIndex] !== null;
    
    case "FRIENDLY_CREATURES":
      return targetPlayerIndex === activePlayerIndex && 
             targetSlotIndex !== undefined && 
             state.players[targetPlayerIndex].board[targetSlotIndex] !== null;
    
    case "ALL_CREATURES":
      return targetSlotIndex !== undefined && 
             state.players[targetPlayerIndex].board[targetSlotIndex] !== null;
    
    case "ENEMY_PLAYER":
      return targetPlayerIndex === enemyIndex && targetSlotIndex === undefined;
    
    case "ANY_PLAYER":
      return targetSlotIndex === undefined;
    
    case "SACRIFICE":
      // For sacrifice targeting, we check if the creature exists
      return targetPlayerIndex === activePlayerIndex && 
             targetSlotIndex !== undefined && 
             state.players[targetPlayerIndex].board[targetSlotIndex] !== null;
    
    default:
      return false;
  }
}

// Get all valid target slots for a given rule
export function getValidTargets(
  state: GameState,
  rule: TargetingRule
): Array<{ playerIndex: number; slotIndex: number }> {
  const validTargets: Array<{ playerIndex: number; slotIndex: number }> = [];
  
  if (rule.type === "ENEMY_PLAYER" || rule.type === "ANY_PLAYER") {
    // Player targeting doesn't return slot-based targets
    return [];
  }

  const activePlayerIndex = state.activePlayerIndex;
  const enemyIndex = activePlayerIndex === 0 ? 1 : 0;

  const checkPlayer = (pIdx: number) => {
    state.players[pIdx].board.forEach((bc, slotIdx) => {
      if (!bc) return;
      
      // Check if basic targeting rules allow this target
      if (!isValidTarget(state, rule, pIdx, slotIdx)) return;
      
      // Filter out enemy creatures with Spell Shield (for enemy spells only)
      const isEnemyCreature = pIdx !== activePlayerIndex;
      const hasSpellShield = hasKeyword(bc.card, "SPELL_SHIELD");
      
      if (isEnemyCreature && hasSpellShield) {
        return; // Skip this creature - it has Spell Shield
      }
      
      validTargets.push({ playerIndex: pIdx, slotIndex: slotIdx });
    });
  };

  switch (rule.type) {
    case "ENEMY_CREATURES":
      checkPlayer(enemyIndex);
      break;
    case "FRIENDLY_CREATURES":
    case "SACRIFICE":
      checkPlayer(activePlayerIndex);
      break;
    case "ALL_CREATURES":
      checkPlayer(0);
      checkPlayer(1);
      break;
  }

  return validTargets;
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
  if (c.preventedDamage === undefined) c.preventedDamage = 0;
if (c.stunnedForTurns === undefined) c.stunnedForTurns = 0;
  if (c.attacksThisTurn === undefined) c.attacksThisTurn = 0;
  if (c.spellShield === undefined) c.spellShield = hasSpellShield(creature.card.name);
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

  return baseAtk + tempBuff + awakenBonus;
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
  const p1 = createInitialPlayer("Player 1", runebladeMainDeck, runebladeEvolutions);
  const p2 = createInitialPlayer("Player 2", runebladeMainDeck, runebladeEvolutions);

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
// HP Sacrifice Summoning
// ---------------------------------------------------------------------------

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

export function resolveSpellTargeting(
  state: GameState,
  spellCardId?: string,
  target?: SpellTarget
): GameState {
  const gs = cloneState(state);

  // -------------------------------------------------------------------------
  // STEP 1: Start casting (no target chosen yet)
  // -------------------------------------------------------------------------
  if (spellCardId && !target) {
    const playerIndex = gs.activePlayerIndex;
    const player = gs.players[playerIndex];
    const card = player.hand.find(c => c.id === spellCardId);

    if (!card || (card.kind !== "FAST_SPELL" && card.kind !== "SLOW_SPELL")) {
      return gs;
    }

    const spellCard = card as SpellCard;

    // Timing check (Fast vs Slow, priority, phase)
    const timing = canCastSpellNow(gs, playerIndex, spellCard);
    if (!timing.ok) {
      gs.log.push(timing.reason || "You cannot cast this spell now.");
      return gs;
    }

    const effects = cardRegistry.getEffects(card.name);

    // Does any effect actually need a chosen target?
    const needsTarget = effects.some(e => {
      const autoResolveScripts = ["SELF_DAMAGE", "RESURRECT_TO_FIELD", "EXCLUDE_SELF"];
      if (e.customScript && autoResolveScripts.includes(e.customScript)) {
        return false;
      }
      return e.targetType === "TARGET_CREATURE" || e.targetType === "TARGET_PLAYER";
    });

    // -------------------- NO TARGET NEEDED --------------------
    if (!needsTarget) {
      if (spellCard.kind === "FAST_SPELL") {
        // Fast spell: go straight onto the stack with no explicit target
        pushFastSpellToStack(gs, playerIndex, spellCard, undefined);
        gs.log.push(`${card.name} is cast as a Fast spell.`);
        // Card stays in hand until the stack item resolves (or you can move
        // it to graveyard at resolution time inside resolveTopOfStack).
      } else {
        // Slow spell: resolve immediately, no stack
        effects.forEach(effect => {
          effectExecutor.executeEffect(gs, effect, playerIndex, undefined);
        });

        // Move spell from hand to graveyard
        player.hand = player.hand.filter(c => c.id !== spellCardId);
        player.graveyard.push(card);
        markSpellCastAndTriggerCatalyst(gs, playerIndex);
        gs.log.push(`${card.name} resolves.`);
      }

      return gs;
    }

    // -------------------- TARGET NEEDED: set up pendingTarget --------------------
    let rule: TargetingRule;
    const firstTargetingEffect = effects.find(
      e => e.targetType === "TARGET_CREATURE" || e.targetType === "TARGET_PLAYER"
    );

    if (firstTargetingEffect?.targetType === "TARGET_CREATURE") {
      if (firstTargetingEffect.customScript === "ENEMY_ONLY") {
        rule = { type: "ENEMY_CREATURES" };
      } else if (firstTargetingEffect.customScript === "FRIENDLY_ONLY") {
        rule = { type: "FRIENDLY_CREATURES" };
      } else {
        rule = { type: "ALL_CREATURES" };
      }
    } else if (firstTargetingEffect?.targetType === "TARGET_PLAYER") {
      if (firstTargetingEffect.customScript === "ENEMY_ONLY") {
        rule = { type: "ENEMY_PLAYER" };
      } else {
        rule = { type: "ANY_PLAYER" };
      }
    } else {
      rule = { type: "ALL_CREATURES" };
    }

    gs.pendingTarget = {
      source: card.name,
      rule,
      sourcePlayerIndex: playerIndex,
      sourceCardId: spellCardId,
      sourceType: "SPELL",
    };

    gs.log.push(`${card.name} needs a target. Click a valid target.`);
    return gs;
  }

  // -------------------------------------------------------------------------
  // STEP 2: Finish casting (target chosen)
  // -------------------------------------------------------------------------
  if (!gs.pendingTarget || gs.pendingTarget.sourceType !== "SPELL" || !target) {
    return gs;
  }

  const { sourcePlayerIndex, sourceCardId, source } = gs.pendingTarget;

  if (!sourceCardId) {
    gs.pendingTarget = undefined;
    return gs;
  }

  const caster = gs.players[sourcePlayerIndex];
  const spellInHand = caster.hand.find(c => c.id === sourceCardId);

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

  const effects = cardRegistry.getEffects(source);

  // -------------------- FAST SPELL: put on stack with target --------------------
  if (spellCard.kind === "FAST_SPELL") {
    pushFastSpellToStack(gs, sourcePlayerIndex, spellCard, target);
    gs.log.push(`${spellCard.name} is cast as a Fast spell targeting something.`);
    // Card stays in hand until the stack item actually resolves (inside resolveTopOfStack).
  } else {
    // -------------------- SLOW SPELL: resolve immediately --------------------
    effects.forEach(effect => {
      if (effect.targetType === "TARGET_PLAYER") {
        // Default: enemy player
        const enemyPlayerIndex = 1 - sourcePlayerIndex;
        const enemyTarget: SpellTarget = { type: "PLAYER", playerIndex: enemyPlayerIndex };
        effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, enemyTarget);
      } else if (effect.targetType === "SELF_PLAYER") {
        effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, undefined);
      } else {
        // TARGET_CREATURE or NONE or ALL_* etc.
        effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, target);
      }
    });

    // Zone change + Catalyst
    caster.hand = caster.hand.filter(c => c.id !== sourceCardId);
    caster.graveyard.push(spellInHand);
    markSpellCastAndTriggerCatalyst(gs, sourcePlayerIndex);
    gs.log.push(`${spellCard.name} resolves.`);
  }

  // Clear pending target after resolution / stack placement
  gs.pendingTarget = undefined;

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
  
  // Check if any effects need targeting based on targetType
  const targetingEffect = onPlayEffects.find(e => 
    e.targetType === "TARGET_CREATURE" || e.targetType === "TARGET_PLAYER"
  );
  
  if (targetingEffect) {
    // Determine targeting rule from effect
    let rule: TargetingRule;
    
    if (targetingEffect.targetType === "TARGET_CREATURE") {
      if (targetingEffect.customScript === "ENEMY_ONLY") {
        rule = { type: "ENEMY_CREATURES" };
      } else if (targetingEffect.customScript === "FRIENDLY_ONLY") {
        rule = { type: "FRIENDLY_CREATURES" };
      } else {
        rule = { type: "ALL_CREATURES" };
      }
    } else if (targetingEffect.targetType === "TARGET_PLAYER") {
      if (targetingEffect.customScript === "ENEMY_ONLY") {
        rule = { type: "ENEMY_PLAYER" };
      } else {
        rule = { type: "ANY_PLAYER" };
      }
    } else {
      rule = { type: "ENEMY_CREATURES" };
    }
    
    gs.pendingTarget = {
      source: bc.card.name,
      rule,
      sourcePlayerIndex: playerIndex,
      sourceSlotIndex: slotIndex,
      sourceType: "ON_PLAY",
    };
    gs.log.push(`${bc.card.name} needs a target. Click a valid target.`);
  } else {
    // Execute non-targeting effects immediately
    onPlayEffects.forEach(effect => {
      effectExecutor.executeEffect(gs, effect, playerIndex, undefined);
    });
  }
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

export function resolveOnPlayTargeting(
  state: GameState,
  targetPlayerIndex: number,
  targetSlotIndex: number
): GameState {
  const gs = cloneState(state);
  
  if (!gs.pendingTarget) return gs;
  
  const { sourcePlayerIndex, sourceSlotIndex, source } = gs.pendingTarget;
  const player = gs.players[sourcePlayerIndex];
  const bc = player.board[sourceSlotIndex];
  
  if (!bc) {
    gs.pendingTarget = undefined;
    return gs;
  }
  
  const effects = cardRegistry.getEffects(source);
  const onPlayEffects = effects.filter(e => e.timing === "ON_PLAY");

  
  const target: SpellTarget = {
    type: "CREATURE",
    playerIndex: targetPlayerIndex,
    slotIndex: targetSlotIndex
  };
  
  onPlayEffects.forEach(effect => {
    effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, target);
  });
  
  gs.pendingTarget = undefined;
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

  const attackerFirst = hasFirstStrike(attackerName);
  const attackerHasPiercing = hasPiercing(attackerName);

  const attackerHitsFirst = attackerFirst;

  function dealCombatDamageToDefender(amount: number) {
    const defenderHpBefore = defender.currentHp;

    applyCreatureDamage(gs, defPlayerIndex, defSlot, amount, false);

    if (amount > 0) {
      bcAny.dealtDamageThisTurn = true;
    }

    // Thorns, Piercing, ATK_BUFF_ON_KILL unchanged...
    const defenderStillAlive = defenderPlayer.board[defSlot] !== null;
    if (defenderStillAlive && amount > 0) {
      const thornsValue = getKeywordValue(defender.card, "THORNS");
      if (thornsValue > 0) {
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
    // Fast: can be cast whenever this player has priority
    if (gs.priorityPlayerIndex !== playerIndex) {
      return {
        ok: false,
        reason: "You can only cast Fast spells when you have priority.",
      };
    }
    // Fast spells are allowed in any phase as long as you have priority.
    // (If you want to restrict to Battle + Main later, we can refine here.)
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

function canPlayEvolution(
  gs: GameState,
  evo: EvolutionCard,
  slotIndex: number
): boolean {
  const player = gs.players[gs.activePlayerIndex];
  const enemy = gs.players[1 - gs.activePlayerIndex];
  const bc = player.board[slotIndex];

  // NEW: You must have a creature in this slot to evolve
  if (!bc) return false;

  const text = evo.text.toLowerCase();

  // Check "evolve from X" requirement (text-based)
  if (text.includes("evolve from")) {
    const creatureName = bc.card.name;
    if (!text.includes(creatureName.toLowerCase())) {
      return false;
    }
  }

  // Check "has taken damage" requirement
  if (text.includes("has taken damage")) {
    const maxHp = (bc.card as any).hp || 0;
    const damageTaken = maxHp - bc.currentHp;
    if (damageTaken <= 0) return false;
  }

  // Check "has full hp" requirement
  if (text.includes("has full hp")) {
    const maxHp = (bc.card as any).hp || 0;
    if (bc.currentHp !== maxHp) return false;
  }

  // Check "cast X or more spells this turn"
  const spellsMatch = text.match(/cast[ed]?\s+(\d+)\s+or more spells/);
  if (spellsMatch) {
    const required = parseInt(spellsMatch[1]);
    const spellsCast = player.spellsCastThisTurn || 0;
    if (spellsCast < required) return false;
  }

  // Check "dealt damage this turn"
  if (text.includes("dealt damage this turn")) {
    if (!(bc as any).dealtDamageThisTurn) return false;
  }

  // Check "killed a creature this turn"
  if (text.includes("killed a creature this turn")) {
    if (!(bc as any).killedCreatureThisTurn) return false;
  }

  // Check "X or more creatures in graveyard"
  const graveyardMatch = text.match(/(\d+)\s+or more creatures in (?:your )?graveyard/);
  if (graveyardMatch) {
    const required = parseInt(graveyardMatch[1]);
    const creaturesInGraveyard = player.graveyard.filter(
      c => c.kind === "CREATURE" || c.kind === "EVOLUTION"
    ).length;
    if (creaturesInGraveyard < required) return false;
  }

  // Check "if your life is lower than your opponent's"
  if (text.includes("if your life is lower than your opponent's")) {
    if (player.life >= enemy.life) return false;
  }

  // Check "if you healed this turn"
  if (text.includes("if you healed this turn")) {
    if (!(player as any).healedThisTurn) return false;
  }

  // Check "if you control 3 creatures"
  if (text.includes("if you control 3 creatures")) {
    const occupied = player.board.filter(c => c !== null).length;
    if (occupied < 3) return false;
  }

  // Check "if your life is X or less"
  const lifeThresholdMatch = text.match(/if your life is (\d+) or less/);
  if (lifeThresholdMatch) {
    const threshold = parseInt(lifeThresholdMatch[1]);
    if (player.life > threshold) return false;
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

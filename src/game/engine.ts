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
} from "./types";
import { waterMainDeck, waterEvolutions, fireMainDeck, fireEvolutions } from "./cards";
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

function baseArmor(cardName: string): number {
  return getKeywordValue(cardName, "ARMOR");
}

function baseRegen(cardName: string): number {
  return getKeywordValue(cardName, "REGEN");
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

function applyRelicToCreature(bc: BoardCreature, relic: RelicCard) {
  
  const text = relic.text;
  const card = bc.card as any;
  
  // Ensure card has keywords array
  if (!card.keywords) card.keywords = [];
  
  // Track what this relic added (for removal later)
  if (!card.relicAddedKeywords) card.relicAddedKeywords = [];
  if (!card.relicAddedStats) card.relicAddedStats = { atk: 0, hp: 0 };
  
  // Parse stat bonuses: "+X ATK" or "+X HP"
  if (text.startsWith('+')) {
    const atkMatch = text.match(/\+(\d+)\s*ATK/i);
    const hpMatch = text.match(/\+(\d+)\s*HP/i);
    
    if (atkMatch) {
      const bonus = parseInt(atkMatch[1]);
      card.atk = (card.atk || 0) + bonus;
      card.relicAddedStats.atk += bonus;
    }
    if (hpMatch) {
      const bonus = parseInt(hpMatch[1]);
      card.hp = (card.hp || 0) + bonus;
      bc.currentHp += bonus;
      card.relicAddedStats.hp += bonus;
    }
  }
  
  // Parse granted keywords: "Grant X"
  if (text.startsWith('Grant')) {
    const grantMatch = text.match(/Grant\s+(.+?)(?:\.|$)/i);
    
    if (grantMatch) {
      const grantedEffect = grantMatch[1].trim();
      
      // Keyword with value (e.g., "Armor 2", "Regen 1")
      const keywordWithValueMatch = grantedEffect.match(/^(\w+(?:\s+\w+)?)\s+(\d+)$/);
      // Keyword without value (e.g., "Double Strike", "Guard")
      const keywordOnlyMatch = grantedEffect.match(/^(\w+(?:\s+\w+)?)$/);
      
      if (keywordWithValueMatch) {
        const keyword = keywordWithValueMatch[1].toUpperCase().replace(/\s+/g, '_');
        const value = parseInt(keywordWithValueMatch[2]);
                
        const keywordObj: any = { keyword };
        if (keyword === "ARMOR") keywordObj.armor = value;
        else if (keyword === "REGEN") keywordObj.regen = value;
        else if (keyword === "SURGE") keywordObj.surge = value;
        
        card.keywords.push(keywordObj);
        card.relicAddedKeywords.push(keywordObj);
      } else if (keywordOnlyMatch) {
        const keyword = keywordOnlyMatch[1].toUpperCase().replace(/\s+/g, '_');
        
        const keywordObj = { keyword };
        card.keywords.push(keywordObj);
        card.relicAddedKeywords.push(keywordObj);
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
      if (isValidTarget(state, rule, pIdx, slotIdx)) {
        validTargets.push({ playerIndex: pIdx, slotIndex: slotIdx });
      }
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

// ---------------------------------------------------------------------------
// Runtime per-creature flags (stored directly on BoardCreature as extra props)
// ---------------------------------------------------------------------------

function ensureRuntimeFields(creature: BoardCreature) {
  const c = creature as any;
  if (c.tempAtkBuff === undefined) c.tempAtkBuff = 0;
  if (c.preventedDamage === undefined) c.preventedDamage = 0;
  if (c.frozenForTurns === undefined) c.frozenForTurns = 0;
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
  const p1 = createInitialPlayer("Water", waterMainDeck, waterEvolutions);
  const p2 = createInitialPlayer("Fire", fireMainDeck, fireEvolutions);

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

  // Reset summoning sickness, attacks, apply Regen and Surge, decrement freeze and locations
  current.board.forEach((bc, idx) => {
    if (!bc) return;
    ensureRuntimeFields(bc);
    bc.hasSummoningSickness = false;
    (bc as any).attacksThisTurn = 0;

const regen = getRegen(gs, gs.activePlayerIndex, idx);

if (regen > 0) {
bc.currentHp = Math.min(
  bc.currentHp + regen,
  (bc.card as any).hp
);
  gs.log.push(`${bc.card.name} regenerates ${regen} HP.`);
}

    // Surge - apply temporary ATK buff
    const surgeValue = getKeywordValue(bc.card.name, "SURGE");
    if (surgeValue > 0) {
      (bc as any).tempAtkBuff = ((bc as any).tempAtkBuff || 0) + surgeValue;
      gs.log.push(`${bc.card.name} gains Surge +${surgeValue} ATK this turn.`);
    }

    // Frozen turns
    if ((bc as any).frozenForTurns > 0) {
      (bc as any).frozenForTurns -= 1;
    }
  });

  // Decrement location durations
  const currAny = current as any;
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

  // Reset Molten Trail per-creature usage
  if (!currAny.moltenTrailUsed) {
    currAny.moltenTrailUsed = [false, false, false];
  } else {
    currAny.moltenTrailUsed = [false, false, false];
  }
}

export function endPhase(state: GameState): GameState {
  const gs = cloneState(state);
  const p = gs.phase;

  if (p === "DRAW") {
    gs.phase = "MAIN";
  } else if (p === "MAIN") {
    gs.phase = "ATTACK";
  } else if (p === "ATTACK") {
    gs.phase = "END";
  } else if (p === "END") {
  const current = gs.players[gs.activePlayerIndex];
  
  // Clear all temporary "until end of turn" buffs
  current.board.forEach((bc) => {
    if (!bc) return;
    ensureRuntimeFields(bc);
    
    // Reset all temporary ATK buffs (from spells, surge, etc.)
    (bc as any).tempAtkBuff = 0;
    
    // Clear any other temporary buffs here as needed
    // preventedDamage stays (it's consumed, not time-based)
    // frozenForTurns decrements at start of turn, not end
  });

  // Turn passes to other player
  gs.turnNumber += 1;
  gs.activePlayerIndex = gs.activePlayerIndex === 0 ? 1 : 0;

  // Start of turn: draw + upkeep (this will re-apply Surge for the new turn)
  startTurn(gs);

  // Immediately move to MAIN
  gs.phase = "MAIN";
}

  return gs;
}

// ---------------------------------------------------------------------------
// Summon HP cost logic (per-card, by name)
// ---------------------------------------------------------------------------

export function getSummonHpCostForCard(card: CreatureCard): number {
  if (card.rank === 1) return 0;

  // Baseline: Rank 2 = 2 HP, Rank 3 = 4 HP
  let base = card.rank === 2 ? 2 : 4;

  // Bump costs for especially strong Rank 3s
  switch (card.name) {
    // WATER bombs
    case "Stormcall Leviathan":
    case "Tidal Goliath":
    case "Abyssal Charger":
      return 5;

    // FIRE bombs
    case "Blazewreak Titan":
    case "Hellfire Charger":
    case "Volcanic Enforcer":
      return 5;

    default:
      return base;
  }
}

// ---------------------------------------------------------------------------
// HP Sacrifice Summoning
// ---------------------------------------------------------------------------

function totalSacHp(player: PlayerState): number {
  return player.board.reduce((sum, bc) => (bc ? sum + bc.currentHp : sum), 0);
}

function canSummonCreature(card: CreatureCard, player: PlayerState): boolean {
  if (card.rank === 1) return true;
  const cost = getSummonHpCostForCard(card);
  return totalSacHp(player) >= cost;
}

function performSummonWithSacrifice(
  gs: GameState,
  playerIndex: number,
  creature: CreatureCard,
  slotIndex: number
): string {
  const player = gs.players[playerIndex];
  const cost = getSummonHpCostForCard(creature);
  let remaining = cost;

  // Build candidate list
  const candidates = player.board
    .map((bc, idx) => ({ bc, idx }))
    .filter((x) => x.bc)
    .sort((a, b) => {
      const aIsTarget = a.idx === slotIndex ? -1 : 0;
      const bIsTarget = b.idx === slotIndex ? -1 : 0;
      if (aIsTarget !== bIsTarget) {
        return aIsTarget - bIsTarget;
      }
      return a.bc!.currentHp - b.bc!.currentHp;
    });

  const sacrificedNames: string[] = [];

for (const { bc, idx } of candidates) {
  if (!bc || remaining <= 0) break;
  remaining -= bc.currentHp;
  sacrificedNames.push(bc.card.name);
  
  // Trigger death effects
  triggerDeathEffects(gs, playerIndex, idx);
  
  // Send relics to graveyard
  const attachedRelics = player.relics.filter(r => r.slotIndex === idx);
  attachedRelics.forEach(relicData => {
    player.graveyard.push(relicData.relic);
  });
  player.relics = player.relics.filter(r => r.slotIndex !== idx);
  
  player.graveyard.push(bc.card);
  player.board[idx] = null;
}

  if (remaining > 0) {
    return `Not enough HP to summon ${creature.name}.`;
  }

  // Now place the new creature
  const bc: BoardCreature = {
    card: creature,
    currentHp: creature.hp,
    hasSummoningSickness: true,
  };
  ensureRuntimeFields(bc);

  // Apply on-summon effects
  applySpellShield(bc);

  player.hand = player.hand.filter((c) => c.id !== creature.id);
  player.board[slotIndex] = bc;

  // Trigger ON_PLAY effects
  triggerOnPlayEffects(gs, playerIndex, slotIndex);

  return `Sacrificed [${sacrificedNames.join(", ")}] to summon ${creature.name}.`;
}

export function playCreature(
  state: GameState,
  handCardId: string,
  slotIndex: number
): GameState {
  const gs = cloneState(state);
  const playerIndex = gs.activePlayerIndex;
  const player = gs.players[playerIndex];

  if (slotIndex < 0 || slotIndex > 2) return gs;

  const card = player.hand.find((c) => c.id === handCardId);
  if (!card || card.kind !== "CREATURE") return gs;

  const creature = card as CreatureCard;

  if (creature.rank === 1 && player.board[slotIndex]) {
    gs.log.push(`Slot ${slotIndex + 1} is not empty.`);
    return gs;
  }

  if (!canSummonCreature(creature, player)) {
    gs.log.push(`Cannot summon ${creature.name}: not enough HP to sacrifice.`);
    return gs;
  }

  if (creature.rank === 1) {
    const bc: BoardCreature = {
      card: creature,
      currentHp: creature.hp,
      hasSummoningSickness: true,
    };
    ensureRuntimeFields(bc);

    player.hand = player.hand.filter((c) => c.id !== card.id);
    player.board[slotIndex] = bc;
    gs.log.push(`Summoned ${creature.name}.`);

    // Apply on-summon effects
    applySurge(gs, bc);
    applySpellShield(bc);
    
    // Trigger ON_PLAY effects
    triggerOnPlayEffects(gs, playerIndex, slotIndex);
  } else {
    const msg = performSummonWithSacrifice(gs, playerIndex, creature, slotIndex);
    gs.log.push(msg);
  }

  return gs;
}

export function summonWithChosenSacrifices(
  state: GameState,
  handCardId: string,
  targetSlot: number,
  sacrificeSlots: number[]
): GameState {
  const gs = cloneState(state);
  const playerIndex = gs.activePlayerIndex;
  const player = gs.players[playerIndex];

  if (targetSlot < 0 || targetSlot > 2) return gs;

  const card = player.hand.find((c) => c.id === handCardId);
  if (!card || card.kind !== "CREATURE") {
    gs.log.push("Summon failed: card is not a creature in hand.");
    return gs;
  }

  const creature = card as CreatureCard;
  if (creature.rank === 1) {
    gs.log.push("Summon failed: Rank 1 does not use manual sacrifices.");
    return gs;
  }

  const cost = getSummonHpCostForCard(creature);

  const uniqueSlots = Array.from(new Set(sacrificeSlots)).filter(
    (idx) => idx >= 0 && idx <= 2
  );
  
  if (uniqueSlots.length === 0) {
    gs.log.push("Summon failed: no sacrifice slots chosen.");
    return gs;
  }

  if (player.board[targetSlot] && !uniqueSlots.includes(targetSlot)) {
    gs.log.push(
      "Summon failed: to summon into an occupied slot, you must choose that creature as a sacrifice."
    );
    return gs;
  }

  let totalHp = 0;
  for (const idx of uniqueSlots) {
    const bc = player.board[idx];
    if (!bc) {
      gs.log.push("Summon failed: one of the chosen sacrifice slots is empty.");
      return gs;
    }
    totalHp += bc.currentHp;
  }

  if (totalHp < cost) {
    gs.log.push(
      `Summon failed: chosen sacrifices only provide ${totalHp} HP, but ${cost} HP is required.`
    );
    return gs;
  }

  // Perform sacrifices
const sacrificedNames: string[] = [];
for (const idx of uniqueSlots) {
  const bc = player.board[idx];
  if (!bc) continue;
  sacrificedNames.push(bc.card.name);
  
  // Trigger death effects
  triggerDeathEffects(gs, playerIndex, idx);
  
  // Send relics to graveyard
  const attachedRelics = player.relics.filter(r => r.slotIndex === idx);
  attachedRelics.forEach(relicData => {
    player.graveyard.push(relicData.relic);
  });
  player.relics = player.relics.filter(r => r.slotIndex !== idx);
  
  player.graveyard.push(bc.card);
  player.board[idx] = null;
}

  // Place new creature
  const bc: BoardCreature = {
    card: creature,
    currentHp: creature.hp,
    hasSummoningSickness: true,
  };
  ensureRuntimeFields(bc);

  applySurge(gs, bc);
  applySpellShield(bc);

  player.hand = player.hand.filter((c) => c.id !== creature.id);
  player.board[targetSlot] = bc;

  gs.log.push(
    `Sacrificed [${sacrificedNames.join(", ")}] to summon ${creature.name}.`
  );

  // Trigger ON_PLAY effects
  triggerOnPlayEffects(gs, playerIndex, targetSlot);

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

    console.log("=== resolveSpellTargeting called ===");
  console.log("spellCardId:", spellCardId);
  console.log("target:", target);
  console.log("pendingTarget:", state.pendingTarget);
    console.trace("Call stack:"); // ADD THIS LINE

  const gs = cloneState(state);
  
  // If we're setting up targeting (no target provided yet)
  if (spellCardId && !target) {
    const player = gs.players[gs.activePlayerIndex];
    const card = player.hand.find(c => c.id === spellCardId);
    
    if (!card || (card.kind !== "FAST_SPELL" && card.kind !== "SLOW_SPELL")) {
      return gs;
    }
    
    // Get effects from card registry
    const effects = cardRegistry.getEffects(card.name);
    
    // Determine if targeting is needed based on effect targetType
const needsTarget = effects.some(e => {
  // Auto-resolution scripts that don't need targeting
  const autoResolveScripts = ["SELF_DAMAGE", "RESURRECT_TO_FIELD", "EXCLUDE_SELF"];
  
  // If it has an auto-resolve custom script, no targeting needed
  if (e.customScript && autoResolveScripts.includes(e.customScript)) {
    return false;
  }
  
  // Otherwise check if it needs user targeting
  return e.targetType === "TARGET_CREATURE" || e.targetType === "TARGET_PLAYER";
});
    
if (!needsTarget) {
  console.log("Executing spell immediately (no targeting needed)");
  
  // Check if this card is already in graveyard (prevent double execution)
  const alreadyInGraveyard = player.graveyard.some(c => c.id === spellCardId);
  if (alreadyInGraveyard) {
    console.log("Card already in graveyard, skipping duplicate execution");
    return gs;
  }
  
  // Check if this card is still in hand (prevent double execution)
  const cardStillInHand = player.hand.find(c => c.id === spellCardId);
  if (!cardStillInHand) {
    console.log("Card not in hand, skipping");
    return gs;
  }
  
  // No targeting needed, cast immediately
  effects.forEach(effect => {
    console.log("Executing effect:", effect);
    effectExecutor.executeEffect(gs, effect, gs.activePlayerIndex, undefined);
  });
  
  // Remove from hand and add to graveyard
  player.hand = player.hand.filter(c => c.id !== spellCardId);
  player.graveyard.push(cardStillInHand);
  markSpellCastAndTriggerCatalyst(gs, gs.activePlayerIndex);
  
  return gs;
}
    
    // Determine targeting rule from effects
    let rule: TargetingRule;
    
    const firstTargetingEffect = effects.find(e => 
      e.targetType === "TARGET_CREATURE" || e.targetType === "TARGET_PLAYER"
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
      sourcePlayerIndex: gs.activePlayerIndex,
      sourceCardId: spellCardId,
      sourceType: "SPELL",
    };
    
    gs.log.push(`${card.name} needs a target. Click a valid target.`);
    return gs;
  }
  
  // If we're resolving targeting (target provided)
  if (!gs.pendingTarget || gs.pendingTarget.sourceType !== "SPELL" || !target) {
    return gs;
  }
  
  const { sourcePlayerIndex, sourceCardId, source } = gs.pendingTarget;
  
  if (!sourceCardId) {
    gs.pendingTarget = undefined;
    return gs;
  }
  
  const player = gs.players[sourcePlayerIndex];
  const card = player.hand.find(c => c.id === sourceCardId);
  
  if (!card) {
    gs.pendingTarget = undefined;
    return gs;
  }
  
// Execute the spell with the target
const effects = cardRegistry.getEffects(source);
console.log("Executing effects in resolution:", effects);
effects.forEach((effect, index) => {
  console.log(`Effect ${index} targetType:`, effect.targetType);
  if (effect.targetType === "TARGET_PLAYER") {
    console.log("Detected TARGET_PLAYER - targeting enemy");
    // Automatically target enemy player
    const enemyPlayerIndex = 1 - sourcePlayerIndex;
    console.log("Enemy index:", enemyPlayerIndex);
    const enemyTarget = {
      playerIndex: enemyPlayerIndex,
      slotIndex: "PLAYER" as const
    };
    console.log("Calling executeEffect with:", enemyTarget);
    effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, enemyTarget);
  } else {
    console.log("Not TARGET_PLAYER - using provided target:", target);
    // Use the provided target for creature-targeting effects
    effectExecutor.executeEffect(gs, effect, sourcePlayerIndex, target);
  }
});
  
  // Remove spell from hand BEFORE clearing pendingTarget
  player.hand = player.hand.filter(c => c.id !== sourceCardId);
  player.graveyard.push(card);
  
  markSpellCastAndTriggerCatalyst(gs, sourcePlayerIndex);
  
  // Clear pending target
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

function markSpellCastAndTriggerCatalyst(gs: GameState, playerIndex: number) {
  const player = gs.players[playerIndex];
  player.spellsCastThisTurn += 1;

  if (player.spellsCastThisTurn === 1) {
    player.board.forEach((bc, slotIdx) => {
      if (!bc) return;
      const effects = cardRegistry.getEffects(bc.card.name);
      const catalystEffects = effects.filter(e => e.timing === "CATALYST");
      catalystEffects.forEach(eff => {
        effectExecutor.executeEffect(gs, eff, playerIndex, undefined);
      });
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
    // Track once-per-turn usage if needed
    const pAny = player as any;
    const locationKey = player.location!.name;
    
    if (effect.customScript?.includes("ONCE_PER_TURN")) {
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
  
  deathEffects.forEach(effect => {
    effectExecutor.executeEffect(gs, effect, playerIndex, undefined);
  });
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

  if (bc.currentHp <= 0) {
    // Trigger death effects
    triggerDeathEffects(gs, targetPlayerIndex, slotIndex);
    
    // Send relics to graveyard
    const attachedRelics = player.relics.filter(r => r.slotIndex === slotIndex);
    attachedRelics.forEach(relicData => {
      player.graveyard.push(relicData.relic);
      gs.log.push(`${relicData.relic.name} goes to the graveyard.`);
    });
    
    // Remove relics from player's relic list
    player.relics = player.relics.filter(r => r.slotIndex !== slotIndex);
    
    // Send creature to graveyard
    player.graveyard.push(bc.card);
    player.board[slotIndex] = null;
    gs.log.push(`${bc.card.name} dies.`);
  }
}

function healCreature(
  gs: GameState,
  targetPlayerIndex: number,
  slotIndex: number,
  amount: number,
  fromSpell: boolean
) {
  const player = gs.players[targetPlayerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return;
  ensureRuntimeFields(bc);

  let heal = amount;

  // Tideswell Basin: healing spells heal +1
  const loc = player.location;
  if (fromSpell && loc && loc.name === WATER_LOCATION) {
    heal += 1;
  }

  const maxHp = (bc.card as any).hp + relicHpBonus(player, slotIndex);
  const old = bc.currentHp;
  bc.currentHp = Math.min(bc.currentHp + heal, maxHp);
  gs.log.push(`${bc.card.name} heals ${bc.currentHp - old} HP.`);
}

function healPlayer(gs: GameState, playerIndex: number, amount: number, fromSpell: boolean) {
  const player = gs.players[playerIndex];
  let heal = amount;

  // Tideswell Basin
  const loc = player.location;
  if (fromSpell && loc && loc.name === WATER_LOCATION) {
    heal += 1;
  }

  const old = player.life;
  player.life = Math.min(20, player.life + heal);
  gs.log.push(`${player.name} heals ${player.life - old} HP.`);
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export function attack(
  state: GameState,
  attackerSlotIndex: number,
  target: { playerIndex: number; slotIndex: number | "PLAYER" }
): GameState {
  const gs = cloneState(state);
  const atkPlayerIndex = gs.activePlayerIndex;
  const defPlayerIndex = target.playerIndex;
  const attackerPlayer = gs.players[atkPlayerIndex];
  const defenderPlayer = gs.players[defPlayerIndex];

  const attacker = attackerPlayer.board[attackerSlotIndex];
  if (!attacker) return gs;
  ensureRuntimeFields(attacker);

  if (attacker.hasSummoningSickness) {
    gs.log.push(`${attacker.card.name} has summoning sickness and cannot attack.`);
    return gs;
  }

  if ((attacker as any).frozenForTurns > 0) {
    gs.log.push(`${attacker.card.name} is Frozen and cannot attack.`);
    return gs;
  }

  const doubleStrike = hasDoubleStrike(attacker.card.name);
  const bcAny = attacker as any;
  if (!bcAny.attacksThisTurn) bcAny.attacksThisTurn = 0;
  if (!doubleStrike && bcAny.attacksThisTurn >= 1) {
    gs.log.push(`${attacker.card.name} has already attacked this turn.`);
    return gs;
  }
  if (doubleStrike && bcAny.attacksThisTurn >= 2) {
    gs.log.push(`${attacker.card.name} has already attacked twice this turn.`);
    return gs;
  }

  // Guard enforcement
  const guardSlots = defenderPlayer.board
    .map((bc, idx) => (bc && hasGuard(bc.card.name) ? idx : -1))
    .filter(x => x !== -1) as number[];

  if (guardSlots.length > 0) {
    if (target.slotIndex === "PLAYER") {
      gs.log.push(`You must attack a Guard creature instead of the player.`);
      return gs;
    }
    if (!guardSlots.includes(target.slotIndex as number)) {
      gs.log.push(`You must target a Guard creature.`);
      return gs;
    }
  }

  // Trigger ON_ATTACK effects BEFORE combat damage
  triggerOnAttackEffects(gs, atkPlayerIndex, attackerSlotIndex);

  const attackerAtk = getEffectiveAtk(gs, atkPlayerIndex, attackerSlotIndex);

if (target.slotIndex === "PLAYER") {
  defenderPlayer.life -= attackerAtk;
  gs.log.push(`${attacker.card.name} deals ${attackerAtk} damage to ${defenderPlayer.name}.`);

  // Trigger location effects on damage to player
  if (attackerPlayer.location) {
    triggerLocationEffects(gs, atkPlayerIndex, "ON_DAMAGE", { 
      damageDealt: attackerAtk,
      source: attacker,
      slotIndex: attackerSlotIndex 
    });
  }

  // Lifetap
  if (hasLifetap(attacker.card.name)) {
    healPlayer(gs, atkPlayerIndex, 1, false);
  }
  
  bcAny.attacksThisTurn += 1;
  return gs;
}

  // Creature vs creature combat
const defSlot = target.slotIndex as number;
const defender = defenderPlayer.board[defSlot];
if (!defender) {
  gs.log.push(`No defender in that slot.`);
  return gs;
}
ensureRuntimeFields(defender);

const defenderAtk = getEffectiveAtk(gs, defPlayerIndex, defSlot);
const attackerName = attacker.card.name;
const defenderName = defender.card.name;

const attackerFirst = hasFirstStrike(attackerName);
const defenderFirst = hasFirstStrike(defenderName);
const attackerHasPiercing = hasPiercing(attackerName); // Add this

const attackerHitsFirst = attackerFirst && !defenderFirst;
const defenderHitsFirst = defenderFirst && !attackerFirst;

function dealCombatDamageToDefender(amount: number) {
  const defenderHpBefore = defender.currentHp;
  
  applyCreatureDamage(gs, defPlayerIndex, defSlot, amount, false);
  
  // Check for Piercing - if defender died, deal excess to player
  if (attackerHasPiercing) {
    const defenderAfter = defenderPlayer.board[defSlot];
    if (!defenderAfter) {
      // Defender died - calculate excess damage
      const excessDamage = amount - defenderHpBefore;
      if (excessDamage > 0) {
        defenderPlayer.life -= excessDamage;
        gs.log.push(`Piercing: ${excessDamage} excess damage dealt to ${defenderPlayer.name}.`);
      }
    }
  }
}

function dealCombatDamageToAttacker(amount: number) {
  applyCreatureDamage(gs, atkPlayerIndex, attackerSlotIndex, amount, false);
}

// Apply combat damage based on first strike
if (attackerHitsFirst) {
  dealCombatDamageToDefender(attackerAtk);
  if (!defenderPlayer.board[defSlot]) {
    gs.log.push(`${attackerName} (First Strike) kills ${defenderName} before it can strike back.`);
  } else {
    dealCombatDamageToAttacker(defenderAtk);
  }
} else if (defenderHitsFirst) {
  dealCombatDamageToAttacker(defenderAtk);
  if (!attackerPlayer.board[attackerSlotIndex]) {
    gs.log.push(`${defenderName} (First Strike) kills ${attackerName} before it can strike back.`);
    // Even if attacker dies, piercing still applies if defender was killed
  } else {
    dealCombatDamageToDefender(attackerAtk);
  }
} else {
  // Simultaneous damage - apply defender damage first so piercing can check
  dealCombatDamageToDefender(attackerAtk);
  dealCombatDamageToAttacker(defenderAtk);
  // Piercing already applied in dealCombatDamageToDefender, even if attacker dies after
}

  bcAny.attacksThisTurn += 1;

  return gs;
}

// ---------------------------------------------------------------------------
// SPELLS
// ---------------------------------------------------------------------------

export type SpellTarget =
  | { type: "CREATURE"; playerIndex: number; slotIndex: number }
  | { type: "PLAYER"; playerIndex: number }
  | { type: "NONE" };

function handleFirstSpellThisTurn(gs: GameState, playerIndex: number) {
  const player = gs.players[playerIndex];

  // Count how many Catalyst creatures there are
  let catalystCount = 0;
  for (let idx = 0; idx < player.board.length; idx++) {
    const bc = player.board[idx];
    if (!bc) continue;

    const effects = cardRegistry.getEffects(bc.card.name);
    const hasCatalyst = effects.some(e => e.timing === "CATALYST");
    if (hasCatalyst) catalystCount++;
  }

  // For each Catalyst, draw 1 card
  for (let i = 0; i < catalystCount; i++) {
    drawCard(player);
    gs.log.push(`Catalyst: ${player.name} draws 1 card(s).`);
  }

  // Then set up ONE discard choice for ALL the Catalysts combined
  if (catalystCount > 0 && player.hand.length > 0) {
    // Store how many discards are needed
    (gs as any).pendingCatalystDiscards = catalystCount;
    
    gs.pendingDiscard = {
      playerIndex,
      source: `Catalyst resolves`,
    };
    gs.log.push(`Catalyst resolves: you discard ${catalystCount === 1 ? '1 card' : catalystCount + ' cards'}.`);
  }
}

function triggerDrawThenDiscardChoice(
  gs: GameState,
  playerIndex: number,
  source: string
) {
  const player = gs.players[playerIndex];

  drawCard(player);

  if (player.hand.length === 0) {
    gs.log.push(
      `${source} triggers: you draw 1 (no card to discard).`
    );
    return;
  }

  if (gs.pendingDiscard) {
    gs.log.push(
      `${source} would make you discard, but a discard choice is already pending.`
    );
    return;
  }

  gs.pendingDiscard = {
    playerIndex,
    source,
  };

  gs.log.push(
    `${source} triggers: choose a card in your hand to discard.`
  );
}

export function castSpell(state: GameState, handCardId: string, target?: SpellTarget): GameState {
  console.log("=== castSpell called ===");
  console.log("handCardId:", handCardId);
  console.log("target:", target);
  
  const gs = cloneState(state);
  const player = gs.players[gs.activePlayerIndex];
  const card = player.hand.find(c => c.id === handCardId);
  
  console.log("Found card:", card?.name);
  
  if (!card || (card.kind !== "FAST_SPELL" && card.kind !== "SLOW_SPELL")) {
    console.log("Not a valid spell card, returning");
    return gs;
  }

  const effects = cardRegistry.getEffects(card.name);
  console.log("Effects from registry:", effects);
  console.log("Number of effects:", effects.length);
  
  const needsTarget = effects.some(e => e.targetType !== "NONE");
  console.log("Needs target:", needsTarget);

  if (needsTarget && !target) {
    console.log("No target provided, setting up pendingTarget");
    // Determine targeting rule based on effect
    const effect = effects[0]; // For simplicity, use first effect's targeting
    let rule: TargetingRule;
    
    if (effect.targetType === "TARGET_CREATURE") {
      rule = { type: "ALL_CREATURES" }; // Adjust based on card
    } else if (effect.targetType === "TARGET_PLAYER") {
      rule = { type: "ANY_PLAYER" };
    } else {
      rule = { type: "ALL_CREATURES" };
    }

    gs.pendingTarget = {
      source: card.name,
      rule,
      onResolve: (state: GameState, tgt: SpellTarget | number[]) => {
        return castSpell(state, handCardId, tgt as SpellTarget);
      }
    };
    gs.log.push(`${card.name} needs a target.`);
    return gs;
  }

  console.log("Executing effects...");
  // Execute each effect with appropriate target
  effects.forEach((effect, index) => {
    console.log(`\n--- Processing effect ${index} ---`);
    console.log("Effect:", effect);
    console.log("Effect targetType:", effect.targetType);
    
    if (effect.targetType === "TARGET_PLAYER") {
      console.log("✓ Detected TARGET_PLAYER, targeting enemy");
      const enemyPlayerIndex = 1 - gs.activePlayerIndex;
      console.log("Enemy player index:", enemyPlayerIndex);
      const enemyTarget = {
        playerIndex: enemyPlayerIndex,
        slotIndex: "PLAYER" as const
      };
      console.log("Calling executeEffect with enemy target:", enemyTarget);
      effectExecutor.executeEffect(gs, effect, gs.activePlayerIndex, enemyTarget);
    } else {
      console.log("✗ Not TARGET_PLAYER, using provided target");
      console.log("Provided target:", target);
      effectExecutor.executeEffect(gs, effect, gs.activePlayerIndex, target);
    }
  });

  console.log("Moving spell to graveyard");
  // Move spell to graveyard
  player.hand = player.hand.filter(c => c.id !== card.id);
  player.graveyard.push(card);

  markSpellCastAndTriggerCatalyst(gs, gs.activePlayerIndex);

  console.log("=== castSpell complete ===\n");
  return gs;
}

// ---------------------------------------------------------------------------
// RELICS
// ---------------------------------------------------------------------------

export function playRelic(state: GameState, relicCardId: string, targetSlotIndex: number): GameState {
  const gs = cloneState(state);
  const player = gs.players[gs.activePlayerIndex];
  
  const relicCard = player.hand.find(c => c.id === relicCardId);
  if (!relicCard || relicCard.kind !== "RELIC") return gs;
  
  const target = player.board[targetSlotIndex];
  if (!target) {
    gs.log.push("No creature in that slot to attach the relic.");
    return gs;
  }
  
  applyRelicToCreature(target, relicCard as RelicCard);
  
  player.relics.push({
    relic: relicCard as RelicCard,
    slotIndex: targetSlotIndex,
  });
  
  player.hand = player.hand.filter(c => c.id !== relicCardId);
  
  gs.log.push(`${relicCard.name} attached to ${target.card.name}.`);
  
  // ADD THIS LINE:
  markSpellCastAndTriggerCatalyst(gs, gs.activePlayerIndex);
  
  return gs;
}

// ---------------------------------------------------------------------------
// LOCATIONS
// ---------------------------------------------------------------------------

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

export function transformEvolution(
  state: GameState,
  evoCardId: string,
  slotIndex: number
): GameState {
  const gs = cloneState(state);
  const player = gs.players[gs.activePlayerIndex];

  const evo = player.evolutionDeck.find(e => e.id === evoCardId);
  if (!evo || evo.evoType !== "TRANSFORM") return gs;

  const bc = player.board[slotIndex];
  if (!bc || bc.card.kind !== "CREATURE") {
    gs.log.push(`No base creature to transform in slot ${slotIndex + 1}.`);
    return gs;
  }

  const baseCard = bc.card as CreatureCard;

  if (baseCard.name !== evo.baseName || baseCard.rank !== evo.requiredRank) {
    gs.log.push(`Cannot evolve: ${evo.name} does not match ${baseCard.name}.`);
    return gs;
  }

  const oldHp = bc.currentHp;
  const newMaxHp = evo.hp + relicHpBonus(player, slotIndex);
  bc.card = evo;
  bc.currentHp = Math.min(oldHp, newMaxHp);
  bc.hasSummoningSickness = false;

  ensureRuntimeFields(bc);

  player.evolutionDeck = player.evolutionDeck.filter(e => e.id !== evo.id);

  gs.log.push(`${baseCard.name} evolves into ${evo.name}.`);

  return gs;
}

export function playDropInEvolution(
  state: GameState,
  evoCardId: string,
  slotIndex: number,
  overwriteExisting: boolean = false
): GameState {
  const gs = cloneState(state);
  const player = gs.players[gs.activePlayerIndex];

  const evo = player.evolutionDeck.find(e => e.id === evoCardId);
  if (!evo || evo.evoType !== "DROP_IN") return gs;

  if (!overwriteExisting && player.board[slotIndex]) {
    gs.log.push(`Slot ${slotIndex + 1} is occupied; use overwriteExisting=true to overwrite.`);
    return gs;
  }

const existing = player.board[slotIndex];
if (existing) {
  // Send relics to graveyard
  const relicsToMove = player.relics.filter(r => r.slotIndex === slotIndex);
  relicsToMove.forEach(r => {
    player.graveyard.push(r.relic);
    gs.log.push(`${r.relic.name} goes to the graveyard.`);
  });
  player.relics = player.relics.filter(r => r.slotIndex !== slotIndex);
  
  player.graveyard.push(existing.card);
}

  const bc: BoardCreature = {
    card: evo,
    currentHp: evo.hp,
    hasSummoningSickness: true,
  };
  ensureRuntimeFields(bc);

  player.board[slotIndex] = bc;
  player.evolutionDeck = player.evolutionDeck.filter(e => e.id !== evo.id);

  gs.log.push(`${player.name} summons drop-in evolution ${evo.name}.`);

  return gs;
}
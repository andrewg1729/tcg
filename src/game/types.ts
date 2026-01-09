// src/game/types.ts

// -----------------------------
// Basic shared types
// -----------------------------
import type { EvolutionCondition } from "./evolutionConditions";

export type CardId = string;

export type CardKind =
  | "CREATURE"
  | "FAST_SPELL"
  | "SLOW_SPELL"
  | "RELIC"
  | "LOCATION"
  | "EVOLUTION";

export type Rank = 1 | 2 | 3;

// -----------------------------
// Card model
// -----------------------------

export interface BaseCard {
  id: CardId;
  name: string;
  kind: CardKind;
  text: string; // short rules text / reminder text
  imagePath?: string; // optional card art path
}

// --- Creatures ---

export interface CreatureCard extends BaseCard {
  kind: "CREATURE";
  tier: number;
  atk: number;
  hp: number;
    type?: string; // "Warrior", "Dragon", "Mage", etc.
}

// --- Spells ---

export interface SpellCard extends BaseCard {
  kind: "FAST_SPELL" | "SLOW_SPELL";
    tier: number; // ✅ NEW
}

// --- Relics ---

export interface RelicCard extends BaseCard {
  kind: "RELIC";
}

// --- Locations ---

export interface LocationCard extends BaseCard {
  kind: "LOCATION";
}

// --- Evolutions ---

export interface EvolutionCard extends BaseCard {
  kind: "EVOLUTION";
  baseName: string;
  requiredTier: number;
  tier: number;
  atk: number;
  hp: number;
  type?: string;

  conditions?: EvolutionCondition[];
}


// Main deck = everything except evolutions
export type MainDeckCard =
  | CreatureCard
  | SpellCard
  | RelicCard
  | LocationCard;

export type AnyCard = MainDeckCard | EvolutionCard;

// -----------------------------
// Board / zones / players
// -----------------------------

export interface BoardCreature {
  card: CreatureCard | EvolutionCard;
  currentHp: number;
  hasSummoningSickness: boolean;
  // Engine adds runtime-only fields (tempAtkBuff, stunnedForTurns, etc.) at runtime.
}

export interface AttachedRelic {
  slotIndex: number; // which creature slot this relic is attached to
  relic: RelicCard;
}

export interface PlayerState {
  name: string;
  life: number;

  // main deck + hand
  deck: MainDeckCard[];
  hand: MainDeckCard[];

  // graveyard can hold any card type
  graveyard: AnyCard[];

  // evolution deck (line-based evolutions)
  evolutionDeck: EvolutionCard[];

  // 3 creature slots: null if empty
  board: (BoardCreature | null)[];

  // relics currently attached to board slots
  relics: AttachedRelic[];

  // single active location
  location: LocationCard | null;

  // how many spells this player has cast during the current turn
  spellsCastThisTurn: number;

  // NEW: Loot counter system
  loot?: number;
  lootGainedThisTurn?: number;
  lootSpentThisTurn?: number;
  
  // NEW: tracking sets for triggers (reset each turn)
  evadedThisTurn?: Set<number>;
  bouncedThisTurn?: Set<number>;
  enemyAttackMissedThisTurn?: boolean;

  // optional: once-per-turn trigger gating
  triggerUsedThisTurn?: Set<string>;
}

// -----------------------------
// Targeting + pending target
// -----------------------------

export type TargetingRule =
  | { type: "ANY_CREATURE"; minTier?: number; maxTier?: number }
  | { type: "FRIENDLY_CREATURES"; excludeSelf?: boolean; minTier?: number; maxTier?: number }
  | { type: "ENEMY_CREATURES"; excludeSelf?: boolean; minTier?: number; maxTier?: number }
  | { type: "ALL_CREATURES"; excludeSelf?: boolean; minTier?: number; maxTier?: number }
  | { type: "ANY_PLAYER" }
  | { type: "SELF_PLAYER" }
  | { type: "ENEMY_PLAYER" };

// Spell / effect targeting as used by the engine + effectExecutor
export type SpellTarget =
  | { type: "CREATURE"; playerIndex: number; slotIndex: number }
  | { type: "PLAYER"; playerIndex: number }
  | { type: "NONE" };

export interface PendingTarget {
  source: string;
  rule: TargetingRule;
  sourcePlayerIndex: number;
  sourceSlotIndex?: number;
  sourceCardId?: string;
  sourceType: "ON_PLAY" | "SPELL" | "RELIC";

  /**
   * If true, the player may decline to select a target (effect does nothing).
   * (UI/controls may implement this as a cancel/skip action.)
   */
  optional?: boolean;

  /**
   * If present, only these effects will be executed after targeting resolves.
   * (Prevents accidentally executing "all ON_PLAY effects" when we only meant one.)
   */
  effects?: any[];
}

export interface PendingOptionalEffect {
  prompt: string;               // "Activate Neonja Callback effect?"
  source: string;               // card name (for logs / lookups)
  sourcePlayerIndex: number;    // owner of the source card
  sourceSlotIndex: number;      // slot of the source card
  effect: any;                  // the CardEffect being offered
}

// -----------------------------
// Stack + priority types
// -----------------------------

export type StackItemType = "FAST_SPELL" | "TRIGGER";

export interface StackItem {
  id: string;
  type: StackItemType;
  sourceCardId?: CardId;  // for spells
  sourceCardName: string;
  sourcePlayerIndex: number;
  // In practice these are CardEffect objects, but we keep it loose here
  // to avoid circular imports from cardEffects.ts.
  effects: any[];
  target?: SpellTarget;
}

// -----------------------------
// Game state & phases
// -----------------------------

export type Phase =
  | "DRAW"
  | "MAIN"
  | "BATTLE_DECLARE"  // was "ATTACK"
  | "BATTLE_DAMAGE"   // used when a single attack is resolving
  | "END";

export interface PendingDiscard {
  playerIndex: number;
  source: string; // e.g. "Driftseer Acolyte"
}

export interface PendingSacrificeSummon {
  cardId: string;
  targetSlot: number;
  requiredHp: number;
}

export interface PendingCombat {
  attackerPlayerIndex: number;
  attackerSlotIndex: number;
  targetPlayerIndex: number;
  targetSlotIndex: number | "PLAYER";
    blockerSlotIndex?: number; // NEW: defending Guard creature that blocks, if any
}

export interface PendingHandReveal {
  viewerPlayerIndex: number;      // who gets to see
  revealedPlayerIndex: number;    // whose hand was revealed
  cardIds: string[];              // stable IDs for UI
  cardNames: string[];            // fallback/simple UI
  until?: "END_OF_TURN" | "ACK";  // optional (you can keep it simple now)
}

export type TriggeringTarget =
  | { type: "CREATURE"; playerIndex: number; slotIndex: number }
  | { type: "NONE" };

  export type PendingChoice = {
  playerIndex: number;          // who must choose
  sourcePlayerIndex: number;    // owner of card that created the choice
  sourceSlotIndex?: number;     // where that card is (if creature)
  prompt: string;
  options: { label: string; effects: any[] }[];
};

export interface GameState {
  players: PlayerState[];
  activePlayerIndex: number;
  phase: Phase;
  turnNumber: number;
  log: string[];

  pendingDiscard?: PendingDiscard | null;
  pendingSacrificeSummon?: PendingSacrificeSummon | null;
  pendingTarget?: PendingTarget;
  pendingOptionalEffect?: PendingOptionalEffect | null;
  pendingHandReveal?: PendingHandReveal | null;
  triggeringTarget?: TriggeringTarget; // set during triggers like ON_EVADE / ON_BOUNCE
  pendingChoice?: PendingChoice;

  stack: StackItem[];
  priorityPlayerIndex: number;
  priorityPassCount: number;

  // NEW: current attack being resolved (if any)
  pendingCombat?: PendingCombat | null;
}


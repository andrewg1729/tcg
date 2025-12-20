// src/game/types.ts

// -----------------------------
// Basic shared types
// -----------------------------

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
  baseName: string;   // name of the base creature this can evolve from
  requiredTier: number; // rank of the base creature
  atk: number;
  hp: number;
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
}

// -----------------------------
// Targeting + pending target
// -----------------------------

export type TargetingRule =
  | { type: "ENEMY_CREATURES" }
  | { type: "FRIENDLY_CREATURES" }
  | { type: "ALL_CREATURES" }
  | { type: "ENEMY_PLAYER" }
  | { type: "ANY_PLAYER" }
  | { type: "SACRIFICE"; requiredHp: number };

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

export interface GameState {
  players: PlayerState[];
  activePlayerIndex: number;
  phase: Phase;
  turnNumber: number;
  log: string[];

  pendingDiscard?: PendingDiscard | null;
  pendingSacrificeSummon?: PendingSacrificeSummon | null;
  pendingTarget?: PendingTarget;

  stack: StackItem[];
  priorityPlayerIndex: number;
  priorityPassCount: number;

  // NEW: current attack being resolved (if any)
  pendingCombat?: PendingCombat | null;
}


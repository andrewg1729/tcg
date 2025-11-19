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
    imagePath?: string; // ← ADD THIS
}

// --- Creatures ---

export interface CreatureCard extends BaseCard {
  kind: "CREATURE";
  rank: Rank;
  atk: number;
  hp: number;
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

export type EvolutionType = "TRANSFORM" | "DROP_IN";

export interface EvolutionCard extends BaseCard {
  kind: "EVOLUTION";
  evoType: EvolutionType;
  baseName: string;     // name of the base creature this can evolve from
  requiredRank: Rank;   // rank of the base creature
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
  // You can later add flags like:
  // hasAttackedThisTurn?: boolean;
  // tempAttackBuff?: number;
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

  // NEW: how many spells this player has cast during the current turn
  spellsCastThisTurn: number;
}

export type TargetingRule = 
  | { type: "ENEMY_CREATURES" }
  | { type: "FRIENDLY_CREATURES" }
  | { type: "ALL_CREATURES" }
  | { type: "ENEMY_PLAYER" }
  | { type: "ANY_PLAYER" }
  | { type: "SACRIFICE"; requiredHp: number };

export interface PendingTarget {
  source: string;
  rule: TargetingRule;
  sourcePlayerIndex: number;
  sourceSlotIndex?: number;
  sourceCardId?: string;
  sourceType: "ON_PLAY" | "SPELL" | "RELIC";  // Add RELIC here
}
// -----------------------------
// Game state & phases
// -----------------------------

export type Phase = "DRAW" | "MAIN" | "ATTACK" | "END";

export interface PendingDiscard {
  playerIndex: number;
  source: string; // e.g. "Driftseer Acolyte"
}

interface PendingSacrificeSummon {
  cardId: string;
  targetSlot: number;
  requiredHp: number;
}

export interface GameState {
  players: PlayerState[];
  activePlayerIndex: number;
  phase: Phase;
  turnNumber: number;
  log: string[];

  // NEW: if not null, active player must discard a card from hand
  pendingDiscard?: PendingDiscard | null;
  pendingSacrificeSummon?: PendingSacrificeSummon | null;
  pendingTarget?: PendingTarget;
}

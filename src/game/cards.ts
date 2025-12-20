// src/game/cards.ts
import { cardRegistry } from "./cardRegistry";
import { runebladeCardDefinitions } from "./cardDefinitions";
import { MainDeckCard, EvolutionCard } from "./types";

// Register all cards
cardRegistry.registerBulk([...runebladeCardDefinitions]);

// Helper to create multiple copies of a card
function createCopies(cardId: string, count: number): MainDeckCard[] {
  const copies: MainDeckCard[] = [];
  for (let i = 0; i < count; i++) {
    const card = cardRegistry.createCard(cardId);
    if (card && card.kind !== "EVOLUTION") {
      // Give each copy a unique ID by appending a suffix
      copies.push({ ...card, id: `${card.id}-copy-${i}` } as MainDeckCard);
    }
  }
  return copies;
}

// Build Runeblade main deck (30 cards based on CSV)
export const runebladeMainDeck: MainDeckCard[] = [
  // Tier 1 creatures
  ...createCopies("RB-C-001", 2), // Runesurge Initiate (x2)
  ...createCopies("RB-C-002", 2), // Novice Bladechanneler (x2)
  ...createCopies("RB-C-003", 2), // Silent Runetrainee (x2)

  // Tier 2 creatures
  ...createCopies("RB-C-101", 3), // Runeblade Adept (x3)
  ...createCopies("RB-C-102", 3), // Rune-Edge Duelist (x3)
  ...createCopies("RB-C-103", 3), // Burning Rune-Monk (x3)

  // Tier 3 creatures
  ...createCopies("RB-C-201", 3), // Ascended Runeblade Veteran (x3)
  ...createCopies("RB-C-202", 3), // Runeblade Lord (x3)

  // Tier 4 creatures
  ...createCopies("RB-C-301", 2), // Flame-Wreathed Runemaster (x2)
  ...createCopies("RB-C-302", 2), // Grandblade Exemplar (x2)

  // Relics
  ...createCopies("RB-R-001", 2), // Runeblade of Piercing Flame (x2)
  ...createCopies("RB-R-002", 2), // Runeblade of Bloodsigil (x2)
  ...createCopies("RB-R-003", 2), // Runeblade of the First Dawn (x2)

  // Fast Spells
  cardRegistry.createCard("RB-FS-001")!, // Rune-Spark Technique (x1)
  cardRegistry.createCard("RB-FS-002")!, // Runic Flourish (x1)
  cardRegistry.createCard("RB-FS-003")!, // Rune-Strike Burst (x1)
  cardRegistry.createCard("RB-FS-004")!, // Battle-Flare Surge (x1)

  // Slow Spells
  cardRegistry.createCard("RB-SS-001")!, // Twin-Rune Preparation (x1)
  cardRegistry.createCard("RB-SS-002")!, // Tempered Rune-Guard (x1)
  cardRegistry.createCard("RB-SS-003")!, // Rune-Channel Overdrive (x1)
  cardRegistry.createCard("RB-SS-004")!, // Runeblade Reclamation (x1)
];

// Build Runeblade evolutions
export const runebladeEvolutions: EvolutionCard[] = [
  cardRegistry.createCard("RB-E-001")!, // Initiate Runeblade Adept
  cardRegistry.createCard("RB-E-002")!, // Twin-Seal Bladechanneler
  cardRegistry.createCard("RB-E-003")!, // Warmaster of the Searing Runes
  cardRegistry.createCard("RB-E-004")!, // Runeblade Ascendant
].filter(card => card !== null) as EvolutionCard[];
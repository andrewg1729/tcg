// src/game/spirateCards.ts
import { cardRegistry } from "./cardRegistry";
import { spirateCardDefinitions } from "./spirateCardDefinitions";
import { MainDeckCard, EvolutionCard } from "./types";

// Register all Spirate cards
cardRegistry.registerBulk([...spirateCardDefinitions]);

// Helper to create multiple copies
function createCopies(cardId: string, count: number): MainDeckCard[] {
  const copies: MainDeckCard[] = [];
  for (let i = 0; i < count; i++) {
    const card = cardRegistry.createCard(cardId);
    if (card && card.kind !== "EVOLUTION") {
      copies.push({ ...card, id: `${card.id}-copy-${i}` } as MainDeckCard);
    }
  }
  return copies;
}

// Build Spirate main deck (30 cards)
export const spirateMainDeck: MainDeckCard[] = [
  // Tier 1 creatures (6 cards)
  ...createCopies("SP-C-001", 2), // Spirate Gunner (x2)
  ...createCopies("SP-C-002", 2), // Spirate Grunt (x2)
  ...createCopies("SP-C-003", 2), // Spirate Powder Monkey (x2)

  // Tier 2 creatures (9 cards)
  ...createCopies("SP-C-101", 3), // Spirate Scout (x3)
  ...createCopies("SP-C-102", 3), // Spirate Navigator (x3)
  ...createCopies("SP-C-103", 3), // Spirate Surgeon (x3)

  // Tier 3 creatures (6 cards)
  ...createCopies("SP-C-201", 3), // Spirate Coin Master (x3)
  ...createCopies("SP-C-202", 3), // Spirate First Mate (x3)

  // Tier 4 creatures (2 cards)
  ...createCopies("SP-C-301", 2), // Spirate Captain (x2)

  // Slow Spells (5 cards)
  cardRegistry.createCard("SP-SS-001")!, // Plunder the Wreckage (x1)
  cardRegistry.createCard("SP-SS-002")!, // Bury the Take (x1)
  cardRegistry.createCard("SP-SS-003")!, // Motherload (x1)
  cardRegistry.createCard("SP-SS-004")!, // Raise the Black Flag (x1)
  cardRegistry.createCard("SP-SS-005")!, // Blood for Coin (x1)

  // Fast Spells (2 cards)
  cardRegistry.createCard("SP-FS-001")!, // Bribe the Blade (x1)
  cardRegistry.createCard("SP-FS-002")!, // Feed the Kraken (x1)
];

// Build Spirate evolutions
export const spirateEvolutions: EvolutionCard[] = [
  cardRegistry.createCard("SP-E-001")!, // Spirate Master Gunner
  cardRegistry.createCard("SP-E-002")!, // Spirate Sailing Master
  cardRegistry.createCard("SP-E-003")!, // Spirate Quartermaster
  cardRegistry.createCard("SP-E-004")!, // Spirate Admiral
  cardRegistry.createCard("SP-E-KRAKEN")!, // Kraken
].filter(card => card !== null) as EvolutionCard[];
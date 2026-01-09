// src/game/neonjaCards.ts
import { cardRegistry } from "./cardRegistry";
import { neonjaCardDefinitions } from "./neonjaCardDefinitions";
import { MainDeckCard, EvolutionCard } from "./types";

// Register all Neonja cards
cardRegistry.registerBulk([...neonjaCardDefinitions]);

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

// Build Neonja main deck (30 cards)
export const neonjaMainDeck: MainDeckCard[] = [
  // Tier 1 creatures (6 cards)
  ...createCopies("NJ-C-001", 2), // Neonja Null (x2)
  ...createCopies("NJ-C-002", 2), // Neonja Jitter (x2)
  ...createCopies("NJ-C-003", 2), // Neonja Backdoor (x2)

  // Tier 2 creatures (9 cards)
  ...createCopies("NJ-C-101", 3), // Neonja Framespike (x3)
  ...createCopies("NJ-C-102", 3), // Neonja Payload (x3)
  ...createCopies("NJ-C-103", 3), // Neonja Callback (x3)

  // Tier 3 creatures (6 cards)
  ...createCopies("NJ-C-201", 3), // Neonja Desync (x3)
  ...createCopies("NJ-C-202", 3), // Neonja Uplink (x3)

  // Tier 4 creatures (2 cards)
  ...createCopies("NJ-C-301", 2), // Neonja Deadlink (x2)

  // Fast Spells (4 cards)
  cardRegistry.createCard("NJ-FS-001")!, // Instant Smoke (x1)
  cardRegistry.createCard("NJ-FS-002")!, // Frame Skip (x1)
  cardRegistry.createCard("NJ-FS-003")!, // Packet Loss (x1)
  cardRegistry.createCard("NJ-FS-004")!, // Glitched Counter (x1)

  // Slow Spells (1 card)
  cardRegistry.createCard("NJ-SS-001")!, // Silent Execution (x1)

  // Relics (2 cards)
  cardRegistry.createCard("NJ-R-001")!, // Makibishi (x1)
  cardRegistry.createCard("NJ-R-002")!, // Smoke Bomb (x1)
];

// Build Neonja evolutions
export const neonjaEvolutions: EvolutionCard[] = [
  cardRegistry.createCard("NJ-E-001")!, // Neonja Jitterflux
  cardRegistry.createCard("NJ-E-002")!, // Neonja Lagspike
  cardRegistry.createCard("NJ-E-003")!, // Neonja Dephase
  cardRegistry.createCard("NJ-E-004")!, // Neonja Deadsite
].filter(card => card !== null) as EvolutionCard[];
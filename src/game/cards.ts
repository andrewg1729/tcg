// src/game/cards.ts
import { cardRegistry } from "./cardRegistry";
import { waterCardDefinitions, fireCardDefinitions } from "./cardDefinitions";
import { MainDeckCard, EvolutionCard } from "./types";

// Register all cards
cardRegistry.registerBulk([...waterCardDefinitions, ...fireCardDefinitions]);

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

// Build Water main deck (30 cards)
export const waterMainDeck: MainDeckCard[] = [
  // Rank 1 creatures (x2 copies each = 12 cards)
  ...createCopies("W-C-001", 2), // Mistling Scout
  ...createCopies("W-C-002", 2), // Tide Warden
  ...createCopies("W-C-003", 2), // Wave Stalker
  ...createCopies("W-C-004", 2), // Moonwake Sentry
  ...createCopies("W-C-005", 2), // Stream Skimmer

  // Rank 2 creatures (4 cards)
  cardRegistry.createCard("W-C-101")!, // Coral Guard
  cardRegistry.createCard("W-C-102")!, // Aqua Revenant
  cardRegistry.createCard("W-C-103")!, // Storm Adept
  cardRegistry.createCard("W-C-104")!, // Abyss Echo Mage

  // Rank 3 creatures (2 cards)
  cardRegistry.createCard("W-C-201")!, // Abyssal Charger
  cardRegistry.createCard("W-C-202")!, // Stormcall Leviathan
  cardRegistry.createCard("W-C-203")!, // Stormcall Leviathan

  // Spells (8 cards)
  cardRegistry.createCard("W-S-001")!, // Tidal Parry
  cardRegistry.createCard("W-S-002")!, // Mist Veil
  cardRegistry.createCard("W-S-003")!, // Cold Snap
  cardRegistry.createCard("W-S-004")!, // Swell Surge
  cardRegistry.createCard("W-S-005")!, // Deep Renewal
  cardRegistry.createCard("W-S-006")!, // Undertow Grip
  cardRegistry.createCard("W-S-007")!, // Tidal Rebirth
  cardRegistry.createCard("W-S-008")!, // Call of the Deep

  // Relics (2 cards)
  cardRegistry.createCard("W-R-001")!, // Coral Bulwark
  cardRegistry.createCard("W-R-002")!, // Moon Pearl Amulet

  // Locations (2 copies = 2 cards)
  ...createCopies("W-L-001", 2), // Tideswell Basin
];

// Build Water evolutions
export const waterEvolutions: EvolutionCard[] = [
  cardRegistry.createCard("W-E-001")!, // Reefguard Captain
  cardRegistry.createCard("W-E-002")!, // Ocean's Will
  cardRegistry.createCard("W-E-003")!, // Ocean's Will
  cardRegistry.createCard("W-E-004")!, // Ocean's Will
  cardRegistry.createCard("W-E-005")!, // Ocean's Will
].filter(card => card !== null) as EvolutionCard[];

// Build Fire main deck (30 cards)
export const fireMainDeck: MainDeckCard[] = [
  // Rank 1 creatures (x2 copies each = 12 cards)
  ...createCopies("F-C-001", 2), // Ember Sprite
  ...createCopies("F-C-002", 2), // Scorchling Pup
  ...createCopies("F-C-003", 2), // Kindle Scout
  ...createCopies("F-C-004", 2), // Embercrack Duelist
  ...createCopies("F-C-005", 2), // Cinder Hopper

  // Rank 2 creatures (4 cards)
  cardRegistry.createCard("F-C-101")!, // Ember Ascetic
  cardRegistry.createCard("F-C-102")!, // Magma Hunter
  cardRegistry.createCard("F-C-103")!, // Emberstorm Roc
  cardRegistry.createCard("F-C-104")!, // Pyre Sentry

  // Rank 3 creatures (2 cards)
  cardRegistry.createCard("F-C-201")!, // Hellfire Charger
  cardRegistry.createCard("F-C-202")!, // Blazewreak Titan
  cardRegistry.createCard("F-C-203")!, // Blazewreak Titan

  // Spells (8 cards)
  cardRegistry.createCard("F-S-001")!, // Flame Burst
  cardRegistry.createCard("F-S-002")!, // Burning Reflex
  cardRegistry.createCard("F-S-003")!, // Ignite Path
  cardRegistry.createCard("F-S-004")!, // Firecall Rally
  cardRegistry.createCard("F-S-005")!, // Ash to Ash
  cardRegistry.createCard("F-S-006")!, // Inferno Pulse
  cardRegistry.createCard("F-S-007")!, // Blazing Rebirth
  cardRegistry.createCard("F-S-008")!, // Ashes Remembered

  // Relics (2 cards)
  cardRegistry.createCard("F-R-001")!, // Ember-Iron Gauntlets
  cardRegistry.createCard("F-R-002")!,

  // Locations (2 copies = 2 cards)
  ...createCopies("F-L-001", 2), // Molten Trail
];

// Build Fire evolutions
export const fireEvolutions: EvolutionCard[] = [
  cardRegistry.createCard("F-E-001")!, // Blazeforge Sentinel
  cardRegistry.createCard("F-E-002")!, // Sunflare Titan
  cardRegistry.createCard("F-E-003")!, // Flame Tyrant
  cardRegistry.createCard("F-E-004")!, // Flame Tyrant
  cardRegistry.createCard("F-E-005")!, // Flame Tyrant
].filter(card => card !== null) as EvolutionCard[];
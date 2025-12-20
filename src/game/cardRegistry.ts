// src/game/cardRegistry.ts

import { CardDefinition, CardEffect, KeywordEffect } from "./cardEffects";
import {
  CreatureCard,
  SpellCard,
  RelicCard,
  LocationCard,
  EvolutionCard,
  MainDeckCard,
} from "./types";

class CardRegistry {
  private definitions: Map<string, CardDefinition> = new Map();
  
  register(def: CardDefinition) {
    this.definitions.set(def.id, def);
  }
  
  registerBulk(defs: CardDefinition[]) {
    defs.forEach(def => this.register(def));
  }
  
  get(id: string): CardDefinition | undefined {
    return this.definitions.get(id);
  }
  
  createCard(id: string): MainDeckCard | EvolutionCard | null {
    const def = this.definitions.get(id);
    if (!def) return null;
    
    const baseCard = {
      id: def.id,
      name: def.name,
      kind: def.kind,
      text: def.text,
          imagePath: def.imagePath, // ← ADD THIS
    };
    
    switch (def.kind) {
      case "CREATURE":
        return {
          ...baseCard,
          kind: "CREATURE",
          tier: def.tier!,
          atk: def.atk!,
          hp: def.hp!,
        } as CreatureCard;
        
      case "FAST_SPELL":
      case "SLOW_SPELL":
        return {
          ...baseCard,
          kind: def.kind,
        } as SpellCard;
        
      case "RELIC":
        return {
          ...baseCard,
          kind: "RELIC",
        } as RelicCard;
        
      case "LOCATION":
        return {
          ...baseCard,
          kind: "LOCATION",
        } as LocationCard;
        
      case "EVOLUTION":
        return {
          ...baseCard,
          kind: "EVOLUTION",
          evoType: def.evoType!,
          baseName: def.baseName!,
          requiredRank: def.requiredRank!,
          atk: def.atk!,
          hp: def.hp!,
        } as EvolutionCard;
        
      default:
        return null;
    }
  }
  
  // Get all keywords for a card
  getKeywords(cardName: string): KeywordEffect[] {
    const def = Array.from(this.definitions.values()).find(d => d.name === cardName);
    return def?.keywords || [];
  }
  
  // Get all effects for a card
  getEffects(cardName: string): CardEffect[] {
    const def = Array.from(this.definitions.values()).find(d => d.name === cardName);
    return def?.effects || [];
  }
}

export const cardRegistry = new CardRegistry();
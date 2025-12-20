// src/game/cardEffects.ts

import { CardKind, Rank, EvolutionType } from "./types";

export type EffectTiming =
  | "ON_PLAY"           // When card enters play
  | "ON_ATTACK"         // When creature attacks
  | "ON_DAMAGE"         // When creature deals damage
  | "ON_DAMAGED"        // When creature takes damage
  | "DEATH"             // When creature dies
  | "START_OF_TURN"     // At turn start
  | "END_OF_TURN"       // At turn end
  | "CATALYST"          // First spell each turn
  | "SPELL_CAST"        // Whenever a spell is cast
  | "IMMEDIATE";        // Spell effect

export type TargetType =
  | "SELF"              // The card itself
  | "TARGET_CREATURE"   // Choose a creature
  | "TARGET_PLAYER"     // Choose a player
  | "SELF_PLAYER"       // The player who controls this card
  | "ALL_FRIENDLY"      // All your creatures
  | "ALL_ENEMY"         // All enemy creatures
  | "ALL_CREATURES"     // All creatures
  | "NONE";             // No target needed

export type ConditionType =
  | "LIFE_COMPARISON"      // Compare player life totals
  | "RANK_CHECK"           // Check creature rank
  | "DAMAGE_DEALT"         // Check if damage was dealt
  | "CREATURE_TYPE_COUNT"  // Count creatures of a specific type
  | "RELIC_COUNT"          // Count relics on a creature
  | "CUSTOM";              // Custom condition logic

export interface EffectCondition {
  type: ConditionType;
  value?: any;
  // For CREATURE_TYPE_COUNT
  creatureType?: string;    // "Warrior", "Dragon", etc.
  minCount?: number;
  // For RELIC_COUNT
  relicTag?: string;        // "Runeblade", "Gauntlet", etc.
}

export interface ConditionalValue {
  baseValue: number;
  bonusValue: number;
  condition: EffectCondition;
}

export interface CardEffect {
  timing: EffectTiming;
  targetType: TargetType;
  conditions?: EffectCondition[];
  
  // Effect actions
  damage?: number;
  heal?: number;
  draw?: number;
  discard?: number;
  atkBuff?: number;
  buffDuration?: "TURN" | "PERMANENT";
  destroy?: boolean;
  stun?: number;
  shield?: number;
  
  // Conditional effects (for cards like "deal 2 damage, or 3 if...")
  conditionalDamage?: ConditionalValue;
  conditionalHeal?: ConditionalValue;
  conditionalDraw?: ConditionalValue;
  
  // Custom script for complex effects
  // Examples:
  // - "TRIGGER_CATALYST" - Trigger Catalyst effects again
  // - "COPY_RELIC_KEYWORDS" - Copy keywords from relics
  // - "SEARCH_DECK_TO_TOP_RUNEBLADE_RELIC" - Search for specific card
  // - "RESURRECT_NAMED_TO_HAND_RUNEBLADE" - Return named card from graveyard
  // - "HEAL_IF_KILL" - Heal if target dies
  // - "ATK_BUFF_ON_KILL" - Gain ATK when killing creatures
  // - "RANDOM_FRIENDLY" - Target random friendly creature
  // - "ENEMY_ONLY" - Can only target enemies
  // - "FRIENDLY_ONLY" - Can only target friendlies
  // - "EXCLUDE_SELF" - Cannot target self
  customScript?: string;
}

export interface KeywordEffect {
  keyword: string;
  
  // Value-based keywords (with numeric values)
  armor?: number;
  regen?: number;
  thorns?: number;
  surge?: number;
  
  // Boolean keywords (present or not)
  guard?: boolean;
  lifetap?: boolean;
  piercing?: boolean;
  firstStrike?: boolean;
  doubleStrike?: boolean;
  spellShield?: boolean;
  swift?: boolean;
  awaken?: boolean;
  
  // Custom keyword behavior
  customScript?: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  kind: CardKind;
  text: string;
  imagePath?: string;
  
  // Creature/Evolution stats
  tier?: number;
  atk?: number;
  hp?: number;
  type?: string;  // "Warrior", "Dragon", "Mage", etc.
  
  // Evolution specific
  evoType?: EvolutionType;
  baseName?: string;
  requiredRank?: Rank;
  
  // Effects and keywords
  keywords?: KeywordEffect[];
  effects?: CardEffect[];
}

// Helper type for tracking what effects a card can have
export type EffectCategory =
  | "DAMAGE"
  | "HEALING"
  | "DRAW"
  | "BUFF"
  | "DEBUFF"
  | "REMOVAL"
  | "RESURRECTION"
  | "SEARCH"
  | "TRIGGER";

// Helper function to categorize effects (useful for UI/tooltips)
export function categorizeEffect(effect: CardEffect): EffectCategory[] {
  const categories: EffectCategory[] = [];
  
  if (effect.damage || effect.conditionalDamage) categories.push("DAMAGE");
  if (effect.heal || effect.conditionalHeal) categories.push("HEALING");
  if (effect.draw || effect.conditionalDraw) categories.push("DRAW");
  if (effect.atkBuff) categories.push("BUFF");
  if (effect.stun) categories.push("DEBUFF");
  if (effect.destroy) categories.push("REMOVAL");
  
  if (effect.customScript) {
    if (effect.customScript.includes("RESURRECT")) categories.push("RESURRECTION");
    if (effect.customScript.includes("SEARCH")) categories.push("SEARCH");
    if (effect.customScript.includes("TRIGGER_CATALYST")) categories.push("TRIGGER");
  }
  
  return categories;
}

// Helper to check if an effect needs targeting
export function effectNeedsTarget(effect: CardEffect): boolean {
  return effect.targetType === "TARGET_CREATURE" || 
         effect.targetType === "TARGET_PLAYER";
}

// Helper to get human-readable effect description
export function getEffectDescription(effect: CardEffect): string {
  const parts: string[] = [];
  
  // Timing
  switch (effect.timing) {
    case "ON_PLAY":
      parts.push("When this enters play:");
      break;
    case "ON_ATTACK":
      parts.push("When this attacks:");
      break;
    case "DEATH":
      parts.push("When this dies:");
      break;
    case "CATALYST":
      parts.push("Catalyst:");
      break;
    case "START_OF_TURN":
      parts.push("At the start of your turn:");
      break;
    case "END_OF_TURN":
      parts.push("At the end of your turn:");
      break;
  }
  
  // Effect actions
  if (effect.damage) parts.push(`Deal ${effect.damage} damage`);
  if (effect.heal) parts.push(`Heal ${effect.heal}`);
  if (effect.draw) parts.push(`Draw ${effect.draw}`);
  if (effect.atkBuff) parts.push(`+${effect.atkBuff} ATK`);
  if (effect.stun) parts.push(`Stun ${effect.stun} turn(s)`);
  if (effect.destroy) parts.push("Destroy");
  
  // Conditional effects
  if (effect.conditionalDamage) {
    const { baseValue, bonusValue, condition } = effect.conditionalDamage;
    parts.push(`Deal ${baseValue} damage (${bonusValue} if condition met)`);
  }
  
  return parts.join(" ");
}
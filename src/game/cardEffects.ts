// src/game/cardEffects.ts

import { CardKind, Rank, EvolutionType, TargetingRule } from "./types";

export type EffectTiming =
  | "ON_PLAY"
  | "ON_ATTACK"
  | "ON_DAMAGE"
  | "ON_DAMAGED"
  | "DEATH"
  | "START_OF_TURN"
  | "END_OF_TURN"
  | "CATALYST"
  | "SPELL_CAST"
  | "ON_EVADE"          // ✅ NEW
  | "ON_BOUNCE"         // ✅ NEW
  | "IMMEDIATE";

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
  | "LIFE_COMPARISON"
  | "RANK_CHECK"
  | "DAMAGE_DEALT"
  | "CREATURE_TYPE_COUNT"
  | "RELIC_COUNT"
  | "SELF_HAS_EVADED_THIS_DUEL"        // ✅ NEW
  | "ANY_FRIENDLY_EVADED_THIS_TURN"    // ✅ NEW
  | "ANY_FRIENDLY_BOUNCED_THIS_TURN"   // ✅ NEW
  | "ENEMY_ATTACK_MISSED_THIS_TURN"    // ✅ NEW
  | "CUSTOM";


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

// src/game/cardEffects.ts

export interface PeekHandSpec {
  target: "OPPONENT" | "PLAYER";     // default OPPONENT
  revealCount?: number;              // default ALL
}

export type ChoiceOption = {
  label: string;
  effects: CardEffect[];
};

export interface CardEffect {
  timing: EffectTiming;
  targetType: TargetType;
  targetingRule?: TargetingRule;
  optional?: boolean;

  // ✅ scalable conditions (already present)
  conditions?: EffectCondition[];

  // ✅ engine is already using these (make them real)
  oncePerTurn?: boolean;

  // used by ON_EVADE / ON_BOUNCE trigger scanners in engine.ts
  condition?: any; // (optional legacy single-condition form; keep if you already shipped it)
  requiresFriendlyEvade?: boolean;
  requiresFriendlyBounce?: boolean;

  // ✅ generic “don’t re-apply this forever once condition stays true”
  triggerOncePerCondition?: boolean;

  // numbers
  damage?: number;
  heal?: number;
  draw?: number;
  discard?: number;
  atkBuff?: number;

  // durations (expandable)
  buffDuration?: "TURN" | "PERMANENT";

  // keywords / statuses
  stun?: number;
  shield?: number;
  evasion?: boolean;
  bounce?: boolean;
  destroy?: boolean;
  summonTokenCardId?: string; // e.g. "NJ-TOKEN-001"
  summonTo?: "BOUNCED_SLOT";  // extend later if needed
  
  // ✅ NEW first-class action
  peekHand?: PeekHandSpec;

  // keep for truly niche / UI multi-step
  customScript?: string;
  
  // NEW: generic choices
  choice?: {
    options: ChoiceOption[];
  };

  // NEW: target the trigger subject (evader/bounced creature)
  targetTriggeringCreature?: boolean;
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
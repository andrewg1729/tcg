// src/game/cardEffects.ts

import { CardKind, Rank, EvolutionType } from "./types";

export type EffectTiming =
  | "ON_PLAY"           // When card enters play
  | "ON_ATTACK"         // When creature attacks
  | "ON_DAMAGE"         // When creature deals damage
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
  | "SELF_PLAYER"  // ADD THIS
  | "ALL_FRIENDLY"      // All your creatures
  | "ALL_ENEMY"         // All enemy creatures
  | "ALL_CREATURES"     // All creatures
  | "NONE";             // No target needed

export interface EffectCondition {
  type: "LIFE_COMPARISON" | "RANK_CHECK" | "DAMAGE_DEALT" | "CUSTOM";
  value?: any;
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
  freeze?: number;
  shield?: number;
  
  // Custom script for complex effects
  customScript?: string;
}

export interface KeywordEffect {
  keyword: string;
  // Static keywords (always active)
  armor?: number;
  regen?: number;
  thorns?: number; // Add this
  guard?: boolean;
  lifetap?: boolean;
  piercing?: boolean;
  firstStrike?: boolean;
  doubleStrike?: boolean;
  spellShield?: boolean;
  surge?: number;
  customScript?: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  kind: CardKind;
  text: string;
    imagePath?: string; // ← ADD THIS
  
  // Creature stats
  rank?: Rank;
  atk?: number;
  hp?: number;
  
  // Evolution specific
  evoType?: EvolutionType;
  baseName?: string;
  requiredRank?: Rank;
  
  // Effects and keywords
  keywords?: KeywordEffect[];
  effects?: CardEffect[];
}
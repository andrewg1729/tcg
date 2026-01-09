// src/game/spirateCardDefinitions.ts

import { CardDefinition } from "./cardEffects";

export const spirateCardDefinitions: CardDefinition[] = [
  // ==================== TIER 1 CREATURES ====================
  {
    id: "SP-C-001",
    name: "Spirate Gunner",
    kind: "CREATURE",
    tier: 1,
    atk: 2,
    hp: 1,
    type: "Spirit",
    text: "When this creature deals combat damage to a creature, gain 1 Loot.",
    imagePath: "/cards/spirate/Spirate Gunner.png",
    keywords: [],
    effects: [
      {
        timing: "ON_DAMAGE",
        targetType: "NONE",
        customScript: "GAIN_LOOT_1_ON_CREATURE_DAMAGE",
      },
    ],
  },
  
  {
    id: "SP-C-002",
    name: "Spirate Grunt",
    kind: "CREATURE",
    tier: 1,
    atk: 2,
    hp: 2,
    type: "Spirit",
    text: "When this creature destroys a creature in combat, gain 1 Loot.",
    imagePath: "/cards/spirate/Spirate Grunt.png",
    keywords: [],
    effects: [
      {
        timing: "ON_DAMAGE",
        targetType: "NONE",
        customScript: "GAIN_LOOT_1_ON_KILL",
      },
    ],
  },
  
  {
    id: "SP-C-003",
    name: "Spirate Powder Monkey",
    kind: "CREATURE",
    tier: 1,
    atk: 1,
    hp: 3,
    type: "Spirit",
    text: "When this creature is destroyed, gain 1 Loot.",
    imagePath: "/cards/spirate/Spirate Powder Monkey.png",
    keywords: [],
    effects: [
      {
        timing: "DEATH",
        targetType: "NONE",
        customScript: "GAIN_LOOT_1",
      },
    ],
  },
  
  // ==================== TIER 2 CREATURES ====================
  {
    id: "SP-C-101",
    name: "Spirate Scout",
    kind: "CREATURE",
    tier: 2,
    atk: 4,
    hp: 3,
    type: "Spirit",
    text: "Once per turn, if you have 2 or more Loot, you may look at one card in your opponent's hand.",
    imagePath: "/cards/spirate/Spirate Scout.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "ACTIVATED_PEEK_HAND_IF_2_LOOT",
      },
    ],
  },
  
  {
    id: "SP-C-102",
    name: "Spirate Navigator",
    kind: "CREATURE",
    tier: 2,
    atk: 3,
    hp: 5,
    type: "Spirit",
    text: "Spend 1 Loot: Look at the top 3 cards of your deck. Put one into your hand and the rest on the bottom in any order. (Once per turn.)",
    imagePath: "/cards/spirate/Spirate Navigator.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "ACTIVATED_SPEND_1_LOOT_SCRY_3",
      },
    ],
  },
  
  {
    id: "SP-C-103",
    name: "Spirate Surgeon",
    kind: "CREATURE",
    tier: 2,
    atk: 2,
    hp: 5,
    type: "Spirit",
    text: "Spend 1 Loot: Heal 3 damage from another creature you control. (Once per turn.)",
    imagePath: "/cards/spirate/Spirate Surgeon.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        customScript: "ACTIVATED_SPEND_1_LOOT_HEAL_3_FRIENDLY_EXCLUDE_SELF",
      },
    ],
  },
  
  // ==================== TIER 3 CREATURES ====================
  {
    id: "SP-C-201",
    name: "Spirate Coin Master",
    kind: "CREATURE",
    tier: 3,
    atk: 5,
    hp: 6,
    type: "Spirit",
    text: "The first time you would gain Loot each turn, gain 1 additional Loot.",
    imagePath: "/cards/spirate/Spirate Coin Master.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "PASSIVE_FIRST_LOOT_BONUS",
      },
    ],
  },
  
  {
    id: "SP-C-202",
    name: "Spirate First Mate",
    kind: "CREATURE",
    tier: 3,
    atk: 6,
    hp: 7,
    type: "Spirit",
    text: "Whenever you gain Loot, this creature gets +1 ATK until end of turn. Spend 2 Loot: Ready another creature you control. (Once per turn.)",
    imagePath: "/cards/spirate/Spirate First Mate.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "SELF",
        customScript: "PASSIVE_ATK_BUFF_ON_LOOT_GAIN",
      },
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        customScript: "ACTIVATED_SPEND_2_LOOT_READY_FRIENDLY_EXCLUDE_SELF",
      },
    ],
  },
  
  // ==================== TIER 4 CREATURES ====================
  {
    id: "SP-C-301",
    name: "Spirate Captain",
    kind: "CREATURE",
    tier: 4,
    atk: 8,
    hp: 8,
    type: "Spirit",
    text: "Whenever you spend Loot, deal 1 damage to your opponent.",
    imagePath: "/cards/spirate/Spirate Captain.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "PASSIVE_DAMAGE_ON_LOOT_SPEND",
      },
    ],
  },
  
  // ==================== SLOW SPELLS ====================
  {
    id: "SP-SS-001",
    name: "Plunder the Wreckage",
    kind: "SLOW_SPELL",
    text: "Destroy target relic and gain 1 Loot",
    imagePath: "/cards/spirate/Plunder the Wreckage.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "DESTROY_TARGET_RELIC_GAIN_1_LOOT",
      },
    ],
  },
  
  {
    id: "SP-SS-002",
    name: "Bury the Take",
    kind: "SLOW_SPELL",
    text: "If you have 3 or more Loot, gain 2 Loot.",
    imagePath: "/cards/spirate/Bury the Take.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "GAIN_2_LOOT_IF_3_LOOT",
      },
    ],
  },
  
  {
    id: "SP-SS-003",
    name: "Motherload",
    kind: "SLOW_SPELL",
    text: "Gain 3 Loot",
    imagePath: "/cards/spirate/Motherload.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "GAIN_LOOT_3",
      },
    ],
  },
  
  {
    id: "SP-SS-004",
    name: "Raise the Black Flag",
    kind: "SLOW_SPELL",
    text: "Each creature you control gains +1 ATK until the end of the turn for every 2 Loot you have.",
    imagePath: "/cards/spirate/Raise the Black Flag.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "ALL_FRIENDLY",
        customScript: "BUFF_ATK_PER_2_LOOT",
      },
    ],
  },
  
  {
    id: "SP-SS-005",
    name: "Blood for Coin",
    kind: "SLOW_SPELL",
    text: "Spend up to 4 Loot. You may destroy an opponent's creature up to the number of Loot spent.",
    imagePath: "/cards/spirate/Blood for Coin.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        customScript: "SPEND_LOOT_DESTROY_ENEMY_BY_TIER",
      },
    ],
  },
  
  // ==================== FAST SPELLS ====================
  {
    id: "SP-FS-001",
    name: "Bribe the Blade",
    kind: "FAST_SPELL",
    text: "Spend 1 Loot. Target attacking or blocking creature gets −2 ATK until end of turn.",
    imagePath: "/cards/spirate/Bribe the Blade.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        customScript: "SPEND_1_LOOT_MINUS_2_ATK",
      },
    ],
  },
  
  {
    id: "SP-FS-002",
    name: "Feed the Kraken",
    kind: "FAST_SPELL",
    text: "Destroy two creatures you control to summon the Kraken from the Evolution Deck.",
    imagePath: "/cards/spirate/Feed the Kraken.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "SACRIFICE_2_SUMMON_KRAKEN",
      },
    ],
  },
  
  // ==================== EVOLUTIONS ====================
  {
    id: "SP-E-001",
    name: "Spirate Master Gunner",
    kind: "EVOLUTION",
    baseName: "Spirate Gunner",
    requiredTier: 1,
    tier: 2.5,
    atk: 3,
    hp: 2,
    type: "Spirit",
    text: "When this creature deals combat damage to a creature, gain 2 Loot",
    imagePath: "/cards/spirate/Spirate Master Gunner.png",
    keywords: [],
    effects: [
      {
        timing: "ON_DAMAGE",
        targetType: "NONE",
        customScript: "GAIN_LOOT_2_ON_CREATURE_DAMAGE",
      },
    ],
  },
  
  {
    id: "SP-E-002",
    name: "Spirate Sailing Master",
    kind: "EVOLUTION",
    baseName: "Spirate Navigator",
    requiredTier: 2,
    tier: 3.5,
    atk: 4,
    hp: 6,
    type: "Spirit",
    text: "The first time you spend Loot each turn, draw 1 card. Spend 2 Loot: Look at the top 5 cards of your deck. Put one into your hand.",
    imagePath: "/cards/spirate/Spirate Sailing Master.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "PASSIVE_DRAW_ON_FIRST_LOOT_SPEND",
      },
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "ACTIVATED_SPEND_2_LOOT_SCRY_5",
      },
    ],
  },
  
  {
    id: "SP-E-003",
    name: "Spirate Quartermaster",
    kind: "EVOLUTION",
    baseName: "Spirate First Mate",
    requiredTier: 3,
    tier: 4.5,
    atk: 7,
    hp: 8,
    type: "Spirit",
    text: "Once per turn, when you gain Loot, choose one: • Deal 1 damage to any target • Target enemy creature gets −1 ATK permanently. Loot you spend this turn counts as +1 additional Loot.",
    imagePath: "/cards/spirate/Spirate Quartermaster.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "TRIGGERED_LOOT_GAIN_MODAL",
      },
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "PASSIVE_LOOT_SPEND_AMPLIFIER",
      },
    ],
  },
  
  {
    id: "SP-E-004",
    name: "Spirate Admiral",
    kind: "EVOLUTION",
    baseName: "Spirate Captain",
    requiredTier: 4,
    tier: 5,
    atk: 9,
    hp: 9,
    type: "Spirit",
    text: "Whenever you spend or gain Loot, deal 1 damage to any target",
    imagePath: "/cards/spirate/Spirate Admiral.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "PASSIVE_DAMAGE_ON_LOOT_ANY",
      },
    ],
  },
  
  {
    id: "SP-E-KRAKEN",
    name: "Kraken",
    kind: "EVOLUTION",
    baseName: "ANY",
    requiredTier: 0,
    tier: 5,
    atk: 11,
    hp: 11,
    type: "Spirit",
    text: "",
    imagePath: "/cards/spirate/Kraken.png",
    keywords: [],
    effects: [],
  },
];
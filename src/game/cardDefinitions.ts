// src/game/cardDefinitions.ts

import { CardDefinition } from "./cardEffects";

export const runebladeCardDefinitions: CardDefinition[] = [
  // ==================== TIER 1 CREATURES ====================
  {
    id: "RB-C-001",
    name: "Runesurge Initiate",
    kind: "CREATURE",
    tier: 1,
    atk: 2,
    hp: 2,
    type: "Warrior",
    text: "Catalyst: This gains +1 ATK this turn.",
    imagePath: "/cards/water/Reef Skitter.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "SELF",
        atkBuff: 1,
        buffDuration: "TURN",
      },
    ],
  },
  
  {
    id: "RB-C-002",
    name: "Novice Bladechanneler",
    kind: "CREATURE",
    tier: 1,
    atk: 2,
    hp: 2,
    type: "Warrior",
    text: "If you have cast a spell this turn, this gains +1 HP.",
    imagePath: "/cards/water/Tide Whelpling.png",
    keywords: [],
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "SELF",
        customScript: "HP_BUFF_IF_SPELL_CAST",
      },
    ],
  },
  
  {
    id: "RB-C-003",
    name: "Silent Runetrainee",
    kind: "CREATURE",
    tier: 1,
    atk: 2,
    hp: 3,
    type: "Warrior",
    text: "",
    imagePath: "/cards/water/Bubbleback Pup.png",
    keywords: [],
    effects: [],
  },
  
  // ==================== TIER 2 CREATURES ====================
  {
    id: "RB-C-101",
    name: "Runeblade Adept",
    kind: "CREATURE",
    tier: 2,
    atk: 3,
    hp: 3,
    type: "Warrior",
    text: "Catalyst: This gains +1/+1 this turn.",
    imagePath: "/cards/water/Grumpstar.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "SELF",
        atkBuff: 1,
        customScript: "HP_BUFF_1",
      },
    ],
  },
  
  {
    id: "RB-C-102",
    name: "Rune-Edge Duelist",
    kind: "CREATURE",
    tier: 2,
    atk: 3,
    hp: 4,
    type: "Warrior",
    text: "If this has a Runeblade relic attached, this gains +1 ATK.",
    imagePath: "/cards/water/Glowfin Nibbler.png",
    keywords: [],
    effects: [],
  },
  
  {
    id: "RB-C-103",
    name: "Burning Rune-Monk",
    kind: "CREATURE",
    tier: 2,
    atk: 3,
    hp: 3,
    type: "Warrior",
    text: "Catalyst: Deal 1 damage to an enemy creature.",
    imagePath: "/cards/water/Coral Soldier.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "TARGET_CREATURE",
        damage: 1,
        customScript: "ENEMY_ONLY",
      },
    ],
  },
  
  // ==================== TIER 3 CREATURES ====================
  {
    id: "RB-C-201",
    name: "Ascended Runeblade Veteran",
    kind: "CREATURE",
    tier: 3,
    atk: 4,
    hp: 5,
    type: "Warrior",
    text: "Catalyst: Give another one of your Warriors +1/+1.",
    imagePath: "/cards/water/Abyss Angler.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "TARGET_CREATURE",
        atkBuff: 1,
        customScript: "FRIENDLY_WARRIOR_ONLY_EXCLUDE_SELF_HP_BUFF_1",
      },
    ],
  },
  
  {
    id: "RB-C-202",
    name: "Runeblade Lord",
    kind: "CREATURE",
    tier: 3,
    atk: 4,
    hp: 6,
    type: "Warrior",
    text: "Catalyst: Gain all keywords from the Runeblade relics you control until the end of the turn.",
    imagePath: "/cards/water/Wave Sprinter.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "NONE",
        customScript: "COPY_RELIC_KEYWORDS",
      },
    ],
  },
  
  // ==================== TIER 4 CREATURES ====================
  {
    id: "RB-C-301",
    name: "Flame-Wreathed Runemaster",
    kind: "CREATURE",
    tier: 4,
    atk: 5,
    hp: 6,
    type: "Warrior",
    text: "Catalyst: Deal 1 damage to all enemy creatures.",
    imagePath: "/cards/water/Coral Shaman.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "ALL_ENEMY",
        damage: 1,
      },
    ],
  },
  
  {
    id: "RB-C-302",
    name: "Grandblade Exemplar",
    kind: "CREATURE",
    tier: 4,
    atk: 5,
    hp: 7,
    type: "Warrior",
    text: "Catalyst: Your Warriors gain +1 ATK this turn.",
    imagePath: "/cards/water/Coralyte.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "ALL_FRIENDLY",
        atkBuff: 1,
        buffDuration: "TURN",
        customScript: "WARRIOR_ONLY",
      },
    ],
  },
  
  // ==================== RELICS ====================
  {
    id: "RB-R-001",
    name: "Runeblade of Steel",
    kind: "RELIC",
    text: "Grant Catalyst: Gain Piercing until end of turn.",
    imagePath: "/cards/water/Runeblade of Steel.png",
    keywords: [
      { keyword: "CATALYST" },
      { keyword: "PIERCING", piercing: true, customScript: "CATALYST_DURATION" }
    ],
  },
  
  {
    id: "RB-R-002",
    name: "Runeblade of Blood",
    kind: "RELIC",
    text: "Grant Catalyst: Gain Lifetap until end of turn.",
    imagePath: "/cards/water/Runeblade of Blood.png",
    keywords: [
      { keyword: "CATALYST" },
      { keyword: "LIFETAP", lifetap: true, customScript: "CATALYST_DURATION" }
    ],
  },
  
  {
    id: "RB-R-003",
    name: "Runeblade of Scroll",
    kind: "RELIC",
    text: "Grant Catalyst: Gain First Strike until end of turn.",
    imagePath: "/cards/water/Runeblade of Scroll.png",
    keywords: [
      { keyword: "CATALYST" },
      { keyword: "FIRST_STRIKE", firstStrike: true, customScript: "CATALYST_DURATION" }
    ],
  },
  
  // ==================== FAST SPELLS ====================
  {
    id: "RB-FS-001",
    name: "Rune-Spark Technique",
    kind: "FAST_SPELL",
    text: "Give one of your Warriors +1 ATK this turn.",
    imagePath: "/cards/water/Tidal Blessing.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        atkBuff: 1,
        buffDuration: "TURN",
        customScript: "FRIENDLY_WARRIOR_ONLY",
      },
    ],
  },
  
  {
    id: "RB-FS-002",
    name: "Runic Flourish",
    kind: "FAST_SPELL",
    text: "Give one of your Warriors +1 ATK this turn. If you control a Warrior with a Runeblade relic attached, give it +2 ATK instead.",
    imagePath: "/cards/water/Aqua Guard.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        conditionalAtkBuff: {
          baseValue: 1,
          bonusValue: 2,
          condition: {
            type: "HAS_RUNEBLADE_RELIC",
          },
        },
        buffDuration: "TURN",
        customScript: "FRIENDLY_WARRIOR_ONLY",
      },
    ],
  },
  
  {
    id: "RB-FS-003",
    name: "Rune-Strike Burst",
    kind: "FAST_SPELL",
    text: "Deal 1 damage to an enemy creature. If you control a Warrior with a Runeblade relic attached, deal 2 instead.",
    imagePath: "/cards/water/Frostbeam Impact.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        conditionalDamage: {
          baseValue: 1,
          bonusValue: 2,
          condition: {
            type: "CONTROLS_WARRIOR_WITH_RUNEBLADE_RELIC",
          },
        },
        customScript: "ENEMY_ONLY",
      },
    ],
  },
  
  {
    id: "RB-FS-004",
    name: "Battle-Flare Surge",
    kind: "FAST_SPELL",
    text: "Trigger the Catalyst of one of your Warriors.",
    imagePath: "/cards/water/Water Slash.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        customScript: "TRIGGER_SINGLE_CATALYST",
      },
    ],
  },
  
  // ==================== SLOW SPELLS ====================
  {
    id: "RB-SS-001",
    name: "Twin-Rune Preparation",
    kind: "SLOW_SPELL",
    text: "Look at the top 3 cards of your deck. You may reveal a Runeblade relic from among them and draw it. Put the rest back in any order.",
    imagePath: "/cards/water/Swell Surge.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "SEARCH_TOP_3_FOR_RUNEBLADE_RELIC",
      },
    ],
  },
  
  {
    id: "RB-SS-002",
    name: "Tempered Rune-Guard",
    kind: "SLOW_SPELL",
    text: "Give all of your Warriors +1 HP permanently if you have cast 2 spells this turn.",
    imagePath: "/cards/water/Bubble Scripture.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "ALL_FRIENDLY",
        customScript: "PERMANENT_HP_BUFF_IF_2_SPELLS_WARRIOR_ONLY",
      },
    ],
  },
  
  {
    id: "RB-SS-003",
    name: "Rune-Channel Overdrive",
    kind: "SLOW_SPELL",
    text: "Draw 1 card. Then give one of your Warriors +2 ATK this turn. If you control a Warrior with a Runeblade relic attached, draw 1 additional card.",
    imagePath: "/cards/water/Return from the Depths.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        draw: 1,
      },
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        atkBuff: 2,
        buffDuration: "TURN",
        customScript: "FRIENDLY_WARRIOR_ONLY",
      },
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        conditionalDraw: {
          baseValue: 0,
          bonusValue: 1,
          condition: {
            type: "CONTROLS_WARRIOR_WITH_RUNEBLADE_RELIC",
          },
        },
      },
    ],
  },
  
  {
    id: "RB-SS-004",
    name: "Runeblade Reclamation",
    kind: "SLOW_SPELL",
    text: "Return a Runeblade relic from your graveyard to your hand.",
    imagePath: "/cards/water/Seabed Retrieval.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "RESURRECT_NAMED_TO_HAND_RUNEBLADE_RELIC",
      },
    ],
  },
  
  // ==================== EVOLUTIONS ====================
  {
    id: "RB-E-001",
    name: "Initiate Runeblade Adept",
    kind: "EVOLUTION",
    baseName: "Runesurge Initiate",
    requiredTier: 1,
    tier: 1.5,
    atk: 3,
    hp: 3,
    type: "Warrior",
    text: "Catalyst: This gains +1/+1.",
    imagePath: "/cards/water/Tide Guardian.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "SELF",
        atkBuff: 1,
        customScript: "HP_BUFF_1",
      },
    ],
  },

  {
    id: "RB-E-002",
    name: "Twin-Seal Bladechanneler",
    kind: "EVOLUTION",
    baseName: "Novice Bladechanneler",
    requiredTier: 1,
    tier: 2.5,
    atk: 4,
    hp: 4,
    type: "Warrior",
    text: "Catalyst: Deal 1 damage to an enemy creature.",
    imagePath: "/cards/water/Glowfin Glider.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "TARGET_CREATURE",
        damage: 1,
        customScript: "ENEMY_ONLY",
      },
    ],
  },

  {
    id: "RB-E-003",
    name: "Warmaster of the Searing Runes",
    kind: "EVOLUTION",
    baseName: "Ascended Runeblade Veteran",
    requiredTier: 3,
    tier: 3.5,
    atk: 6,
    hp: 7,
    type: "Warrior",
    text: "Catalyst: Give all of your Warriors +1 ATK this turn.",
    imagePath: "/cards/water/Coral General.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "ALL_FRIENDLY",
        atkBuff: 1,
        buffDuration: "TURN",
        customScript: "WARRIOR_ONLY",
      },
    ],
  },

  {
    id: "RB-E-004",
    name: "Runeblade Ascendant",
    kind: "EVOLUTION",
    baseName: "Runeblade Lord",
    requiredTier: 3,
    tier: 4.5,
    atk: 6,
    hp: 9,
    type: "Warrior",
    text: "Your Warriors' Catalyst effects trigger an additional time each turn. On evolve: Draw 2 cards.",
    imagePath: "/cards/water/Crankstar.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "ON_PLAY",
        targetType: "NONE",
        draw: 2,
      },
    ],
  },
];
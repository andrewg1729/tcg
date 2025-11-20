// src/game/cardDefinitions.ts

import { CardDefinition } from "./cardEffects";

export const waterCardDefinitions: CardDefinition[] = [
  // ==================== RANK 1 CREATURES ====================
  {
    id: "W-C-001",
    name: "Reef Skitter",
    kind: "CREATURE",
    rank: 1,
    atk: 1,
    hp: 3,
    text: "Spell Shield. When played, draw 1, then discard 1.",
    imagePath: "/cards/water/Reef Skitter.png",
    keywords: [{ keyword: "SPELL_SHIELD", spellShield: true }],
    effects: [
      {
        timing: "ON_PLAY",
        targetType: "NONE",
        draw: 1,
        discard: 1,
      },
    ],
  },
  
  {
    id: "W-C-002",
    name: "Tide Whelpling",
    kind: "CREATURE",
    rank: 1,
    atk: 2,
    hp: 3,
    text: "Guard. Death: Heal 1.",
    imagePath: "/cards/water/Tide Whelpling.png",
    keywords: [{ keyword: "GUARD", guard: true }],
    effects: [
      {
        timing: "DEATH",
        targetType: "TARGET_PLAYER",
        heal: 1,
      },
    ],
  },
  
  {
    id: "W-C-003",
    name: "Bubbleback Pup",
    kind: "CREATURE",
    rank: 1,
    atk: 2,
    hp: 2,
    text: "Regen 1. At the end of your turn, this heals 1.",
    imagePath: "/cards/water/Bubbleback Pup.png",
    keywords: [{ keyword: "REGEN", regen: 1 }],
  },

  {
    id: "W-C-004",
    name: "Grumpstar",
    kind: "CREATURE",
    rank: 1,
    atk: 2,
    hp: 2,
    text: "Surge.",
    imagePath: "/cards/water/Grumpstar.png",
    keywords: [{ keyword: "SURGE", surge: 1 }],
  },
  
  {
    id: "W-C-005",
    name: "Glowfin Nibbler",
    kind: "CREATURE",
    rank: 1,
    atk: 1,
    hp: 3,
    text: "Catalyst. When you cast your first spell each turn, draw 1, then discard 1.",
    imagePath: "/cards/water/Glowfin Nibbler.png",
    keywords: [{ keyword: "CATALYST" }],
    effects: [
      {
        timing: "CATALYST",
        targetType: "NONE",
        draw: 1,
        discard: 1,
      },
    ],
  },
  
  // ==================== RANK 2 CREATURES ====================
  {
    id: "W-C-101",
    name: "Coral Soldier",
    kind: "CREATURE",
    rank: 2,
    atk: 3,
    hp: 4,
    text: "Guard. Enemies must attack this if able while it is undamaged.",
    imagePath: "/cards/water/Coral Soldier.png",
    keywords: [{ keyword: "GUARD", guard: true }],
  },
  
  {
    id: "W-C-102",
    name: "Abyss Angler",
    kind: "CREATURE",
    rank: 2,
    atk: 3,
    hp: 3,
    text: "Death: Heal 2.",
    imagePath: "/cards/water/Abyss Angler.png",
    effects: [
      {
        timing: "DEATH",
        targetType: "TARGET_PLAYER",
        heal: 2,
      },
    ],
  },
  
  {
    id: "W-C-103",
    name: "Wave Sprinter",
    kind: "CREATURE",
    rank: 2,
    atk: 3,
    hp: 4,
    text: "First Strike. When this attacks a creature, it deals damage first.",
    imagePath: "/cards/water/Wave Sprinter.png",
    keywords: [{ keyword: "FIRST_STRIKE", firstStrike: true }],
  },
  
  {
    id: "W-C-104",
    name: "Coral Shaman",
    kind: "CREATURE",
    rank: 2,
    atk: 2,
    hp: 5,
    text: "Regen 2. At the end of your turn, this heals 2.",
    imagePath: "/cards/water/Coral Shaman.png",
    keywords: [{ keyword: "REGEN", regen: 2 }],
  },
  
  // ==================== RANK 3 CREATURES ====================
  {
    id: "W-C-201",
    name: "Coralyte",
    kind: "CREATURE",
    rank: 3,
    atk: 5,
    hp: 5,
    text: "Piercing.",
    imagePath: "/cards/water/Coralyte.png",
    keywords: [{ keyword: "PIERCING", piercing: true }],
  },
  
  {
    id: "W-C-202",
    name: "Hydrallion",
    kind: "CREATURE",
    rank: 3,
    atk: 4,
    hp: 7,
    text: "On Summon: Deal 2 damage to all enemy creatures.",
    imagePath: "/cards/water/Hydrallion.png",
    effects: [
      { 
        timing: "ON_PLAY",
        targetType: "ALL_ENEMY",
        damage: 2,
      },
    ],
  },
  
  {
    id: "W-C-203",
    name: "Coral Titan",
    kind: "CREATURE",
    rank: 3,
    atk: 4,
    hp: 8,
    text: "Guard. This enters with 8 HP and must be attacked first while it lives.",
    imagePath: "/cards/water/Coral Titan.png",
    keywords: [{ keyword: "GUARD", guard: true }],
  },
  
  // ==================== SPELLS ====================
  {
    id: "W-S-001",
    name: "Tidal Blessing",
    kind: "FAST_SPELL",
    text: "Heal a creature 2.",
    imagePath: "/cards/water/Tidal Blessing.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        heal: 2,
      },
    ],
  },
  
  {
    id: "W-S-002",
    name: "Aqua Guard",
    kind: "FAST_SPELL",
    text: "Prevents the next 2 damage this creature would take this turn.",
    imagePath: "/cards/water/Aqua Guard.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        shield: 2,
      },
    ],
  },
  
{
  id: "W-S-003",
  name: "Frostbeam Impact",
  kind: "FAST_SPELL",
  text: "Deal 2 damage to a creature and Freeze it for its controller's next turn.",
  imagePath: "/cards/water/Frostbeam Impact.png",
  effects: [
    {
      timing: "IMMEDIATE",
      targetType: "TARGET_CREATURE",
      damage: 2,
      freeze: 2,  // Change from 1 to 2
    },
  ],
},
  
  {
    id: "W-S-004",
    name: "Swell Surge",
    kind: "SLOW_SPELL",
    text: "Your creatures get +1 ATK until the end of this turn.",
    imagePath: "/cards/water/Swell Surge.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "ALL_FRIENDLY",
        atkBuff: 1,
        buffDuration: "TURN",
      },
    ],
  },
  
{
  id: "W-S-005",
  name: "Bubble Scripture",
  kind: "SLOW_SPELL",
  text: "Heal 3, then draw 1.",
  imagePath: "/cards/water/Bubble Scripture.png",
  effects: [
    {
      timing: "IMMEDIATE",
      targetType: "SELF_PLAYER",  // Change from TARGET_PLAYER
      heal: 3,
    },
    {
      timing: "IMMEDIATE",
      targetType: "NONE",
      draw: 1,
    },
  ],
},
  
  {
    id: "W-S-006",
    name: "Water Slash",
    kind: "FAST_SPELL",
    text: "Deal 3 damage to a creature. If it dies, heal 1.",
    imagePath: "/cards/water/Water Slash.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        damage: 3,
        customScript: "HEAL_IF_KILL",
      },
    ],
  },
  
  {
    id: "W-S-007",
    name: "Return from the Depths",
    kind: "SLOW_SPELL",
    text: "Return the top creature from your graveyard to the field in an empty slot if possible.",
    imagePath: "/cards/water/Return from the Depths.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "RESURRECT_TO_FIELD",
      },
    ],
  },
  
  {
    id: "W-S-008",
    name: "Seabed Retrieval",
    kind: "SLOW_SPELL",
    text: "Return the top creature from your graveyard to your hand.",
    imagePath: "/cards/water/Seabed Retrieval.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "RESURRECT_TO_HAND",
      },
    ],
  },
  
  // ==================== RELICS ====================
  {
    id: "W-R-001",
    name: "Coral Bulwark",
    kind: "RELIC",
    text: "Grant Armor 1.",
    imagePath: "/cards/water/Coral Bulwark.png",
    keywords: [{ keyword: "ARMOR", armor: 1 }],
  },
  
  {
    id: "W-R-002",
    name: "Moon Pearl Amulet",
    kind: "RELIC",
    text: "Grant Regen 1.",
    imagePath: "/cards/water/Moon Pearl Amulet.png",
    keywords: [{ keyword: "REGEN", regen: 1 }],
  },
  
  // ==================== LOCATIONS ====================
  {
    id: "W-L-001",
    name: "Coral Citadel",
    kind: "LOCATION",
    text: "Your spells heal 1 extra. Lasts 2 of your turns.",
    imagePath: "/cards/water/Coral Citadel.png",
    effects: [
      {
        timing: "SPELL_CAST",
        targetType: "NONE",
        customScript: "BOOST_HEALING",
      },
    ],
  },

  // ==================== WATER EVOLUTIONS ====================
{
  id: "W-E-001",
  name: "Tide Guardian",
  kind: "EVOLUTION",
  baseName: "Tide Whelpling",
  requiredRank: 1,
  atk: 4,
  hp: 6,
  text: "Evolve from Tide Whelpling when it has taken damage but survived. Guard. Armor 1. Death: Heal 2.",
  imagePath: "/cards/water/Tide Guardian.png",
  keywords: [
    { keyword: "GUARD", guard: true },
    { keyword: "ARMOR", armor: 1 },
  ],
  effects: [
    {
      timing: "DEATH",
      targetType: "TARGET_PLAYER",
      heal: 2,
    },
  ],
},

{
  id: "W-E-002",
  name: "Glowfin Glider",
  kind: "EVOLUTION",
  baseName: "Glowfin Nibbler",
  requiredRank: 1,
  atk: 4,
  hp: 5,
  text: "Evolve from Glowfin Nibbler if you've cast 2 or more spells this turn. Double Strike. Catalyst: Draw 2, then discard 1.",
  imagePath: "/cards/water/Glowfin Glider.png",
  keywords: [
    { keyword: "DOUBLE_STRIKE", doubleStrike: true },
    { keyword: "CATALYST" },
  ],
  effects: [
    {
      timing: "CATALYST",
      targetType: "NONE",
      draw: 2,
      discard: 1,
    },
  ],
},

{
  id: "W-E-003",
  name: "Coral General",
  kind: "EVOLUTION",
  baseName: "Coral Soldier",
  requiredRank: 2,
  atk: 5,
  hp: 9,
  text: "Evolve from Coral Soldier when it has full HP. Guard. Armor 2. Thorns 1.",
  imagePath: "/cards/water/Coral General.png",
  keywords: [
    { keyword: "GUARD", guard: true },
    { keyword: "ARMOR", armor: 2 },
    { keyword: "THORNS", thorns: 1 }, // Add this
  ],
},

{
  id: "W-E-004",
  name: "Crankstar",
  kind: "EVOLUTION",
  baseName: "Grumpstar",
  requiredRank: 1,
  atk: 6,
  hp: 4,
  text: "Evolve from Grumpstar if it dealt damage this turn. Surge +2. First Strike. When this attacks, draw 1 card.",
  imagePath: "/cards/water/Crankstar.png",
  keywords: [
    { keyword: "SURGE", surge: 2 },
    { keyword: "FIRST_STRIKE", firstStrike: true },
  ],
  effects: [
    {
      timing: "ON_ATTACK",
      targetType: "NONE",
      draw: 1,
    },
  ],
},

{
  id: "W-E-005",
  name: "Coralex",
  kind: "EVOLUTION",
  baseName: "Coralyte",
  requiredRank: 3,
  atk: 11,
  hp: 8,
  text: "Drop-In Evolution: If you have 3 or more creatures in your graveyard. Regen 3. Piercing. At the start of your turn, heal a random friendly creature for 2.",
  imagePath: "/cards/water/Coralex.png",
  keywords: [
    { keyword: "REGEN", regen: 3 },
    { keyword: "PIERCING", piercing: true },
  ],
  effects: [
    {
      timing: "START_OF_TURN",
      targetType: "TARGET_CREATURE",
      heal: 2,
      customScript: "RANDOM_FRIENDLY",
    },
  ],
},
];

export const fireCardDefinitions: CardDefinition[] = [
  // ==================== RANK 1 CREATURES ====================
  {
    id: "F-C-001",
    name: "Coalimp",
    kind: "CREATURE",
    rank: 1,
    atk: 2,
    hp: 1,
    text: "Surge.",
    imagePath: "/cards/fire/Coalimp.png",
    keywords: [{ keyword: "SURGE", surge: 1 }],
  },
  
  {
    id: "F-C-002",
    name: "Flarby",
    kind: "CREATURE",
    rank: 1,
    atk: 1,
    hp: 2,
    text: "Death: Deal 1 damage to the enemy.",
    imagePath: "/cards/fire/Flarby.png",
    effects: [
      {
        timing: "DEATH",
        targetType: "TARGET_PLAYER",
        damage: 1,
      },
    ],
  },
  
  {
    id: "F-C-003",
    name: "Cinderhawk",
    kind: "CREATURE",
    rank: 1,
    atk: 2,
    hp: 2,
    text: "Awaken: +1 ATK.",
    imagePath: "/cards/fire/Cinderhawk.png",
    keywords: [{ keyword: "AWAKEN" }],
  },
  
  {
    id: "F-C-004",
    name: "Embercrack Duelist",
    kind: "CREATURE",
    rank: 1,
    atk: 2,
    hp: 3,
    text: "First Strike. When this attacks a creature, it deals damage first.",
    imagePath: "/cards/fire/Embercrack Duelist.png",
    keywords: [{ keyword: "FIRST_STRIKE", firstStrike: true }],
  },
  
  {
    id: "F-C-005",
    name: "Prismflare Beetle",
    kind: "CREATURE",
    rank: 1,
    atk: 1,
    hp: 3,
    text: "Lifetap.",
    imagePath: "/cards/fire/Prismflare Beetle.png",
    keywords: [{ keyword: "LIFETAP", lifetap: true }],
  },
  
  // ==================== RANK 2 CREATURES ====================
  {
    id: "F-C-101",
    name: "Emberalith",
    kind: "CREATURE",
    rank: 2,
    atk: 2,
    hp: 5,
    text: "Regen 1. At the end of your turn, this heals 1.",
    imagePath: "/cards/fire/Emberalith.png",
    keywords: [{ keyword: "REGEN", regen: 1 }],
  },
  
  {
    id: "F-C-102",
    name: "Infernowl",
    kind: "CREATURE",
    rank: 2,
    atk: 4,
    hp: 3,
    text: "Piercing.",
    imagePath: "/cards/fire/Infernowl.png",
    keywords: [{ keyword: "PIERCING", piercing: true }],
  },
  
  {
    id: "F-C-103",
    name: "Skyrill",
    kind: "CREATURE",
    rank: 2,
    atk: 3,
    hp: 4,
    text: "Armor 1. Prevent the first 1 damage dealt to this each time it is damaged.",
    imagePath: "/cards/fire/Skyrill.png",
    keywords: [{ keyword: "ARMOR", armor: 1 }],
  },
  
  {
    id: "F-C-104",
    name: "Scorchog",
    kind: "CREATURE",
    rank: 2,
    atk: 3,
    hp: 4,
    text: "Guard. Enemies must attack this if able.",
    imagePath: "/cards/fire/Scorchog.png",
    keywords: [{ keyword: "GUARD", guard: true }],
  },
  
  // ==================== RANK 3 CREATURES ====================
{
  id: "F-C-201",
  name: "Pyrethorn Charger",
  kind: "CREATURE",
  rank: 3,
  atk: 5,
  hp: 4,
  text: "On Attack: Deal 1 damage to all enemy creatures.",
  imagePath: "/cards/fire/Pyrethorn Charger.png",
  effects: [
    {
      timing: "ON_ATTACK",
      targetType: "ALL_ENEMY",  // Change this from ALL_CREATURES
      damage: 1,
    },
  ],
},
  
  {
    id: "F-C-202",
    name: "Scorvane",
    kind: "CREATURE",
    rank: 3,
    atk: 6,
    hp: 5,
    text: "Double Strike. This can attack twice each turn.",
    imagePath: "/cards/fire/Scorvane.png",
    keywords: [{ keyword: "DOUBLE_STRIKE", doubleStrike: true }],
  },
  
  {
    id: "F-C-203",
    name: "Chromavore",
    kind: "CREATURE",
    rank: 3,
    atk: 4,
    hp: 7,
    text: "On Summon: Deal 2 damage to an enemy creature.",
    imagePath: "/cards/fire/Chromavore.png",
    effects: [
      {
        timing: "ON_PLAY",
        targetType: "TARGET_CREATURE",
        damage: 2,
        customScript: "ENEMY_ONLY",
      },
    ],
  },
  
  // ==================== SPELLS ====================
  {
    id: "F-S-001",
    name: "Flame Burst",
    kind: "FAST_SPELL",
    text: "Deal 2 damage to a creature.",
    imagePath: "/cards/fire/Flame Burst.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        damage: 2,
      },
    ],
  },
  
  {
    id: "F-S-002",
    name: "Blazing Empowerment",
    kind: "FAST_SPELL",
    text: "Give a creature +2 ATK until the end of this turn.",
    imagePath: "/cards/fire/Blazing Empowerment.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        atkBuff: 2,
        buffDuration: "TURN",
      },
    ],
  },
  
  {
    id: "F-S-003",
    name: "Fireball",
    kind: "FAST_SPELL",
    text: "Deal 3 damage to a creature.",
    imagePath: "/cards/fire/Fireball.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        damage: 3,
      },
    ],
  },
  
  {
    id: "F-S-004",
    name: "Firecall Rally",
    kind: "SLOW_SPELL",
    text: "Your creatures get +1 ATK until the end of this turn.",
    imagePath: "/cards/fire/Firecall Rally.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "ALL_FRIENDLY",
        atkBuff: 1,
        buffDuration: "TURN",
      },
    ],
  },
  
  {
    id: "F-S-005",
    name: "Ash to Ash",
    kind: "SLOW_SPELL",
    text: "Destroy a Rank 1 creature. Then deal 1 damage to the enemy.",
    imagePath: "/cards/fire/Ash to Ash.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_CREATURE",
        destroy: true,
        conditions: [{ type: "RANK_CHECK", value: 1 }],
      },
      {
        timing: "IMMEDIATE",
        targetType: "TARGET_PLAYER",
        damage: 1,
      },
    ],
  },
  
{
  id: "F-S-006",
  name: "Overheat",
  kind: "SLOW_SPELL",
  text: "Deal 5 damage to a creature. You lose 2 life.",
  imagePath: "/cards/fire/Overheat.png",
  effects: [
    {
      timing: "IMMEDIATE",
      targetType: "TARGET_CREATURE",
      damage: 5,
    },
    {
      timing: "IMMEDIATE",
      targetType: "SELF_PLAYER",  // Change from TARGET_PLAYER
      damage: 2,
      // Remove customScript: "SELF_DAMAGE"
    },
  ],
},
  
{
  id: "F-S-007",
  name: "Blazing Rebirth",
  kind: "SLOW_SPELL",
  text: "Return the top creature from your graveyard to the field in an empty slot. You lose 1 life.",
  imagePath: "/cards/fire/Blazing Rebirth.png",
  effects: [
    {
      timing: "IMMEDIATE",
      targetType: "NONE",
      customScript: "RESURRECT_TO_FIELD",
    },
    {
      timing: "IMMEDIATE",
      targetType: "SELF_PLAYER",  // Change from TARGET_PLAYER to SELF_PLAYER
      damage: 1,
      // Remove the customScript line entirely
    },
  ],
},
  
  {
    id: "F-S-008",
    name: "Ashes Remembered",
    kind: "SLOW_SPELL",
    text: "Return the top creature from your graveyard to your hand.",
    imagePath: "/cards/fire/Ashes Remembered.png",
    effects: [
      {
        timing: "IMMEDIATE",
        targetType: "NONE",
        customScript: "RESURRECT_TO_HAND",
      },
    ],
  },
  
  // ==================== RELICS ====================
  {
    id: "F-R-001",
    name: "Ember-Iron Gauntlets",
    kind: "RELIC",
    text: "+2 ATK.",
    imagePath: "/cards/fire/Ember-Iron Gauntlets.png",
    keywords: [{ keyword: "ATK_BONUS", customScript: "ATK_2" }],
  },
  
  {
    id: "F-R-002",
    name: "Cinder Plate",
    kind: "RELIC",
    text: "+3 HP.",
    imagePath: "/cards/fire/Cinder Plate.png",
    keywords: [{ keyword: "HP_BONUS", customScript: "HP_3" }],
  },
  
  // ==================== LOCATIONS ====================
{
  id: "F-L-001",
  name: "Molten Trail",
  kind: "LOCATION",
  text: "When one of your creatures hits the enemy, deal 1 extra damage. Lasts 2 of your turns.",
  imagePath: "/cards/fire/Molten Trail.png",
  effects: [
    {
      timing: "ON_DAMAGE",
      targetType: "TARGET_PLAYER",
      damage: 1,
    },
  ],
},

  // ==================== FIRE EVOLUTIONS ====================
{
  id: "F-E-001",
  name: "Moltusk",
  kind: "EVOLUTION",
  baseName: "Scorchog",
  requiredRank: 2,
  atk: 6,
  hp: 10,
  text: "Evolve from Scorchog if it has taken damage. Armor 1. Regen 2. When this takes damage, deal 1 damage to all enemy creatures.",
  imagePath: "/cards/fire/Moltusk.png",
  keywords: [
    { keyword: "ARMOR", armor: 1 },
    { keyword: "REGEN", regen: 2 },
  ],
  effects: [
    {
      timing: "ON_DAMAGE",
      targetType: "ALL_ENEMY",
      damage: 1,
    },
  ],
},

{
  id: "F-E-002",
  name: "Coalfiend Trickster",
  kind: "EVOLUTION",
  baseName: "Coalimp",
  requiredRank: 1,
  atk: 7,
  hp: 4,
  text: "Evolve from Coalimp if your life is lower than your opponent's. First Strike. Double Strike. Piercing. Awaken.",
  imagePath: "/cards/fire/Coalfiend Trickster.png",
  keywords: [
    { keyword: "FIRST_STRIKE", firstStrike: true },
    { keyword: "DOUBLE_STRIKE", doubleStrike: true },
    { keyword: "PIERCING", piercing: true },
    { keyword: "AWAKEN" },
  ],
},

{
  id: "F-E-003",
  name: "Embercrack Bladelord",
  kind: "EVOLUTION",
  baseName: "Embercrack Duelist",
  requiredRank: 1,
  atk: 7,
  hp: 4,
  text: "Evolve from Embercrack Duelist if it killed a creature this turn. First Strike. Double Strike. When this kills a creature, it may attack again this turn.",
  imagePath: "/cards/fire/Embercrack Bladelord.png",
  keywords: [
    { keyword: "FIRST_STRIKE", firstStrike: true },
    { keyword: "DOUBLE_STRIKE", doubleStrike: true },
  ],
  effects: [
    {
      timing: "ON_DAMAGE",
      targetType: "NONE",
      customScript: "EXTRA_ATTACK_ON_KILL",
    },
  ],
},

{
  id: "F-E-004",
  name: "Prismflare Colossus",
  kind: "EVOLUTION",
  baseName: "Prismflare Beetle",
  requiredRank: 1,
  atk: 5,
  hp: 6,
  text: "Evolve from Prismflare Beetle if you healed this turn. Lifetap. Regen 1. At the start of your turn, heal 1.",
  imagePath: "/cards/fire/Prismflare Colossus.png",
  keywords: [
    { keyword: "LIFETAP", lifetap: true },
    { keyword: "REGEN", regen: 1 },
  ],
  effects: [
    {
      timing: "START_OF_TURN",
      targetType: "SELF_PLAYER",
      heal: 1,
    },
  ],
},

{
  id: "F-E-005",
  name: "Scorvane - The Ash King",
  kind: "EVOLUTION",
  baseName: "Scorvane",
  requiredRank: 3,
  atk: 9,
  hp: 12,
  text: "If your life is 10 or less. Guard. Armor 2. At the end of your turn, deal 1 damage to all enemy creatures.",
  imagePath: "/cards/fire/Scorvane - The Ash King.png",
  keywords: [
    { keyword: "GUARD", guard: true },
    { keyword: "ARMOR", armor: 2 },
  ],
  effects: [
    {
      timing: "END_OF_TURN",
      targetType: "ALL_ENEMY",
      damage: 1,
    },
  ],
},
];

// Export all definitionss
export const allCardDefinitions: CardDefinition[] = [
  ...waterCardDefinitions,
  ...fireCardDefinitions,
];
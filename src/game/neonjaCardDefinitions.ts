// src/game/neonjaCardDefinitions.ts

import { CardDefinition } from "./cardEffects";

export const neonjaCardDefinitions: CardDefinition[] = [
  // ==================== TIER 1 CREATURES ====================
  {
    id: "NJ-C-001",
    name: "Neonja Null",
    kind: "CREATURE",
    tier: 1,
    atk: 1,
    hp: 1,
    type: "Warrior",
    text: "Evasion",
    imagePath: "/cards/neonja/Neonja Null.png",
    keywords: [{ keyword: "EVASION", evasion: true }],
    effects: [],
  },
  
  {
    id: "NJ-C-002",
    name: "Neonja Jitter",
    kind: "CREATURE",
    tier: 1,
    atk: 1,
    hp: 2,
    type: "Warrior",
    text: "Evasion. If this creature has evaded battle damage this duel, it gains +1 ATK.",
    imagePath: "/cards/neonja/Neonja Jitter.png",
    keywords: [{ keyword: "EVASION", evasion: true }],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "SELF",
        atkBuff: 1,
        buffDuration: "PERMANENT",
        triggerOncePerCondition: true,
        conditions: [{ type: "SELF_HAS_EVADED_THIS_DUEL" }],
      },
    ],
  },
  
  {
    id: "NJ-C-003",
    name: "Neonja Backdoor",
    kind: "CREATURE",
    tier: 1,
    atk: 2,
    hp: 1,
    type: "Warrior",
    text: "When this creature evades battle damage, look at your opponent's hand. (Once per turn)",
    imagePath: "/cards/neonja/Neonja Backdoor.png",
    keywords: [],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "SELF",
        peekHand: { target: "OPPONENT", revealCount: 1 },
        oncePerTurn: true,
      },
    ],
  },
  
  // ==================== TIER 2 CREATURES ====================
  {
    id: "NJ-C-101",
    name: "Neonja Framespike",
    kind: "CREATURE",
    tier: 2,
    atk: 2,
    hp: 3,
    type: "Warrior",
    text: "Evasion. When this creature evades battle damage, deal 1 damage to the attacking creature.",
    imagePath: "/cards/neonja/Neonja Framespike.png",
    keywords: [{ keyword: "EVASION", evasion: true }],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "ANY_CREATURE",
        damage: 1,
        oncePerTurn: true,
      },
    ],
  },
  
  {
    id: "NJ-C-102",
    name: "Neonja Payload",
    kind: "CREATURE",
    tier: 2,
    atk: 3,
    hp: 4,
    type: "Warrior",
    text: "When this creature attacks, if it has evaded battle damage this duel, deal 1 damage to any target. (Once per turn.)",
    imagePath: "/cards/neonja/Neonja Payload.png",
    keywords: [],
    effects: [
      {
        timing: "ON_ATTACK",
        targetType: "ANY_TARGET",
        damage: 1,
        oncePerTurn: true,
        conditions: [{ type: "SELF_HAS_EVADED_THIS_DUEL" }],
      },
    ],
  },
  
  {
    id: "NJ-C-103",
    name: "Neonja Callback",
    kind: "CREATURE",
    tier: 2,
    atk: 3,
    hp: 3,
    type: "Warrior",
    text: "When this creature enters play, you may return another creature you control to your hand.",
    imagePath: "/cards/neonja/Neonja Callback.png",
    keywords: [],
effects: [
  {
    timing: "ON_PLAY",
    targetType: "TARGET_CREATURE", // ✅ MUST BE THIS
    targetingRule: { type: "FRIENDLY_CREATURES", excludeSelf: true },
    bounce: true,
    optional: true,
  },
],
  },
  
  // ==================== TIER 3 CREATURES ====================
  {
    id: "NJ-C-201",
    name: "Neonja Desync",
    kind: "CREATURE",
    tier: 3,
    atk: 4,
    hp: 4,
    type: "Warrior",
    text: "Evasion. When this creature evades battle damage, stun the attacking creature for 1 turn.",
    imagePath: "/cards/neonja/Neonja Desync.png",
    keywords: [{ keyword: "EVASION", evasion: true }],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "ANY_CREATURE",
        stun: 1,
      },
    ],
  },
  
  {
    id: "NJ-C-202",
    name: "Neonja Uplink",
    kind: "CREATURE",
    tier: 3,
    atk: 4,
    hp: 5,
    type: "Warrior",
    text: "Once per turn, when another creature you control is returned to your hand, this creature gains +1 ATK.",
    imagePath: "/cards/neonja/Neonja Uplink.png",
    keywords: [],
    effects: [
      {
        timing: "ON_BOUNCE",
        targetType: "SELF",
        atkBuff: 1,
        buffDuration: "PERMANENT",
        requiresFriendlyBounce: true,
      },
    ],
  },
  
  // ==================== TIER 4 CREATURES ====================
  {
    id: "NJ-C-301",
    name: "Neonja Deadlink",
    kind: "CREATURE",
    tier: 4,
    atk: 6,
    hp: 6,
    type: "Warrior",
    text: "Once per turn, when a creature you control evades battle damage, deal 1 damage to your opponent.",
    imagePath: "/cards/neonja/Neonja Deadlink.png",
    keywords: [],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "OPPONENT_PLAYER",
        damage: 1,
        oncePerTurn: true,
        requiresFriendlyEvade: true,
      },
    ],
  },
  
// ==================== FAST SPELLS ====================

{
  id: "NJ-FS-001",
  name: "Instant Smoke",
  kind: "FAST_SPELL",
  tier: 4, // ✅ NEW
  text: "Return a creature you control to your hand.",
  imagePath: "/cards/neonja/Instant Smoke.png",
  effects: [
    {
      timing: "ON_PLAY",
      targetType: "TARGET_CREATURE", // ✅ was ANY_CREATURE
      targetingRule: { type: "FRIENDLY_CREATURES" }, // "a creature you control"
      bounce: true,
    },
  ],
},

{
  id: "NJ-FS-002",
  name: "Frame Skip",
  kind: "FAST_SPELL",
  tier: 2, // ✅ NEW
  text: "A Neonja creature you control evades the next battle damage it would take this turn.",
  imagePath: "/cards/neonja/Frame Skip.png",
  effects: [
    {
      timing: "ON_PLAY",
      targetType: "TARGET_CREATURE", // ✅ was ANY_CREATURE
      targetingRule: { type: "FRIENDLY_CREATURES" },
      evasion: true,
    },
  ],
},

{
  id: "NJ-FS-003",
  name: "Packet Loss",
  kind: "FAST_SPELL",
  tier: 3, // ✅ NEW
  text: "If a creature you control evaded battle damage this duel, return it to your hand.",
  imagePath: "/cards/neonja/Packet Loss.png",
  effects: [
    {
      timing: "ON_PLAY",
      targetType: "TARGET_CREATURE",
      targetingRule: { type: "FRIENDLY_CREATURES" },
      bounce: true,
      conditions: [{ type: "TARGET_HAS_EVADED_THIS_DUEL" }], // ✅ generic condition (you likely already have this or can add)
    },
  ],
},

{
  id: "NJ-FS-004",
  name: "Glitched Counter",
  kind: "FAST_SPELL",
  tier: 1, // ✅ NEW
  text: "If an enemy attack missed this turn, deal 2 damage to any target.",
  imagePath: "/cards/neonja/Glitched Counter.png",
  effects: [
    {
      timing: "ON_PLAY",
      targetType: "TARGET", // if you support TARGET with targetingRule; otherwise use TARGET_CREATURE/TARGET_PLAYER split
      targetingRule: { type: "ANY_PLAYER" }, // (see note below)
      damage: 2,
      conditions: [{ type: "ENEMY_ATTACK_MISSED_THIS_TURN" }],
    },
  ],
},

// ==================== SLOW SPELLS ====================

{
  id: "NJ-SS-001",
  name: "Silent Execution",
  kind: "SLOW_SPELL",
  tier: 2, // ✅ NEW
  text: "If a Neonja creature you control evaded battle damage this turn, destroy 1 Tier 3 or lower creature your opponent controls.",
  imagePath: "/cards/neonja/Silent Execution.png",
  effects: [
    {
      timing: "ON_PLAY",
      targetType: "TARGET_CREATURE",
      targetingRule: { type: "ENEMY_CREATURES", maxTier: 3 },
      destroy: true,
      conditions: [{ type: "ANY_FRIENDLY_EVADED_THIS_TURN" }],
    },
  ],
},
  
  // ==================== RELICS ====================
{
  id: "NJ-R-001",
  name: "Makibishi",
  kind: "RELIC",
  text: "When the equipped creature is returned to your hand, replace the creature with a Makibishi token.",
  imagePath: "/cards/neonja/Makibishi.png",
  keywords: [],
  effects: [
    {
      timing: "ON_BOUNCE",
      targetType: "NONE",
      summonTokenCardId: "NJ-TOKEN-001",
      summonTo: "BOUNCED_SLOT",
    },
  ],
},
  
{
  id: "NJ-R-002",
  name: "Smoke Bomb",
  kind: "RELIC",
  text: "Grant Evasion.",
  imagePath: "/cards/neonja/Smoke Bomb.png",
  keywords: [], // optional: you can omit this entirely if your type allows
},
  
  // ==================== TOKENS ====================
  {
    id: "NJ-TOKEN-001",
    name: "Makibishi Token",
    kind: "CREATURE",
    tier: 0,
    atk: 0,
    hp: 1,
    type: "Warrior",
    text: "Thorns 2",
    imagePath: "/cards/neonja/Makibishi Token.png",
    keywords: [{ keyword: "THORNS", thorns: 2 }],
    effects: [],
  },
  
  // ==================== EVOLUTIONS ====================
// Neonja Evolutions (updated to use structured evolution conditions)
  {
    id: "NJ-E-001",
    name: "Neonja Jitterflux",
    kind: "EVOLUTION",
    baseName: "Neonja Jitter",
    requiredTier: 1,
    tier: 2.5,
    atk: 2,
    hp: 3,
    type: "Warrior",
    text: "Evasion. Whenever a creature you control dodges battle damage, this creature gains +1 ATK.",
    imagePath: "/cards/neonja/Neonja Jitterflux.png",
    keywords: [{ keyword: "EVASION", evasion: true }],
    conditions: [{ type: "SELF_HAS_EVADED_THIS_DUEL" }],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "SELF",
        atkBuff: 1,
        buffDuration: "PERMANENT",
        // triggers whenever a friendly creature evades (your ON_EVADE is global)
        conditions: [{ type: "ANY_FRIENDLY_EVADED_THIS_TURN" }],
      },
    ],
  },

  {
    id: "NJ-E-002",
    name: "Neonja Lagspike",
    kind: "EVOLUTION",
    baseName: "Neonja Framespike",
    requiredTier: 2,
    tier: 3.5,
    atk: 4,
    hp: 4,
    type: "Warrior",
    text: "Evasion. Whenever this creature evades battle damage, choose one: Draw 1 or return another friendly creature.",
    imagePath: "/cards/neonja/Neonja Lagspike.png",
    keywords: [{ keyword: "EVASION", evasion: true }],
    conditions: [{ type: "YOU_RETURNED_A_CREATURE_TO_HAND_THIS_TURN" }],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "NONE",
        // If you want “ONLY when Lagspike itself evades”, we can add a condition:
        // { type: "TRIGGERING_CREATURE_IS_SELF" } later.
        choice: {
          options: [
            { label: "Draw 1 card", effects: [{ timing: "IMMEDIATE", targetType: "NONE", draw: 1 }] },
            {
              label: "Return another friendly creature to hand",
              effects: [
                {
                  timing: "IMMEDIATE",
                  targetType: "TARGET",
                  targetingRule: { type: "FRIENDLY_CREATURES", excludeSelf: true },
                  bounce: true,
                },
              ],
            },
          ],
        },
      },
    ],
  },

  {
    id: "NJ-E-003",
    name: "Neonja Dephase",
    kind: "EVOLUTION",
    baseName: "Neonja Callback",
    requiredTier: 2,
    tier: 4.5,
    atk: 6,
    hp: 6,
    type: "Warrior",
    text: "Once per turn, when a creature you control evades, you may return that creature. If you do, choose one payoff.",
    imagePath: "/cards/neonja/Neonja Dephase.png",
    keywords: [],
    conditions: [{ type: "A_FRIENDLY_CREATURE_EVADED_THIS_TURN" }],
    effects: [
      {
        timing: "ON_EVADE",
        targetType: "NONE",
        oncePerTurn: true,
        optional: true,
        choice: {
          options: [
            {
              label: "Return the evading creature, then choose payoff",
              effects: [
                {
                  timing: "IMMEDIATE",
                  targetType: "TRIGGERING",
                  targetTriggeringCreature: true,
                  bounce: true,
                },
                {
                  timing: "IMMEDIATE",
                  targetType: "NONE",
                  choice: {
                    options: [
                      {
                        label: "Destroy target Tier 2 or lower enemy creature",
                        effects: [
                          {
                            timing: "IMMEDIATE",
                            targetType: "TARGET",
                            targetingRule: { type: "ENEMY_CREATURES", maxTier: 2 },
                            destroy: true,
                          },
                        ],
                      },
                      {
                        label: "Dephase gains +1 ATK permanently",
                        effects: [{ timing: "IMMEDIATE", targetType: "SELF", atkBuff: 1, buffDuration: "PERMANENT" }],
                      },
                    ],
                  },
                },
              ],
            },
            { label: "Do nothing", effects: [] },
          ],
        },
      },
    ],
  },

  {
    id: "NJ-E-004",
    name: "Neonja Deadsite",
    kind: "EVOLUTION",
    baseName: "Neonja Deadlink",
    requiredTier: 4,
    tier: 5,
    atk: 7,
    hp: 8,
    type: "Warrior",
    text: "End of turn: if you evaded this turn, deal 2 to opponent. Whenever you bounce a creature, this gains +1 ATK until end of turn.",
    imagePath: "/cards/neonja/Neonja Deadsite.png",
    keywords: [],
    conditions: [{ type: "TWO_OR_MORE_FRIENDLY_CREATURES_EVADED_THIS_DUEL" }],
    effects: [
      {
        timing: "END_OF_TURN",
        targetType: "TARGET",
        targetingRule: { type: "ENEMY_PLAYER" },
        damage: 2,
        conditions: [{ type: "ANY_FRIENDLY_EVADED_THIS_TURN" }],
      },
      {
        timing: "ON_BOUNCE",
        targetType: "SELF",
        atkBuff: 1,
        buffDuration: "TURN",
        conditions: [{ type: "ANY_FRIENDLY_BOUNCED_THIS_TURN" }],
      },
    ],
  },
];

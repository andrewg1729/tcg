// src/game/keywordGuide.ts

export type KeywordTiming =
  | "static"      // Always on while the card is in play
  | "triggered"   // Fires when some event happens
  | "status"      // Temporary state on a creature
  | "spell-speed" // How/when you can cast a spell
  | "card-type";  // Label for card types / special mechanics

export interface KeywordDefinition {
  /** Canonical keyword name as used in rules / code */
  keyword: string;
  /** How it should appear on the card / in UI (can include X, etc.) */
  label: string;
  /** High-level timing category */
  timing: KeywordTiming;
  /** 1–2 sentence short text for tooltips */
  short: string;
  /** Longer explanation for rules / help screen */
  detailed: string;
  /** Optional extra rules / edge case notes */
  notes?: string;
}

/**
 * Master list of rules keywords currently in the game.
 * In the future you can attach these to cards by keyword string
 * and show them as tooltips or in a help overlay.
 */
export const KEYWORD_DEFINITIONS: KeywordDefinition[] = [
  // ----------------------
  // Core combat / defense
  // ----------------------
  {
    keyword: "Armor",
    label: "Armor X",
    timing: "static",
    short:
      "Incoming damage to this creature is reduced by X each time it takes damage.",
    detailed:
      "Armor X reduces damage dealt to this creature by X every time it would take damage. " +
      "If the damage is less than or equal to X, the damage is reduced to 0. " +
      "Armor does not reduce healing or life loss that is not damage.",
    notes:
      "Armor applies to both combat and spell damage unless an effect says otherwise.",
  },
  {
    keyword: "Regen",
    label: "Regen X",
    timing: "static",
    short:
      "At the start of your turn, this creature heals X damage (up to its max HP).",
    detailed:
      "During the start-of-turn step, before you attack or cast spells, each of your creatures " +
      "with Regen X heals X HP, up to its printed (plus bonus) maximum HP. Regen does not trigger " +
      "if the creature is no longer on the board.",
  },
  {
    keyword: "Shield",
    label: "Shield",
    timing: "static",
    short:
      "The next spell or effect that would affect this creature is prevented and the Shield is removed.",
    detailed:
      "Shield protects this creature from the next spell or ability that would deal damage to it or " +
      "target it. That effect is prevented for this creature, then the Shield is removed. " +
      "Shield does not stop global effects that do not target and do not deal damage directly, " +
      "unless we explicitly rule it that way on a specific card.",
    notes: "Implemented via spellShield in the engine.",
  },
  {
    keyword: "Lifetap",
    label: "Lifetap",
    timing: "static",
    short:
      "When this creature deals combat damage, you heal that much life.",
    detailed:
      "Whenever this creature successfully deals combat damage to an opposing creature or player, " +
      "you heal life equal to the damage actually dealt (after Armor, reductions, etc.). " +
      "Non-combat damage from spells or abilities does not trigger Lifetap unless a card says otherwise.",
  },
  {
    keyword: "Guard",
    label: "Guard",
    timing: "static",
    short:
      "Opponents must attack this creature before they can attack your other creatures or your life.",
    detailed:
      "If you control at least one creature with Guard, your opponent’s attacks must target a Guard " +
      "creature if they can. Only when no Guard creature is attackable can they attack your other " +
      "creatures or your life directly.",
    notes:
      "Exact targeting priority can be refined later, but conceptually this is a 'taunt' mechanic.",
  },
  {
    keyword: "First Strike",
    label: "First Strike",
    timing: "static",
    short:
      "In combat, this creature deals its damage before creatures without First Strike.",
    detailed:
      "When this creature attacks or is attacked, it deals combat damage before creatures that do " +
      "not have First Strike. If it destroys its opposing creature in this early damage step, " +
      "that creature does not deal combat damage back.",
  },
  {
    keyword: "Piercing",
    label: "Piercing",
    timing: "static",
    short:
      "Excess combat damage from this creature carries over to the defending player.",
    detailed:
      "When this creature attacks a creature and deals more damage than that creature’s remaining HP, " +
      "any excess damage is dealt to the opposing player. Piercing has no effect when attacking " +
      "players directly.",
  },

  // ----------------------
  // Triggered abilities
  // ----------------------
{
  keyword: "Death",
  label: "Death",
  timing: "triggered",
  short:
    "When this creature dies (destroyed or sacrificed), its effect triggers.",
  detailed:
    "A Death ability triggers when this creature leaves the board and is put into its owner's graveyard. " +
    "This includes dying in combat, being reduced to 0 HP, or being sacrificed as part of a summoning cost. " +
    "Death does not trigger if the creature is discarded from hand, returned to hand or deck, or otherwise removed " +
    "without going to the graveyard.",
  notes:
    "Replaces the former Last Breath keyword. Death triggers on sacrifice for Rank-up summoning.",
},
{
  keyword: "Surge",
  label: "Surge",
  timing: "triggered",
  short:
    "This creature gets +X ATK at the start of your turn until end of turn.",
  detailed:
    "At the start of your turn, this creature gains +X ATK as a temporary buff that lasts until " +
    "the end of your turn. This bonus is applied every turn, not just when the creature enters play. " +
    "Since creatures have summoning sickness when first played, Surge provides ongoing value. " +
    "Some cards may specify different Surge values (e.g., 'Surge +2').",
  notes: "Applied as tempAtkBuff at start of turn, removed at end of turn.",
},
  {
    keyword: "Catalyst",
    label: "Catalyst",
    timing: "triggered",
    short:
      "Triggers when you cast your first spell each turn.",
    detailed:
      "A Catalyst ability checks when you cast your first spell-speed card that turn (including spells, relics, " +
      "and locations as defined by the engine). If this is your first such card this turn, all Catalyst abilities " +
      "you control trigger. Later spells that turn do not retrigger Catalyst unless a card says otherwise.",
    notes:
      "Driftseer Acolyte and Flamebound Acolyte currently use this mechanic under the hood.",
  },

  // ----------------------
  // Status effects
  // ----------------------
  {
    keyword: "Stunned",
    label: "Stunned",
    timing: "status",
    short:
      "This creature cannot attack during its controller’s next turn.",
    detailed:
      "A Stunned creature skips its next opportunity to attack. After its controller’s next turn passes, " +
      "Stun is removed. Stun does not prevent it from blocking (if we later add blocks) or from being targeted.",
  },
  {
    keyword: "Summoning Sickness",
    label: "Summoning Sickness",
    timing: "status",
    short:
      "Creatures cannot attack on the turn they enter the field unless an effect says otherwise.",
    detailed:
      "Whenever a creature enters your board, it has summoning sickness until the start of your next turn. " +
      "While it has summoning sickness, it cannot be declared as an attacker. It can still be targeted, take " +
      "damage, be sacrificed, etc.",
  },

  // ----------------------
  // Spell speeds
  // ----------------------
  {
    keyword: "Fast",
    label: "Fast Spell",
    timing: "spell-speed",
    short:
      "Can be cast on either player’s turn, including during combat windows defined by the rules.",
    detailed:
      "Fast spells can be cast on your turn or your opponent’s turn at allowed timing windows (such as before attacks, " +
      "after an attack is declared, or in response to another effect, depending on the finalized timing rules). " +
      "In the current prototype, Fast simply means you can cast it outside of your main phase when the UI allows.",
  },
  {
    keyword: "Slow",
    label: "Slow Spell",
    timing: "spell-speed",
    short:
      "Can only be cast during your own Main phase.",
    detailed:
      "Slow spells may only be cast on your turn, during your Main phase, when the stack is empty (if we later " +
      "formalize a stack). In the current implementation, the button for a Slow spell is disabled unless it is "      +
      "your turn and the phase is MAIN.",
  },

  // ----------------------
  // Card types / special mechanics
  // ----------------------
  {
    keyword: "Relic",
    label: "Relic",
    timing: "card-type",
    short:
      "An item that attaches to one of your creatures and grants ongoing bonuses.",
    detailed:
      "Relics are played attached to a specific creature on your board. They usually grant Armor, ATK, HP, Regen, " +
      "or other continuous bonuses as long as that creature remains on the field. If the creature dies, the relic " +
      "goes to your graveyard (unless a card says otherwise).",
    notes:
      "Tracked in the engine as { relic, slotIndex } plus stat bonuses on the creature.",
  },
  {
    keyword: "Location",
    label: "Location",
    timing: "card-type",
    short:
      "A global field effect for your side that lasts a limited number of your turns.",
    detailed:
      "Locations represent the battlefield itself: ocean trenches, volcanic ridges, etc. You may control at most " +
      "one Location at a time. Playing a new Location replaces your previous one, which goes to the graveyard. " +
      "Each Location has a duration measured in your turns; when that many of your turns have passed, it expires.",
  },
  {
    keyword: "Evolution",
    label: "Evolution (Evo)",
    timing: "card-type",
    short:
      "A stronger form that upgrades a specific base creature, keeping its slot but replacing its stats and text.",
    detailed:
      "Evolution cards (Evos) represent an upgraded form of a specific base creature. Transform-style Evos require " +
      "you to control the exact base name and rank shown on the card, then replace it in place. Drop-In Evos can be " +
      "played into an empty slot or overwrite an existing creature as specified.",
  },
  {
    keyword: "Transform",
    label: "Transform",
    timing: "card-type",
    short:
      "Replaces a specific base creature with this Evolution in the same slot.",
    detailed:
      "A Transform Evolution checks that the chosen creature on your board matches the required base name and rank. " +
      "If it does, you replace that creature with the Evolution in the same slot, carrying over board position but " +
      "using the Evo’s ATK, HP, and text. The base creature goes to the graveyard unless an effect says otherwise.",
  },
  {
    keyword: "Drop-In",
    label: "Drop-In",
    timing: "card-type",
    short:
      "An Evolution that can enter an empty slot, or overwrite an existing creature, as specified.",
    detailed:
      "Drop-In Evolutions do not require a specific base creature. They can be played into empty board slots, and " +
      "some may allow you to overwrite an existing creature, sending it to the graveyard. Exact overwrite rules " +
      "are printed on the card.",
  },
];

export const KEYWORD_LOOKUP: Record<string, KeywordDefinition> = KEYWORD_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.keyword] = def;
    return acc;
  },
  {} as Record<string, KeywordDefinition>
);

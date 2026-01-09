// src/game/evolutionConditions.ts
import { GameState } from "./types";

export type EvolutionCondition =
  | { type: "SELF_HAS_EVADED_THIS_DUEL" }
  | { type: "YOU_RETURNED_A_CREATURE_TO_HAND_THIS_TURN" }
  | { type: "A_FRIENDLY_CREATURE_EVADED_THIS_TURN" }
  | { type: "TWO_OR_MORE_FRIENDLY_CREATURES_EVADED_THIS_DUEL" }; // field-only

export function areEvolutionConditionsMet(
  gs: GameState,
  playerIndex: number,
  slotIndex: number,
  conditions?: EvolutionCondition[]
): boolean {
  if (!conditions || conditions.length === 0) return true;

  const player: any = gs.players[playerIndex];
  const bc = player.board[slotIndex];

  // If you’re evolving, the slot must contain a creature.
  if (!bc) return false;

  for (const cond of conditions) {
    switch (cond.type) {
      case "SELF_HAS_EVADED_THIS_DUEL": {
        if (!(bc as any).hasEvadedThisDuel) return false;
        break;
      }

      case "YOU_RETURNED_A_CREATURE_TO_HAND_THIS_TURN": {
        // You said you already track bounces. This supports either approach:
        // - bouncedThisTurn: Set<number>
        // - returnedCreatureToHandThisTurn: boolean
        const bounced = player.bouncedThisTurn;
        const ok =
          (bounced instanceof Set && bounced.size > 0) ||
          !!player.returnedCreatureToHandThisTurn;
        if (!ok) return false;
        break;
      }

      case "A_FRIENDLY_CREATURE_EVADED_THIS_TURN": {
        const evaded = player.evadedThisTurn;
        const ok = evaded instanceof Set && evaded.size > 0;
        if (!ok) return false;
        break;
      }

      case "TWO_OR_MORE_FRIENDLY_CREATURES_EVADED_THIS_DUEL": {
        // Field-only interpretation: count current board creatures with hasEvadedThisDuel
        let count = 0;
        for (let i = 0; i < player.board.length; i++) {
          const c = player.board[i];
          if (!c) continue;
          if (!!(c as any).hasEvadedThisDuel) count++;
        }
        if (count < 2) return false;
        break;
      }

      default:
        // fail closed
        return false;
    }
  }

  return true;
}

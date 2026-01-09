// src/components/BoardCreatureView.tsx
import React from "react";
import {
  BoardCreature,
  PlayerState,
  Phase,
  CreatureCard,
  EvolutionCard,
  GameState,
} from "../game/types";
import { cardRegistry } from "../game/cardRegistry";

interface BoardCreatureViewProps {
  bc: BoardCreature;
  slotIndex: number;
  player: PlayerState;
  isActiveRow: boolean;
  phase: Phase;
  isValidTarget?: boolean;
  gameState: GameState;
  playerIndex: number;
  onAttack?: (mySlot: number, target: "PLAYER" | number) => void;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export const BoardCreatureView: React.FC<BoardCreatureViewProps> = ({
  bc,
  slotIndex,
  player,
  isActiveRow,
  phase,
  isValidTarget = false,
  gameState,
  playerIndex,
  onAttack,
  onClick,
  onMouseEnter,
}) => {
  const card = bc.card as CreatureCard | EvolutionCard;

  // Calculate full effective ATK including all bonuses
  const baseAtk = (card as any).atk ?? 0; // already includes relic bonus
  const tempAtkBuff = (bc as any).tempAtkBuff ?? 0;
  const permAtkBuff = (bc as any).permAtkBuff ?? 0;

  // Calculate Awaken bonus
  const enemyIndex = playerIndex === 0 ? 1 : 0;
  const hasAwaken = cardRegistry
    .getKeywords(card.name)
    .some((kw) => kw.keyword === "AWAKEN");
  const awakenBonus =
    hasAwaken && player.life < gameState.players[enemyIndex].life ? 1 : 0;

  const displayAtk = baseAtk + permAtkBuff + tempAtkBuff + awakenBonus;

  return (
    <div
      className={`board-creature-container ${
        isValidTarget ? "valid-target" : ""
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {/* Card Image */}
      {card.imagePath ? (
        <img
          src={card.imagePath}
          alt={card.name}
          className="board-creature-image"
        />
      ) : (
        <div className="board-creature-placeholder">{card.name}</div>
      )}

      {/* Overlay with stats and info */}
      <div className="board-creature-overlay">
        <div className="board-creature-stats">
          <span className="stat-badge atk-badge">{displayAtk}</span>
          <span className="stat-badge hp-badge">{bc.currentHp}</span>
        </div>

        {bc.hasSummoningSickness && (
          <div className="status-indicator summoning-sickness">😴</div>
        )}

        {(bc as any).stunnedForTurns > 0 && (
          <div className="status-indicator stunned">💫</div>
        )}
      </div>

      {/* Action buttons */}
      {isActiveRow &&
        phase === "BATTLE_DECLARE" && // ✅ use battle declare phase
        !bc.hasSummoningSickness &&
        onAttack && (
          <div className="board-creature-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAttack(slotIndex, "PLAYER");
              }}
            >
              Attack Player
            </button>
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onAttack(slotIndex, idx);
                }}
              >
                Slot {idx + 1}
              </button>
            ))}
          </div>
        )}
    </div>
  );
};

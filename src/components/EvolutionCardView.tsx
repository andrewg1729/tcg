// src/components/EvolutionCardView.tsx
import React from "react";
import { EvolutionCard, PlayerState, CreatureCard } from "../game/types";

interface EvolutionCardViewProps {
  evo: EvolutionCard;
  player: PlayerState;
  onTransform: (slotIndex: number) => void;
  onDropIn: (slotIndex: number, overwriteExisting: boolean) => void;
  onMouseEnter?: () => void;
}

export const EvolutionCardView: React.FC<EvolutionCardViewProps> = ({
  evo,
  player,
  onTransform,
  onDropIn,
  onMouseEnter,
}) => {
  const isTransform = evo.evoType === "TRANSFORM";

  return (
    <div 
      className="evo-card"
      onMouseEnter={onMouseEnter}
    >
      {/* Card Image */}
      {evo.imagePath ? (
        <img 
          src={evo.imagePath} 
          alt={evo.name} 
          className="evo-card-image"
        />
      ) : (
        <div className="evo-card-placeholder">
          {evo.name}
        </div>
      )}

      {/* Action buttons */}
      <div className="evo-card-actions">
        {isTransform ? (
          <>
            <div className="evo-card-subtitle">Transform:</div>
            <div className="evo-card-buttons">
              {player.board.map((bc, idx) => {
                const disabled =
                  !bc ||
                  bc.card.kind !== "CREATURE" ||
                  (bc.card as CreatureCard).name !== evo.baseName ||
                  (bc.card as CreatureCard).rank !== evo.requiredRank;
                return (
                  <button
                    key={idx}
                    disabled={disabled}
                    onClick={() => onTransform(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="evo-card-subtitle">Drop-In:</div>
            <div className="evo-card-buttons">
              {player.board.map((bc, idx) => (
                <button
                  key={idx}
                  onClick={() => onDropIn(idx, !!bc)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
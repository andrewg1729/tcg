// src/components/EvolutionCardView.tsx
import React from "react";
import { EvolutionCard, PlayerState } from "../game/types";

interface EvolutionCardViewProps {
  evo: EvolutionCard;
  player: PlayerState;
  onDropIn: (slotIndex: number, overwriteExisting: boolean) => void;
  onMouseEnter?: () => void;
}

export const EvolutionCardView: React.FC<EvolutionCardViewProps> = ({
  evo,
  player,
  onDropIn,
  onMouseEnter,
}) => {
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
        <div className="evo-card-subtitle">Play Evolution:</div>
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
      </div>
    </div>
  );
};
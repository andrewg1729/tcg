// src/components/HandCard.tsx
import React from "react";
import { MainDeckCard, Phase } from "../game/types";

interface HandCardProps {
  card: MainDeckCard;
  phase: Phase;
  isActivePlayer: boolean;
  onSummon?: (slotIndex: number) => void;
  onCastSpell?: () => void;
  onPlayRelic?: () => void;
  index: number;
  total: number;
  isDiscardMode?: boolean;
  onDiscard?: (cardId: string) => void;
  onMouseEnter?: () => void;
}

export const HandCard: React.FC<HandCardProps> = ({
  card,
  phase,
  isActivePlayer,
  onSummon,
  onCastSpell,
  onPlayRelic,
  index,
  total,
  isDiscardMode,
  onDiscard,
  onMouseEnter,
}) => {
  const angleSpread = Math.min(15, 40 / Math.max(total, 1));
  const centerIndex = (total - 1) / 2;
  const angle = (index - centerIndex) * angleSpread;

  const isCreature = card.kind === "CREATURE" || card.kind === "EVOLUTION";
  const isSpell = card.kind === "FAST_SPELL" || card.kind === "SLOW_SPELL";
  const isRelic = card.kind === "RELIC";

  const handleClickDiscard = () => {
    if (isDiscardMode && onDiscard) {
      onDiscard(card.id);
    }
  };

  const canPlayNormally = isActivePlayer && !isDiscardMode;

  return (
    <div
      className={`hand-card ${isDiscardMode ? "hand-card-discard-mode" : ""}`}
      style={{
        transform: `rotate(${angle}deg)`,
      }}
      onClick={isDiscardMode ? handleClickDiscard : undefined}
      onMouseEnter={onMouseEnter}
    >
      {/* Card Image */}
      {card.imagePath ? (
        <img
          src={card.imagePath}
          alt={card.name}
          className="hand-card-image"
        />
      ) : (
        <div className="hand-card-placeholder">{card.name}</div>
      )}

      {/* Action buttons overlay */}
      {!isDiscardMode && (
        <div className="hand-card-actions">
          {isCreature && canPlayNormally && onSummon && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSummon(0);
                }}
              >
                L
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSummon(1);
                }}
              >
                C
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSummon(2);
                }}
              >
                R
              </button>
            </>
          )}

          {isSpell && canPlayNormally && onCastSpell && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCastSpell();
              }}
              disabled={card.kind === "SLOW_SPELL" && phase !== "MAIN"}
            >
              Cast
            </button>
          )}

          {isRelic && canPlayNormally && onPlayRelic && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayRelic();
              }}
            >
              Play
            </button>
          )}
        </div>
      )}

      {isDiscardMode && (
        <div className="hand-card-discard-hint">Click to discard</div>
      )}
    </div>
  );
};

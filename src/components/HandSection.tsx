// src/components/HandSection.tsx
import React from "react";
import { MainDeckCard, Phase, SpellCard, RelicCard, LocationCard } from "../game/types";
import { HandCard } from "./HandCard";

interface HandSectionProps {
  hand: MainDeckCard[];
  phase: Phase;
  isActivePlayer: boolean;
  isDiscardMode: boolean;
  onPlayCreature: (card: MainDeckCard, slotIndex: number) => void;
  onCastSpell: (card: SpellCard) => void;
  onPlayRelic: (cardId: string) => void;
  onPlayLocation: (card: LocationCard) => void;
  onDiscard: (cardId: string) => void;
  onMouseEnter: (card: MainDeckCard) => void;
}

export const HandSection: React.FC<HandSectionProps> = ({
  hand,
  phase,
  isActivePlayer,
  isDiscardMode,
  onPlayCreature,
  onCastSpell,
  onPlayRelic,
  onPlayLocation,
  onDiscard,
  onMouseEnter,
}) => {
  return (
    <section className="hand-section">
      <h3>Your Hand ({hand.length})</h3>
      <div className="hand-strip">
        {hand.map((card, i) => (
          <HandCard
            key={card.id}
            card={card}
            phase={phase}
            isActivePlayer={isActivePlayer}
            onSummon={(slotIndex) => onPlayCreature(card, slotIndex)}
            onCastSpell={
              card.kind === "FAST_SPELL" || card.kind === "SLOW_SPELL"
                ? () => onCastSpell(card as SpellCard)
                : undefined
            }
            onPlayRelic={
              card.kind === "RELIC" ? () => onPlayRelic(card.id) : undefined
            }
            onPlayLocation={
              card.kind === "LOCATION"
                ? () => onPlayLocation(card as LocationCard)
                : undefined
            }
            index={i}
            total={hand.length}
            isDiscardMode={isDiscardMode}
            onDiscard={onDiscard}
            onMouseEnter={() => onMouseEnter(card)}
          />
        ))}
      </div>
    </section>
  );
};
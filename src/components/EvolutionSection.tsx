// src/components/EvolutionSection.tsx
import React from "react";
import { EvolutionCard, PlayerState } from "../game/types";
import { EvolutionCardView } from "./EvolutionCardView";

interface EvolutionSectionProps {
  evolutions: EvolutionCard[];
  player: PlayerState;
  onTransform: (evo: EvolutionCard, slotIndex: number) => void;
  onDropIn: (evo: EvolutionCard, slotIndex: number, overwrite: boolean) => void;
  onMouseEnter: (evo: EvolutionCard) => void;
}

export const EvolutionSection: React.FC<EvolutionSectionProps> = ({
  evolutions,
  player,
  onTransform,
  onDropIn,
  onMouseEnter,
}) => {
  return (
    <section className="evo-section">
      <h3>Your Evolutions ({evolutions.length})</h3>
      <div className="evo-strip">
        {evolutions.map((evo) => (
          <EvolutionCardView
            key={evo.id}
            evo={evo}
            player={player}
            onTransform={(slotIndex) => onTransform(evo, slotIndex)}
            onDropIn={(slotIndex, overwrite) => onDropIn(evo, slotIndex, overwrite)}
            onMouseEnter={() => onMouseEnter(evo)}
          />
        ))}
      </div>
    </section>
  );
};
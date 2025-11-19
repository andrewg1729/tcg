// src/components/GameControls.tsx
import React from "react";
import { Phase } from "../game/types";

interface GameControlsProps {
  phase: Phase;
  log: string[];
  onEndPhase: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  phase,
  log,
  onEndPhase,
}) => {
  return (
    <section className="controls-log">
      <div className="controls-column">
        <button className="end-phase-btn" onClick={onEndPhase}>
          End Phase
        </button>
        <div className="phase-indicator">
          Current phase: <strong>{phase}</strong>
        </div>
      </div>
      <div className="log-column">
        <h3>Game Log</h3>
        <div className="log-box">
          {log
            .slice()
            .reverse()
            .map((l, i) => (
              <div key={i}>{l}</div>
            ))}
        </div>
      </div>
    </section>
  );
};
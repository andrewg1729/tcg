// src/components/GameHeader.tsx
import React from "react";
import { GameState, PlayerState } from "../game/types";

interface GameHeaderProps {
  state: GameState;
  active: PlayerState;
  infoText: string;
  onReset: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  state,
  active,
  infoText,
  onReset,
}) => {
  return (
    <div className="game-header">
      <h1>Constellations TCG — Local Playtest</h1>
      <div className="game-header-row">
        <span>
          Turn <strong>{state.turnNumber}</strong> —{" "}
          <strong>{active.name}</strong>&rsquo;s turn ({state.phase})
        </span>
        <button onClick={onReset}>Reset Game</button>
      </div>
      {infoText && <div className="game-info-banner">{infoText}</div>}
    </div>
  );
};
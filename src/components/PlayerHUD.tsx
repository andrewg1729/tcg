// src/components/PlayerHUD.tsx
import React from "react";
import { PlayerState } from "../game/types";

interface PlayerHUDProps {
  player: PlayerState;
  isActive: boolean;
  isTop?: boolean;
  onClickPortrait?: () => void;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  player,
  isActive,
  isTop,
  onClickPortrait,
}) => {
  return (
    <div
      className={`player-hud ${
        isTop ? "player-hud-top" : "player-hud-bottom"
      }`}
    >
      <div
        className={`player-portrait ${
          isActive ? "player-portrait-active" : ""
        } ${onClickPortrait ? "player-portrait-clickable" : ""}`}
        onClick={onClickPortrait}
      >
        <div className="player-name">{player.name}</div>
        <div className="player-life">{player.life}</div>
      </div>
      <div className="player-zones">
        <div className="zone-pill">
          Deck
          <span className="zone-count">{player.deck.length}</span>
        </div>
        <div className="zone-pill">
          Hand
          <span className="zone-count">{player.hand.length}</span>
        </div>
        <div className="zone-pill">
          Grave
          <span className="zone-count">{player.graveyard.length}</span>
        </div>
      </div>
    </div>
  );
};

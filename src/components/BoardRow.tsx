// src/components/BoardRow.tsx
import React from "react";
import { GameState, BoardCreature, PlayerState, EvolutionCard, LocationCard } from "../game/types";
import { BoardCreatureView } from "./BoardCreatureView";

const slotLabels = ["Left", "Center", "Right"];

interface BoardRowProps {
  label: string;
  playerIndex: number;
  state: GameState;
  isActiveRow: boolean;
  validTargets?: Array<{ playerIndex: number; slotIndex: number }>;
  onAttack?: (mySlot: number, target: "PLAYER" | number) => void;
  onClickCreature?: (playerIndex: number, slotIndex: number) => void;
  onMouseEnterCreature?: (bc: BoardCreature, player: PlayerState, slotIndex: number) => void;
  onMouseEnterRelic?: (relic: any) => void;
  onMouseEnterEvolution?: (evo: EvolutionCard) => void;
  onMouseEnterLocation?: (location: LocationCard) => void;
}

export const BoardRow: React.FC<BoardRowProps> = ({
  label,
  playerIndex,
  state,
  isActiveRow,
  validTargets = [],
  onAttack,
  onClickCreature,
  onMouseEnterCreature,
  onMouseEnterRelic,
  onMouseEnterEvolution,
  onMouseEnterLocation,
}) => {
  const player = state.players[playerIndex];

  return (
    <div className="board-row-container">
      <div className="board-row">
        <div className="board-row-label">{label}</div>
        
        <div className="board-row-slots-with-zones">
          {/* Evolution Deck */}
          <div 
            className="board-zone-slot evolution-deck-zone"
            onMouseEnter={
              onMouseEnterEvolution && player.evolutionDeck.length > 0
                ? () => onMouseEnterEvolution(player.evolutionDeck[0])
                : undefined
            }
          >
            <div className="board-slot-label">Evolutions</div>
            <div className="zone-slot-content">
              {player.evolutionDeck.length > 0 && player.evolutionDeck[0].imagePath ? (
                <img 
                  src={player.evolutionDeck[0].imagePath} 
                  alt="Evolution Deck" 
                  className="zone-slot-image"
                />
              ) : (
                <div className="zone-slot-placeholder">⭐</div>
              )}
              <div className="zone-slot-count">{player.evolutionDeck.length}</div>
            </div>
          </div>

          {/* Location Slot */}
          <div 
            className="board-zone-slot location-zone"
            onMouseEnter={
              onMouseEnterLocation && player.location
                ? () => onMouseEnterLocation(player.location!)
                : undefined
            }
          >
            <div className="board-slot-label">Location</div>
            <div className="zone-slot-content">
              {player.location?.imagePath ? (
                <img 
                  src={player.location.imagePath} 
                  alt={player.location.name} 
                  className="zone-slot-image"
                />
              ) : (
                <div className="zone-slot-placeholder">📍</div>
              )}
            </div>
          </div>

          {/* Creature Slots */}
          {player.board.map((bc, idx) => {
            const isValidTarget = validTargets.some(
              vt => vt.playerIndex === playerIndex && vt.slotIndex === idx
            );
            
            return (
              <div key={idx} className="board-slot">
                <div className="board-slot-label">{slotLabels[idx]}</div>
                {bc ? (
                  <BoardCreatureView
                    bc={bc}
                    slotIndex={idx}
                    player={player}
                    isActiveRow={isActiveRow}
                    phase={state.phase}
                    isValidTarget={isValidTarget}
                      gameState={state} // Add this
  playerIndex={playerIndex} // Add this
                    onAttack={onAttack}
                    onClick={
                      onClickCreature
                        ? () => onClickCreature(playerIndex, idx)
                        : undefined
                    }
                    onMouseEnter={
                      onMouseEnterCreature
                        ? () => onMouseEnterCreature(bc, player, idx)
                        : undefined
                    }
                  />
                ) : (
                  <div className="board-slot-empty">Empty</div>
                )}
              </div>
            );
          })}

          {/* Deck */}
          <div className="board-zone-slot deck-zone">
            <div className="board-slot-label">Deck</div>
            <div className="zone-slot-content">
              <div className="zone-slot-placeholder">🎴</div>
              <div className="zone-slot-count">{player.deck.length}</div>
            </div>
          </div>

          {/* Graveyard */}
          <div 
            className="board-zone-slot graveyard-zone"
            onMouseEnter={
              player.graveyard.length > 0
                ? () => {
                    const topCard = player.graveyard[player.graveyard.length - 1];
                    if (onMouseEnterRelic) {
                      onMouseEnterRelic(topCard);
                    }
                  }
                : undefined
            }
          >
            <div className="board-slot-label">Graveyard</div>
            <div className="zone-slot-content">
              {player.graveyard.length > 0 && player.graveyard[player.graveyard.length - 1].imagePath ? (
                <img 
                  src={player.graveyard[player.graveyard.length - 1].imagePath} 
                  alt="Graveyard" 
                  className="zone-slot-image"
                />
              ) : (
                <div className="zone-slot-placeholder">💀</div>
              )}
              <div className="zone-slot-count">{player.graveyard.length}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Relics row - rendered BELOW the creature slots only */}
      <div className="board-relics-row">
        {/* Empty space for evolution and location */}
        <div className="board-relics-spacer"></div>
        <div className="board-relics-spacer"></div>
        
        {/* Relics under creature slots */}
        {player.board.map((bc, idx) => {
          const attachedRelics = player.relics.filter((r) => r.slotIndex === idx);
          
          return (
            <div key={idx} className="board-relic-slot">
              {attachedRelics.length > 0 && (
                <div className="attached-relics">
                  {attachedRelics.map((relicData, relicIdx) => (
                    <div 
                      key={relicIdx} 
                      className="attached-relic-mini"
                      title={relicData.relic.name}
                      onMouseEnter={
                        onMouseEnterRelic 
                          ? () => onMouseEnterRelic(relicData.relic)
                          : undefined
                      }
                    >
                      {relicData.relic.imagePath ? (
                        <img 
                          src={relicData.relic.imagePath} 
                          alt={relicData.relic.name}
                          className="attached-relic-image"
                        />
                      ) : (
                        <div className="attached-relic-placeholder">
                          {relicData.relic.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Empty space for deck and graveyard */}
        <div className="board-relics-spacer"></div>
        <div className="board-relics-spacer"></div>
      </div>
    </div>
  );
};
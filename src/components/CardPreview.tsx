// src/components/CardPreview.tsx

import React from "react";
import { MainDeckCard, CreatureCard, EvolutionCard, BoardCreature, PlayerState } from "../game/types";
import { cardRegistry } from "../game/cardRegistry";
import "../CardPreview.css";

interface CardPreviewProps {
  card: MainDeckCard | EvolutionCard | BoardCreature | null;
  playerState?: PlayerState; // For checking buffs/relics
  slotIndex?: number; // If it's a board creature
}

export const CardPreview: React.FC<CardPreviewProps> = ({ card, playerState, slotIndex }) => {
  if (!card) {
    return (
      <div className="card-preview-panel">
        <div className="card-preview-empty">
          Hover over a card to preview
        </div>
      </div>
    );
  }

  // Handle BoardCreature vs regular card
  const actualCard = "card" in card ? card.card : card;
  const boardCreature = "card" in card ? card : null;

  const isCreature = actualCard.kind === "CREATURE" || actualCard.kind === "EVOLUTION";
  const keywords = cardRegistry.getKeywords(actualCard.name);
  const effects = cardRegistry.getEffects(actualCard.name);

  // Get dynamic stats if it's on the board
  let displayAtk = isCreature ? (actualCard as any).atk : undefined;
  let displayHp = boardCreature ? boardCreature.currentHp : isCreature ? (actualCard as any).hp : undefined;
  let maxHp = isCreature ? (actualCard as any).hp : undefined;
  let tempAtkBuff = 0;
  let relicCount = 0;

  if (boardCreature && playerState && slotIndex !== undefined) {
    tempAtkBuff = (boardCreature as any).tempAtkBuff || 0;
    displayAtk = (displayAtk || 0) + tempAtkBuff;
    relicCount = playerState.relics.filter(r => r.slotIndex === slotIndex).length;
  }

  return (
    <div className="card-preview-panel">
      <div className="card-preview-content">
        {/* Card Image */}
        <div className="card-preview-image">
          {actualCard.imagePath ? (
            <img src={actualCard.imagePath} alt={actualCard.name} />
          ) : (
            <div className="card-preview-placeholder">
              {actualCard.name}
            </div>
          )}
        </div>

        {/* Card Name & Type */}
        <div className="card-preview-header">
          <h3 className="card-preview-name">{actualCard.name}</h3>
          <div className="card-preview-type">
            {actualCard.kind === "CREATURE" && `Rank ${(actualCard as CreatureCard).rank} Creature`}
            {actualCard.kind === "EVOLUTION" && "Evolution"}
            {actualCard.kind === "FAST_SPELL" && "Fast Spell"}
            {actualCard.kind === "SLOW_SPELL" && "Slow Spell"}
            {actualCard.kind === "RELIC" && "Relic"}
            {actualCard.kind === "LOCATION" && "Location"}
          </div>
        </div>

        {/* Stats (for creatures) */}
        {isCreature && (
          <div className="card-preview-stats">
            <div className="card-preview-stat-row">
              <span className="stat-label">ATK:</span>
              <span className="stat-value atk-value">
                {displayAtk}
                {tempAtkBuff > 0 && <span className="stat-buff"> (+{tempAtkBuff})</span>}
              </span>
            </div>
            <div className="card-preview-stat-row">
              <span className="stat-label">HP:</span>
              <span className="stat-value hp-value">
                {displayHp}
                {boardCreature && maxHp !== displayHp && <span className="stat-max"> / {maxHp}</span>}
              </span>
            </div>
          </div>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="card-preview-keywords">
            <h4>Keywords:</h4>
            <div className="keyword-list">
              {keywords.map((kw, idx) => (
                <span key={idx} className="keyword-badge">
                  {kw.keyword}
                  {kw.armor && ` ${kw.armor}`}
                  {kw.regen && ` ${kw.regen}`}
                  {kw.surge && ` ${kw.surge}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active Effects/Buffs */}
        {boardCreature && (
          <div className="card-preview-active-effects">
            <h4>Active Effects:</h4>
            <div className="effect-list">
              {(boardCreature as any).frozenForTurns > 0 && (
                <div className="effect-item frozen">
                  Frozen ({(boardCreature as any).frozenForTurns} turns)
                </div>
              )}
              {(boardCreature as any).preventedDamage > 0 && (
                <div className="effect-item shield">
                  Shield ({(boardCreature as any).preventedDamage} damage prevented)
                </div>
              )}
              {(boardCreature as any).spellShield && (
                <div className="effect-item spell-shield">
                  Spell Shield Active
                </div>
              )}
              {boardCreature.hasSummoningSickness && (
                <div className="effect-item sickness">
                  Summoning Sickness
                </div>
              )}
              {relicCount > 0 && (
                <div className="effect-item relics">
                  {relicCount} Relic{relicCount > 1 ? "s" : ""} Equipped
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card Text */}
        <div className="card-preview-text">
          <h4>Effect:</h4>
          <p>{actualCard.text}</p>
        </div>

        {/* Effects Detail (optional, for debugging) */}
        {effects.length > 0 && (
          <div className="card-preview-effects-detail">
            <h4>Triggered Effects:</h4>
            <ul>
              {effects.map((eff, idx) => (
                <li key={idx}>
                  <strong>{eff.timing}:</strong>{" "}
                  {eff.damage && `Deal ${eff.damage} damage. `}
                  {eff.heal && `Heal ${eff.heal}. `}
                  {eff.draw && `Draw ${eff.draw}. `}
                  {eff.atkBuff && `+${eff.atkBuff} ATK. `}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
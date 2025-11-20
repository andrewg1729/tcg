// src/components/CardPreview.tsx

import React, { useState, useEffect } from "react";
import { MainDeckCard, CreatureCard, EvolutionCard, BoardCreature, PlayerState, GameState } from "../game/types";
import { cardRegistry } from "../game/cardRegistry";
import "../CardPreview.css";

interface CardPreviewProps {
  card: MainDeckCard | EvolutionCard | BoardCreature | null;
  playerState?: PlayerState;
  slotIndex?: number;
  gameState?: GameState;
  playerIndex?: number;
}

// Keyword explanations
const KEYWORD_TOOLTIPS: Record<string, string> = {
  GUARD: "Enemies must attack this creature first while it lives.",
  ARMOR: "Reduces all incoming damage by X.",
  REGEN: "Heals X HP at the start of your turn.",
  SPELL_SHIELD: "The first enemy spell that targets this creature is negated.",
  FIRST_STRIKE: "Deals combat damage before the opposing creature.",
  DOUBLE_STRIKE: "Deals combat damage twice (first strike timing + regular timing).",
  PIERCING: "Excess damage dealt to creatures carries over to the opponent.",
  LIFETAP: "When this creature hits the enemy leader, heal your leader 1 HP.",
  SURGE: "At the start of your turn, this creature gets +X ATK until end of turn.",
  CATALYST: "Triggers an effect when you cast your first spell each turn.",
  AWAKEN: "Gains bonus stats while your life is lower than your opponent's.",
  UN_TARGETABLE: "Cannot be targeted by enemy spells.",
  RESISTANT: "Takes X less damage from spells only.",
  REFLECT: "The first enemy spell targeting this creature targets the opponent instead.",
  EMPOWER: "Counts as +1 HP toward sacrifice summoning.",
  VIGILANT: "This creature can attack twice per turn.",
  SWIFT: "Does not have summoning sickness (can attack immediately).",
  DEATH: "Triggers an effect when this creature dies.",
    THORNS: "When this creature takes damage from an attack, deal X damage back to the attacker.",
};

export const CardPreview: React.FC<CardPreviewProps> = ({ 
  card, 
  playerState, 
  slotIndex,
  gameState,
  playerIndex 
}) => {
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  // Adjust tooltip position to keep it on screen
  useEffect(() => {
    if (hoveredKeyword && tooltipSize.width > 0) {
      const padding = 10;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = tooltipPosition.x;
      let adjustedY = tooltipPosition.y - 10;

      // Check right edge
      if (adjustedX + tooltipSize.width / 2 > viewportWidth - padding) {
        adjustedX = viewportWidth - tooltipSize.width / 2 - padding;
      }

      // Check left edge
      if (adjustedX - tooltipSize.width / 2 < padding) {
        adjustedX = tooltipSize.width / 2 + padding;
      }

      // Check top edge
      if (adjustedY - tooltipSize.height < padding) {
        adjustedY = tooltipPosition.y + 30; // Position below keyword instead
      }

      if (adjustedX !== tooltipPosition.x || adjustedY !== tooltipPosition.y) {
        setTooltipPosition({ x: adjustedX, y: adjustedY });
      }
    }
  }, [hoveredKeyword, tooltipSize]);

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
  let relicCount = 0;
  let conditionalBonuses = { awaken: 0, surge: 0, temp: 0 };

  if (boardCreature && playerState && slotIndex !== undefined) {
  const baseTempBuff = (boardCreature as any).tempAtkBuff || 0;
  
  // Calculate relic ATK bonus
  const relicAtkBonus = playerState.relics
    .filter(r => r.slotIndex === slotIndex)
    .reduce((sum, relicData) => {
      const relicName = relicData.relic.name;
      if (relicName === "Ember-Iron Gauntlets") return sum + 2;
      return sum;
    }, 0);
  
  // Calculate Awaken bonus
  let awakenBonus = 0;
  if (gameState && playerIndex !== undefined) {
    const enemyIndex = playerIndex === 0 ? 1 : 0;
    const hasAwaken = keywords.some(kw => kw.keyword === "AWAKEN");
    if (hasAwaken && playerState.life < gameState.players[enemyIndex].life) {
      awakenBonus = 1;
    }
  }
  
  // Calculate Surge bonus (check if it's included in tempAtkBuff)
  let surgeBonus = 0;
  let nonSurgeTempBuff = baseTempBuff;
  
  if (gameState && playerIndex !== undefined) {
    const surgeValue = keywords.find(kw => kw.keyword === "SURGE")?.surge || 0;
    if (gameState.activePlayerIndex === playerIndex && surgeValue > 0) {
      surgeBonus = surgeValue;
      // Surge is already in tempAtkBuff, so subtract it to get non-surge temp buffs
      nonSurgeTempBuff = baseTempBuff - surgeValue;
    }
  }
  
  conditionalBonuses = {
    temp: nonSurgeTempBuff,
    surge: surgeBonus,
    awaken: awakenBonus
  };
  
  displayAtk = ((actualCard as any).atk || 0) + relicAtkBonus + baseTempBuff + awakenBonus;
  relicCount = playerState.relics.filter(r => r.slotIndex === slotIndex).length;
}

  // Get granted keywords from relics
  const grantedKeywords: Array<{ keyword: string; source: string; value?: number }> = [];
  
  if (boardCreature && playerState && slotIndex !== undefined) {
    playerState.relics
      .filter(r => r.slotIndex === slotIndex)
      .forEach(relicData => {
        const relicKeywords = cardRegistry.getKeywords(relicData.relic.name);
        
        relicKeywords.forEach(kw => {
          grantedKeywords.push({
            keyword: kw.keyword,
            source: relicData.relic.name,
            value: kw.armor || kw.regen || kw.surge || undefined
          });
        });
      });
  }

  // Render card text with keyword highlighting
  const renderTextWithKeywords = (text: string) => {
    const parts: Array<{ text: string; isKeyword: boolean; keyword?: string }> = [];
    let lastIndex = 0;

    // Find all keyword matches in the text
    const matches: Array<{ index: number; length: number; keyword: string; match: string }> = [];
    
    for (const keyword of Object.keys(KEYWORD_TOOLTIPS)) {
      const pattern = keyword.replace('_', '[\\s_]');
      // Match keyword with optional value (e.g., "Armor 2", "Death:")
      const regex = new RegExp(`\\b${pattern}(\\s*\\d+|\\s*:)?\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          keyword: keyword,
          match: match[0]
        });
      }
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Build parts array
    matches.forEach(match => {
      if (match.index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.index),
          isKeyword: false
        });
      }
      parts.push({
        text: match.match,
        isKeyword: true,
        keyword: match.keyword
      });
      lastIndex = match.index + match.length;
    });

    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        isKeyword: false
      });
    }

    return (
      <>
        {parts.map((part, i) => 
          part.isKeyword ? (
            <span
              key={i}
              className="keyword-highlight"
              onMouseEnter={(e) => {
                setHoveredKeyword(part.keyword!);
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => setHoveredKeyword(null)}
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    );
  };

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
                {boardCreature && (
                  <>
                    {conditionalBonuses.temp > 0 && <span className="stat-buff"> (+{conditionalBonuses.temp} temp)</span>}
                    {conditionalBonuses.surge > 0 && <span className="stat-buff"> (+{conditionalBonuses.surge} surge)</span>}
                    {conditionalBonuses.awaken > 0 && <span className="stat-buff"> (+{conditionalBonuses.awaken} awaken)</span>}
                  </>
                )}
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

        {/* Granted Effects from Relics */}
        {grantedKeywords.length > 0 && (
          <div className="card-preview-granted-effects">
            <h4>Granted by Relics:</h4>
            <div className="granted-effect-list">
              {grantedKeywords.map((granted, idx) => (
                <div key={idx} className="granted-effect-item">
                  🎴 {granted.keyword}
                  {granted.value && ` ${granted.value}`}
                  <span className="granted-source"> (from {granted.source})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Text with keyword highlighting */}
        <div className="card-preview-text">
          <h4>Effect:</h4>
          <p>{renderTextWithKeywords(actualCard.text)}</p>
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

      {/* Keyword Tooltip */}
      {hoveredKeyword && (
        <div 
          className="keyword-tooltip"
          ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.width !== tooltipSize.width || rect.height !== tooltipSize.height) {
                setTooltipSize({ width: rect.width, height: rect.height });
              }
            }
          }}
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="keyword-tooltip-title">{hoveredKeyword.replace('_', ' ')}</div>
          <div className="keyword-tooltip-text">{KEYWORD_TOOLTIPS[hoveredKeyword]}</div>
        </div>
      )}
    </div>
  );
};
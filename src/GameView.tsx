// src/GameView.tsx
import React, { useState } from "react";
import {
  createInitialGameState,
  playCreature,
  attack,
  endPhase,
  castSpell,
  playRelic,
  playLocation,
  transformEvolution,
  playDropInEvolution,
  type SpellTarget,
  getSummonHpCostForCard,
  chooseDiscardFromHand,
  summonWithChosenSacrifices,
} from "./game/engine";
import {
  GameState,
  MainDeckCard,
  CreatureCard,
  SpellCard,
  RelicCard,
  LocationCard,
  EvolutionCard,
  BoardCreature,
  Phase,
  PlayerState,
} from "./game/types";
import { CardPreview } from "./components/CardPreview";

// ---------- Type guards ----------
function isCreature(card: MainDeckCard): card is CreatureCard {
  return card.kind === "CREATURE";
}
function isSpell(card: MainDeckCard): card is SpellCard {
  return card.kind === "FAST_SPELL" || card.kind === "SLOW_SPELL";
}
function isRelic(card: MainDeckCard): card is RelicCard {
  return card.kind === "RELIC";
}
function isLocation(card: MainDeckCard): card is LocationCard {
  return card.kind === "LOCATION";
}

// Spells that don't need explicit targets
const noTargetSpells = new Set<string>([
  "Swell Surge",
  "Bubble Scripture",
  "Firecall Rally",
  "Return from the Depths",
  "Seabed Retrieval",
  "Blazing Rebirth",
  "Ashes Remembered",
]);

const slotLabels = ["Left", "Center", "Right"];

interface PendingSacrificeSummon {
  cardId: string;
  targetSlot: number;
  requiredHp: number;
}

const GameView: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const [pendingSpellId, setPendingSpellId] = useState<string | null>(null);
  const [pendingRelicId, setPendingRelicId] = useState<string | null>(null);
  const [pendingSacSummon, setPendingSacSummon] = useState<PendingSacrificeSummon | null>(null);
  const [selectedSacSlots, setSelectedSacSlots] = useState<number[]>([]);

  // Preview state
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [previewPlayerState, setPreviewPlayerState] = useState<PlayerState | undefined>(undefined);
  const [previewSlotIndex, setPreviewSlotIndex] = useState<number | undefined>(undefined);

  const activeIndex = state.activePlayerIndex;
  const enemyIndex = activeIndex === 0 ? 1 : 0;
  const active = state.players[activeIndex];
  const enemy = state.players[enemyIndex];

  // -------- Spell casting --------
  function startCastingSpell(cardId: string) {
    setPendingRelicId(null);
    setPendingSpellId(cardId);
  }

  function handleSelectSpellTarget(target: SpellTarget) {
    if (!pendingSpellId) return;
    setState((prev) => castSpell(prev, pendingSpellId, target));
    setPendingSpellId(null);
  }

  // -------- Relic attaching --------
  function startAttachingRelic(cardId: string) {
    setPendingSpellId(null);
    setPendingRelicId(cardId);
  }

  function handleAttachRelic(slotIndex: number) {
    if (!pendingRelicId) return;
    setState((prev) => playRelic(prev, pendingRelicId, slotIndex));
    setPendingRelicId(null);
  }

  const handleChooseDiscard = (handCardId: string) => {
    setState((prev) => chooseDiscardFromHand(prev, handCardId));
  };

  const isDiscardMode =
    state.pendingDiscard != null &&
    state.pendingDiscard.playerIndex === state.activePlayerIndex;

  // -------- Creatures --------
  function handlePlayCreature(card: MainDeckCard, slotIndex: number) {
    if (!isCreature(card)) return;

    // Rank 1: normal summon immediately (requires empty slot)
    if ((card as CreatureCard).rank === 1) {
      setPendingSpellId(null);
      setPendingRelicId(null);
      setPendingSacSummon(null);
      setSelectedSacSlots([]);
      setState((prev) => playCreature(prev, card.id, slotIndex));
      return;
    }

    // Rank 2/3: enter sacrifice selection mode
    const creature = card as CreatureCard;
    const cost = getSummonHpCostForCard(creature);

    setPendingSpellId(null);
    setPendingRelicId(null);
    setPendingSacSummon({
      cardId: card.id,
      targetSlot: slotIndex,
      requiredHp: cost,
    });
    setSelectedSacSlots([]);
  }

  // -------- Attack --------
  function handleAttack(mySlot: number, target: "PLAYER" | number) {
    const targetSpec: SpellTarget =
      target === "PLAYER"
        ? { type: "PLAYER", playerIndex: enemyIndex }
        : { type: "CREATURE", playerIndex: enemyIndex, slotIndex: target };
    setState((prev) =>
      attack(prev, mySlot, {
        playerIndex:
          targetSpec.type === "PLAYER"
            ? targetSpec.playerIndex
            : targetSpec.playerIndex,
        slotIndex: targetSpec.type === "PLAYER" ? "PLAYER" : targetSpec.slotIndex,
      })
    );
  }

  // -------- Phase control --------
  function handleEndPhase() {
    setPendingSpellId(null);
    setPendingRelicId(null);
    setState((prev) => endPhase(prev));
  }

  // -------- Locations --------
  function handlePlayLocation(card: LocationCard) {
    setPendingSpellId(null);
    setPendingRelicId(null);
    setState((prev) => playLocation(prev, card.id));
  }

  // -------- Sacrifice selection for Rank 2/3 summons --------
  function handleToggleSacrificeSlot(slotIndex: number) {
    if (!pendingSacSummon) return;

    const player = state.players[state.activePlayerIndex];
    const bc = player.board[slotIndex];
    if (!bc) return;

    const already = selectedSacSlots.includes(slotIndex);
    const nextSelected = already
      ? selectedSacSlots.filter((i) => i !== slotIndex)
      : [...selectedSacSlots, slotIndex];

    setSelectedSacSlots(nextSelected);

    if (!already) {
      const totalHp = nextSelected.reduce((sum, idx) => {
        const c = player.board[idx];
        return sum + (c ? c.currentHp : 0);
      }, 0);

      if (totalHp >= pendingSacSummon.requiredHp) {
        setState((prev) =>
          summonWithChosenSacrifices(
            prev,
            pendingSacSummon.cardId,
            pendingSacSummon.targetSlot,
            nextSelected
          )
        );
        setPendingSacSummon(null);
        setSelectedSacSlots([]);
      }
    }
  }

  // -------- Evolutions --------
  function handleTransformEvo(evo: EvolutionCard, slotIndex: number) {
    setState((prev) => transformEvolution(prev, evo.id, slotIndex));
  }

  function handleDropInEvo(
    evo: EvolutionCard,
    slotIndex: number,
    overwriteExisting: boolean
  ) {
    setState((prev) => playDropInEvolution(prev, evo.id, slotIndex, overwriteExisting));
  }

  // -------- Spell cast from hand --------
  function handleCastSpellCard(card: SpellCard) {
    if (card.kind === "SLOW_SPELL" && state.phase !== "MAIN") return;

    if (noTargetSpells.has(card.name)) {
      const target: SpellTarget = { type: "NONE" };
      setState((prev) => castSpell(prev, card.id, target));
      return;
    }

    startCastingSpell(card.id);
  }

  function handleClickPlayerAsTarget(playerIndex: number) {
    if (!pendingSpellId) return;
    const target: SpellTarget = { type: "PLAYER", playerIndex };
    handleSelectSpellTarget(target);
  }

  const infoText =
    pendingSpellId != null
      ? "Select a target for your spell (click a creature or player portrait)."
      : pendingRelicId != null
      ? "Select one of your creatures to attach the relic."
      : pendingSacSummon != null
      ? `Choose your sacrifices (need ${pendingSacSummon.requiredHp} total HP).`
      : "";

  return (
    <div className="game-root-with-preview">
      {/* Card Preview Panel */}
      <CardPreview 
        card={previewCard} 
        playerState={previewPlayerState}
        slotIndex={previewSlotIndex}
      />

      {/* Main Game Area */}
      <div className="game-main-area">
        <div className="game-header">
          <h1>Constellations TCG — Local Playtest</h1>
          <div className="game-header-row">
            <span>
              Turn <strong>{state.turnNumber}</strong> —{" "}
              <strong>{active.name}</strong>&rsquo;s turn ({state.phase})
            </span>
            <button onClick={() => setState(createInitialGameState())}>Reset Game</button>
          </div>
          {infoText && <div className="game-info-banner">{infoText}</div>}
        </div>

        <div className="board-mat">
          {/* Enemy HUD */}
          <PlayerHUD
            player={enemy}
            isActive={enemyIndex === activeIndex}
            isTop
            onClickPortrait={
              pendingSpellId ? () => handleClickPlayerAsTarget(enemyIndex) : undefined
            }
          />

          {/* Enemy board row */}
          <BoardRow
            label={`${enemy.name} Field`}
            playerIndex={enemyIndex}
            state={state}
            isActiveRow={false}
            pendingSpell={pendingSpellId != null}
            onClickCreature={(pIdx, sIdx) =>
              handleSelectSpellTarget({
                type: "CREATURE",
                playerIndex: pIdx,
                slotIndex: sIdx,
              })
            }
            onMouseEnterCreature={(bc, player, slotIndex) => {
              setPreviewCard(bc);
              setPreviewPlayerState(player);
              setPreviewSlotIndex(slotIndex);
            }}
            onMouseLeaveCreature={() => setPreviewCard(null)}
          />

          {/* Middle divider */}
          <div className="board-divider" />

          {/* Active player board row */}
          <BoardRow
            label={`${active.name} Field`}
            playerIndex={activeIndex}
            state={state}
            isActiveRow
            pendingSpell={pendingSpellId != null}
            pendingRelic={pendingRelicId != null}
            onClickCreature={(pIdx, sIdx) =>
              pendingSpellId
                ? handleSelectSpellTarget({
                    type: "CREATURE",
                    playerIndex: pIdx,
                    slotIndex: sIdx,
                  })
                : pendingSacSummon
                ? handleToggleSacrificeSlot(sIdx)
                : undefined
            }
            onAttachRelic={handleAttachRelic}
            onAttack={
              state.phase === "ATTACK" && pendingSpellId == null
                ? handleAttack
                : undefined
            }
            onMouseEnterCreature={(bc, player, slotIndex) => {
              setPreviewCard(bc);
              setPreviewPlayerState(player);
              setPreviewSlotIndex(slotIndex);
            }}
            onMouseLeaveCreature={() => setPreviewCard(null)}
          />

          {/* Active HUD */}
          <PlayerHUD
            player={active}
            isActive
            onClickPortrait={
              pendingSpellId ? () => handleClickPlayerAsTarget(activeIndex) : undefined
            }
          />
        </div>

        {/* Hand + Evolutions + Controls */}
        <div className="bottom-panel">
          {/* Active player's hand */}
          <section className="hand-section">
            <h3>Your Hand ({active.hand.length})</h3>
            <div className="hand-strip">
              {active.hand.map((card, i) => (
                <HandCard
                  key={card.id}
                  card={card}
                  phase={state.phase}
                  isActivePlayer={activeIndex === state.activePlayerIndex}
                  onSummon={(slotIndex) => handlePlayCreature(card, slotIndex)}
                  onCastSpell={
                    isSpell(card)
                      ? () => handleCastSpellCard(card as SpellCard)
                      : undefined
                  }
                  onPlayRelic={
                    isRelic(card) ? () => startAttachingRelic(card.id) : undefined
                  }
                  onPlayLocation={
                    isLocation(card)
                      ? () => handlePlayLocation(card as LocationCard)
                      : undefined
                  }
                  index={i}
                  total={active.hand.length}
                  isDiscardMode={isDiscardMode}
                  onDiscard={handleChooseDiscard}
                  onMouseEnter={() => {
                    setPreviewCard(card);
                    setPreviewPlayerState(undefined);
                    setPreviewSlotIndex(undefined);
                  }}
                  onMouseLeave={() => setPreviewCard(null)}
                />
              ))}
            </div>
          </section>

          {/* Evolution row */}
          <section className="evo-section">
            <h3>Your Evolutions ({active.evolutionDeck.length})</h3>
            <div className="evo-strip">
              {active.evolutionDeck.map((evo) => (
                <EvolutionCardView
                  key={evo.id}
                  evo={evo}
                  player={active}
                  onTransform={(slotIndex) => handleTransformEvo(evo, slotIndex)}
                  onDropIn={(slotIndex, overwrite) =>
                    handleDropInEvo(evo, slotIndex, overwrite)
                  }
                  onMouseEnter={() => {
                    setPreviewCard(evo);
                    setPreviewPlayerState(undefined);
                    setPreviewSlotIndex(undefined);
                  }}
                  onMouseLeave={() => setPreviewCard(null)}
                />
              ))}
            </div>
          </section>

          {/* Turn controls + log */}
          <section className="controls-log">
            <div className="controls-column">
              <button className="end-phase-btn" onClick={handleEndPhase}>
                End Phase
              </button>
              <div className="phase-indicator">
                Current phase: <strong>{state.phase}</strong>
              </div>
            </div>
            <div className="log-column">
              <h3>Game Log</h3>
              <div className="log-box">
                {state.log
                  .slice()
                  .reverse()
                  .map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Player HUD (portrait / life / deck / graveyard / location)
// -----------------------------------------------------------------------------

interface PlayerHUDProps {
  player: PlayerState;
  isActive: boolean;
  isTop?: boolean;
  onClickPortrait?: () => void;
}

const PlayerHUD: React.FC<PlayerHUDProps> = ({
  player,
  isActive,
  isTop,
  onClickPortrait,
}) => {
  return (
    <div className={`player-hud ${isTop ? "player-hud-top" : "player-hud-bottom"}`}>
      <div
        className={`player-portrait ${isActive ? "player-portrait-active" : ""} ${
          onClickPortrait ? "player-portrait-clickable" : ""
        }`}
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
        <div className="zone-pill">
          Location
          <span className="zone-slot">
            {player.location ? player.location.name : "—"}
          </span>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Board Row (3 slots)
// -----------------------------------------------------------------------------

interface BoardRowProps {
  label: string;
  playerIndex: number;
  state: GameState;
  isActiveRow: boolean;
  pendingSpell?: boolean;
  pendingRelic?: boolean;
  onAttack?: (mySlot: number, target: "PLAYER" | number) => void;
  onClickCreature?: (playerIndex: number, slotIndex: number) => void;
  onAttachRelic?: (slotIndex: number) => void;
  onMouseEnterCreature?: (bc: BoardCreature, player: PlayerState, slotIndex: number) => void;
  onMouseLeaveCreature?: () => void;
}

const BoardRow: React.FC<BoardRowProps> = ({
  label,
  playerIndex,
  state,
  isActiveRow,
  pendingSpell,
  pendingRelic,
  onAttack,
  onClickCreature,
  onAttachRelic,
  onMouseEnterCreature,
  onMouseLeaveCreature,
}) => {
  const player = state.players[playerIndex];

  return (
    <div className="board-row">
      <div className="board-row-label">{label}</div>
      <div className="board-row-slots">
        {player.board.map((bc, idx) => (
          <div key={idx} className="board-slot">
            <div className="board-slot-label">{slotLabels[idx]}</div>
            {bc ? (
              <BoardCreatureView
                bc={bc}
                slotIndex={idx}
                player={player}
                isActiveRow={isActiveRow}
                phase={state.phase}
                pendingSpell={pendingSpell}
                pendingRelic={pendingRelic}
                onAttack={onAttack}
                onClick={
                  onClickCreature
                    ? () => onClickCreature(playerIndex, idx)
                    : undefined
                }
                onAttachRelic={onAttachRelic}
                onMouseEnter={
                  onMouseEnterCreature
                    ? () => onMouseEnterCreature(bc, player, idx)
                    : undefined
                }
                onMouseLeave={onMouseLeaveCreature}
              />
            ) : (
              <div className="board-slot-empty">Empty</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface BoardCreatureViewProps {
  bc: BoardCreature;
  slotIndex: number;
  player: PlayerState;
  isActiveRow: boolean;
  phase: Phase;
  pendingSpell?: boolean;
  pendingRelic?: boolean;
  onAttack?: (mySlot: number, target: "PLAYER" | number) => void;
  onClick?: () => void;
  onAttachRelic?: (slotIndex: number) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const BoardCreatureView: React.FC<BoardCreatureViewProps> = ({
  bc,
  slotIndex,
  player,
  isActiveRow,
  phase,
  pendingSpell,
  pendingRelic,
  onAttack,
  onClick,
  onAttachRelic,
  onMouseEnter,
  onMouseLeave,
}) => {
  const card = bc.card as CreatureCard | EvolutionCard;

  const baseAtk = (card as any).atk ?? 0;
  const tempAtkBuff = (bc as any).tempAtkBuff ?? 0;
  const displayAtk = baseAtk + tempAtkBuff;

  const relicCount = player.relics.filter((r) => r.slotIndex === slotIndex).length;

  return (
    <div
      className={`board-creature-container ${
        pendingSpell ? "card-frame-targetable" : ""
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Card Image */}
      {card.imagePath ? (
        <img 
          src={card.imagePath} 
          alt={card.name} 
          className="board-creature-image"
        />
      ) : (
        <div className="board-creature-placeholder">
          {card.name}
        </div>
      )}

      {/* Overlay with stats and info */}
      <div className="board-creature-overlay">
        <div className="board-creature-stats">
          <span className="stat-badge atk-badge">{displayAtk}</span>
          <span className="stat-badge hp-badge">{bc.currentHp}</span>
        </div>

        {bc.hasSummoningSickness && (
          <div className="status-indicator summoning-sickness">😴</div>
        )}

        {(bc as any).frozenForTurns > 0 && (
          <div className="status-indicator frozen">❄️</div>
        )}

        {relicCount > 0 && (
          <div className="relic-indicator">🎴 {relicCount}</div>
        )}
      </div>

      {/* Action buttons */}
      {isActiveRow && phase === "ATTACK" && !bc.hasSummoningSickness && onAttack && (
        <div className="board-creature-actions">
          <button onClick={(e) => { e.stopPropagation(); onAttack(slotIndex, "PLAYER"); }}>
            Attack Player
          </button>
          {[0, 1, 2].map((idx) => (
            <button key={idx} onClick={(e) => { e.stopPropagation(); onAttack(slotIndex, idx); }}>
              Slot {idx + 1}
            </button>
          ))}
        </div>
      )}

      {isActiveRow && pendingRelic && onAttachRelic && (
        <div className="board-creature-actions">
          <button onClick={(e) => { e.stopPropagation(); onAttachRelic(slotIndex); }}>
            Attach Here
          </button>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Hand card
// -----------------------------------------------------------------------------

interface HandCardProps {
  card: MainDeckCard;
  phase: Phase;
  isActivePlayer: boolean;
  onSummon?: (slotIndex: number) => void;
  onCastSpell?: () => void;
  onPlayRelic?: () => void;
  onPlayLocation?: () => void;
  index: number;
  total: number;
  isDiscardMode?: boolean;
  onDiscard?: (cardId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const HandCard: React.FC<HandCardProps> = ({
  card,
  phase,
  isActivePlayer,
  onSummon,
  onCastSpell,
  onPlayRelic,
  onPlayLocation,
  index,
  total,
  isDiscardMode,
  onDiscard,
  onMouseEnter,
  onMouseLeave,
}) => {
  const angleSpread = Math.min(15, 40 / Math.max(total, 1));
  const centerIndex = (total - 1) / 2;
  const angle = (index - centerIndex) * angleSpread;

  const isCreature = card.kind === "CREATURE" || card.kind === "EVOLUTION";
  const isSpell = card.kind === "FAST_SPELL" || card.kind === "SLOW_SPELL";
  const isRelic = card.kind === "RELIC";
  const isLocation = card.kind === "LOCATION";

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
      onMouseLeave={onMouseLeave}
    >
      {/* Card Image */}
      {card.imagePath ? (
        <img 
          src={card.imagePath} 
          alt={card.name} 
          className="hand-card-image"
        />
      ) : (
        <div className="hand-card-placeholder">
          {card.name}
        </div>
      )}

      {/* Action buttons overlay */}
      {!isDiscardMode && (
        <div className="hand-card-actions">
          {isCreature && canPlayNormally && onSummon && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onSummon(0); }}>L</button>
              <button onClick={(e) => { e.stopPropagation(); onSummon(1); }}>C</button>
              <button onClick={(e) => { e.stopPropagation(); onSummon(2); }}>R</button>
            </>
          )}

          {isSpell && canPlayNormally && onCastSpell && (
            <button
              onClick={(e) => { e.stopPropagation(); onCastSpell(); }}
              disabled={card.kind === "SLOW_SPELL" && phase !== "MAIN"}
            >
              Cast
            </button>
          )}

          {isRelic && canPlayNormally && onPlayRelic && (
            <button onClick={(e) => { e.stopPropagation(); onPlayRelic(); }}>
              Play
            </button>
          )}

          {isLocation && canPlayNormally && onPlayLocation && (
            <button onClick={(e) => { e.stopPropagation(); onPlayLocation(); }}>
              Play
            </button>
          )}
        </div>
      )}

      {isDiscardMode && (
        <div className="hand-card-discard-hint">
          Click to discard
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Evolution cards row
// -----------------------------------------------------------------------------

interface EvolutionCardViewProps {
  evo: EvolutionCard;
  player: PlayerState;
  onTransform: (slotIndex: number) => void;
  onDropIn: (slotIndex: number, overwriteExisting: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const EvolutionCardView: React.FC<EvolutionCardViewProps> = ({
  evo,
  player,
  onTransform,
  onDropIn,
  onMouseEnter,
  onMouseLeave,
}) => {
  const isTransform = evo.evoType === "TRANSFORM";

  return (
    <div 
      className="evo-card"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
        {isTransform ? (
          <>
            <div className="evo-card-subtitle">Transform:</div>
            <div className="evo-card-buttons">
              {player.board.map((bc, idx) => {
                const disabled =
                  !bc ||
                  bc.card.kind !== "CREATURE" ||
                  (bc.card as CreatureCard).name !== evo.baseName ||
                  (bc.card as CreatureCard).rank !== evo.requiredRank;
                return (
                  <button
                    key={idx}
                    disabled={disabled}
                    onClick={() => onTransform(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="evo-card-subtitle">Drop-In:</div>
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
          </>
        )}
      </div>
    </div>
  );
};

export default GameView;
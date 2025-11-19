// src/GameView.tsx
import React, { useState } from "react";
import {
  createInitialGameState,
  playCreature,
  attack,
  endPhase,
  playRelic,
  playLocation,
  transformEvolution,
  playDropInEvolution,
  getSummonHpCostForCard,
  chooseDiscardFromHand,
  summonWithChosenSacrifices,
  resolveOnPlayTargeting,
  getValidTargets,
  resolveSpellTargeting,
  resolveRelicTargeting,
  cloneState,
} from "./game/engine";
import {
  GameState,
  MainDeckCard,
  CreatureCard,
  SpellCard,
  RelicCard,
  LocationCard,
  EvolutionCard,
  PlayerState,
} from "./game/types";
import { CardPreview } from "./components/CardPreview";
import { GameHeader } from "./components/GameHeader";
import { PlayerHUD } from "./components/PlayerHUD";
import { BoardRow } from "./components/BoardRow";
import { HandSection } from "./components/HandSection";
import { EvolutionSection } from "./components/EvolutionSection";
import { GameControls } from "./components/GameControls";

// Type guards
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

interface PendingSacrificeSummon {
  cardId: string;
  targetSlot: number;
  requiredHp: number;
}

const GameView: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createInitialGameState());
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

  const handleCardHover = (card: any, playerState?: PlayerState, slotIndex?: number) => {
    setPreviewCard(card);
    setPreviewPlayerState(playerState);
    setPreviewSlotIndex(slotIndex);
  };

  // Relic attaching
function startAttachingRelic(cardId: string) {
  setState((prev) => {
    const gs = cloneState(prev);
    const player = gs.players[gs.activePlayerIndex];
    const card = player.hand.find(c => c.id === cardId);
    
    if (!card || card.kind !== "RELIC") {
      return prev;
    }
    
    // Set up targeting for relic
    gs.pendingTarget = {
      source: card.name,
      rule: { type: "FRIENDLY_CREATURES" },
      sourcePlayerIndex: gs.activePlayerIndex,
      sourceCardId: cardId,
      sourceType: "RELIC",
    };
    
    gs.log.push(`${card.name} needs a target. Click one of your creatures.`);
    return gs;
  });
}

// Remove the old handleAttachRelic function and replace with this:
function handleAttachRelic(slotIndex: number) {
  setState((prev) => resolveRelicTargeting(prev, slotIndex));
}

  const handleChooseDiscard = (handCardId: string) => {
    setState((prev) => chooseDiscardFromHand(prev, handCardId));
  };

  const isDiscardMode =
    state.pendingDiscard != null &&
    state.pendingDiscard.playerIndex === state.activePlayerIndex;

  // Creatures
  function handlePlayCreature(card: MainDeckCard, slotIndex: number) {
    if (!isCreature(card)) return;

    if ((card as CreatureCard).rank === 1) {
      setPendingRelicId(null);
      setPendingSacSummon(null);
      setSelectedSacSlots([]);
      setState((prev) => playCreature(prev, card.id, slotIndex));
      return;
    }

    const creature = card as CreatureCard;
    const cost = getSummonHpCostForCard(creature);

    setPendingRelicId(null);
    setPendingSacSummon({
      cardId: card.id,
      targetSlot: slotIndex,
      requiredHp: cost,
    });
    setSelectedSacSlots([]);
  }

  // Attack
  function handleAttack(mySlot: number, target: "PLAYER" | number) {
    setState((prev) =>
      attack(prev, mySlot, {
        playerIndex: target === "PLAYER" ? enemyIndex : enemyIndex,
        slotIndex: target === "PLAYER" ? "PLAYER" : target,
      })
    );
  }

  // Phase control
  function handleEndPhase() {
    setPendingRelicId(null);
    setState((prev) => endPhase(prev));
  }

  // Locations
  function handlePlayLocation(card: LocationCard) {
    setPendingRelicId(null);
    setState((prev) => playLocation(prev, card.id));
  }

  // Sacrifice selection
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

  // Evolutions
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

  // Spell/Relic/Location casting
  function handleCastSpellCard(card: SpellCard) {
    if (card.kind === "SLOW_SPELL" && state.phase !== "MAIN") return;
    setState((prev) => resolveSpellTargeting(prev, card.id));
  }

  function handleClickPlayerAsTarget(playerIndex: number) {
    if (!state.pendingTarget) return;
    setState((prev) => resolveSpellTargeting(prev, undefined, { type: "PLAYER", playerIndex }));
  }

const infoText = state.pendingTarget
  ? `${state.pendingTarget.source} needs a target. Click a valid target.`
  : pendingSacSummon != null
  ? `Choose your sacrifices (need ${pendingSacSummon.requiredHp} total HP).`
  : "";

  const validTargets = state.pendingTarget 
    ? getValidTargets(state, state.pendingTarget.rule)
    : [];

const handleCreatureClick = (playerIndex: number, slotIndex: number) => {
  if (state.pendingTarget) {
    if (state.pendingTarget.sourceType === "ON_PLAY") {
      setState((prev) => resolveOnPlayTargeting(prev, playerIndex, slotIndex));
    } else if (state.pendingTarget.sourceType === "SPELL") {
      setState((prev) => resolveSpellTargeting(prev, undefined, { type: "CREATURE", playerIndex, slotIndex }));
    } else if (state.pendingTarget.sourceType === "RELIC") {
      setState((prev) => resolveRelicTargeting(prev, slotIndex));
    }
  } else if (pendingSacSummon) {
    handleToggleSacrificeSlot(slotIndex);
  }
};

  return (
    <div className="game-root-with-preview">
      <CardPreview 
        card={previewCard} 
        playerState={previewPlayerState}
        slotIndex={previewSlotIndex}
          gameState={state} // Add this
  playerIndex={
    previewPlayerState === state.players[0] ? 0 :
    previewPlayerState === state.players[1] ? 1 :
    undefined
  } // Add this
      />

      <div className="game-main-area">
        <GameHeader
          state={state}
          active={active}
          infoText={infoText}
          onReset={() => setState(createInitialGameState())}
        />

        <div className="board-mat">
          <PlayerHUD
            player={enemy}
            isActive={enemyIndex === activeIndex}
            isTop
            onClickPortrait={
              state.pendingTarget ? () => handleClickPlayerAsTarget(enemyIndex) : undefined
            }
          />

<BoardRow
  label={`${enemy.name} Field`}
  playerIndex={enemyIndex}
  state={state}
  isActiveRow={false}
  validTargets={validTargets}
  onClickCreature={handleCreatureClick}
  onMouseEnterCreature={(bc, player, slotIndex) => 
    handleCardHover(bc, player, slotIndex)
  }
  onMouseEnterRelic={(relic) => handleCardHover(relic)} // Add this
    onMouseEnterEvolution={(evo) => handleCardHover(evo)}
  onMouseEnterLocation={(location) => handleCardHover(location)}
/>

          <div className="board-divider" />
<BoardRow
  label={`${active.name} Field`}
  playerIndex={activeIndex}
  state={state}
  isActiveRow
  validTargets={validTargets}
  onClickCreature={handleCreatureClick}
  onAttack={
    state.phase === "ATTACK" && !state.pendingTarget
      ? handleAttack
      : undefined
  }
  onMouseEnterCreature={(bc, player, slotIndex) => 
    handleCardHover(bc, player, slotIndex)
  }
  onMouseEnterRelic={(relic) => handleCardHover(relic)} // Add this
    onMouseEnterEvolution={(evo) => handleCardHover(evo)}
  onMouseEnterLocation={(location) => handleCardHover(location)}
/>

          <PlayerHUD
            player={active}
            isActive
            onClickPortrait={
              state.pendingTarget ? () => handleClickPlayerAsTarget(activeIndex) : undefined
            }
          />
        </div>

        <div className="bottom-panel">
          <HandSection
            hand={active.hand}
            phase={state.phase}
            isActivePlayer={true}
            isDiscardMode={isDiscardMode}
            onPlayCreature={handlePlayCreature}
            onCastSpell={handleCastSpellCard}
            onPlayRelic={startAttachingRelic}
            onPlayLocation={handlePlayLocation}
            onDiscard={handleChooseDiscard}
            onMouseEnter={handleCardHover}
          />

          <EvolutionSection
            evolutions={active.evolutionDeck}
            player={active}
            onTransform={handleTransformEvo}
            onDropIn={handleDropInEvo}
            onMouseEnter={handleCardHover}
          />

          <GameControls
            phase={state.phase}
            log={state.log}
            onEndPhase={handleEndPhase}
          />
        </div>
      </div>
    </div>
  );
};

export default GameView;
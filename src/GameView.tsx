// src/GameView.tsx
import React, { useState } from "react";
import {
  createInitialGameState,
  playCreature,
  attack,
  endPhase,
  playRelic,
  playDropInEvolution,
  chooseDiscardFromHand,
  resolveOnPlayTargeting,
  getValidTargets,
  cancelPendingTarget,
  resolveSpellTargeting,
  resolveRelicTargeting,
  cloneState,
  passPriority,
  declareGuardBlock,        // ✅ NEW
} from "./game/engine";
import {
  GameState,
  MainDeckCard,
  CreatureCard,
  SpellCard,
  RelicCard,
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

const executedSpells = new Set<string>();

const GameView: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const [pendingRelicId, setPendingRelicId] = useState<string | null>(null);
  const [animationEvents, setAnimationEvents] = useState<AnimationEvent[]>([]);

  // Preview state
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [previewPlayerState, setPreviewPlayerState] = useState<
    PlayerState | undefined
  >(undefined);
  const [previewSlotIndex, setPreviewSlotIndex] = useState<
    number | undefined
  >(undefined);

  const activeIndex = state.activePlayerIndex;
  const enemyIndex = activeIndex === 0 ? 1 : 0;
  const active = state.players[activeIndex];
  const enemy = state.players[enemyIndex];

  const handleCardHover = (
    card: any,
    playerState?: PlayerState,
    slotIndex?: number
  ) => {
    setPreviewCard(card);
    setPreviewPlayerState(playerState);
    setPreviewSlotIndex(slotIndex);
  };

  const pushAnimation = (event: AnimationEvent) => {
    setAnimationEvents((prev) => [...prev, event]);
  };

  // Relic attaching
  function startAttachingRelic(cardId: string) {
    setState((prev) => {
      const gs = cloneState(prev);
      const player = gs.players[gs.activePlayerIndex];
      const card = player.hand.find((c) => c.id === cardId);

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

  React.useEffect(() => {
    // On initial mount and each time the turn increments, announce the new active player
    pushAnimation({
      type: "TURN_STARTED",
      playerIndex: state.activePlayerIndex,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber]);

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

  setState((prev) => {
    const ownerIndex = prev.activePlayerIndex;

    // Board state before attempting to summon
    const before = prev.players[ownerIndex].board[slotIndex];

    // Let the engine handle tier / turn gating and slot checks
    const next = playCreature(prev, card.id, slotIndex);

    // Board state after attempting to summon
    const after = next.players[ownerIndex].board[slotIndex];

    // Only fire a "played to board" animation if the creature actually landed
    if (!before && after && (after.card as any).id === card.id) {
      const cardRef: CardRef = {
        id: card.id,
        name: card.name,
        ownerIndex,
      };

      pushAnimation({
        type: "CARD_PLAYED_TO_BOARD",
        card: cardRef,
        slotIndex,
      });
    }

    return next;
  });
}


  // Attack declaration
  function handleAttack(mySlot: number, target: "PLAYER" | number) {
    setState((prev) =>
      attack(prev, mySlot, {
        playerIndex: enemyIndex,
        slotIndex: target === "PLAYER" ? "PLAYER" : target,
      })
    );
  }

  function handlePassPriority() {
    setState((prev) => passPriority(prev));
  }

  // Phase control
  function handleEndPhase() {
    setPendingRelicId(null);
    setState((prev) => endPhase(prev));
  }

function handleCancelTarget() {
  setState((prev) => cancelPendingTarget(prev));
}

  function handleDropInEvo(
    evo: EvolutionCard,
    slotIndex: number,
    overwriteExisting: boolean
  ) {
    const ownerIndex = state.activePlayerIndex;
    const player = state.players[ownerIndex];
    const existing = player.board[slotIndex];

    const baseCardRef: CardRef | null = existing
      ? {
          id: (existing.card as any).id,
          name: existing.card.name,
          ownerIndex,
        }
      : null;

    const evoRef: CardRef = {
      id: evo.id,
      name: evo.name,
      ownerIndex,
    };

    setState((prev) =>
      playDropInEvolution(prev, evo.id, slotIndex, overwriteExisting)
    );

    if (baseCardRef) {
      pushAnimation({
        type: "EVOLVED",
        baseCard: baseCardRef,
        evoCard: evoRef,
        slotIndex,
      });
    }
  }

  // Spell / Relic casting
  function handleCastSpellCard(card: SpellCard) {
    if (card.kind === "SLOW_SPELL" && state.phase !== "MAIN") return;

    // rudimentary “no double-cast right now” guard
    if (executedSpells.has(card.id)) {
      console.log("Spell already being cast, skipping");
      return;
    }

    executedSpells.add(card.id);

    setState((prev) => {
      const result = resolveSpellTargeting(prev, card.id);
      setTimeout(() => executedSpells.delete(card.id), 100);
      return result;
    });
  }

  function handleClickPlayerAsTarget(playerIndex: number) {
    if (!state.pendingTarget) return;
    setState((prev) =>
      resolveSpellTargeting(prev, undefined, { type: "PLAYER", playerIndex })
    );
  }

// Info text (top banner)
let infoText = "";
if (state.pendingTarget) {
  infoText = `${state.pendingTarget.source} needs a target. Click a valid target.`;
} else if (state.pendingCombat) {
  if (state.priorityPlayerIndex === activeIndex) {
    infoText =
      "An attack is pending. You may cast Fast spells or click a Guard creature to block, then Pass / Continue.";
  } else {
    infoText = "An attack is pending. Waiting for opponent responses.";
  }
}

  const validTargets = state.pendingTarget
    ? getValidTargets(state, state.pendingTarget.rule)
    : [];

  // ✅ Creature click: targeting, sac, OR Guard block (if pendingCombat & you’re the defender)
  const handleCreatureClick = (playerIndex: number, slotIndex: number) => {
    // 1) Guard block window: pendingCombat + no spell target + no sac + defender has priority
    const canAttemptBlock =
      state.pendingCombat &&
      !state.pendingTarget &&
      !pendingSacSummon &&
      state.priorityPlayerIndex === playerIndex &&
      state.pendingCombat.targetPlayerIndex === playerIndex;

  if (canAttemptBlock) {
    setState((prev) => declareGuardBlock(prev, slotIndex));
    return;
  }

  // 2) Spell / on-play / relic targeting
  if (state.pendingTarget) {
    if (state.pendingTarget.sourceType === "ON_PLAY") {
      setState((prev) =>
        resolveOnPlayTargeting(prev, playerIndex, slotIndex)
      );
    } else if (state.pendingTarget.sourceType === "SPELL") {
      setState((prev) =>
        resolveSpellTargeting(prev, undefined, {
          type: "CREATURE",
          playerIndex,
          slotIndex,
        })
      );
    } else if (state.pendingTarget.sourceType === "RELIC") {
      setState((prev) => resolveRelicTargeting(prev, slotIndex));
    }
  }
};

  const canPassPriority = state.stack.length > 0 || state.pendingCombat != null;

  return (
    <div className="game-root-with-preview">
      <CardPreview
        card={previewCard}
        playerState={previewPlayerState}
        slotIndex={previewSlotIndex}
        gameState={state}
        playerIndex={
          previewPlayerState === state.players[0]
            ? 0
            : previewPlayerState === state.players[1]
            ? 1
            : undefined
        }
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
              state.pendingTarget
                ? () => handleClickPlayerAsTarget(enemyIndex)
                : undefined
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
            onMouseEnterRelic={(relic) => handleCardHover(relic)}
            onMouseEnterEvolution={(evo) => handleCardHover(evo)}
          />

          <div className="board-divider" />

          <BoardRow
            label={`${active.name} Field`}
            playerIndex={activeIndex}
            state={state}
            isActiveRow
            validTargets={validTargets}
            onAttack={
              state.phase === "BATTLE_DECLARE" && !state.pendingTarget
                ? handleAttack
                : undefined
            }
            onClickCreature={handleCreatureClick}
            onMouseEnterCreature={(bc, player, slotIndex) =>
              handleCardHover(bc, player, slotIndex)
            }
            onMouseEnterRelic={(relic) => handleCardHover(relic)}
            onMouseEnterEvolution={(evo) => handleCardHover(evo)}
          />

          <PlayerHUD
            player={active}
            isActive
            onClickPortrait={
              state.pendingTarget
                ? () => handleClickPlayerAsTarget(activeIndex)
                : undefined
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
            onDiscard={handleChooseDiscard}
            onMouseEnter={handleCardHover}
          />

          <EvolutionSection
            evolutions={active.evolutionDeck}
            player={active}
            onDropIn={handleDropInEvo}
            onMouseEnter={handleCardHover}
          />

<GameControls
  phase={state.phase}
  log={state.log}
  onEndPhase={handleEndPhase}
  onCancelTarget={
    state.pendingTarget ? handleCancelTarget : undefined
  }
  onPassPriority={canPassPriority ? handlePassPriority : undefined}
/>

        </div>
      </div>
    </div>
  );
};

export default GameView;

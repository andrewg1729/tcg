// src/game/effectExecutor.ts

import { GameState, PlayerState, BoardCreature, SpellTarget } from "./types";
import { CardEffect, TargetType } from "./cardEffects";
import { getLocationModifiers, bounceCreatureToHand, summonTokenIntoSlot } from "./engine";

export class EffectExecutor {
  executeEffect(
    gs: GameState,
    effect: CardEffect,
    sourcePlayerIndex: number,
    target?: SpellTarget
  ): void {
    console.log("effectExecutor.executeEffect called with:", {
      effect,
      sourcePlayerIndex,
      target,
      timing: effect.timing
    });

    // If this effect is a choice, pause execution and wait for UI selection
if ((effect as any).choice?.options?.length) {
  const opts = (effect as any).choice.options;

  gs.pendingChoice = {
    playerIndex: sourcePlayerIndex,
    sourcePlayerIndex,
    sourceSlotIndex: target?.type === "CREATURE" ? target.slotIndex : undefined,
    prompt: "Choose one:",
    options: opts.map((o: any) => ({ label: o.label, effects: o.effects })),
  };

  return;
}
    
    switch (effect.timing) {
      case "IMMEDIATE":
        this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
        break;
      case "ON_PLAY":
        this.executeOnPlayEffect(gs, effect, sourcePlayerIndex, target);
        break;
      case "ON_ATTACK":
        this.executeOnAttackEffect(gs, effect, sourcePlayerIndex);
        break;
      case "ON_DAMAGE":
        this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
        break;
        case "ON_DAMAGED":
  this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
  break;
      case "START_OF_TURN":
        this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
        break;
      case "END_OF_TURN":
  this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
  break;
      case "DEATH":
        this.executeDeathEffect(gs, effect, sourcePlayerIndex);
        break;
      case "CATALYST":
        this.executeCatalystEffect(gs, effect, sourcePlayerIndex);
        break;
        case "ON_EVADE":
  this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
  break;
case "ON_BOUNCE":
  this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
  break;
    }
  }
  
// Add this at the start of executeImmediateEffect, before handling damage
private executeImmediateEffect(
  gs: GameState,
  effect: CardEffect,
  playerIndex: number,
  target?: SpellTarget
): void {
  const player = gs.players[playerIndex];
  const enemy = gs.players[1 - playerIndex];

    if (effect.conditions && effect.conditions.length > 0) {
    const ok = this.areConditionsMet(gs, playerIndex, target, effect.conditions);
    if (!ok) return;
  }

    // ✅ generic: only trigger once when conditions become true
  if (effect.triggerOncePerCondition && effect.conditions?.length) {
    const gateTarget =
      (target?.type === "CREATURE")
        ? gs.players[target.playerIndex].board[target.slotIndex]
        : (effect.targetType === "SELF" && target?.type === "CREATURE"
            ? gs.players[target.playerIndex].board[target.slotIndex]
            : null);

    if (gateTarget) {
      const anyGate = gateTarget as any;
      if (!anyGate.triggeredConditionKeys) anyGate.triggeredConditionKeys = new Set<string>();

      const key = JSON.stringify(effect.conditions);
      if (anyGate.triggeredConditionKeys.has(key)) return;
      anyGate.triggeredConditionKeys.add(key);
    }
  }
  
  // EVALUATE CONDITIONAL VALUES FIRST
  if (effect.conditionalDamage) {
    effect.damage = this.evaluateConditionalValue(gs, playerIndex, effect.conditionalDamage);
  }
  if (effect.conditionalHeal) {
    effect.heal = this.evaluateConditionalValue(gs, playerIndex, effect.conditionalHeal);
  }
  if (effect.conditionalDraw) {
    effect.draw = this.evaluateConditionalValue(gs, playerIndex, effect.conditionalDraw);
  }
    
  // Handle HEAL_IF_KILL specially - check before and after damage
// Handle HEAL_IF_KILL specially - check before and after damage
let creatureWasAlive = false;
if (effect.customScript === "HEAL_IF_KILL" && target?.type === "CREATURE" && effect.damage) {
  const targetPlayer = gs.players[target.playerIndex];
  creatureWasAlive = targetPlayer.board[target.slotIndex] !== null;
}

// Handle custom scripts first (but don't process HEAL_IF_KILL yet - it needs to check after damage)
if (effect.customScript && effect.customScript !== "HEAL_IF_KILL") {
  this.handleCustomScript(gs, effect.customScript, playerIndex, target);
}

// Handle damage
if (effect.damage !== undefined) {
  console.log("Processing damage effect");
  console.log("target?.type === 'CREATURE':", target?.type === "CREATURE");
  console.log("target?.type === 'PLAYER':", target?.type === "PLAYER");
  console.log("target?.slotIndex === 'PLAYER':", target?.slotIndex === "PLAYER");
  
  if (target?.type === "CREATURE") {
    this.applyDamageToCreature(
      gs,
      target.playerIndex,
      target.slotIndex,
      effect.damage,
      true
    );
    
    // NOW check if HEAL_IF_KILL condition is met (creature died)
    if (effect.customScript === "HEAL_IF_KILL" && creatureWasAlive) {
      const targetPlayer = gs.players[target.playerIndex];
      const creatureIsDead = targetPlayer.board[target.slotIndex] === null;
      
      if (creatureIsDead) {
        this.healPlayer(gs, playerIndex, 1, true);
      }
    }
  } else if (target?.type === "PLAYER") {
        const targetPlayer = gs.players[target.playerIndex];
        targetPlayer.life -= effect.damage;
        gs.log.push(`${targetPlayer.name} takes ${effect.damage} damage.`);
      } else if (target?.slotIndex === "PLAYER") {
        const targetPlayer = gs.players[target.playerIndex];
        targetPlayer.life -= effect.damage;
        gs.log.push(`${targetPlayer.name} takes ${effect.damage} damage.`);
      } else if (effect.targetType === "SELF_PLAYER") {
        player.life -= effect.damage;
        gs.log.push(`${player.name} loses ${effect.damage} life.`);
      } else if (effect.targetType === "ALL_ENEMY") {
        enemy.board.forEach((bc, idx) => {
          if (bc) {
            this.applyDamageToCreature(gs, 1 - playerIndex, idx, effect.damage!, true);
          }
        });
      } else if (effect.targetType === "ALL_FRIENDLY") {
        player.board.forEach((bc, idx) => {
          if (bc) {
            this.applyDamageToCreature(gs, playerIndex, idx, effect.damage!, true);
          }
        });
      } else if (effect.targetType === "ALL_CREATURES") {
        [player, enemy].forEach((p, pIdx) => {
          p.board.forEach((bc, idx) => {
            if (bc) {
              this.applyDamageToCreature(gs, pIdx, idx, effect.damage!, true);
            }
          });
        });
      }
    }
    
// Handle healing
if (effect.heal !== undefined) {
  if (target?.type === "CREATURE") {
    this.healCreature(gs, target.playerIndex, target.slotIndex, effect.heal, true);
  } else if (target?.type === "PLAYER") {
    this.healPlayer(gs, target.playerIndex, effect.heal, true);
  } else if (target?.slotIndex === "PLAYER") {
    this.healPlayer(gs, target.playerIndex, effect.heal, true);
  } else if (effect.targetType === "SELF_PLAYER") {  // ADD THIS
    this.healPlayer(gs, playerIndex, effect.heal, true);
  } else if (effect.targetType === "TARGET_PLAYER") {
    // Default to healing self
    this.healPlayer(gs, playerIndex, effect.heal, true);
  }
}

    // ✅ Generic token summon support (used by Makibishi)
    if ((effect as any).summonTokenCardId && (effect as any).summonTo === "BOUNCED_SLOT") {
      const ctx = (gs as any).lastBounceContext;
      if (ctx && typeof ctx.bouncedOwnerIndex === "number" && typeof ctx.bouncedSlotIndex === "number") {
        summonTokenIntoSlot(gs, ctx.bouncedOwnerIndex, ctx.bouncedSlotIndex, (effect as any).summonTokenCardId);
      }
      return;
    }
    
    // Handle draw
    if (effect.draw !== undefined && effect.draw > 0) {
      for (let i = 0; i < effect.draw; i++) {
        this.drawCard(player);
      }
      gs.log.push(`${player.name} draws ${effect.draw} card(s).`);
    }
    
    // Handle discard
    if (effect.discard !== undefined && effect.discard > 0) {
      gs.pendingDiscard = {
        playerIndex,
        source: "Card Effect",
      };
    }
    
    if (effect.atkBuff !== undefined) {
      const applyBuff = (bc: any) => {
        if (effect.buffDuration === "PERMANENT") {
          bc.permAtkBuff = (bc.permAtkBuff || 0) + effect.atkBuff!;
        } else {
          bc.tempAtkBuff = (bc.tempAtkBuff || 0) + effect.atkBuff!;
        }
      };

      if (effect.targetType === "ALL_FRIENDLY") {
        player.board.forEach(bc => {
          if (bc) applyBuff(bc as any);
        });
        gs.log.push(`All your creatures gain +${effect.atkBuff} ATK ${effect.buffDuration === "PERMANENT" ? "permanently" : "this turn"}.`);
      } else if (target?.type === "CREATURE") {
        const bc = gs.players[target.playerIndex].board[target.slotIndex];
        if (bc) {
          applyBuff(bc as any);
          gs.log.push(`${bc.card.name} gains +${effect.atkBuff} ATK ${effect.buffDuration === "PERMANENT" ? "permanently" : "this turn"}.`);
        }
      }
    }

    // ✅ Handle bounce (return creature to owner's hand)
if (effect.bounce && target?.type === "CREATURE") {
  bounceCreatureToHand(gs, target.playerIndex, target.slotIndex, playerIndex);
}

    if (effect.peekHand) {
      const spec = effect.peekHand;
      const revealedPlayerIndex =
        spec.target === "PLAYER"
          ? (target?.type === "PLAYER" ? target.playerIndex : (1 - playerIndex))
          : (1 - playerIndex);

      const revealed = gs.players[revealedPlayerIndex];
      const revealCount = spec.revealCount ?? revealed.hand.length;

      const slice = revealed.hand.slice(0, revealCount);
      gs.pendingHandReveal = {
        viewerPlayerIndex: playerIndex,
        revealedPlayerIndex,
        cardIds: slice.map(c => c.id),
        cardNames: slice.map(c => c.name),
        until: "END_OF_TURN",
      };

      gs.log.push(`${gs.players[playerIndex].name} looks at ${revealed.name}'s hand.`);
    }
    
// Handle stun
if (effect.stun !== undefined && target?.type === "CREATURE") {
  const bc = gs.players[target.playerIndex].board[target.slotIndex];
  if (bc) {
    (bc as any).stunnedForTurns = effect.stun;
    gs.log.push(`${bc.card.name} is Stunned for ${effect.stun} turn(s).`);
  }
}
    
    // Handle shield
    if (effect.shield !== undefined && target?.type === "CREATURE") {
      const bc = gs.players[target.playerIndex].board[target.slotIndex];
      if (bc) {
        (bc as any).preventedDamage = ((bc as any).preventedDamage || 0) + effect.shield;
        gs.log.push(`${bc.card.name} gains a shield preventing ${effect.shield} damage.`);
      }
    }

    // ✅ Handle evasion grant (temp evade this turn)
if (effect.evasion && target?.type === "CREATURE") {
  const bc = gs.players[target.playerIndex].board[target.slotIndex];
  if (bc) {
    (bc as any).tempEvadeThisTurn = true;
    gs.log.push(`${bc.card.name} will evade the next battle damage this turn.`);
  }
}
    
    // Handle destroy
    if (effect.destroy && target?.type === "CREATURE") {
      const targetPlayer = gs.players[target.playerIndex];
      const bc = targetPlayer.board[target.slotIndex];
      
      if (bc) {
        // Check conditions if any
        let canDestroy = true;
        
        if (effect.conditions) {
          for (const condition of effect.conditions) {
            if (condition.type === "RANK_CHECK") {
              const creatureRank = (bc.card as any).rank;
              if (creatureRank !== condition.value) {
                canDestroy = false;
                gs.log.push(`Cannot destroy ${bc.card.name}: rank requirement not met.`);
              }
            }
          }
        }
        
        if (canDestroy) {
          targetPlayer.graveyard.push(bc.card);
          targetPlayer.board[target.slotIndex] = null;
          gs.log.push(`${bc.card.name} is destroyed.`);
        }
      }
    }
  }
  
private executeOnPlayEffect(
  gs: GameState,
  effect: CardEffect,
  playerIndex: number,
  target?: SpellTarget
): void {
  const player = gs.players[playerIndex];
  const enemy = gs.players[1 - playerIndex];
  
  // Handle damage
  if (effect.damage !== undefined) {
    if (effect.targetType === "ALL_ENEMY") {
      // Damage all enemy creatures
      enemy.board.forEach((bc, idx) => {
        if (bc) {
          this.applyDamageToCreature(gs, 1 - playerIndex, idx, effect.damage!, false);
        }
      });
    } else if (target?.type === "CREATURE") {
      // Damage targeted creature
      this.applyDamageToCreature(
        gs,
        target.playerIndex,
        target.slotIndex,
        effect.damage,
        false
      );
    }
  }

    // ✅ Handle bounce for ON_PLAY effects (return creature to owner's hand)
  if (effect.bounce && target?.type === "CREATURE") {
    bounceCreatureToHand(gs, target.playerIndex, target.slotIndex, playerIndex);
  }

  // Handle healing for ON_PLAY effects
  if (effect.heal !== undefined && target?.type === "CREATURE") {
    this.healCreature(gs, target.playerIndex, target.slotIndex, effect.heal, false);
  }
  
  if (effect.draw !== undefined && effect.draw > 0) {
    for (let i = 0; i < effect.draw; i++) {
      this.drawCard(player);
    }
    gs.log.push(`${player.name} draws ${effect.draw} card(s).`);
  }
  
  if (effect.discard !== undefined && effect.discard > 0) {
    gs.pendingDiscard = {
      playerIndex,
      source: "On Play",
    };
  }
}

private executeOnAttackEffect(
  gs: GameState,
  effect: CardEffect,
  playerIndex: number
): void {
  const player = gs.players[playerIndex];
  const enemy = gs.players[1 - playerIndex];
  
  // Handle damage to all enemy creatures
  if (effect.damage !== undefined && effect.targetType === "ALL_ENEMY") {
    enemy.board.forEach((bc, idx) => {
      if (bc) {
        this.applyDamageToCreature(gs, 1 - playerIndex, idx, effect.damage!, false);
      }
    });
  }
  
  // Handle draw
  if (effect.draw !== undefined && effect.draw > 0) {
    for (let i = 0; i < effect.draw; i++) {
      this.drawCard(player);
    }
    gs.log.push(`${player.name} draws ${effect.draw} card(s).`);
  }
}

private areConditionsMet(
  gs: GameState,
  sourcePlayerIndex: number,
  target: SpellTarget | undefined,
  conditions: any[]
): boolean {
  const player = gs.players[sourcePlayerIndex] as any;

  for (const cond of conditions) {
    switch (cond.type) {
      case "SELF_HAS_EVADED_THIS_DUEL": {
        // expects target to be SELF creature OR an explicit creature target
        if (target?.type !== "CREATURE") return false;
        const bc = gs.players[target.playerIndex].board[target.slotIndex];
        if (!bc) return false;
        return !!(bc as any).hasEvadedThisDuel;
      }

      case "ANY_FRIENDLY_EVADED_THIS_TURN": {
        return !!player.evadedThisTurn && player.evadedThisTurn.size > 0;
      }

      case "ANY_FRIENDLY_BOUNCED_THIS_TURN": {
        return !!player.bouncedThisTurn && player.bouncedThisTurn.size > 0;
      }

      case "ENEMY_ATTACK_MISSED_THIS_TURN": {
        return !!player.enemyAttackMissedThisTurn;
      }

      // keep your existing ones too (if you later want to reuse them here)
      case "CREATURE_TYPE_COUNT": {
        if (!cond.creatureType || !cond.minCount) return false;
        const count = gs.players[sourcePlayerIndex].board.filter((bc: any) =>
          bc && (bc.card as any).type?.toLowerCase() === cond.creatureType.toLowerCase()
        ).length;
        return count >= cond.minCount;
      }

      case "RELIC_COUNT": {
        if (!cond.relicTag || !cond.minCount) return false;
        const count = gs.players[sourcePlayerIndex].relics.filter((r: any) =>
          r.relic.name.toLowerCase().includes(cond.relicTag.toLowerCase())
        ).length;
        return count >= cond.minCount;
      }

      default:
        // unknown conditions default to false (safer)
        return false;
    }
  }

  return true;
}

  
private executeDeathEffect(
  gs: GameState,
  effect: CardEffect,
  playerIndex: number
): void {
  const player = gs.players[playerIndex];
  const enemy = gs.players[1 - playerIndex];
  
  if (effect.heal !== undefined) {
    // Use the centralized healPlayer method which includes location boosts
    this.healPlayer(gs, playerIndex, effect.heal, false);
    gs.log.push(`(Death ability)`);
  }
  
  if (effect.damage !== undefined) {
    if (effect.targetType === "TARGET_PLAYER") {
      enemy.life -= effect.damage;
      gs.log.push(`${enemy.name} takes ${effect.damage} damage (Death ability).`);
    }
  }
}
  
  private executeCatalystEffect(
    gs: GameState,
    effect: CardEffect,
    playerIndex: number
  ): void {
    const player = gs.players[playerIndex];
    
    if (effect.draw !== undefined && effect.draw > 0) {
      for (let i = 0; i < effect.draw; i++) {
        this.drawCard(player);
      }
      gs.log.push(`Catalyst: ${player.name} draws ${effect.draw} card(s).`);
    }
    
    if (effect.discard !== undefined && effect.discard > 0) {
      gs.pendingDiscard = {
        playerIndex,
        source: "Catalyst",
      };
    }
    
    if (effect.atkBuff !== undefined && effect.targetType === "SELF") {
      // Find the creature with Catalyst and buff it
      player.board.forEach(bc => {
        if (bc && bc.card.name === "Flamebound Acolyte") {
          (bc as any).tempAtkBuff = ((bc as any).tempAtkBuff || 0) + effect.atkBuff!;
          gs.log.push(`${bc.card.name} gains +${effect.atkBuff} ATK (Catalyst).`);
        }
      });
    }
  }

  private triggerCatalystAgain(gs: GameState, playerIndex: number): void {
  const player = gs.players[playerIndex];
  
  player.board.forEach((bc, slotIdx) => {
    if (!bc) return;
    const effects = cardRegistry.getEffects(bc.card.name);
    const catalystEffects = effects.filter((e) => e.timing === "CATALYST");
    
    catalystEffects.forEach((eff) => {
      effectExecutor.executeEffect(gs, eff, playerIndex, {
        type: "CREATURE",
        playerIndex,
        slotIndex: slotIdx,
      });
    });
  });
  
  gs.log.push(`Catalyst effects trigger again!`);
}

private evaluateConditionalValue(
  gs: GameState,
  playerIndex: number,
  conditional: ConditionalValue
): number {
  const { baseValue, bonusValue, condition } = conditional;
  const player = gs.players[playerIndex];
  
  let conditionMet = false;
  
  switch (condition.type) {
    case "CREATURE_TYPE_COUNT":
      if (condition.creatureType && condition.minCount) {
        const count = player.board.filter(bc => 
          bc && (bc.card as any).type?.toLowerCase() === condition.creatureType.toLowerCase()
        ).length;
        conditionMet = count >= condition.minCount;
      }
      break;
      
    case "RELIC_COUNT":
      if (condition.relicTag && condition.minCount) {
        const count = player.relics.filter(r =>
          r.relic.name.toLowerCase().includes(condition.relicTag!.toLowerCase())
        ).length;
        conditionMet = count >= condition.minCount;
      }
      break;
      
    // Add other condition types as needed
  }
  
  return conditionMet ? bonusValue : baseValue;
}
  
  private handleCustomScript(
    gs: GameState,
    script: string,
    playerIndex: number,
    target?: SpellTarget
  ): void {
    const player = gs.players[playerIndex];
    const enemy = gs.players[1 - playerIndex];
    
    // Custom scripts that need special handling
    // Most custom scripts are just for tracking/filtering, not execution
    switch (script) {
      case "RESURRECT_TO_FIELD":
        this.resurrectToField(gs, playerIndex);
        break;
        
      case "RESURRECT_TO_HAND":
        this.resurrectToHand(gs, playerIndex);
        break;

        case "RESURRECT_NAMED_TO_HAND":
  this.resurrectNamedToHand(gs, playerIndex, effect);
  break;

  case "COPY_RELIC_KEYWORDS":
  this.copyRelicKeywords(gs, playerIndex);
  break;
        
      case "HEAL_IF_KILL":
        // This needs special handling - check if target died
        if (target?.type === "CREATURE") {
          const targetPlayer = gs.players[target.playerIndex];
          const wasDead = !targetPlayer.board[target.slotIndex];
          
          // Apply damage first (this is handled in the main damage flow)
          // Then check if it died
          if (wasDead) {
            this.healPlayer(gs, playerIndex, 1, true);
          }
        }
        break;
        
case "TRIGGER_CATALYST":
  this.triggerCatalystAgain(gs, playerIndex);
  break;

  case "SEARCH_DECK_TO_TOP":
  this.searchDeckToTop(gs, playerIndex, effect);
  break;
        
      default:
        // Unknown custom script - just log it
        // Don't log for common filter scripts
        if (!["EXCLUDE_SELF", "ENEMY_ONLY", "FRIENDLY_ONLY"].includes(script)) {
          console.log(`Custom script (may be handled elsewhere): ${script}`);
        }
    }
  }
  
  private resurrectToField(gs: GameState, playerIndex: number): void {
    const player = gs.players[playerIndex];
    
    const creatureIndex = [...player.graveyard]
      .map((c, i) => ({ c, i }))
      .reverse()
      .find(x => x.c.kind === "CREATURE" || x.c.kind === "EVOLUTION")?.i;
    
    if (creatureIndex === undefined) {
      gs.log.push("No creature in graveyard to resurrect.");
      return;
    }
    
    const card = player.graveyard[creatureIndex];
    const emptySlot = player.board.findIndex(bc => bc === null);
    
    if (emptySlot === -1) {
      gs.log.push("Resurrection failed: no empty board slot.");
      return;
    }
    
    player.graveyard.splice(creatureIndex, 1);
    
    const bc: BoardCreature = {
      card: card as any,
      currentHp: (card as any).hp,
      hasSummoningSickness: true,
    };
    
    player.board[emptySlot] = bc;
    gs.log.push(`${card.name} returns to the field.`);
  }
  
  private resurrectToHand(gs: GameState, playerIndex: number): void {
    const player = gs.players[playerIndex];
    
    const creatureIndex = [...player.graveyard]
      .map((c, i) => ({ c, i }))
      .reverse()
      .find(x => x.c.kind === "CREATURE" || x.c.kind === "EVOLUTION")?.i;
    
    if (creatureIndex === undefined) {
      gs.log.push("No creature in graveyard to return.");
      return;
    }
    
    const card = player.graveyard.splice(creatureIndex, 1)[0];
    player.hand.push(card as any);
    gs.log.push(`${card.name} returns to your hand.`);
  }

private resurrectNamedToHand(
  gs: GameState,
  playerIndex: number,
  effect: CardEffect
): void {
  const player = gs.players[playerIndex];
  
  // Parse what to search for from the customScript
  // e.g., "RESURRECT_NAMED_TO_HAND_RUNEBLADE"
  const parts = effect.customScript?.split("_") || [];
  const searchTag = parts[parts.length - 1]; // "RUNEBLADE", "GAUNTLET", etc.
  
  // Find creature matching the name criteria
  const targetCard = [...player.graveyard]
    .reverse()
    .find(c => 
      (c.kind === "CREATURE" || c.kind === "EVOLUTION") &&
      c.name.toLowerCase().includes(searchTag.toLowerCase())
    );
  
  if (!targetCard) {
    gs.log.push("No matching creature in graveyard.");
    return;
  }
  
  // Remove from graveyard and add to hand
  player.graveyard = player.graveyard.filter(c => c.id !== targetCard.id);
  player.hand.push(targetCard as MainDeckCard);
  
  gs.log.push(`${targetCard.name} returns to your hand.`);
}
  
  // Helper methods
  private drawCard(player: PlayerState): void {
    const card = player.deck.shift();
    if (card) {
      player.hand.push(card);
    }
  }

private searchDeckToTop(
  gs: GameState,
  playerIndex: number,
  effect: CardEffect
): void {
  const player = gs.players[playerIndex];
  
  // Parse what to search for from the customScript
  // e.g., "SEARCH_DECK_TO_TOP_RUNEBLADE_RELIC"
  const parts = effect.customScript?.split("_") || [];
  const searchTag = parts[parts.length - 2]; // "RUNEBLADE"
  const searchType = parts[parts.length - 1]; // "RELIC"
  
  // Find cards matching the search criteria
  const matchingCards = player.deck.filter(c => {
    if (searchType === "RELIC" && c.kind !== "RELIC") return false;
    if (searchType === "CREATURE" && c.kind !== "CREATURE") return false;
    if (searchType === "SPELL" && c.kind !== "FAST_SPELL" && c.kind !== "SLOW_SPELL") return false;
    
    // Check if card name contains the tag
    return c.name.toLowerCase().includes(searchTag.toLowerCase());
  });
  
  if (matchingCards.length === 0) {
    gs.log.push("No matching cards found in deck.");
    return;
  }
  
  // Take the first matching card
  const card = matchingCards[0];
  const cardIndex = player.deck.indexOf(card);
  
  // Remove from deck
  player.deck.splice(cardIndex, 1);
  
  // Place on top of deck
  player.deck.unshift(card);
  
  gs.log.push(`A card is moved to the top of the deck.`);
}

// Better approach - parse from the card's actual text
private copyRelicKeywords(
  gs: GameState,
  playerIndex: number,
  effect: CardEffect
): void {
  const player = gs.players[playerIndex];
  
  // Find the creature that has this Catalyst effect
  let sourceCreature: BoardCreature | null = null;
  let sourceSlot = -1;
  
  for (let i = 0; i < player.board.length; i++) {
    const bc = player.board[i];
    if (!bc) continue;
    
    const effects = cardRegistry.getEffects(bc.card.name);
    const hasCopyKeywordsEffect = effects.some(e => 
      e.customScript?.startsWith("COPY_RELIC_KEYWORDS")
    );
    
    if (hasCopyKeywordsEffect) {
      sourceCreature = bc;
      sourceSlot = i;
      break;
    }
  }
  
  if (!sourceCreature) return;
  
  // Parse the creature's text to find the relic tag
  // Pattern: "Gain all keywords from the [TAG] relics you control"
  const text = sourceCreature.card.text;
  const match = text.match(/gain all keywords from (?:the )?(\w+) relics/i);
  
  if (!match) {
    console.error("Could not parse relic tag from card text:", text);
    return;
  }
  
  const relicTag = match[1]; // "Runeblade", "Gauntlet", etc.
  const creatureCard = sourceCreature.card as any;
  
  // Ensure keywords array exists
  if (!creatureCard.keywords) creatureCard.keywords = [];
  if (!creatureCard.catalystAddedKeywords) creatureCard.catalystAddedKeywords = [];
  
  // Collect all unique keywords from matching relics
  const relicKeywords = new Map<string, any>();
  
  player.relics.forEach(relicData => {
    // Check if this relic matches the tag
    if (!relicData.relic.name.toLowerCase().includes(relicTag.toLowerCase())) return;
    
    const keywords = cardRegistry.getKeywords(relicData.relic.name);
    keywords.forEach(kw => {
      // Store the highest value for value-based keywords
      const existing = relicKeywords.get(kw.keyword);
      if (!existing || 
          (kw.armor || 0) > (existing.armor || 0) || 
          (kw.regen || 0) > (existing.regen || 0) ||
          (kw.surge || 0) > (existing.surge || 0) ||
          (kw.thorns || 0) > (existing.thorns || 0)) {
        relicKeywords.set(kw.keyword, kw);
      }
    });
  });
  
  // Add all collected keywords to the creature
  relicKeywords.forEach(kw => {
    creatureCard.keywords.push(kw);
    creatureCard.catalystAddedKeywords.push(kw);
  });
  
  if (relicKeywords.size > 0) {
    gs.log.push(`${sourceCreature.card.name} gains keywords from ${relicTag} relics!`);
  }
}
  
  private applyDamageToCreature(
    gs: GameState,
    playerIndex: number,
    slotIndex: number,
    damage: number,
    isSpell: boolean
  ): void {
    const player = gs.players[playerIndex];
    const bc = player.board[slotIndex];
    if (!bc) return;
    
    // Simplified damage application - in real implementation, 
    // this would call the engine's applyCreatureDamage function
    bc.currentHp -= damage;
    gs.log.push(`${bc.card.name} takes ${damage} damage.`);
    
    if (bc.currentHp <= 0) {
      player.graveyard.push(bc.card);
      player.board[slotIndex] = null;
      gs.log.push(`${bc.card.name} dies.`);
    }
  }
  
private healCreature(
  gs: GameState,
  playerIndex: number,
  slotIndex: number,
  amount: number
): void {
  const player = gs.players[playerIndex];
  const bc = player.board[slotIndex];
  if (!bc) return;
  
  const modifiers = getLocationModifiers(gs, playerIndex);
  let heal = amount + modifiers.healBoost;
  
  const maxHp = (bc.card as any).hp;
  const old = bc.currentHp;
  bc.currentHp = Math.min(bc.currentHp + heal, maxHp);
  
  if (bc.currentHp > old) {
    gs.log.push(`${bc.card.name} heals ${bc.currentHp - old} HP.`);
  }
}
  
private healPlayer(
  gs: GameState,
  playerIndex: number,
  amount: number,
): void {
  const player = gs.players[playerIndex];
  
  const modifiers = getLocationModifiers(gs, playerIndex);
  console.log("Healing player", playerIndex, "base amount:", amount, "boost:", modifiers.healBoost, "location:", player.location?.name);
  let heal = amount + modifiers.healBoost;
  
  const old = player.life;
  player.life = Math.min(20, player.life + heal);
  gs.log.push(`${player.name} heals ${player.life - old} HP.`);
}
}

export const effectExecutor = new EffectExecutor();
// src/game/effectExecutor.ts

import { GameState, PlayerState, BoardCreature } from "./types";
import { CardEffect, TargetType } from "./cardEffects";
import { SpellTarget } from "./engine";

export class EffectExecutor {
  executeEffect(
    gs: GameState,
    effect: CardEffect,
    sourcePlayerIndex: number,
    target?: SpellTarget
  ): void {
    switch (effect.timing) {
      case "IMMEDIATE":
        this.executeImmediateEffect(gs, effect, sourcePlayerIndex, target);
        break;
      case "ON_PLAY":
        this.executeOnPlayEffect(gs, effect, sourcePlayerIndex);
        break;
      case "DEATH":
        this.executeDeathEffect(gs, effect, sourcePlayerIndex);
        break;
      case "CATALYST":
        this.executeCatalystEffect(gs, effect, sourcePlayerIndex);
        break;
      // Add other timings as needed
    }
  }
  
  private executeImmediateEffect(
    gs: GameState,
    effect: CardEffect,
    playerIndex: number,
    target?: SpellTarget
  ): void {
    const player = gs.players[playerIndex];
    const enemy = gs.players[1 - playerIndex];
    
    // Handle custom scripts first
    if (effect.customScript) {
      this.handleCustomScript(gs, effect.customScript, playerIndex, target);
      return;
    }
    
    // Handle damage
    if (effect.damage !== undefined) {
      if (target?.type === "CREATURE") {
        this.applyDamageToCreature(
          gs,
          target.playerIndex,
          target.slotIndex,
          effect.damage,
          true
        );
      } else if (target?.type === "PLAYER") {
        const targetPlayer = gs.players[target.playerIndex];
        targetPlayer.life -= effect.damage;
        gs.log.push(`${targetPlayer.name} takes ${effect.damage} damage.`);
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
      } else if (effect.targetType === "TARGET_PLAYER") {
        // Default to healing self
        this.healPlayer(gs, playerIndex, effect.heal, true);
      }
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
    
    // Handle ATK buff
    if (effect.atkBuff !== undefined) {
      if (effect.targetType === "ALL_FRIENDLY") {
        player.board.forEach(bc => {
          if (bc) {
            (bc as any).tempAtkBuff = ((bc as any).tempAtkBuff || 0) + effect.atkBuff!;
          }
        });
        gs.log.push(`All your creatures gain +${effect.atkBuff} ATK this turn.`);
      } else if (target?.type === "CREATURE") {
        const bc = gs.players[target.playerIndex].board[target.slotIndex];
        if (bc) {
          (bc as any).tempAtkBuff = ((bc as any).tempAtkBuff || 0) + effect.atkBuff!;
          gs.log.push(`${bc.card.name} gains +${effect.atkBuff} ATK this turn.`);
        }
      }
    }
    
    // Handle freeze
    if (effect.freeze !== undefined && target?.type === "CREATURE") {
      const bc = gs.players[target.playerIndex].board[target.slotIndex];
      if (bc) {
        (bc as any).frozenForTurns = effect.freeze;
        gs.log.push(`${bc.card.name} is Frozen for ${effect.freeze} turn(s).`);
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
    playerIndex: number
  ): void {
    const player = gs.players[playerIndex];
    
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
  
  private executeDeathEffect(
    gs: GameState,
    effect: CardEffect,
    playerIndex: number
  ): void {
    const player = gs.players[playerIndex];
    const enemy = gs.players[1 - playerIndex];
    
    if (effect.heal !== undefined) {
      player.life = Math.min(player.life + effect.heal, 20);
      gs.log.push(`${player.name} heals ${effect.heal} HP (Death ability).`);
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
  
  private handleCustomScript(
    gs: GameState,
    script: string,
    playerIndex: number,
    target?: SpellTarget
  ): void {
    const player = gs.players[playerIndex];
    const enemy = gs.players[1 - playerIndex];
    
    switch (script) {
      case "RESURRECT_TO_FIELD":
        this.resurrectToField(gs, playerIndex);
        break;
        
      case "RESURRECT_TO_HAND":
        this.resurrectToHand(gs, playerIndex);
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
        
      case "SELF_DAMAGE":
        player.life -= 2;
        gs.log.push(`${player.name} loses 2 life.`);
        break;
        
      default:
        gs.log.push(`Unknown custom script: ${script}`);
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
  
  // Helper methods
  private drawCard(player: PlayerState): void {
    const card = player.deck.shift();
    if (card) {
      player.hand.push(card);
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
    amount: number,
    fromSpell: boolean
  ): void {
    const player = gs.players[playerIndex];
    const bc = player.board[slotIndex];
    if (!bc) return;
    
    let heal = amount;
    
    // Tideswell Basin bonus
    if (fromSpell && player.location?.name === "Tideswell Basin") {
      heal += 1;
    }
    
    const maxHp = (bc.card as any).hp;
    const old = bc.currentHp;
    bc.currentHp = Math.min(bc.currentHp + heal, maxHp);
    gs.log.push(`${bc.card.name} heals ${bc.currentHp - old} HP.`);
  }
  
  private healPlayer(
    gs: GameState,
    playerIndex: number,
    amount: number,
    fromSpell: boolean
  ): void {
    const player = gs.players[playerIndex];
    let heal = amount;
    
    // Tideswell Basin bonus
    if (fromSpell && player.location?.name === "Tideswell Basin") {
      heal += 1;
    }
    
    const old = player.life;
    player.life = Math.min(20, player.life + heal);
    gs.log.push(`${player.name} heals ${player.life - old} HP.`);
  }
}

export const effectExecutor = new EffectExecutor();
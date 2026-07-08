(function () {
  'use strict';

  const Game = window.CrystalMatchGame;
  if (!Game) return;

  Game.prototype.pushEffect = function (effect) {
      this.effects.push(effect);
      this.trimEffects();
      return effect;
    
  };

  Game.prototype.trimEffects = function () {
      const limit = this.maxEffects || 160;
      this.trimSpritePieces();
      let over = this.effects.length - limit;
      if (over <= 0) return;

      this.effects = this.effects.filter((effect) => {
        if (over <= 0) return true;
        if (effect.kind === 'spark' || effect.kind === 'spritePiece') {
          over -= 1;
          return false;
        }
        return true;
      });

      if (over > 0) this.effects.splice(0, over);
    
  };

  Game.prototype.trimSpritePieces = function () {
      const limit = this.maxSpritePieces || Math.floor((this.maxEffects || 160) * 0.55);
      let count = 0;
      for (let i = 0; i < this.effects.length; i += 1) {
        if (this.effects[i].kind === 'spritePiece') count += 1;
      }
      let over = count - limit;
      if (over <= 0) return;
      this.effects = this.effects.filter((effect) => {
        if (over <= 0 || effect.kind !== 'spritePiece') return true;
        over -= 1;
        return false;
      });
    
  };

  Game.prototype.updateEffects = function (dt) {
      const decay = dt / 1000;
      this.reactionCooldown = Math.max(0, this.reactionCooldown - dt);
      if (this.boardBounce.life > 0) {
        this.boardBounce.life = Math.max(0, this.boardBounce.life - dt);
      }
      this.reactions = this.reactions.filter((reaction) => {
        reaction.elapsed += dt;
        reaction.life -= dt;
        reaction.y -= reaction.floatSpeed * decay;
        if (reaction.sparks) {
          reaction.sparks.forEach((spark) => {
            spark.life -= dt;
            spark.x += spark.vx * decay;
            spark.y += spark.vy * decay;
            spark.vy += 0.12 * decay;
          });
          reaction.sparks = reaction.sparks.filter((spark) => spark.life > 0);
        }
        return reaction.life > 0;
      });
      this.effects = this.effects.filter((effect) => {
        if (effect.delay && effect.delay > 0) {
          effect.delay -= dt;
          return true;
        }
        effect.life -= decay;
        effect.x += effect.vx * decay;
        effect.y += effect.vy * decay;
        effect.vy += (effect.gravity === undefined ? 1.7 : effect.gravity) * decay;
        return effect.life > 0;
      });
      this.popups = this.popups.filter((popup) => {
        popup.life -= decay;
        popup.y -= 0.58 * decay;
        return popup.life > 0;
      });
      this.coinFlights = this.coinFlights.filter((coin) => {
        coin.elapsed += dt;
        if (coin.elapsed < coin.delay) return true;
        if (coin.elapsed - coin.delay >= coin.duration) {
          this.displayCoins += coin.value;
          this.playSound('coinCollect');
          return false;
        }
        return true;
      });
      this.coinSpendBursts = this.coinSpendBursts.filter((coin) => {
        coin.elapsed += dt;
        return coin.elapsed - coin.delay < coin.duration;
      });
    
  };

  Game.prototype.evaluateReaction = function (stats) {
      const combo = stats.combo || 0;
      const cleared = stats.cleared || 0;
      const gained = stats.gained || 0;
      let candidate = null;

      if (combo >= 4) {
        candidate = { kind: 'combo', power: 'strong', priority: 80, text: this.t('reaction.combo', { combo }) };
      } else if (cleared >= 18) {
        candidate = { kind: 'clear', power: 'strong', priority: 76, text: this.t('reaction.crushing') };
      } else if (gained >= 4000) {
        candidate = { kind: 'score', power: 'strong', priority: 72, text: this.t('reaction.amazing') };
      } else if (combo >= 3) {
        candidate = { kind: 'combo', power: 'medium', priority: 60, text: this.t('reaction.combo', { combo }) };
      } else if (cleared >= 12) {
        candidate = { kind: 'clear', power: 'medium', priority: 56, text: this.t('reaction.greatMove') };
      } else if (gained >= 2000) {
        candidate = { kind: 'score', power: 'medium', priority: 52, text: this.t('reaction.powerful') };
      } else if (combo >= 2) {
        candidate = { kind: 'combo', power: 'small', priority: 40, text: this.t('reaction.combo', { combo }) };
      } else if (cleared >= 8) {
        candidate = { kind: 'clear', power: 'small', priority: 36, text: this.t('reaction.nice') };
      } else if (gained >= 1000) {
        candidate = { kind: 'score', power: 'small', priority: 32, text: this.t('reaction.excellent') };
      }

      if (candidate) this.triggerReaction(candidate);
    
  };

  Game.prototype.triggerReaction = function (candidate) {
      if (!candidate || !candidate.text) return false;
      const force = !!candidate.force || candidate.power === 'rank';
      if (!force && this.reactionCooldown > 0) return false;

      const active = this.reactions || [];
      if (active.length >= 2) {
        let weakestIndex = 0;
        for (let i = 1; i < active.length; i += 1) {
          if ((active[i].priority || 0) < (active[weakestIndex].priority || 0)) weakestIndex = i;
        }
        if (!force && (active[weakestIndex].priority || 0) >= (candidate.priority || 0)) return false;
        active.splice(weakestIndex, 1);
      }

      const l = this.reactionLevel(candidate.power);
      const reaction = {
        kind: candidate.kind || 'generic',
        power: candidate.power || 'small',
        priority: candidate.priority || 1,
        text: candidate.text,
        subtext: candidate.subtext || '',
        life: l.life,
        maxLife: l.life,
        elapsed: 0,
        x: 0,
        y: 0,
        offsetX: (Math.random() - 0.5) * 0.9,
        offsetY: (Math.random() - 0.5) * 0.42,
        floatSpeed: l.floatSpeed,
        sparks: l.sparkCount > 0 ? this.createReactionSparks(l.sparkCount) : []
      };
      active.push(reaction);
      this.reactions = active.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 2);
      this.reactionCooldown = force ? 260 : l.cooldown;
      if (l.bounce > 0) {
        this.boardBounce = { life: l.bounceLife, maxLife: l.bounceLife, power: l.bounce };
      }
      return true;
    
  };

  Game.prototype.reactionLevel = function (power) {
      if (power === 'rank') return { life: 1900, cooldown: 0, floatSpeed: 0.025, bounce: 0.03, bounceLife: 360, sparkCount: this.mobileLike ? 14 : 22 };
      if (power === 'strong') return { life: 1500, cooldown: 920, floatSpeed: 0.03, bounce: 0.024, bounceLife: 280, sparkCount: this.mobileLike ? 10 : 18 };
      if (power === 'medium') return { life: 1180, cooldown: 760, floatSpeed: 0.034, bounce: 0.014, bounceLife: 220, sparkCount: 0 };
      return { life: 950, cooldown: 620, floatSpeed: 0.04, bounce: 0, bounceLife: 0, sparkCount: 0 };
    
  };

  Game.prototype.createReactionSparks = function (count) {
      const sparks = [];
      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI * 0.92 + Math.random() * Math.PI * 0.84;
        const speed = 0.18 + Math.random() * 0.42;
        sparks.push({
          x: (Math.random() - 0.5) * 1.35,
          y: (Math.random() - 0.5) * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 520 + Math.random() * 480,
          maxLife: 1000,
          size: 0.012 + Math.random() * 0.018
        });
      }
      return sparks;
    
  };

  Game.prototype.spawnLineBeam = function (col, row, type, direction) {
      this.playSound('line');
      this.pushEffect({
        kind: 'lineBeam',
        x: col + 0.5,
        y: row + 0.5,
        vx: 0,
        vy: 0,
        life: 0.5,
        maxLife: 0.5,
        type,
        direction,
        size: 1,
        gravity: 0
      });
    
  };

  Game.prototype.spawnBombBlast = function (col, row, type) {
      this.playSound('bomb');
      this.pushEffect({
        kind: 'bombBlast',
        x: col + 0.5,
        y: row + 0.5,
        vx: 0,
        vy: 0,
        life: 0.48,
        maxLife: 0.48,
        type,
        size: 1,
        gravity: 0
      });
    
  };

  Game.prototype.spawnBurst = function (col, row, type, special, delay = 0, suppressLightning = false) {
      const isStoneBurst = type < 0;
      const isBombBurst = special === 'bomb';
      const lightBreak = !!suppressLightning;
      const density = this.effectDensity || 1;
      const normalPieces = Math.round((isStoneBurst ? 5 : 6) * density);
      const specialPieces = Math.round((isStoneBurst ? 4 : 3) * density);
      const pieceCount = lightBreak
        ? Math.max(isStoneBurst ? 3 : 3, specialPieces)
        : Math.max(isStoneBurst ? 4 : 5, normalPieces);
      const pieces = this.shardPieces(pieceCount);
      pieces.forEach((piece) => {
        const center = piece.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
        center.x /= piece.length;
        center.y /= piece.length;
        const angle = Math.atan2(center.y, center.x);
        const speed = (isStoneBurst ? 0.22 : 0.28) + Math.random() * 0.16;
        const effect = this.pushEffect({
          kind: 'spritePiece',
          x: col + 0.5,
          y: row + 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: (isStoneBurst ? 0.62 : 0.54) + Math.random() * 0.12,
          maxLife: 0,
          type,
          special,
          delay,
          piece,
          size: isStoneBurst ? 0.98 : isBombBurst ? 1.12 : 1.04,
          rotation: 0,
          gravity: 0.38
        });
        effect.maxLife = effect.life;
      });

      if (!suppressLightning) {
        this.pushEffect({
          kind: 'matchFlash',
          x: col + 0.5,
          y: row + 0.5,
          vx: 0,
          vy: 0,
          life: 0.18,
          maxLife: 0.18,
          type,
          special,
          delay,
          size: isStoneBurst ? 0.98 : isBombBurst ? 1.12 : 1.04,
          rotation: 0,
          gravity: 0
        });
      }

    
  };

  Game.prototype.spawnRainbowBurst = function (col, row, delay = 0) {
      this.playSound('rainbow');
      this.pushEffect({
        kind: 'rainbowBurst',
        x: col + 0.5,
        y: row + 0.5,
        vx: 0,
        vy: 0,
        life: 0.52,
        maxLife: 0.52,
        type: 3,
        delay,
        size: 1,
        gravity: 0
      });
    
  };

  Game.prototype.spawnRainbowHit = function (col, row, type, delay = 0) {
      this.pushEffect({
        kind: 'rainbowHit',
        x: col + 0.5,
        y: row + 0.5,
        vx: 0,
        vy: 0,
        life: 0.34,
        maxLife: 0.34,
        type,
        delay,
        size: 1,
        gravity: 0
      });
    
  };

  Game.prototype.shardPieces = function (count) {
      const six = [
        [{ x: -0.5, y: -0.5 }, { x: -0.04, y: -0.5 }, { x: 0.02, y: -0.03 }, { x: -0.28, y: 0.08 }, { x: -0.5, y: -0.08 }],
        [{ x: -0.04, y: -0.5 }, { x: 0.24, y: -0.5 }, { x: 0.12, y: 0.02 }, { x: 0.02, y: -0.03 }],
        [{ x: 0.24, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: -0.08 }, { x: 0.12, y: 0.02 }],
        [{ x: -0.5, y: -0.08 }, { x: -0.28, y: 0.08 }, { x: -0.08, y: 0.5 }, { x: -0.5, y: 0.5 }],
        [{ x: -0.28, y: 0.08 }, { x: 0.02, y: -0.03 }, { x: 0.12, y: 0.02 }, { x: 0.08, y: 0.5 }, { x: -0.08, y: 0.5 }],
        [{ x: 0.12, y: 0.02 }, { x: 0.5, y: -0.08 }, { x: 0.5, y: 0.5 }, { x: 0.08, y: 0.5 }]
      ];
      const five = [
        [{ x: -0.5, y: -0.5 }, { x: -0.04, y: -0.5 }, { x: 0.02, y: -0.03 }, { x: -0.28, y: 0.08 }, { x: -0.5, y: -0.08 }],
        [{ x: -0.04, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: -0.08 }, { x: 0.12, y: 0.02 }, { x: 0.02, y: -0.03 }],
        [{ x: -0.5, y: -0.08 }, { x: -0.28, y: 0.08 }, { x: -0.08, y: 0.5 }, { x: -0.5, y: 0.5 }],
        [{ x: -0.28, y: 0.08 }, { x: 0.02, y: -0.03 }, { x: 0.12, y: 0.02 }, { x: 0.08, y: 0.5 }, { x: -0.08, y: 0.5 }],
        [{ x: 0.12, y: 0.02 }, { x: 0.5, y: -0.08 }, { x: 0.5, y: 0.5 }, { x: 0.08, y: 0.5 }]
      ];
      if (count >= 6) return six;
      if (count >= 5) return five;
      if (count <= 3) {
        return [
          [{ x: -0.5, y: -0.5 }, { x: 0.04, y: -0.5 }, { x: -0.06, y: 0.08 }, { x: -0.5, y: 0.24 }],
          [{ x: 0.04, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.18 }, { x: 0.08, y: 0.06 }, { x: -0.06, y: 0.08 }],
          [{ x: -0.5, y: 0.24 }, { x: -0.06, y: 0.08 }, { x: 0.08, y: 0.06 }, { x: 0.5, y: 0.18 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }]
        ];
      }
      return [
        [{ x: -0.5, y: -0.5 }, { x: 0.02, y: -0.5 }, { x: -0.03, y: 0.03 }, { x: -0.5, y: 0.16 }],
        [{ x: 0.02, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.1 }, { x: 0.08, y: 0.04 }, { x: -0.03, y: 0.03 }],
        [{ x: -0.5, y: 0.16 }, { x: -0.03, y: 0.03 }, { x: 0.06, y: 0.5 }, { x: -0.5, y: 0.5 }],
        [{ x: 0.08, y: 0.04 }, { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.06, y: 0.5 }, { x: -0.03, y: 0.03 }]
      ];
    
  };

  Game.prototype.lightningBolts = function (count) {
      const bolts = [];
      for (let i = 0; i < count; i += 1) {
        const horizontal = Math.random() > 0.45;
        const start = horizontal
          ? { x: -0.42, y: -0.28 + Math.random() * 0.56 }
          : { x: -0.28 + Math.random() * 0.56, y: -0.42 };
        const end = horizontal
          ? { x: 0.42, y: -0.28 + Math.random() * 0.56 }
          : { x: -0.28 + Math.random() * 0.56, y: 0.42 };
        const points = [];
        const steps = 5 + Math.floor(Math.random() * 3);
        for (let step = 0; step <= steps; step += 1) {
          const t = step / steps;
          const wobble = (Math.random() - 0.5) * 0.24;
          points.push({
            x: start.x + (end.x - start.x) * t + (horizontal ? 0 : wobble),
            y: start.y + (end.y - start.y) * t + (horizontal ? wobble : 0)
          });
        }
        bolts.push({ points, branch: false });
        for (let branch = 1; branch < points.length - 1; branch += 2) {
          if (Math.random() < 0.72) {
            const base = points[branch];
            const branchAngle = (horizontal ? -Math.PI / 2 : 0) + (Math.random() - 0.5) * 1.2;
            const length = 0.1 + Math.random() * 0.14;
            bolts.push({
              branch: true,
              points: [
                base,
                {
                  x: base.x + Math.cos(branchAngle) * length,
                  y: base.y + Math.sin(branchAngle) * length
                },
                {
                  x: base.x + Math.cos(branchAngle + 0.55) * length * 1.45,
                  y: base.y + Math.sin(branchAngle + 0.55) * length * 1.45
                }
              ]
            });
          }
        }
      }
      return bolts;
    
  };

})();

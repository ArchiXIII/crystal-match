(function () {
  'use strict';

  const Game = window.CrystalMatchGame;
  if (!Game) return;

  Game.prototype.nextGoal = function () {
      const level = Math.floor(this.goalLevel / 3);
      const color = this.randomType();
      const templates = [
        {
          type: 'score',
          target: 1200 + level * 450,
          reward: 250 + level * 50,
          text: this.t('goal.score')
        },
        {
          type: 'color',
          color,
          target: 14 + level * 3,
          reward: 300 + level * 60,
          text: this.t('goal.color', { color: this.colorName(color) })
        },
        {
          type: 'stones',
          target: 3 + level,
          reward: 350 + level * 70,
          text: this.t('goal.stones')
        },
        {
          type: 'combo',
          target: 2 + Math.floor(level / 2),
          reward: 400 + level * 80,
          text: this.t('goal.combo')
        },
        {
          type: 'special',
          target: 2 + Math.floor(level / 2),
          reward: 500 + level * 80,
          text: this.t('goal.special')
        },
        {
          type: 'match4',
          target: 2 + Math.floor(level / 2),
          reward: 420 + level * 75,
          text: this.t('goal.match4')
        },
        {
          type: 'createBomb',
          target: 1 + Math.floor(level / 3),
          reward: 520 + level * 90,
          text: this.t('goal.createBomb')
        },
        {
          type: 'useBooster',
          target: 1 + Math.floor(level / 4),
          reward: 360 + level * 70,
          text: this.t('goal.useBooster')
        }
      ];
      const availableTemplates = templates.filter((template) => (
        (template.type !== 'stones' || (this.turns >= 6 && this.stoneCountOnBoard() > 0)) &&
        (template.type !== 'createBomb' || this.goalLevel >= 3) &&
        (template.type !== 'useBooster' || this.goalLevel >= 4)
      ));
      const pool = this.goalLevel < 2 ? availableTemplates.slice(0, 2) : availableTemplates;
      const goal = pool[Math.floor(Math.random() * pool.length)];
      this.currentGoal = Object.assign({ progress: 0 }, goal);
    
  };

  Game.prototype.applyLevelGoal = function () {
      const level = this.currentLevel;
      if (!level || !level.goal) {
        this.currentGoal = null;
        return;
      }
      const goal = Object.assign({}, level.goal);
      const text = this.levelGoalText(goal);
      const target = this.levelGoalTarget(goal);
      this.currentGoal = Object.assign({
        progress: 0,
        target,
        reward: goal.reward || 0,
        text,
        levelGoal: true,
        parts: this.levelGoalParts(goal)
      }, goal);
      this.refreshLevelGoalProgress();
    
  };

  Game.prototype.levelGoalTarget = function (goal) {
      if (goal.type === 'colors') return goal.target * (goal.colors ? goal.colors.length : 1);
      if (goal.type === 'colorStones') return (goal.colorTarget || 0) + (goal.stoneTarget || 0);
      if (goal.type === 'scoreCombo') return (goal.scoreTarget || 0) + (goal.comboTarget || 0);
      if (goal.type === 'scoreStones') return (goal.scoreTarget || 0) + (goal.stoneTarget || 0);
      return goal.target || 1;
    
  };

  Game.prototype.levelGoalParts = function (goal) {
      if (goal.type === 'colors') {
        return {
          colors: (goal.colors || []).reduce((acc, color) => {
            acc[color] = 0;
            return acc;
          }, {})
        };
      }
      if (goal.type === 'colorStones') return { color: 0, stones: 0 };
      if (goal.type === 'scoreCombo') return { score: 0, combo: 0 };
      if (goal.type === 'scoreStones') return { score: 0, stones: 0 };
      return null;
    
  };

  Game.prototype.levelGoalText = function (goal) {
      if (goal.type === 'score') return this.t('goal.score');
      if (goal.type === 'color') return this.t('goal.color', { color: this.colorName(goal.color) });
      if (goal.type === 'stones') return this.t('goal.stones');
      if (goal.type === 'combo') return this.t('goal.combo');
      if (goal.type === 'special') return this.t('goal.special');
      if (goal.type === 'createRainbow') return this.t('goal.createRainbow');
      if (goal.type === 'rainbowUse') return this.t('goal.rainbowUse');
      if (goal.type === 'colors') {
        return this.t('goal.twoColors', {
          first: this.colorName((goal.colors || [0])[0]),
          second: this.colorName((goal.colors || [1])[1])
        });
      }
      if (goal.type === 'colorStones') return this.t('goal.colorStones', { color: this.colorName(goal.color) });
      if (goal.type === 'scoreCombo') return this.t('goal.scoreCombo');
      if (goal.type === 'scoreStones') return this.t('goal.scoreStones');
      return this.t('goal.score');
    
  };

  Game.prototype.refreshLevelGoalProgress = function () {
      const goal = this.currentGoal;
      if (!goal || !goal.levelGoal) return;
      if (goal.type === 'colors') {
        goal.progress = Object.keys(goal.parts.colors).reduce((sum, color) => {
          return sum + Math.min(goal.target, goal.parts.colors[color] || 0);
        }, 0);
      } else if (goal.type === 'colorStones') {
        goal.progress = Math.min(goal.colorTarget, goal.parts.color || 0) + Math.min(goal.stoneTarget, goal.parts.stones || 0);
      } else if (goal.type === 'scoreCombo') {
        goal.progress = Math.min(goal.scoreTarget, goal.parts.score || 0) + Math.min(goal.comboTarget, goal.parts.combo || 0);
      } else if (goal.type === 'scoreStones') {
        goal.progress = Math.min(goal.scoreTarget, goal.parts.score || 0) + Math.min(goal.stoneTarget, goal.parts.stones || 0);
      }
      if (goal.progress >= goal.target) this.completeGoal();
    
  };

  Game.prototype.colorName = function (type) {
      return [
        this.t('color.red'),
        this.t('color.blue'),
        this.t('color.green'),
        this.t('color.purple'),
        this.t('color.gold')
      ][type] || this.t('color.fallback');
    
  };

  Game.prototype.addGoalProgress = function (type, amount, color) {
      const goal = this.currentGoal;
      if (!goal || amount <= 0) return;
      if (goal.levelGoal) {
        this.addLevelGoalProgress(type, amount, color);
        return;
      }
      if (goal.type !== type) return;
      if (goal.type === 'color' && goal.color !== color) return;
      goal.progress = Math.min(goal.target, goal.progress + amount);
      if (goal.progress >= goal.target) {
        this.completeGoal();
      }
    
  };

  Game.prototype.addLevelGoalProgress = function (type, amount, color) {
      const goal = this.currentGoal;
      if (!goal || !goal.levelGoal || amount <= 0) return;
      if (goal.type === type) {
        if (goal.type === 'color' && goal.color !== color) return;
        goal.progress = Math.min(goal.target, goal.progress + amount);
        if (goal.progress >= goal.target) this.completeGoal();
        return;
      }
      if (goal.type === 'colors' && type === 'color' && goal.parts && goal.parts.colors && goal.parts.colors[color] !== undefined) {
        goal.parts.colors[color] += amount;
        this.refreshLevelGoalProgress();
      } else if (goal.type === 'colorStones') {
        if (type === 'color' && goal.color === color) goal.parts.color += amount;
        if (type === 'stones') goal.parts.stones += amount;
        this.refreshLevelGoalProgress();
      } else if (goal.type === 'scoreCombo') {
        if (type === 'score') goal.parts.score += amount;
        if (type === 'combo') goal.parts.combo += amount;
        this.refreshLevelGoalProgress();
      } else if (goal.type === 'scoreStones') {
        if (type === 'score') goal.parts.score += amount;
        if (type === 'stones') goal.parts.stones += amount;
        this.refreshLevelGoalProgress();
      }
    
  };

  Game.prototype.completeGoal = function () {
      const goal = this.currentGoal;
      if (!goal) return;
      if (this.gameMode === 'level' && this.pendingLevelWin) return;
      if (this.gameMode === 'level') {
        this.pendingLevelReward = Math.max(0, Math.floor(Number(goal.reward) || 0));
        this.playSound('goalComplete');
        this.pendingLevelWin = true;
        goal.progress = goal.target;
      } else {
        this.addCoins(goal.reward, { kind: 'goal' }, true, { immediate: true });
        this.playSound('goalComplete');
        this.goalLevel += 1;
        this.nextGoal();
      }
    
  };

})();

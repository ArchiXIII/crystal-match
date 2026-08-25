(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;
  const GEM_COLORS = window.CrystalMatchRenderAssets.GEM_COLORS;

  Renderer.prototype.drawGoal = function (ctx) {
      const goal = this.game.currentGoal;
      if (!goal || this.shouldShowEndRoundButton()) return;
      const l = this.layout;
      const compact = this.width < 420;
      const tight = !!l.tightPortrait;
      let x = l.goalX;
      const y = l.goalY;
      let w = l.goalWidth;
      const h = l.goalHeight;
      const progress = Math.max(0, Math.min(1, goal.progress / goal.target));
      const progressKey = goal.text + '|' + goal.target;
      if (this.goalProgressKey !== progressKey) {
        this.goalProgressKey = progressKey;
        this.goalProgressDisplay = progress;
      } else {
        this.goalProgressDisplay += (progress - this.goalProgressDisplay) * 0.14;
        if (Math.abs(progress - this.goalProgressDisplay) < 0.003) this.goalProgressDisplay = progress;
      }
      const shownProgress = Math.max(0, Math.min(1, this.goalProgressDisplay));
      const mobileLevelGoal = this.game.gameMode === 'level' && !l.desktopGoal;
      const mobileEndlessGoal = this.game.gameMode === 'endless' && !l.desktopGoal;
      const compactGoal = mobileLevelGoal || mobileEndlessGoal;
      if (mobileEndlessGoal && this.shouldShowExitEndlessRoundButton()) {
        const exitGap = tight ? 7 : 9;
        const exitButtonW = Math.max(tight ? 82 : 104, Math.min(tight ? 102 : 128, l.goalWidth * (tight ? 0.27 : 0.31)));
        x = l.goalX + exitButtonW + exitGap;
        w = Math.max(152, l.goalWidth - exitButtonW - exitGap);
      }
      const barX = x + (tight ? 12 : 16);
      const barY = compactGoal ? y + h - (tight ? 14 : 18) : y + h - (l.desktopGoal ? 20 : (tight ? 15 : 20));
      const movesAreaW = mobileLevelGoal ? (tight ? 74 : Math.min(112, Math.max(92, w * 0.16))) : 0;
      const exitAreaW = 0;
      const sideActionW = Math.max(movesAreaW, exitAreaW);
      const barW = compactGoal
        ? Math.max(88, w - (tight ? 26 : 36) - sideActionW)
        : w - (tight ? 24 : 32);
      const barH = tight ? 5 : 6;
      const desktopGoalTight = l.desktopGoal && h < 108;
      const lineY = l.desktopGoal ? (desktopGoalTight ? y + h - 34 : barY - 20) : y + h * (tight ? 0.34 : 0.38);
      const rewardText = '+' + this.formatCoins(goal.reward);
      const rewardCoinR = l.desktopGoal ? 8 : (tight ? 7 : 8);
      const rewardCoinX = barX + barW - rewardCoinR;
      const rewardTextGap = tight ? 4 : 5;
      const rewardTextSize = l.desktopGoal ? 16 : (compact ? (tight ? 13 : 12) : 14);

      this.roundPanel(ctx, x, y, w, h, 16, 0.76);
      ctx.save();
      ctx.fillStyle = '#fff4d6';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      if (l.desktopGoal) {
        const titleY = y + (desktopGoalTight ? 15 : 18);
        const goalTextY = y + (desktopGoalTight ? 37 : 42);
        const titleSize = desktopGoalTight ? 13 : 14;
        const goalSize = desktopGoalTight ? 17 : 18;
        const progressSize = desktopGoalTight ? 18 : 19;
        ctx.font = '800 ' + titleSize + 'px CrystalUI, Arial';
        ctx.fillStyle = '#f6bd4c';
        ctx.fillText(this.t('goal.title'), x + 14, titleY);
        ctx.fillStyle = '#fff4d6';
        const desktopGoalFont = this.fitTextFontSize(ctx, goal.text, w - 28, goalSize, desktopGoalTight ? 10 : 11, '800');
        ctx.font = '800 ' + desktopGoalFont + 'px CrystalUI, Arial';
        ctx.fillText(goal.text, x + 14, goalTextY);
        ctx.fillStyle = '#ffd77a';
        const desktopProgressText = goal.progress + ' / ' + goal.target;
        const desktopProgressFont = this.fitTextFontSize(ctx, desktopProgressText, w - 96, progressSize, 11, '800');
        ctx.font = '800 ' + desktopProgressFont + 'px CrystalUI, Arial';
        ctx.fillText(desktopProgressText, x + 14, lineY);
        ctx.textAlign = 'right';
        ctx.font = '800 ' + (desktopGoalTight ? Math.max(14, rewardTextSize - 1) : rewardTextSize) + 'px CrystalUI, Arial';
        ctx.fillText(rewardText, rewardCoinX - rewardCoinR - rewardTextGap, lineY, Math.max(44, w * 0.28));
        this.drawCoin(ctx, rewardCoinX, lineY, rewardCoinR);
      } else if (compactGoal) {
        const leftPad = tight ? 12 : 16;
        const actionAreaW = mobileLevelGoal ? movesAreaW : exitAreaW;
        const movesX = x + w - (tight ? 42 : Math.max(48, actionAreaW * 0.48));
        const leftW = Math.max(120, w - leftPad - actionAreaW - 16);
        const titleY = tight ? y + 17 : y + Math.max(24, h * 0.34);
        const progressRight = barX + barW;
        const progressText = goal.progress + '/' + goal.target;
        const movesLabelY = tight ? y + 10 : y + Math.max(16, h * 0.24);
        const movesValueY = y + h * (tight ? 0.64 : 0.63);
        const titleSize = compact ? (tight ? 15 : 16) : 18;
        const progressSize = compact ? (tight ? 18 : 19) : 22;

        ctx.fillStyle = '#fff4d6';
        ctx.font = '800 ' + titleSize + 'px CrystalUI, Arial';
        ctx.textAlign = 'left';

        ctx.fillStyle = '#ffd77a';
        const progressMaxW = Math.max(tight ? 48 : 58, Math.min(tight ? 66 : 78, leftW * 0.42));
        const progressFont = this.fitTextFontSize(ctx, progressText, progressMaxW, progressSize, tight ? 12 : 13, '800');
        ctx.font = '800 ' + progressFont + 'px CrystalUI, Arial';
        const progressW = Math.max(tight ? 48 : 58, Math.min(progressMaxW, ctx.measureText(progressText).width + 6));
        ctx.textAlign = 'right';
        ctx.fillText(progressText, progressRight, titleY);

        ctx.fillStyle = '#fff4d6';
        const titleMaxW = Math.max(38, leftW - progressW - 12);
        const titleFont = this.fitTextFontSize(ctx, goal.text, titleMaxW, titleSize, tight ? 8 : 9, '800');
        ctx.font = '800 ' + titleFont + 'px CrystalUI, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(goal.text, x + leftPad, titleY);

        if (mobileLevelGoal) {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f6bd4c';
          ctx.font = '800 ' + (tight ? 11 : 13) + 'px CrystalUI, Arial';
          ctx.fillText(this.t('hud.moves'), movesX, movesLabelY);
          ctx.fillStyle = '#fff4d6';
          this.drawMovesValue(ctx, Math.max(0, this.game.levelMovesLeft || 0), movesX, movesValueY, tight ? 25 : 31, 'center');
        }
      } else {
        ctx.font = '800 ' + (compact ? (tight ? 15 : 14) : 17) + 'px CrystalUI, Arial';
        const leftPad = tight ? 12 : 16;
        const rightPad = tight ? 12 : 16;
        const titleFont = ctx.font;
        ctx.font = '800 ' + rewardTextSize + 'px CrystalUI, Arial';
        const rewardTextW = ctx.measureText(rewardText).width;
        ctx.font = titleFont;
        const rewardGroupW = rewardTextW + rewardCoinR * 2 + rewardTextGap + 8;
        const progressMaxW = tight ? 54 : 66;
        const progressRight = x + w - rightPad - rewardGroupW;
        const titleMaxW = Math.max(50, progressRight - (x + leftPad) - progressMaxW - 8);
        const topGoalFont = this.fitTextFontSize(ctx, goal.text, titleMaxW, compact ? (tight ? 15 : 14) : 17, tight ? 8 : 9, '800');
        ctx.font = '800 ' + topGoalFont + 'px CrystalUI, Arial';
        ctx.fillText(goal.text, x + leftPad, lineY);

        ctx.fillStyle = '#ffd77a';
        const topProgressText = goal.progress + '/' + goal.target;
        const topProgressFont = this.fitTextFontSize(ctx, topProgressText, progressMaxW, compact ? (tight ? 14 : 13) : 15, 9, '800');
        ctx.font = '800 ' + topProgressFont + 'px CrystalUI, Arial';
        ctx.textAlign = 'right';
        ctx.fillText(topProgressText, progressRight, lineY);
        ctx.font = '800 ' + rewardTextSize + 'px CrystalUI, Arial';
        ctx.fillText(rewardText, rewardCoinX - rewardCoinR - rewardTextGap, lineY, Math.max(42, rewardGroupW - rewardCoinR * 2));
        this.drawCoin(ctx, rewardCoinX, lineY, rewardCoinR);
      }

      this.roundRect(ctx, barX, barY, barW, barH, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();

      if (shownProgress > 0) {
        this.roundRect(ctx, barX, barY, barW * shownProgress, barH, 4);
        const grd = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        grd.addColorStop(0, '#f6bd4c');
        grd.addColorStop(0.58, '#7af2ff');
        grd.addColorStop(1, '#d66aff');
        ctx.fillStyle = grd;
        ctx.shadowColor = 'rgba(246, 189, 76, 0.72)';
        ctx.shadowBlur = this.shadow(10);
        ctx.fill();
      }
      ctx.restore();
    };

  Renderer.prototype.shouldShowEndlessMoveBonus = function () {
      return this.game.platformFeatures.endlessMoveBonus === true &&
        this.game.gameMode === 'endless' &&
        !this.game.menuOpen &&
        !this.game.gameOver &&
        !!this.game.currentGoal;
    };

  Renderer.prototype.drawEndlessMoveBonus = function (ctx) {
      this.endlessBonusPanelRect = null;
      this.endlessBonusClaimRect = null;
      this.endlessBonusAdRect = null;
      if (!this.shouldShowEndlessMoveBonus() || !this.game.endlessMoveBonusInfo) return;
      const info = this.game.endlessMoveBonusInfo();
      const l = this.layout;
      const tight = !!l.tightPortrait;
      const gap = l.verticalGap || Math.max(7, Math.min(12, this.height * 0.01));
      const h = Math.max(48, l.endlessBonusHeight || (tight ? 54 : 64));
      const x = l.desktopGoal ? l.goalX : l.boardX - 4;
      const y = l.goalY + l.goalHeight + gap;
      const w = l.desktopGoal ? l.goalWidth : l.boardWidth + 8;
      this.endlessBonusPanelRect = { x, y, w, h };

      ctx.save();
      this.roundPanel(ctx, x, y, w, h, Math.min(16, h * 0.28), 0.76);
      this.roundRect(ctx, x, y, w, h, Math.min(16, h * 0.28));
      ctx.strokeStyle = info.ready ? 'rgba(255, 229, 144, 0.76)' : 'rgba(255, 229, 144, 0.34)';
      ctx.lineWidth = info.ready ? 1.6 : 1.1;
      if (info.ready) {
        ctx.shadowColor = 'rgba(246, 189, 76, 0.48)';
        ctx.shadowBlur = this.shadow(14);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (info.ready) {
        this.drawEndlessMoveBonusButtons(ctx, info, x, y, w, h, tight, l.desktopGoal);
        ctx.restore();
        return;
      }

      const pad = tight ? 12 : 14;
      const titleY = y + (tight ? 18 : 21);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f6bd4c';
      ctx.textAlign = 'left';
      ctx.font = '800 ' + (tight ? 13 : 14) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('endlessBonus.title'), x + pad, titleY);
      ctx.fillStyle = '#fff4d6';
      ctx.textAlign = 'right';
      ctx.font = '800 ' + (tight ? 12 : 13) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('endlessBonus.moves', { moves: info.moves, target: info.target }), x + w - pad, titleY);

      const barX = x + pad;
      const barY = y + h - (tight ? 13 : 16);
      const barW = w - pad * 2;
      const barH = tight ? 5 : 6;
      this.roundRect(ctx, barX, barY, barW, barH, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      if (info.moves > 0) {
        this.roundRect(ctx, barX, barY, barW * info.moves / info.target, barH, 4);
        const grd = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        grd.addColorStop(0, '#f6bd4c');
        grd.addColorStop(0.58, '#7af2ff');
        grd.addColorStop(1, '#d66aff');
        ctx.fillStyle = grd;
        ctx.shadowColor = 'rgba(246, 189, 76, 0.72)';
        ctx.shadowBlur = this.shadow(10);
        ctx.fill();
      }
      ctx.restore();
    };

  Renderer.prototype.drawEndlessMoveBonusButtons = function (ctx, info, x, y, w, h, tight, desktop) {
      const outerPad = tight ? 4 : 5;
      const gap = tight ? 5 : 7;
      const buttonW = (w - outerPad * 2 - gap) / 2;
      const buttonH = h - outerPad * 2;
      const left = { x: x + outerPad, y: y + outerPad, w: buttonW, h: buttonH };
      const right = { x: left.x + buttonW + gap, y: left.y, w: buttonW, h: buttonH };
      if (!info.pending) this.endlessBonusClaimRect = left;
      if (info.adAvailable && !info.pending) this.endlessBonusAdRect = right;

      this.roundRect(ctx, left.x, left.y, left.w, left.h, Math.min(13, left.h * 0.28));
      const freeGrd = ctx.createLinearGradient(left.x, left.y, left.x, left.y + left.h);
      freeGrd.addColorStop(0, 'rgba(72, 48, 91, 0.92)');
      freeGrd.addColorStop(1, 'rgba(29, 25, 43, 0.96)');
      ctx.fillStyle = freeGrd;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.58)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      this.roundRect(ctx, right.x, right.y, right.w, right.h, Math.min(13, right.h * 0.28));
      const adGrd = ctx.createLinearGradient(right.x, right.y, right.x, right.y + right.h);
      adGrd.addColorStop(0, info.adAvailable ? '#fff0a8' : 'rgba(84, 76, 78, 0.84)');
      adGrd.addColorStop(0.48, info.adAvailable ? '#f6bd4c' : 'rgba(72, 65, 70, 0.86)');
      adGrd.addColorStop(1, info.adAvailable ? '#a85f12' : 'rgba(44, 41, 49, 0.9)');
      ctx.fillStyle = adGrd;
      ctx.fill();
      ctx.strokeStyle = info.adAvailable ? 'rgba(255, 246, 198, 0.9)' : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      const topY = left.y + left.h * 0.34;
      const valueY = left.y + left.h * 0.72;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = info.pending ? 'rgba(255, 244, 214, 0.5)' : '#fff4d6';
      ctx.font = '800 ' + (desktop ? 13 : (tight ? 10 : 11)) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('endlessBonus.claim'), left.x + left.w / 2, topY, left.w - 12);
      this.drawEndlessMoveBonusValue(ctx, left.x + left.w / 2, valueY, info.reward, tight, info.pending ? 0.48 : 1);

      if (info.pending) {
        ctx.fillStyle = '#2a1705';
        ctx.font = '800 ' + (tight ? 9 : 10) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('endlessBonus.loading'), right.x + right.w / 2, right.y + right.h / 2, right.w - 12);
      } else if (!info.adAvailable) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.58)';
        ctx.font = '800 ' + (tight ? 9 : 10) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('endlessBonus.noVideo'), right.x + right.w / 2, topY, right.w - 12);
        this.drawEndlessMoveBonusValue(ctx, right.x + right.w / 2, valueY, info.adReward, tight, 0.48);
      } else {
        const markSize = tight ? 10 : 11;
        const markX = right.x + right.w / 2 - (tight ? 12 : 14);
        this.drawEndlessMoveBonusPlayMark(ctx, markX, topY, markSize);
        ctx.fillStyle = '#2a1705';
        ctx.textAlign = 'left';
        ctx.font = '900 ' + (desktop ? 14 : (tight ? 11 : 12)) + 'px CrystalUI, Arial';
        ctx.fillText('×4', markX + markSize + 5, topY + 1);
        this.drawEndlessMoveBonusValue(ctx, right.x + right.w / 2, valueY, info.adReward, tight, 1, '#2a1705');
      }
    };

  Renderer.prototype.drawEndlessMoveBonusValue = function (ctx, centerX, y, value, tight, alpha, color) {
      const text = this.formatCoins(value);
      const r = tight ? 6 : 7;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 ' + (tight ? 12 : 13) + 'px CrystalUI, Arial';
      const textW = ctx.measureText(text).width;
      const groupW = r * 2 + 4 + textW;
      const coinX = centerX - groupW / 2 + r;
      this.drawCoin(ctx, coinX, y, r);
      ctx.fillStyle = color || '#ffd77a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, coinX + r + 4, y + 1);
      ctx.restore();
    };

  Renderer.prototype.drawEndlessMoveBonusPlayMark = function (ctx, x, y, size) {
      ctx.save();
      ctx.strokeStyle = '#2a1705';
      ctx.lineWidth = Math.max(1.2, size * 0.14);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#2a1705';
      ctx.beginPath();
      ctx.moveTo(x - size * 0.24, y - size * 0.42);
      ctx.lineTo(x + size * 0.48, y);
      ctx.lineTo(x - size * 0.24, y + size * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

  Renderer.prototype.shouldShowEndRoundButton = function () {
      return this.game.noMoves && !this.game.gameOver && (this.game.gameMode === 'level' || this.game.hasUsableBoosters());
    };

  Renderer.prototype.shouldShowExitEndlessRoundButton = function () {
      const levelExit = this.game.gameMode === 'level' && this.game.platformFeatures.levelExitButton === true;
      return (this.game.gameMode === 'endless' || levelExit) &&
        !this.game.menuOpen &&
        !this.game.gameOver &&
        (levelExit || !this.shouldShowEndRoundButton()) &&
        !!this.game.currentGoal;
    };

  Renderer.prototype.drawExitEndlessRoundButton = function (ctx) {
      this.exitEndlessRoundRect = null;
      if (!this.shouldShowExitEndlessRoundButton()) return;
      const l = this.layout;
      const tight = !!l.tightPortrait;
      const compact = this.width < 420;
      const label = this.t('exitRound.confirm');
      let x;
      let y;
      let w;
      let h;
      if (l.desktopGoal) {
        const gap = Math.max(8, Math.min(12, l.boardHeight * 0.02));
        h = Math.max(34, Math.min(42, l.goalHeight * 0.36));
        w = l.goalWidth;
        x = l.goalX;
        y = this.endlessBonusPanelRect
          ? this.endlessBonusPanelRect.y + this.endlessBonusPanelRect.h + gap
          : l.goalY + l.goalHeight + gap;
        const maxY = l.boardY + l.boardHeight - h;
        if (y > maxY) y = maxY;
      } else if (l.mobileLevelExitRow && this.game.gameMode === 'level') {
        const panelW = l.boardWidth + 8;
        const gap = Math.max(7, Math.min(12, panelW * 0.032));
        h = Math.min(86, l.boosterHeight);
        w = (panelW - gap * 2) / 3;
        x = l.boardX + l.boardWidth / 2 - w / 2;
        y = l.exitRoundY;
      } else {
        h = l.goalHeight;
        w = Math.max(tight ? 82 : 104, Math.min(tight ? 102 : 128, l.goalWidth * (tight ? 0.27 : 0.31)));
        x = l.goalX;
        y = l.goalY;
      }

      this.exitEndlessRoundRect = { x, y, w, h };
      ctx.save();
      ctx.shadowBlur = 0;
      this.roundRect(ctx, x, y, w, h, Math.min(15, h / 2));
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      grd.addColorStop(0, 'rgba(78, 47, 96, 0.58)');
      grd.addColorStop(0.55, 'rgba(58, 40, 78, 0.54)');
      grd.addColorStop(1, 'rgba(42, 34, 62, 0.50)');
      ctx.fillStyle = grd;
      ctx.fill();
      const inset = ctx.createLinearGradient(x, y, x + w, y + h);
      inset.addColorStop(0, 'rgba(255, 229, 144, 0.08)');
      inset.addColorStop(1, 'rgba(122, 242, 255, 0.03)');
      ctx.fillStyle = inset;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.46)';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 244, 214, 0.88)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let fontSize = l.desktopGoal ? 15 : (compact ? (tight ? 15 : 16) : 17);
      ctx.font = '800 ' + fontSize + 'px CrystalUI, Arial';
      while (fontSize > 8 && (ctx.measureText(label).width > w - 12 || fontSize > h * 0.46)) {
        fontSize -= 1;
        ctx.font = '800 ' + fontSize + 'px CrystalUI, Arial';
      }
      ctx.fillText(label, x + w / 2, y + h / 2 + 1);
      ctx.restore();
    };
  Renderer.prototype.drawTutorialHint = function (ctx) {
      if (!this.game.currentTutorialHint || this.shouldShowEndRoundButton()) return;
      const hint = this.game.currentTutorialHint();
      if (!hint || !hint.text) return;
      const l = this.layout;
      const compact = this.width < 420;
      const tight = !!l.tightPortrait;
      const mobile = this.width < 620;
      const boardLeft = l.boardX - 4;
      const boardRight = l.boardX + l.boardWidth + 4;
      const baseY = Math.min(this.height - l.safeBottom - Math.max(46, l.boosterHeight || 58), l.boosterY || (l.boardY + l.boardHeight + 10));
      let x = boardLeft;
      let y = baseY;
      let w = Math.max(170, boardRight - boardLeft);
      let h = Math.max(46, Math.min(68, l.boosterHeight || 58));
      let align = 'center';

      if (hint.anchor === 'hammer') {
        const hammer = (this.boosterRects || []).find((rect) => rect.id === 'hammer');
        if (hammer) {
          const rightSpace = boardRight - (hammer.x + hammer.w + 8);
          if (rightSpace >= 128) {
            x = hammer.x + hammer.w + 8;
            y = hammer.y + Math.max(0, (hammer.h - h) / 2);
            w = rightSpace;
            h = Math.min(hammer.h, Math.max(52, h));
            align = 'left';
          } else {
            w = Math.min(boardRight - boardLeft, mobile ? 260 : 340);
            x = Math.max(boardLeft, Math.min(boardRight - w, hammer.x + hammer.w / 2 - w / 2));
            y = Math.max(l.boardY + l.boardHeight + 6, hammer.y - h - 8);
          }
        }
      } else if (l.desktopGoal && !(this.game.gameMode === 'level' && this.game.platformFeatures.levelExitButton === true)) {
        x = l.goalX;
        w = l.goalWidth;
        y = l.goalY + l.goalHeight + Math.max(8, Math.min(12, l.boardHeight * 0.018));
        h = Math.max(52, Math.min(78, l.goalHeight * 0.72));
        const maxHintBottom = l.boardY + l.boardHeight;
        if (y + h > maxHintBottom) {
          h = Math.max(46, maxHintBottom - y);
        }
        align = 'center';
      } else {
        w = Math.min(boardRight - boardLeft, mobile ? 292 : 430);
        x = l.boardX + l.boardWidth / 2 - w / 2;
      }

      ctx.save();
      this.roundPanel(ctx, x, y, w, h, 15, 0.82);
      this.roundRect(ctx, x, y, w, h, 15);
      ctx.strokeStyle = 'rgba(255, 222, 132, 0.82)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(255, 207, 86, 0.34)';
      ctx.shadowBlur = this.shadow(12);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const sideDesktopHint = l.desktopGoal && hint.anchor !== 'hammer';
      const hintFontSize = sideDesktopHint ? (h < 60 ? 14 : 15) : (compact ? (tight ? 15 : 16) : 18);
      const hintMaxW = w - 24;
      const hintMaxH = h - 14;
      const fittedHint = this.fitWrappedFont(ctx, hint.text, hintMaxW, hintMaxH, hintFontSize, sideDesktopHint ? 9 : 8, '700', sideDesktopHint ? 2 : 3);
      const hintLineHeight = fittedHint.lineHeight;
      ctx.fillStyle = '#fff4d6';
      ctx.font = '700 ' + fittedHint.size + 'px CrystalUI, Arial';
      ctx.textBaseline = 'middle';
      if (align === 'left') {
        ctx.textAlign = 'left';
        const lines = this.wrappedLineCount(ctx, hint.text, w - 22);
        const startY = y + h / 2 - ((lines - 1) * hintLineHeight) / 2;
        this.wrapTextLeft(ctx, hint.text, x + 12, startY, w - 22, hintLineHeight, y + h - 8);
      } else {
        ctx.textAlign = 'center';
        const lines = this.wrappedLineCount(ctx, hint.text, hintMaxW);
        const hintTextY = y + h / 2 - ((lines - 1) * hintLineHeight) / 2;
        this.wrapText(ctx, hint.text, x + 12, hintTextY, hintMaxW, hintLineHeight);
      }
      ctx.restore();
    };

  Renderer.prototype.drawBoosters = function (ctx) {
      const l = this.layout;
      const panelW = l.boardWidth + 8;
      const panelX = l.boardX - 4;
      const gap = Math.max(7, Math.min(12, panelW * 0.032));
      const cardW = (panelW - gap * 2) / 3;
      const cardH = Math.min(86, l.boosterHeight);
      const y = Math.min(this.height - l.safeBottom - cardH, l.boosterY);
      const endRoundPrompt = this.shouldShowEndRoundButton();
      this.boosterRects = [];
      this.boosterShopRects = [];
      const boosters = this.game.availableBoosters ? this.game.availableBoosters() : this.game.boosters;
      boosters.forEach((booster, index) => {
        const x = panelX + index * (cardW + gap);
        const active = this.game.activeBooster === booster.id;
        const cost = this.game.currentBoosterCost(booster);
        const affordable = this.game.coins >= cost;
        const prompted = endRoundPrompt && affordable;
        this.boosterRects.push({ id: booster.id, x, y, w: cardW, h: cardH });
        this.drawCachedBoosterPanel(ctx, x, y, cardW, cardH, 15, 0.78);
        ctx.strokeStyle = active ? '#ffe590' : 'rgba(246, 189, 76, 0.62)';
        ctx.lineWidth = active ? 3 : 1.5;
        ctx.shadowColor = active ? 'rgba(255, 229, 144, 0.88)' : 'transparent';
        ctx.shadowBlur = this.shadow(active ? 24 : 0);
        this.roundRect(ctx, x, y, cardW, cardH, 15);
        ctx.stroke();
        if (prompted) {
          this.drawRunningFrameLight(ctx, x + 2, y + 2, cardW - 4, cardH - 4, 13, index * 0.18);
        }
        ctx.shadowBlur = 0;

        ctx.globalAlpha = affordable ? 1 : 0.45;
        const iconR = Math.min(cardW * 0.24, cardH * 0.38);
        this.drawBoosterIcon(ctx, booster.id, x + cardW * 0.29, y + cardH * 0.5, iconR);
        ctx.globalAlpha = affordable ? 1 : 0.45;
        ctx.shadowBlur = 0;
        ctx.fillStyle = affordable ? '#fff4d6' : 'rgba(255,255,255,0.58)';
        ctx.font = '800 ' + Math.max(12, Math.min(16, cardW * 0.15)) + 'px CrystalUI, Arial';
        ctx.textAlign = 'center';
        const priceCenterX = x + cardW * 0.71;
        const coinR = Math.max(10, Math.min(14, cardH * 0.15));
        const coinY = y + cardH * 0.31;
        const priceY = coinY + coinR * 2.15;
        this.drawCoin(ctx, priceCenterX, coinY, coinR);
        if (!affordable) {
          const plusSize = 26;
          const plusCx = Math.min(x + cardW - plusSize * 0.66, priceCenterX + coinR + plusSize * 0.72);
          const plusCy = coinY;
          const hit = Math.max(38, plusSize + 14);
          this.boosterShopRects.push({ id: booster.id, x: plusCx - hit / 2, y: plusCy - hit / 2, w: hit, h: hit });
          ctx.globalAlpha = 1;
          this.drawCoinShopPlus(ctx, plusCx, plusCy, plusSize / 2);
          ctx.globalAlpha = affordable ? 1 : 0.45;
        }
        ctx.fillText('-' + cost, priceCenterX, priceY);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      });
    };


  Renderer.prototype.drawEndRoundButton = function (ctx) {
      this.endRoundRect = null;
      if (!this.shouldShowEndRoundButton()) return;
      const l = this.layout;
      const panelX = l.goalX;
      const panelY = l.goalY;
      const panelW = l.goalWidth;
      const panelH = l.goalHeight;
      const tight = !!l.tightPortrait;
      const pad = l.goalSide ? 12 : (tight ? 8 : 9);
      const contentY = panelY + (l.goalSide ? 10 : (tight ? 6 : 8));
      const contentH = Math.max(tight ? 30 : 34, Math.min(l.goalSide ? 46 : (tight ? 34 : 40), panelH - (l.goalSide ? 48 : (tight ? 12 : 34))));
      const x = panelX + pad;
      const y = contentY;
      const w = tight && !l.goalSide ? Math.min(148, Math.max(116, panelW * 0.42)) : panelW - pad * 2;
      const h = contentH;
      this.endRoundRect = { x, y, w, h };

      ctx.save();
      this.roundPanel(ctx, panelX, panelY, panelW, panelH, 15, 0.82);
      ctx.shadowBlur = 0;
      this.roundRect(ctx, panelX, panelY, panelW, panelH, 15);
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.74)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      this.drawRunningFrameLight(ctx, panelX + 2, panelY + 2, panelW - 4, panelH - 4, 14, 0);
      ctx.shadowBlur = 0;
      this.roundRect(ctx, x, y, w, h, 15);
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      grd.addColorStop(0, '#fff0a8');
      grd.addColorStop(0.46, '#f5b83b');
      grd.addColorStop(1, '#a85f12');
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = '#fff7cf';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#140b04';
      const buttonText = this.game.gameMode === 'level' ? this.t('endRound.levelButton') : this.t('endRound.button');
      let buttonFontSize = Math.max(tight ? 12 : 15, Math.min(tight ? 15 : 20, w * 0.12));
      ctx.font = '800 ' + buttonFontSize + 'px CrystalUI, Arial';
      while (buttonFontSize > (l.goalSide ? 9 : (tight ? 12 : 13)) && ctx.measureText(buttonText).width > w - 14) {
        buttonFontSize -= 1;
        ctx.font = '800 ' + buttonFontSize + 'px CrystalUI, Arial';
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(buttonText, x + w / 2, y + h / 2 + 1);

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 244, 214, 0.78)';
      const hint = this.t('endRound.hint');
      ctx.textBaseline = 'top';
      if (tight && !l.goalSide) {
        ctx.textAlign = 'left';
        const hintX = x + w + 10;
        const hintW = Math.max(64, panelX + panelW - pad - hintX);
        const hintTop = panelY + 5;
        const hintBottom = panelY + panelH - 8;
        let fontSize = 11;
        let lineHeight = 12;
        ctx.font = '700 ' + fontSize + 'px CrystalUI, Arial';
        while (fontSize > 8 && this.wrappedLineCount(ctx, hint, hintW) * lineHeight > hintBottom - hintTop) {
          fontSize -= 1;
          lineHeight = Math.max(9, fontSize + 1);
          ctx.font = '700 ' + fontSize + 'px CrystalUI, Arial';
        }
        this.wrapTextLeft(ctx, hint, hintX, hintTop, hintW, lineHeight, hintBottom);
      } else {
        const hintTop = y + h + 2;
        const hintW = Math.max(64, panelW - 18);
        const hintBottom = panelY + panelH - 8;
        let fontSize = l.goalSide ? 13 : 12;
        let lineHeight = l.goalSide ? 17 : 14;
        ctx.font = '700 ' + fontSize + 'px CrystalUI, Arial';
        let lineCount = this.wrappedLineCount(ctx, hint, hintW);
        while (fontSize > 8 && lineCount * lineHeight > hintBottom - hintTop) {
          fontSize -= 1;
          lineHeight = Math.max(9, fontSize + 2);
          ctx.font = '700 ' + fontSize + 'px CrystalUI, Arial';
          lineCount = this.wrappedLineCount(ctx, hint, hintW);
        }
        const hintY = hintTop + Math.max(0, (hintBottom - hintTop - lineCount * lineHeight) / 2);
        this.wrapText(ctx, hint, panelX + 9, hintY, hintW, lineHeight);
      }
      ctx.restore();
    };

})();


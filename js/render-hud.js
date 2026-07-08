(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;
  const GEM_COLORS = window.CrystalMatchRenderAssets.GEM_COLORS;

  Renderer.prototype.drawMovesValue = function (ctx, value, x, y, fontSize, align) {
      const moves = Math.max(0, Math.floor(Number(value) || 0));
      const low = this.game && this.game.gameMode === 'level' && moves <= 5 && !this.game.menuOpen && !this.game.gameOver;
      const pulse = low ? (0.5 + Math.sin((this.game.time || 0) * 0.004) * 0.5) : 0;
      const scale = 1 + pulse * 0.055;
      const glow = low ? 9 + pulse * 8 : 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 ' + fontSize + 'px Arial';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(20, 10, 4, 0.86)';
      ctx.lineWidth = Math.max(2, fontSize * 0.1);
      ctx.strokeText(String(moves), 0, 0);
      ctx.fillStyle = low ? '#fff6c8' : '#fff4d6';
      ctx.shadowColor = low ? 'rgba(255, 207, 86, 0.76)' : 'rgba(255, 207, 86, 0.44)';
      ctx.shadowBlur = this.shadow(glow);
      ctx.fillText(String(moves), 0, 0);
      ctx.restore();
    };

  Renderer.prototype.drawHud = function (ctx) {
      const l = this.layout;
      const y = l.safeTop;
      const tight = !!l.tightPortrait;
      this.roundPanel(ctx, l.sidePad, y, this.width - l.sidePad * 2, l.hudHeight, tight ? 20 : 26, 0.72);

      const compact = this.width < 420;
      const avatarY = y + l.hudHeight * 0.5;

      ctx.fillStyle = '#fff7df';
      ctx.font = '800 ' + (compact ? (tight ? 17 : 15) : 18) + 'px Arial';
      ctx.textBaseline = 'middle';
      const profileTextX = l.sidePad + (tight ? 14 : 18);
      const playerName = this.game.playerName || this.t('leaderboard.player');
      this.profileButtonRect = {
        x: profileTextX - 8,
        y: avatarY - (tight ? 26 : 30),
        w: compact ? (tight ? 132 : 126) : 170,
        h: tight ? 48 : 56
      };
      ctx.fillText(playerName, profileTextX, avatarY - (compact ? (tight ? 11 : 12) : 13), compact ? (tight ? 112 : 108) : 154);
      ctx.fillStyle = '#f6bd4c';
      ctx.font = '900 ' + (compact ? (tight ? 12 : 11) : 14) + 'px Arial';
      const rankInfo = this.game.rankInfo ? this.game.rankInfo() : { title: this.t('player.rank'), progress: 0 };
      const rankProgressKey = String(rankInfo.level || 0);
      if (this.rankProgressKey !== rankProgressKey) {
        this.rankProgressKey = rankProgressKey;
        this.rankProgressDisplay = rankInfo.progress || 0;
      } else {
        this.rankProgressDisplay += ((rankInfo.progress || 0) - this.rankProgressDisplay) * 0.08;
        if (Math.abs((rankInfo.progress || 0) - this.rankProgressDisplay) < 0.002) {
          this.rankProgressDisplay = rankInfo.progress || 0;
        }
      }
      ctx.fillText(rankInfo.title, profileTextX, avatarY + (compact ? (tight ? 5 : 5) : 6));
      const rankBarW = compact ? (tight ? 86 : 94) : 126;
      const rankBarH = tight ? 3 : 4;
      const rankBarX = profileTextX;
      const rankBarY = avatarY + (compact ? (tight ? 12 : 15) : 18);
      this.roundRect(ctx, rankBarX, rankBarY, rankBarW, rankBarH, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      this.roundRect(ctx, rankBarX, rankBarY, rankBarW * Math.max(0, Math.min(1, this.rankProgressDisplay || 0)), rankBarH, 3);
      const rankGrd = ctx.createLinearGradient(rankBarX, rankBarY, rankBarX + rankBarW, rankBarY);
      rankGrd.addColorStop(0, '#f6bd4c');
      rankGrd.addColorStop(0.58, '#ffe590');
      rankGrd.addColorStop(1, '#7af2ff');
      ctx.fillStyle = rankGrd;
      ctx.shadowColor = 'rgba(246, 189, 76, 0.58)';
      ctx.shadowBlur = this.shadow(8);
      ctx.fill();
      ctx.shadowBlur = 0;

      const small = compact ? (tight ? 32 : 30) : 38;
      const pillH = compact ? (tight ? 28 : 30) : 38;
      const shownCoins = Math.min(this.game.coins, Math.floor(this.game.displayCoins));
      const coinText = this.formatCoins(shownCoins);
      const plusSize = 26;
      const coinTextBase = compact ? 13 : 17;
      ctx.font = '700 ' + coinTextBase + 'px Arial';
      const minPillW = compact ? (tight ? 118 : 112) : 146;
      const maxPillW = Math.min(compact ? 154 : 196, this.width * (tight ? 0.43 : 0.35));
      const pillW = Math.round(Math.max(minPillW, Math.min(maxPillW, ctx.measureText(coinText).width + plusSize + (compact ? 67 : 84))));
      const buttonInset = tight ? 8 : 14;
      const clusterGap = compact ? 6 : 8;
      const normalScoreX = this.width - l.sidePad - buttonInset - pillW - small * 2 - clusterGap * 2;
      const normalProfileRight = profileTextX + (compact ? (tight ? 124 : 116) : 154);
      const normalRightClusterLeft = normalScoreX - 12;
      const stackedHud = this.width < 560 || normalRightClusterLeft - normalProfileRight < 96;
      const stackedScoreX = Math.round(Math.max(
        (this.width - pillW) / 2,
        Math.min(normalScoreX, this.width * 0.58 - pillW / 2)
      ));
      const scoreX = stackedHud ? stackedScoreX : normalScoreX;
      const stackedScoreCenterX = scoreX + pillW / 2;
      const activeEndlessRound = this.game.gameMode === 'endless' &&
        !this.game.menuOpen &&
        !this.game.levelSelectOpen &&
        !this.game.gameOver;
      const endlessStackedCoinLift = stackedHud && activeEndlessRound ? (tight ? 7 : 6) : 0;
      const scoreY = y + (l.hudHeight - pillH) / 2 - endlessStackedCoinLift;
      this.roundPanel(ctx, scoreX, scoreY, pillW, pillH, pillH / 2, 0.9);
      const coinX = scoreX + (compact ? 17 : 24);
      const coinY = scoreY + pillH / 2;
      const coinR = compact ? 9 : 12;
      this.coinTarget = { x: coinX, y: coinY, r: coinR };
      this.drawCoin(ctx, coinX, coinY, coinR);
      ctx.fillStyle = '#fff9ec';
      ctx.textAlign = 'right';
      const plusX = scoreX + pillW - plusSize - (compact ? 7 : 8);
      const plusY = scoreY + (pillH - plusSize) / 2;
      this.coinShopButtonRect = { x: scoreX, y: scoreY, w: pillW, h: pillH };
      const textMaxW = Math.max(42, plusX - 8 - (coinX + coinR + 7));
      ctx.font = this.fitFont(ctx, coinText, '700', coinTextBase, compact ? 10 : 12, textMaxW);
      ctx.fillText(coinText, plusX - 8, scoreY + pillH / 2 + 1);
      this.drawCoinShopPlus(ctx, plusX + plusSize / 2, plusY + plusSize / 2, plusSize / 2);
      ctx.textAlign = 'left';

      const buttonY = y + (l.hudHeight - small) / 2;
      const muteX = this.width - l.sidePad - small - buttonInset;
      this.soundButtonRect = { x: muteX, y: buttonY, w: small, h: small };
      this.circleButton(ctx, muteX + small / 2, buttonY + small / 2, small / 2, this.game.soundOn ? 'soundOn' : 'soundOff');
      const leaderboardX = muteX - small - clusterGap;
      this.leaderboardButtonRect = { x: leaderboardX, y: buttonY, w: small, h: small };
      this.circleButton(ctx, leaderboardX + small / 2, buttonY + small / 2, small / 2, 'leaderboard');

      if (!this.game.menuOpen) {
        const levelMode = this.game.gameMode === 'level';
        const movesShownInGoal = levelMode && this.game.currentGoal && !l.desktopGoal;
        const centerLabel = levelMode ? this.t('hud.moves') : this.t('hud.score');
        const centerValue = levelMode ? Math.max(0, this.game.levelMovesLeft || 0) : this.game.score;
        if (movesShownInGoal) {
          ctx.textAlign = 'left';
        } else if (stackedHud) {
          ctx.fillStyle = '#f6bd4c';
          ctx.font = '900 ' + (tight ? 14 : 15) + 'px Arial';
          ctx.textAlign = 'center';
          const valueY = y + l.hudHeight - (tight ? 7 : 11);
          if (levelMode) {
            const labelText = centerLabel + ' ';
            const valueText = String(centerValue);
            const labelW = ctx.measureText(labelText).width;
            ctx.font = '900 ' + (tight ? 15 : 16) + 'px Arial';
            const valueW = ctx.measureText(valueText).width;
            const groupX = stackedScoreCenterX - (labelW + valueW) / 2;
            ctx.font = '900 ' + (tight ? 14 : 15) + 'px Arial';
            ctx.fillText(labelText, groupX + labelW / 2, valueY);
            this.drawMovesValue(ctx, valueText, groupX + labelW + valueW / 2, valueY, tight ? 15 : 16, 'center');
          } else {
            const scoreText = centerLabel + ' ' + centerValue;
            let scoreFontSize = tight ? 18 : 20;
            ctx.font = '900 ' + scoreFontSize + 'px Arial';
            while (scoreFontSize > 15 && ctx.measureText(scoreText).width > this.width - l.sidePad * 2 - 24) {
              scoreFontSize -= 1;
              ctx.font = '900 ' + scoreFontSize + 'px Arial';
            }
            ctx.fillText(scoreText, stackedScoreCenterX, valueY);
          }
        } else {
          const scoreSpace = normalRightClusterLeft - normalProfileRight;
          const scoreTextW = Math.min(150, scoreSpace);
          const scoreCenterX = Math.round(Math.max(normalProfileRight + scoreTextW / 2, Math.min(this.width / 2, normalRightClusterLeft - scoreTextW / 2)));
          ctx.fillStyle = '#f6bd4c';
          const desktopLevelHud = levelMode && !stackedHud;
          ctx.font = '800 ' + (desktopLevelHud ? 15 : 10) + 'px Arial';
          ctx.textAlign = 'center';
          const scoreBaseY = y + l.hudHeight * 0.5;
          ctx.fillText(centerLabel, scoreCenterX, scoreBaseY - (desktopLevelHud ? 13 : 9));
          if (levelMode) {
            this.drawMovesValue(ctx, centerValue, scoreCenterX, scoreBaseY + (desktopLevelHud ? 13 : 10), desktopLevelHud ? 26 : 17, 'center');
          } else {
            ctx.fillStyle = '#fff7df';
            ctx.font = '900 17px Arial';
            ctx.fillText(centerValue, scoreCenterX, scoreBaseY + 10);
          }
        }
        ctx.textAlign = 'left';
      }
      ctx.textAlign = 'left';
    };


})();

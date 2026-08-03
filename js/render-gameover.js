(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;

  Renderer.prototype.drawGameOver = function (ctx) {
      this.mainMenuButtonRect = null;
      this.restartLevelButtonRect = null;
      this.nextLevelButtonRect = null;
      this.levelContinueAdButtonRect = null;
      this.playButtonRect = null;
      this.recordButtonRect = null;
      this.levelButtonRects = [];
      this.levelNavRects = [];
      this.levelPlayButtonRect = null;
      this.dailyBonusButtonRect = null;
      this.ourGamesButtonRect = null;
      if (!this.game.gameOver) return;
      this.levelWinStarsSource = null;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      ctx.fillRect(0, 0, this.width, this.height);

      const compact = this.width < 420 || this.height < 720;
      const showLeaderboard = this.game.platformFeatures.gameOverLeaderboard !== false &&
        (this.game.gameMode === 'level' || this.game.platformFeatures.endlessGameOverLeaderboard !== false);
      const w = Math.min(compact ? 380 : 460, this.width - 28);
      const h = Math.min(
        showLeaderboard ? (compact ? 540 : 620) : (compact ? 480 : 540),
        this.height - 28
      );
      const x = Math.round((this.width - w) / 2);
      const y = Math.round((this.height - h) / 2);
      this.roundPanel(ctx, x, y, w, h, 22, 0.94);
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.72)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, w, h, 22);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const isLevelResult = this.game.gameMode === 'level';
      const isLevelLost = isLevelResult && !this.game.levelWon;
      const isLevelWon = isLevelResult && this.game.levelWon;
      if (isLevelResult) {
        const levelNumber = this.game.currentLevel ? this.game.currentLevel.n : 1;
        ctx.fillStyle = '#ffe590';
        ctx.shadowColor = 'rgba(246, 189, 76, 0.72)';
        ctx.shadowBlur = this.shadow(14);
        ctx.font = '800 ' + (compact ? 15 : 17) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('levels.result', { level: levelNumber }), x + w / 2, y + 26);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ffe590';
        ctx.shadowColor = 'rgba(246, 189, 76, 0.72)';
        ctx.shadowBlur = this.shadow(14);
        ctx.font = '800 ' + (compact ? 13 : 15) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('menu.developer'), x + w / 2, y + 26);
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#fff4d6';
      ctx.font = '800 ' + (compact ? 22 : 26) + 'px CrystalUI, Arial';
      const title = this.game.gameMode === 'level'
        ? this.t(this.game.levelWon ? 'gameOver.levelWin' : 'gameOver.levelLose')
        : this.t('gameOver.title');
      ctx.fillText(title, x + w / 2, y + (compact ? 54 : 60));

      let contentY;
      if (isLevelResult) {
        contentY = y + (compact ? 88 : 102);
      } else {
        ctx.fillStyle = '#ffd77a';
        ctx.font = '800 ' + (compact ? 22 : 26) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('gameOver.score', { score: String(this.game.score).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }), x + w / 2, y + (compact ? 88 : 98));
        contentY = y + (compact ? 122 : 136);
      }
      if (this.game.roundNewRank) {
        const rankH = compact ? 32 : 36;
        const rankX = x + 24;
        const rankW = w - 48;
        this.roundRect(ctx, rankX, contentY, rankW, rankH, 14);
        const rankGrd = ctx.createLinearGradient(rankX, contentY, rankX + rankW, contentY + rankH);
        rankGrd.addColorStop(0, 'rgba(246, 189, 76, 0.2)');
        rankGrd.addColorStop(0.5, 'rgba(255, 229, 144, 0.16)');
        rankGrd.addColorStop(1, 'rgba(122, 242, 255, 0.1)');
        ctx.fillStyle = rankGrd;
        ctx.shadowColor = 'rgba(255, 229, 144, 0.42)';
        ctx.shadowBlur = this.shadow(18);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 229, 144, 0.56)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#ffe590';
        ctx.font = '800 ' + (compact ? 12 : 14) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('gameOver.newRank', { rank: this.game.roundNewRank.title }), x + w / 2, contentY + rankH / 2 + 1);
        contentY += rankH + (compact ? 12 : 14);
      }

      if (this.game.gameMode === 'level') {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.78)';
        ctx.font = '800 ' + (compact ? 14 : 16) + 'px CrystalUI, Arial';
        const levelNumber = this.game.currentLevel ? this.game.currentLevel.n : 1;
        if (this.game.levelWon) {
          const earnedStars = Math.max(0, Math.min(3, this.game.lastLevelStarsEarned || (this.game.levelStarsFor ? this.game.levelStarsFor(levelNumber) : 0)));
          const starsX = x + w / 2;
          const starsR = compact ? 30 : 36;
          const starsY = contentY + (compact ? 24 : 30);
          const startTime = this.game.finishedAt || Date.now();
          const now = Date.now();
          this.levelWinStarsSource = { x: starsX, y: starsY };
          this.drawLevelStars(ctx, starsX, starsY, starsR, earnedStars, 1, {
            animated: true,
            startTime
          });
          const trophyEarned = this.game.lastChapterTrophyEarned !== null && this.game.lastChapterTrophyEarned !== undefined;
          const trophyDelay = 1260;
          const trophyElapsed = now - startTime - trophyDelay;
          const trophyProgress = Math.max(0, Math.min(1, trophyElapsed / 560));
          const starSpacing = starsR * 2.25;
          let trophyTextExtra = 0;
          if (trophyEarned && trophyElapsed > 0) {
            const trophySize = compact ? 48 : 58;
            const trophyX = Math.min(x + w - trophySize * 0.78, starsX + starSpacing + starsR * 2.15);
            this.drawChapterTrophy(ctx, trophyX, starsY + (compact ? 1 : 2), trophySize, 1, {
              glow: true,
              progress: trophyProgress
            });
            const label = this.t('gameOver.chapterTrophy');
            const letters = Math.max(0, Math.min(label.length, Math.floor(label.length * Math.max(0, Math.min(1, (trophyElapsed - 240) / 980)))));
            if (letters > 0) {
              trophyTextExtra = compact ? 24 : 29;
              ctx.fillStyle = '#ffe590';
              ctx.shadowColor = 'rgba(246, 189, 76, 0.48)';
              ctx.shadowBlur = this.shadow(8);
              ctx.font = '800 ' + (compact ? 15 : 18) + 'px CrystalUI, Arial';
              ctx.fillText(label.slice(0, letters), x + w / 2, starsY + starsR + trophyTextExtra);
              ctx.shadowBlur = 0;
            }
          }
          const movesY = starsY + starsR + (trophyTextExtra > 0 ? trophyTextExtra + (compact ? 17 : 22) : (compact ? 31 : 37));
          ctx.fillStyle = '#ffd77a';
          ctx.font = '800 ' + (compact ? 15 : 17) + 'px CrystalUI, Arial';
          ctx.fillText(this.t('levels.movesLeft', { moves: Math.max(0, this.game.levelMovesLeft || 0) }), x + w / 2, movesY);
          if (showLeaderboard) {
            const levelBoardY = movesY + (compact ? 22 : 27);
            const listX = x + 22;
            const listW = w - 44;
            const rowH = compact ? 25 : 28;
            if (this.game.gameOverLeaderboardLoading) {
              ctx.fillStyle = 'rgba(255, 244, 214, 0.78)';
              ctx.font = '700 12px CrystalUI, Arial';
              ctx.fillText(this.t('gameOver.leaderboardLoading'), x + w / 2, levelBoardY + rowH);
            } else if (this.game.gameOverLeaderboardError) {
              ctx.fillStyle = 'rgba(255, 244, 214, 0.72)';
              ctx.font = '700 12px CrystalUI, Arial';
              this.wrapText(ctx, this.game.gameOverLeaderboardError, x + 30, levelBoardY + rowH, w - 60, 17);
            } else {
              const rows = this.gameOverLeaderboardRows(this.game.gameOverLeaderboardEntries || [], true);
              rows.forEach((entry, index) => {
                this.drawGameOverLeaderboardRow(ctx, entry, listX, levelBoardY + index * rowH, listW, rowH - 4);
              });
            }
          }
        } else {
          ctx.fillStyle = '#ffd77a';
          ctx.font = '800 ' + (compact ? 17 : 20) + 'px CrystalUI, Arial';
          ctx.fillText(this.t('gameOver.movesEnded'), x + w / 2, contentY + 36);
        }
        contentY += compact ? 112 : 136;
      } else if (showLeaderboard) {
        ctx.fillStyle = '#f6bd4c';
        ctx.font = '800 ' + (compact ? 14 : 16) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('gameOver.leaderboard'), x + w / 2, contentY);
        contentY += compact ? 14 : 17;

        const listX = x + 22;
        const listW = w - 44;
        const rowH = compact ? 25 : 28;
        if (this.game.gameOverLeaderboardLoading) {
          ctx.fillStyle = 'rgba(255, 244, 214, 0.78)';
          ctx.font = '700 13px CrystalUI, Arial';
          ctx.fillText(this.t('gameOver.leaderboardLoading'), x + w / 2, contentY + rowH * 2);
          contentY += rowH * 5.5;
        } else if (this.game.gameOverLeaderboardError) {
          ctx.fillStyle = 'rgba(255, 244, 214, 0.72)';
          ctx.font = '700 12px CrystalUI, Arial';
          this.wrapText(ctx, this.game.gameOverLeaderboardError, x + 30, contentY + rowH, w - 60, 17);
          contentY += rowH * 4.5;
        } else {
          const rows = this.gameOverLeaderboardRows(this.game.gameOverLeaderboardEntries || []);
          if (!rows.length) {
            ctx.fillStyle = 'rgba(255, 244, 214, 0.72)';
            ctx.font = '700 12px CrystalUI, Arial';
            ctx.fillText(this.t('gameOver.leaderboardPending'), x + w / 2, contentY + rowH * 1.5);
            contentY += rowH * 4.5;
          } else {
            rows.forEach((entry, index) => {
              const rowY = contentY + index * rowH;
              if (entry.divider) {
                ctx.fillStyle = 'rgba(255, 229, 144, 0.58)';
                ctx.font = '800 16px CrystalUI, Arial';
                ctx.fillText('...', x + w / 2, rowY + rowH / 2);
                return;
              }
              this.drawGameOverLeaderboardRow(ctx, entry, listX, rowY, listW, rowH - 4);
            });
            contentY += rows.length * rowH + (compact ? 8 : 12);
          }
        }
      }

      const buttonW = Math.min((isLevelLost || isLevelWon) ? 270 : 230, w - 58);
      const buttonH = compact ? 42 : 46;
      const buttonX = x + (w - buttonW) / 2;
      const secondaryH = buttonH;
      const bottomPad = compact ? 18 : 22;
      const secondaryY = y + h - bottomPad - secondaryH;
      const canAdContinue = this.game.canContinueLevelWithAd && this.game.canContinueLevelWithAd();
      if (isLevelLost) {
        const gap = compact ? 10 : 12;
        const mainY = y + h - bottomPad - buttonH;
        const adButtonY = canAdContinue ? mainY - buttonH - gap : 0;
        const restartY = canAdContinue ? adButtonY - buttonH - gap : mainY - buttonH - gap;
        this.restartLevelButtonRect = { x: buttonX, y: restartY, w: buttonW, h: buttonH };
        this.drawGameOverGoldButton(ctx, buttonX, restartY, buttonW, buttonH, this.t('gameOver.restart'), compact);
        if (canAdContinue) {
          this.levelContinueAdButtonRect = { x: buttonX, y: adButtonY, w: buttonW, h: buttonH };
          this.drawGameOverGoldButton(ctx, buttonX, adButtonY, buttonW, buttonH, this.t('levels.continueAd'), compact);
        }
        this.mainMenuButtonRect = { x: buttonX, y: mainY, w: buttonW, h: buttonH };
        this.drawGameOverGoldButton(ctx, buttonX, mainY, buttonW, buttonH, this.t('menu.main'), compact);
      } else if (isLevelWon) {
        const gap = compact ? 10 : 12;
        const mainY = y + h - bottomPad - buttonH;
        const nextY = mainY - buttonH - gap;
        this.nextLevelButtonRect = { x: buttonX, y: nextY, w: buttonW, h: buttonH };
        this.drawGameOverGoldButton(ctx, buttonX, nextY, buttonW, buttonH, this.t('levels.next'), compact);
        this.mainMenuButtonRect = { x: buttonX, y: mainY, w: buttonW, h: buttonH };
        this.drawGameOverGoldButton(ctx, buttonX, mainY, buttonW, buttonH, this.t('menu.main'), compact);
      } else {
        const adButtonY = canAdContinue ? secondaryY - buttonH - 10 : 0;
        const buttonY = canAdContinue ? adButtonY - buttonH - 10 : secondaryY - buttonH - 10;
        const developerGames = this.game.platformFeatures.developerGames !== false;
        if (canAdContinue) {
          this.levelContinueAdButtonRect = { x: buttonX, y: adButtonY, w: buttonW, h: buttonH };
          this.drawGameOverGoldButton(ctx, buttonX, adButtonY, buttonW, buttonH, this.t('levels.continueAd'), compact);
        }
        const mainMenuY = developerGames ? buttonY : secondaryY;
        this.mainMenuButtonRect = { x: buttonX, y: mainMenuY, w: buttonW, h: buttonH };
        this.drawGameOverGoldButton(ctx, buttonX, mainMenuY, buttonW, buttonH, this.t('menu.main'), compact);

        if (developerGames) {
          this.ourGamesButtonRect = { x: buttonX, y: secondaryY, w: buttonW, h: secondaryH };
          this.roundRect(ctx, buttonX, secondaryY, buttonW, secondaryH, 14);
          const secondaryGrd = ctx.createLinearGradient(buttonX, secondaryY, buttonX, secondaryY + secondaryH);
          secondaryGrd.addColorStop(0, 'rgba(31, 36, 48, 0.9)');
          secondaryGrd.addColorStop(1, 'rgba(7, 9, 14, 0.92)');
          ctx.fillStyle = secondaryGrd;
          ctx.fill();
          ctx.strokeStyle = 'rgba(246, 189, 76, 0.62)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.fillStyle = '#fff4d6';
          ctx.font = '800 14px CrystalUI, Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.t('menu.ourGames'), buttonX + buttonW / 2, secondaryY + secondaryH / 2 + 1);
        }
      }

      ctx.restore();
    };

  Renderer.prototype.drawGameOverGoldButton = function (ctx, x, y, w, h, label, compact, disabled) {
      ctx.save();
      this.roundRect(ctx, x, y, w, h, 16);
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      grd.addColorStop(0, disabled ? 'rgba(255, 240, 168, 0.62)' : '#fff0a8');
      grd.addColorStop(0.48, disabled ? 'rgba(246, 189, 76, 0.58)' : '#f6bd4c');
      grd.addColorStop(1, disabled ? 'rgba(168, 95, 18, 0.58)' : '#a85f12');
      ctx.fillStyle = grd;
      ctx.shadowColor = 'rgba(255, 207, 86, 0.72)';
      ctx.shadowBlur = this.shadow(disabled ? 8 : 18);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = disabled ? 'rgba(255, 247, 207, 0.62)' : '#fff7cf';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = disabled ? 'rgba(20, 11, 4, 0.72)' : '#140b04';
      ctx.font = '800 ' + (compact ? 13 : 15) + 'px CrystalUI, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 1, w - 18);
      ctx.restore();
    };

  Renderer.prototype.gameOverLeaderboardRows = function (entries, aroundOnly) {
      const sorted = (entries || []).slice().filter((entry) => entry && Number.isFinite(entry.rank)).sort((a, b) => a.rank - b.rank);
      if (aroundOnly) {
        const player = sorted.find((entry) => entry.isPlayer);
        if (player) {
          return sorted.filter((entry) => Math.abs(entry.rank - player.rank) <= 1).slice(0, 3);
        }
        return sorted.slice(0, 3);
      }
      const top = sorted.filter((entry) => entry.rank <= 5).slice(0, 5);
      const player = sorted.find((entry) => entry.isPlayer);
      const rows = top.slice();
      if (player && !top.some((entry) => entry.rank === player.rank)) {
        const around = sorted.filter((entry) => Math.abs(entry.rank - player.rank) <= 2 && !rows.some((row) => row.rank === entry.rank));
        if (around.length) {
          rows.push({ divider: true });
          around.forEach((entry) => rows.push(entry));
        }
      }
      if (!rows.length && sorted.length) return sorted.slice(0, 7);
      return rows.slice(0, 9);
    };

  Renderer.prototype.drawGameOverLeaderboardRow = function (ctx, entry, x, y, w, h) {
      const isPlayer = entry.isPlayer;
      this.roundRect(ctx, x, y, w, h, 9);
      ctx.fillStyle = isPlayer ? 'rgba(246, 189, 76, 0.2)' : 'rgba(255, 255, 255, 0.055)';
      ctx.fill();
      if (isPlayer) {
        ctx.strokeStyle = 'rgba(255, 229, 144, 0.66)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = isPlayer ? '#ffe590' : '#fff4d6';
      ctx.font = '800 12px CrystalUI, Arial';
      ctx.fillText(String(entry.rank), x + 10, y + h / 2 + 1);
      ctx.font = '700 12px CrystalUI, Arial';
      ctx.fillText(entry.name || this.t('leaderboard.player'), x + 54, y + h / 2 + 1, w - 150);
      ctx.textAlign = 'right';
      ctx.font = '800 12px CrystalUI, Arial';
      const valueText = String(entry.score || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      if (this.game.gameOverLeaderboardType === 'stars') {
        const star = this.uiIconSprites && this.uiIconSprites.levelStar;
        const starSize = Math.min(17, h * 0.72);
        const textX = x + w - starSize - 14;
        ctx.fillText(valueText, textX, y + h / 2 + 1);
        if (star && star.complete && star.naturalWidth) {
          ctx.drawImage(star, x + w - starSize - 8, y + (h - starSize) / 2, starSize, starSize);
        }
      } else {
        ctx.fillText(valueText, x + w - 10, y + h / 2 + 1);
      }
      ctx.textAlign = 'left';
    };

})();

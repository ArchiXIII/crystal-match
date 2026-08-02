(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;
  const GEM_COLORS = window.CrystalMatchRenderAssets.GEM_COLORS;

  Renderer.prototype.drawProfilePanel = function (ctx) {
      this.profileCloseRect = null;
      this.profileXpRect = null;
      if (!this.game.profilePanelOpen) return;

      const compact = this.width < 430 || this.height < 700;
      const w = Math.min(compact ? 360 : 430, this.width - 30);
      const h = Math.min(compact ? 300 : 340, this.height - 34);
      const x = Math.round((this.width - w) / 2);
      const y = Math.round((this.height - h) / 2);
      const rankInfo = this.game.rankInfo ? this.game.rankInfo() : { title: this.t('player.rank'), progress: 0, xp: 0 };
      const playerName = this.game.playerName || this.t('leaderboard.player');
      const xpText = this.formatCoins(rankInfo.xp || 0);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.64)';
      ctx.fillRect(0, 0, this.width, this.height);

      this.roundPanel(ctx, x, y, w, h, 22, 0.95);
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.78)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, w, h, 22);
      ctx.stroke();

      const closeSize = compact ? 34 : 38;
      this.profileCloseRect = { x: x + w - closeSize - 12, y: y + 12, w: closeSize, h: closeSize };
      this.circleButton(ctx, this.profileCloseRect.x + closeSize / 2, this.profileCloseRect.y + closeSize / 2, closeSize / 2, '×');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff7df';
      ctx.font = this.fitFont(ctx, playerName, '900', compact ? 24 : 28, 16, w - 72);
      ctx.fillText(playerName, x + w / 2, y + (compact ? 52 : 62));

      ctx.fillStyle = '#ffe590';
      ctx.font = this.fitFont(ctx, rankInfo.title, '900', compact ? 18 : 21, 13, w - 58);
      ctx.fillText(rankInfo.title, x + w / 2, y + (compact ? 84 : 98));

      const barW = Math.min(w - 74, compact ? 230 : 280);
      const barX = x + (w - barW) / 2;
      const barY = y + (compact ? 107 : 124);
      this.roundRect(ctx, barX, barY, barW, 7, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      this.roundRect(ctx, barX, barY, barW * Math.max(0, Math.min(1, rankInfo.progress || 0)), 7, 5);
      const rankGrd = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      rankGrd.addColorStop(0, '#f6bd4c');
      rankGrd.addColorStop(0.58, '#ffe590');
      rankGrd.addColorStop(1, '#7af2ff');
      ctx.fillStyle = rankGrd;
      ctx.shadowColor = 'rgba(246, 189, 76, 0.62)';
      ctx.shadowBlur = this.shadow(10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f6bd4c';
      ctx.font = '900 ' + (compact ? 14 : 15) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('profile.totalXp'), x + w / 2, y + (compact ? 150 : 168));

      const xpY = y + (compact ? 194 : 216);
      if (this.game.platformFeatures.xpLeaderboard !== false) {
        this.profileXpRect = { x: x + 42, y: xpY - (compact ? 32 : 38), w: w - 84, h: compact ? 64 : 76 };
      }
      ctx.fillStyle = '#fff4d6';
      ctx.shadowColor = 'rgba(246, 189, 76, 0.48)';
      ctx.shadowBlur = this.shadow(10);
      ctx.font = this.fitFont(ctx, xpText, '900', compact ? 34 : 40, 24, w - 54);
      ctx.fillText(xpText, x + w / 2, xpY);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255, 244, 214, 0.82)';
      ctx.font = '800 ' + (compact ? 13 : 14) + 'px CrystalUI, Arial';
      this.wrapText(ctx, this.t('profile.thanks'), x + 28, y + h - (compact ? 56 : 62), w - 56, compact ? 18 : 20);
      ctx.restore();
    };

















})();

(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;

  Renderer.prototype.drawXpLeaderboard = function (ctx) {
      this.xpLeaderboardCloseRect = null;
      if (!this.game.xpLeaderboardOpen) return;

      const compact = this.width < 430 || this.height < 720;
      const w = Math.min(compact ? 376 : 460, this.width - 28);
      const h = Math.min(compact ? 500 : 560, this.height - 28);
      const x = Math.round((this.width - w) / 2);
      const y = Math.round((this.height - h) / 2);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.66)';
      ctx.fillRect(0, 0, this.width, this.height);

      this.roundPanel(ctx, x, y, w, h, 22, 0.95);
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.78)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, w, h, 22);
      ctx.stroke();

      const closeSize = compact ? 34 : 38;
      this.xpLeaderboardCloseRect = { x: x + w - closeSize - 12, y: y + 12, w: closeSize, h: closeSize };
      this.circleButton(ctx, this.xpLeaderboardCloseRect.x + closeSize / 2, this.xpLeaderboardCloseRect.y + closeSize / 2, closeSize / 2, '×');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4d6';
      ctx.font = '900 ' + (compact ? 22 : 25) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('profile.xpLeaderboard'), x + w / 2, y + (compact ? 48 : 56));

      if (this.game.xpLeaderboardLoading) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.82)';
        ctx.font = '800 15px CrystalUI, Arial';
        ctx.fillText(this.t('leaderboard.loading'), x + w / 2, y + h / 2);
        ctx.restore();
        return;
      }

      if (this.game.xpLeaderboardError) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.78)';
        ctx.font = '800 13px CrystalUI, Arial';
        this.wrapText(ctx, this.game.xpLeaderboardError, x + 28, y + h / 2 - 18, w - 56, 18);
        ctx.restore();
        return;
      }

      const rows = this.xpLeaderboardRows(this.game.xpLeaderboardEntries || []);
      if (!rows.length) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.76)';
        ctx.font = '800 15px CrystalUI, Arial';
        ctx.fillText(this.t('leaderboard.empty'), x + w / 2, y + h / 2);
        ctx.restore();
        return;
      }

      const listX = x + 20;
      const listY = y + (compact ? 84 : 96);
      const listW = w - 40;
      const rowH = Math.min(compact ? 31 : 35, Math.max(25, (h - (compact ? 112 : 126)) / Math.max(9, rows.length)));
      rows.forEach((entry, index) => {
        const rowY = listY + index * rowH;
        if (entry.divider) {
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255, 229, 144, 0.58)';
          ctx.font = '900 ' + Math.max(13, rowH * 0.52) + 'px CrystalUI, Arial';
          ctx.fillText('...', x + w / 2, rowY + rowH / 2);
          return;
        }
        this.drawLeaderboardRow(ctx, entry, listX, rowY, listW, rowH - 5, compact);
      });

      ctx.restore();
    };

  Renderer.prototype.xpLeaderboardRows = function (entries) {
      const sorted = (entries || [])
        .slice()
        .filter((entry) => entry && Number.isFinite(entry.rank))
        .sort((a, b) => a.rank - b.rank);
      if (!sorted.length) return [];

      const rows = [];
      const added = new Set();
      const addEntry = (entry) => {
        if (!entry || added.has(entry.rank)) return;
        rows.push(entry);
        added.add(entry.rank);
      };
      const addDivider = () => {
        if (rows.length && !rows[rows.length - 1].divider) rows.push({ divider: true });
      };

      sorted.filter((entry) => entry.rank <= 3).slice(0, 3).forEach(addEntry);

      const player = sorted.find((entry) => entry.isPlayer);
      const around = player
        ? sorted.filter((entry) => Math.abs(entry.rank - player.rank) <= 1)
        : [];
      if (around.some((entry) => !added.has(entry.rank))) {
        addDivider();
        around.forEach(addEntry);
      }

      const bottom = sorted.slice(-3);
      if (bottom.some((entry) => !added.has(entry.rank))) {
        addDivider();
        bottom.forEach(addEntry);
      }

      return rows.slice(0, 13);
    };

  Renderer.prototype.pointToXpLeaderboardClose = function (clientX, clientY) {
      if (!this.xpLeaderboardCloseRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.xpLeaderboardCloseRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

})();

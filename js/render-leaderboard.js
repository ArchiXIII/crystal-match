(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;

  Renderer.prototype.drawLeaderboard = function (ctx) {
      this.leaderboardCloseRect = null;
      this.leaderboardTabRects = [];
      if (!this.game.leaderboardOpen) return;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      ctx.fillRect(0, 0, this.width, this.height);

      const compact = this.width < 420 || this.height < 720;
      const w = Math.min(compact ? 400 : 480, this.width - 28);
      const h = Math.min(compact ? 560 : 640, this.height - 28);
      const x = Math.round((this.width - w) / 2);
      const y = Math.round((this.height - h) / 2);
      const activeTab = this.game.leaderboardTab === 'endless' ? 'endless' : 'stars';
      const tabH = compact ? 44 : 48;
      const tabSlant = compact ? 15 : 18;
      this.roundPanel(ctx, x, y, w, h, 22, 0.95);

      const closeSize = 38;
      this.leaderboardCloseRect = { x: x + w - closeSize - 12, y: y + tabH + 8, w: closeSize, h: closeSize };
      this.circleButton(ctx, this.leaderboardCloseRect.x + closeSize / 2, this.leaderboardCloseRect.y + closeSize / 2, closeSize / 2, '×');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4d6';
      ctx.font = '800 ' + (compact ? 23 : 25) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('leaderboard.title'), x + w / 2, y + tabH + 28);
      const description = activeTab === 'stars' ? this.t('leaderboard.descStars') : this.t('leaderboard.descEndless');
      let descFont = compact ? 9.5 : 11;
      ctx.font = '800 ' + descFont + 'px CrystalUI, Arial';
      const descMaxW = w - (compact ? 70 : 92);
      while (descFont > 7.5 && ctx.measureText(description).width > descMaxW) {
        descFont -= 0.5;
        ctx.font = '800 ' + descFont + 'px CrystalUI, Arial';
      }
      ctx.fillStyle = 'rgba(255, 229, 144, 0.86)';
      ctx.shadowColor = 'rgba(246, 189, 76, 0.25)';
      ctx.shadowBlur = this.shadow(4);
      ctx.fillText(description, x + w / 2, y + tabH + 51);
      ctx.shadowBlur = 0;

      const tabW = (w + tabSlant) / 2;
      const tabs = [
        { id: 'stars', label: this.t('leaderboard.tabStars'), x: x, side: 'left' },
        { id: 'endless', label: this.t('leaderboard.tabEndless'), x: x + w - tabW, side: 'right' }
      ];
      tabs.forEach((tab) => {
        const active = tab.id === activeTab;
        this.leaderboardTabRects.push({ tab: tab.id, x: tab.x, y, w: tabW, h: tabH });
        this.drawLeaderboardTab(ctx, tab.x, y, tabW, tabH, tab.label, active, compact, tab.side, tabSlant);
      });
      this.drawLeaderboardWindowFrame(ctx, x, y, w, h, tabH);
      this.drawLeaderboardTabFrame(ctx, x, y, w, tabH, activeTab, tabSlant);

      if (this.game.leaderboardLoading) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.82)';
        ctx.font = '700 16px CrystalUI, Arial';
        ctx.fillText(this.t('leaderboard.loading'), x + w / 2, y + h / 2);
        ctx.restore();
        return;
      }

      if (this.game.leaderboardError) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.82)';
        ctx.font = '700 14px CrystalUI, Arial';
        this.wrapText(ctx, this.game.leaderboardError, x + 30, y + h / 2 - 20, w - 60, 20);
        ctx.restore();
        return;
      }

      const entries = this.game.leaderboardEntries || [];
      if (!entries.length) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.76)';
        ctx.font = '700 15px CrystalUI, Arial';
        ctx.fillText(this.t('leaderboard.empty'), x + w / 2, y + h / 2);
        ctx.restore();
        return;
      }

      const rows = this.leaderboardRows(entries);
      const listX = x + 20;
      const listY = y + tabH + (compact ? 83 : 90);
      const listW = w - 40;
      const rowH = Math.min(compact ? 29 : 33, Math.max(23, (h - tabH - (compact ? 112 : 122)) / Math.max(12, rows.length)));
      ctx.textBaseline = 'middle';
      rows.forEach((entry, index) => {
        const rowY = listY + index * rowH;
        if (entry.divider) {
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255, 229, 144, 0.6)';
          ctx.font = '800 ' + Math.max(14, rowH * 0.54) + 'px CrystalUI, Arial';
          ctx.fillText('...', x + w / 2, rowY + rowH / 2);
          return;
        }
        this.drawLeaderboardRow(ctx, entry, listX, rowY, listW, rowH - 5, compact);
      });

      ctx.restore();
    };

  Renderer.prototype.drawLeaderboardTabPath = function (ctx, x, y, w, h, side, slant) {
      const r = Math.min(13, h * 0.34);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - slant, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      } else {
        ctx.moveTo(x + slant, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + slant, y);
      }
      ctx.closePath();
    };

  Renderer.prototype.drawLeaderboardTab = function (ctx, x, y, w, h, label, active, compact, side, slant) {
      ctx.save();
      if (!active) {
        const maskX = side === 'left' ? x - 2 : x - 1;
        const maskY = y - 2;
        const maskW = w + 4;
        const maskH = h + 4;
        this.drawLeaderboardTabShadePath(ctx, maskX, maskY, maskW, maskH, side, slant);
        const grd = ctx.createLinearGradient(x, y, x, y + h);
        grd.addColorStop(0, 'rgba(25, 29, 39, 0.98)');
        grd.addColorStop(0.64, 'rgba(11, 13, 20, 0.99)');
        grd.addColorStop(1, 'rgba(7, 9, 14, 0.98)');
        ctx.fillStyle = grd;
        ctx.shadowBlur = 0;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = active ? '#ffe590' : 'rgba(255, 244, 214, 0.72)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 ' + (compact ? 13 : 14) + 'px CrystalUI, Arial';
      const textShift = side === 'left' ? -slant * 0.12 : slant * 0.12;
      ctx.fillText(label, x + w / 2 + textShift, y + h / 2 + 1, w - slant - 12);
      ctx.restore();
    };

  Renderer.prototype.drawLeaderboardTabShadePath = function (ctx, x, y, w, h, side, slant) {
      const r = Math.min(13, h * 0.34);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - slant, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      } else {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + slant, y + h);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

  Renderer.prototype.drawLeaderboardWindowFrame = function (ctx, x, y, w, h, tabH) {
      const r = 22;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.76)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 207, 86, 0.2)';
      ctx.shadowBlur = this.shadow(4);
      ctx.beginPath();
      ctx.moveTo(x, y + tabH);
      ctx.lineTo(x, y + h - r);
      ctx.quadraticCurveTo(x, y + h, x + r, y + h);
      ctx.lineTo(x + w - r, y + h);
      ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
      ctx.lineTo(x + w, y + tabH);
      ctx.stroke();
      ctx.restore();
    };

  Renderer.prototype.drawLeaderboardTabFrame = function (ctx, x, y, w, h, activeTab, slant) {
      const r = 22;
      const centerX = x + w / 2;
      const leftJoin = centerX - slant / 2;
      const rightJoin = centerX + slant / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 232, 151, 0.98)';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 207, 86, 0.34)';
      ctx.shadowBlur = this.shadow(5);
      ctx.beginPath();
      if (activeTab === 'endless') {
        ctx.moveTo(x, y + h);
        ctx.lineTo(leftJoin, y + h);
        ctx.lineTo(rightJoin, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h);
      } else {
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(leftJoin, y);
        ctx.lineTo(rightJoin, y + h);
        ctx.lineTo(x + w, y + h);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

  Renderer.prototype.leaderboardRows = function (entries) {
      const sorted = (entries || []).slice().filter((entry) => entry && Number.isFinite(entry.rank)).sort((a, b) => a.rank - b.rank);
      const unrankedPlayer = (entries || []).find((entry) => entry && entry.isPlayer && !Number.isFinite(entry.rank));
      const top = sorted.filter((entry) => entry.rank <= 10).slice(0, 10);
      const player = sorted.find((entry) => entry.isPlayer);
      const rows = top.slice();
      if (player && !top.some((entry) => entry.rank === player.rank)) {
        const around = sorted.filter((entry) => Math.abs(entry.rank - player.rank) <= 2 && !rows.some((row) => row.rank === entry.rank));
        if (around.length) {
          rows.push({ divider: true });
          around.forEach((entry) => rows.push(entry));
        }
      } else if (unrankedPlayer) {
        if (rows.length) rows.push({ divider: true });
        rows.push(unrankedPlayer);
      }
      return rows.length ? rows.slice(0, 16) : sorted.slice(0, 12);
    };

  Renderer.prototype.drawLeaderboardRow = function (ctx, entry, x, y, w, h, compact) {
      const isPlayer = entry.isPlayer;
      const hasRank = Number.isFinite(entry.rank);
      const rank = hasRank ? entry.rank : 0;
      const medal = rank === 1
        ? { main: '#ffe590', edge: '#f6bd4c', glow: 'rgba(255, 219, 92, 0.72)', fillA: 'rgba(255, 220, 108, 0.2)', fillB: 'rgba(126, 79, 18, 0.12)' }
        : rank === 2
          ? { main: '#e9f2ff', edge: '#9eb5cf', glow: 'rgba(191, 220, 255, 0.52)', fillA: 'rgba(210, 230, 255, 0.15)', fillB: 'rgba(96, 118, 148, 0.1)' }
          : rank === 3
            ? { main: '#ffc279', edge: '#c97932', glow: 'rgba(255, 159, 74, 0.46)', fillA: 'rgba(255, 160, 82, 0.14)', fillB: 'rgba(111, 57, 22, 0.1)' }
            : null;
      this.roundRect(ctx, x, y, w, h, 11);
      const fill = ctx.createLinearGradient(x, y, x + w, y + h);
      if (isPlayer) {
        fill.addColorStop(0, 'rgba(246, 189, 76, 0.24)');
        fill.addColorStop(1, 'rgba(122, 242, 255, 0.1)');
      } else if (medal) {
        fill.addColorStop(0, medal.fillA);
        fill.addColorStop(1, medal.fillB);
      } else {
        fill.addColorStop(0, 'rgba(255, 255, 255, 0.065)');
        fill.addColorStop(1, 'rgba(255, 255, 255, 0.035)');
      }
      ctx.fillStyle = fill;
      ctx.fill();
      if (isPlayer || medal) {
        ctx.shadowColor = isPlayer ? 'rgba(255, 229, 144, 0.5)' : medal.glow;
        ctx.shadowBlur = this.shadow(rank === 1 ? 16 : (medal ? 10 : 0));
        ctx.strokeStyle = isPlayer ? 'rgba(255, 229, 144, 0.76)' : medal.edge;
        ctx.lineWidth = isPlayer ? 1.7 : (rank === 1 ? 1.7 : 1.25);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (rank === 1) {
        const shine = ctx.createLinearGradient(x + w * 0.08, y, x + w * 0.44, y + h);
        shine.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shine.addColorStop(0.48, 'rgba(255, 249, 214, 0.12)');
        shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shine;
        this.roundRect(ctx, x + 2, y + 1, w - 4, h - 2, 10);
        ctx.fill();
      }

      ctx.textBaseline = 'middle';
      if (medal) {
        this.drawLeaderboardMedal(ctx, x + 28, y + h / 2, Math.min(12, h * 0.38), rank, medal);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = isPlayer ? '#ffe590' : '#f6bd4c';
        ctx.font = '800 ' + (compact ? 13 : 15) + 'px CrystalUI, Arial';
        if (hasRank) ctx.fillText(String(rank), x + 28, y + h / 2 + 1);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = isPlayer ? '#ffe590' : '#fff4d6';
      ctx.font = '700 ' + (compact ? 12 : 14) + 'px CrystalUI, Arial';
      ctx.fillText(entry.name || this.t('leaderboard.player'), x + (hasRank ? 58 : 14), y + h / 2 + 1, w - (hasRank ? 160 : 116));

      ctx.textAlign = 'right';
      ctx.fillStyle = medal ? medal.main : (isPlayer ? '#ffe590' : '#fff4d6');
      ctx.font = '800 ' + (compact ? 12 : 14) + 'px CrystalUI, Arial';
      ctx.fillText(String(entry.score || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), x + w - 12, y + h / 2 + 1);
      ctx.textAlign = 'left';
    };

  Renderer.prototype.drawLeaderboardMedal = function (ctx, x, y, r, rank, medal) {
      ctx.save();
      ctx.shadowColor = medal.glow;
      ctx.shadowBlur = this.shadow(rank === 1 ? 12 : 8);
      const grd = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.18, x, y, r);
      grd.addColorStop(0, '#fff8d8');
      grd.addColorStop(0.42, medal.main);
      grd.addColorStop(1, medal.edge);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.66)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#130b04';
      ctx.font = '800 ' + Math.max(9, r * 0.78) + 'px CrystalUI, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rank, x, y + 1);
      ctx.restore();
    };

})();

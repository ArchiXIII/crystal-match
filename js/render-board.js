(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;
  const GEM_COLORS = window.CrystalMatchRenderAssets.GEM_COLORS;

  Renderer.prototype.drawBoard = function (ctx) {
      const l = this.layout;
      ctx.save();
      const bounce = this.game.boardBounce || { life: 0, maxLife: 0, power: 0 };
      if (bounce.life > 0 && bounce.maxLife > 0 && bounce.power > 0) {
        const progress = 1 - Math.max(0, Math.min(1, bounce.life / bounce.maxLife));
        const pulse = Math.sin(Math.PI * progress);
        const settle = 1 - Math.pow(progress, 2);
        const scale = 1 + bounce.power * pulse * settle;
        const cx = l.boardX + l.boardWidth / 2;
        const cy = l.boardY + l.boardHeight / 2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
      }
      this.drawBoardFrame(ctx);

      for (let row = 0; row < this.game.rows; row += 1) {
        for (let col = 0; col < this.game.columns; col += 1) {
          const x = l.boardX + col * l.cell;
          const y = l.boardY + row * l.cell;
          this.drawCell(ctx, x, y, l.cell);
        }
      }

      for (let row = 0; row < this.game.rows; row += 1) {
        for (let col = 0; col < this.game.columns; col += 1) {
          const tile = this.game.tileAt(col, row);
          if (tile && !this.isDragPreviewTile(tile)) this.drawTile(ctx, tile);
        }
      }
      this.drawDragPreview(ctx);

      if (this.game.selected) {
        const x = l.boardX + this.game.selected.col * l.cell;
        const y = l.boardY + this.game.selected.row * l.cell;
        ctx.save();
        ctx.shadowColor = 'rgba(255, 232, 145, 0.95)';
        ctx.shadowBlur = this.shadow(24);
        this.roundRect(ctx, x + 5, y + 5, l.cell - 10, l.cell - 10, 16);
        ctx.strokeStyle = '#ffe590';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      this.drawHint(ctx);
      ctx.restore();
    };

  Renderer.prototype.drawBoardFrame = function (ctx) {
      const l = this.layout;
      const margin = 22;
      const width = Math.ceil(l.boardWidth + margin * 2);
      const height = Math.ceil(l.boardHeight + margin * 2);
      const key = [
        width,
        height,
        Math.round(this.shadow(18) * 10),
        Math.round(l.boardWidth),
        Math.round(l.boardHeight)
      ].join('|');

      if (!this.boardFrameCache || this.boardFrameCacheKey !== key) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const cacheCtx = canvas.getContext('2d');
        cacheCtx.save();
        cacheCtx.shadowColor = 'rgba(246, 189, 76, 0.64)';
        cacheCtx.shadowBlur = this.shadow(18);
        this.roundRect(cacheCtx, margin - 4, margin - 4, l.boardWidth + 8, l.boardHeight + 8, 18);
        cacheCtx.strokeStyle = '#f7bd4f';
        cacheCtx.lineWidth = 2;
        cacheCtx.stroke();
        cacheCtx.restore();
        this.boardFrameCache = canvas;
        this.boardFrameCacheKey = key;
      }

      ctx.drawImage(this.boardFrameCache, l.boardX - margin, l.boardY - margin);
    };

  Renderer.prototype.drawCell = function (ctx, x, y, size) {
    };

  Renderer.prototype.isDragPreviewTile = function (tile) {
      const drag = this.game.dragPreview;
      if (!drag || !tile) return false;
      return (tile.col === drag.from.col && tile.row === drag.from.row) ||
        (tile.col === drag.to.col && tile.row === drag.to.row);
    };

  Renderer.prototype.shouldUseBakedTileSprites = function () {
      return !!(this.game && this.game.performanceQuality && this.game.performanceQuality.level === 0);
    };

  Renderer.prototype.getDragOffset = function (tile) {
      const drag = this.game.dragPreview;
      if (!drag || !tile) return { x: 0, y: 0 };
      const l = this.layout;
      if (tile.col === drag.from.col && tile.row === drag.from.row) {
        return { x: drag.dx * l.cell, y: drag.dy * l.cell };
      }
      if (tile.col === drag.to.col && tile.row === drag.to.row) {
        return { x: -drag.dx * l.cell, y: -drag.dy * l.cell };
      }
      return { x: 0, y: 0 };
    };

  Renderer.prototype.drawDragPreview = function (ctx) {
      const drag = this.game.dragPreview;
      if (!drag) return;
      const target = this.game.tileAt(drag.to.col, drag.to.row);
      const source = this.game.tileAt(drag.from.col, drag.from.row);
      if (target) this.drawTile(ctx, target);
      if (source) this.drawTile(ctx, source);
    };

  Renderer.prototype.drawTile = function (ctx, tile) {
      const l = this.layout;
      if (tile.kind === 'stone') {
        this.drawStone(ctx, tile);
        return;
      }
      if (tile.special === 'rainbow') {
        this.drawRainbowTile(ctx, tile);
        return;
      }
      if (tile.special === 'bomb') {
        this.drawBombTile(ctx, tile);
        return;
      }
      const sprite = this.sprites[tile.type];
      const fallbackSprite = this.fallbackSprites[tile.type];
      const size = l.cell * 1.04 * tile.scale;
      const hintOffset = this.getHintOffset(tile);
      const dragOffset = this.getDragOffset(tile);
      const x = l.boardX + (tile.x + 0.5) * l.cell - size / 2 + hintOffset.x + dragOffset.x;
      const y = l.boardY + (tile.y + 0.5) * l.cell - size / 2 + hintOffset.y + dragOffset.y;
      const color = GEM_COLORS[tile.type];

      ctx.save();
      ctx.globalAlpha = tile.alpha;
      const baseSize = l.cell * 1.04;
      const useBakedSprite = this.shouldUseBakedTileSprites();
      const cachedSprite = useBakedSprite
        ? (sprite && sprite.complete && sprite.naturalWidth > 0
          ? this.getSizedSprite(sprite, 'gem-' + tile.type, baseSize)
          : this.getSizedSprite(fallbackSprite, 'gem-fallback-' + tile.type, baseSize))
        : null;
      if (cachedSprite) {
        ctx.drawImage(cachedSprite, x, y, size, size);
      } else if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, x, y, size, size);
      } else {
        ctx.drawImage(fallbackSprite, x, y, size, size);
      }
      this.drawSpecialMark(ctx, tile, x, y, size, color);
      ctx.restore();
    };

  Renderer.prototype.drawRainbowTile = function (ctx, tile) {
      const l = this.layout;
      const hintOffset = this.getHintOffset(tile);
      const dragOffset = this.getDragOffset(tile);
      const size = l.cell * 1.02 * tile.scale;
      const x = l.boardX + (tile.x + 0.5) * l.cell - size / 2 + hintOffset.x + dragOffset.x;
      const y = l.boardY + (tile.y + 0.5) * l.cell - size / 2 + hintOffset.y + dragOffset.y;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size * 0.38;
      const decorTime = this.decorTime ? this.decorTime() : (this.time || 0);
      const pulse = 0.5 + Math.sin(decorTime * 0.004) * 0.5;
      const sprite = this.boosterSprites && this.boosterSprites.rainbow;

      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const spin = -decorTime * 0.000625;
        const iconSize = size * 1.02;
        const starPulse = 0.35 + Math.sin(decorTime * 0.004) * 0.35 + Math.sin(decorTime * 0.0095) * 0.18;
        const starAlpha = Math.max(0.18, Math.min(1, starPulse));
        ctx.save();
        ctx.globalAlpha = tile.alpha;
        ctx.translate(cx, cy);
        ctx.shadowColor = 'rgba(120, 210, 255, 0.72)';
        ctx.shadowBlur = 0;
        ctx.rotate(spin);
        const cachedRainbow = this.shouldUseBakedTileSprites()
          ? this.getSizedSprite(sprite, 'special-rainbow', l.cell * 1.02)
          : null;
        ctx.drawImage(cachedRainbow || sprite, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.rotate(-spin);
        ctx.globalAlpha = tile.alpha * starAlpha;
        ctx.shadowColor = 'rgba(255, 228, 116, 0.95)';
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff7cf';
        ctx.lineWidth = Math.max(1.2, size * 0.018);
        const starR = size * (0.055 + starAlpha * 0.02);
        ctx.beginPath();
        ctx.moveTo(-starR, 0);
        ctx.lineTo(starR, 0);
        ctx.moveTo(0, -starR);
        ctx.lineTo(0, starR);
        ctx.moveTo(-starR * 0.62, -starR * 0.62);
        ctx.lineTo(starR * 0.62, starR * 0.62);
        ctx.moveTo(starR * 0.62, -starR * 0.62);
        ctx.lineTo(-starR * 0.62, starR * 0.62);
        ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.globalAlpha = tile.alpha;
      ctx.shadowColor = 'rgba(255, 229, 144, 0.9)';
      ctx.shadowBlur = 0;

      const core = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.34, 2, cx, cy, r);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.18, '#fff2a8');
      core.addColorStop(0.42, '#64e5ff');
      core.addColorStop(0.66, '#d65cff');
      core.addColorStop(1, '#171024');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = Math.max(3, size * 0.045);
      for (let i = 0; i < GEM_COLORS.length; i += 1) {
        ctx.strokeStyle = GEM_COLORS[i].core;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.08 + i * 0.055), i * 1.26 + pulse * 0.35, i * 1.26 + 0.95 + pulse * 0.35);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffe590';
      ctx.lineWidth = Math.max(2, size * 0.032);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.23, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.76)';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.3, cy - r * 0.38, r * 0.28, r * 0.1, -0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

  Renderer.prototype.drawBombTile = function (ctx, tile) {
      const l = this.layout;
      const hintOffset = this.getHintOffset(tile);
      const dragOffset = this.getDragOffset(tile);
      const size = l.cell * 1.12 * tile.scale;
      const x = l.boardX + (tile.x + 0.5) * l.cell - size / 2 + l.cell * 0.04 + hintOffset.x + dragOffset.x;
      const y = l.boardY + (tile.y + 0.5) * l.cell - size / 2 - l.cell * 0.05 + hintOffset.y + dragOffset.y;
      const sprite = this.bombSprites && this.bombSprites[tile.type];
      const color = GEM_COLORS[tile.type] || GEM_COLORS[0];

      ctx.save();
      ctx.globalAlpha = tile.alpha;
      ctx.shadowBlur = 0;
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const cachedBomb = this.shouldUseBakedTileSprites()
          ? this.getSizedSprite(sprite, 'bomb-' + tile.type, l.cell * 1.12)
          : null;
        ctx.drawImage(cachedBomb || sprite, x, y, size, size);
        if (!tile.removing) this.drawBombFuseFlame(ctx, tile, x, y, size);
      } else {
        const grd = ctx.createRadialGradient(x + size * 0.34, y + size * 0.32, 2, x + size / 2, y + size / 2, size * 0.45);
        grd.addColorStop(0, '#6d7280');
        grd.addColorStop(1, '#050506');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f6bd4c';
        ctx.lineWidth = Math.max(2, size * 0.055);
        ctx.stroke();
      }
      ctx.restore();
    };

  Renderer.prototype.drawBombBodyPulse = function (ctx, tile, x, y, size, color) {
      const t = (this.decorTime ? this.decorTime() : (this.time || 0)) * 0.001;
      const bodyCx = x + size * 0.45;
      const bodyCy = y + size * 0.6;
      const r = size * 0.33;
      const pulse = 0.5 + Math.sin(t * 2.2 + tile.col * 0.7 + tile.row * 0.4) * 0.5;
      const slow = 0.5 + Math.sin(t * 1.15 + tile.id.length) * 0.5;

      ctx.save();
      ctx.globalAlpha *= 0.22 + pulse * 0.18;
      ctx.beginPath();
      ctx.arc(bodyCx, bodyCy, r, 0, Math.PI * 2);
      ctx.clip();

      const glow = ctx.createRadialGradient(
        bodyCx - r * 0.35,
        bodyCy - r * 0.42,
        2,
        bodyCx,
        bodyCy,
        r
      );
      glow.addColorStop(0, 'rgba(255,255,255,0.22)');
      glow.addColorStop(0.38, color.glow);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(bodyCx - r, bodyCy - r, r * 2, r * 2);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= 0.5 + slow * 0.45;
      ctx.strokeStyle = color.glow;
      ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.beginPath();
      ctx.arc(bodyCx, bodyCy, r * (0.86 + pulse * 0.05), 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = 'rgba(255, 245, 190, 0.18)';
      ctx.beginPath();
      ctx.ellipse(bodyCx - r * 0.28, bodyCy - r * 0.34, r * 0.34, r * 0.12, -0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    };

  Renderer.prototype.drawBombFuseFlame = function (ctx, tile, x, y, size) {
      const t = (this.decorTime ? this.decorTime() : (this.time || 0)) * 0.001;
      const flicker = 0.86 + Math.sin(t * 9 + tile.id.length) * 0.1 + Math.sin(t * 17 + tile.col) * 0.04;
      const fx = x + size * 0.8;
      const fy = y + size * 0.13;
      const r = size * (0.065 + flicker * 0.012);

      ctx.save();
      ctx.globalAlpha *= Math.max(0.78, Math.min(1, flicker));
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 0;

      const flame = ctx.createRadialGradient(fx - r * 0.2, fy - r * 0.22, 1, fx, fy, r * 2.1);
      flame.addColorStop(0, 'rgba(255,255,236,0.96)');
      flame.addColorStop(0.25, 'rgba(255,218,82,0.82)');
      flame.addColorStop(0.58, 'rgba(255,126,28,0.36)');
      flame.addColorStop(1, 'rgba(255,126,28,0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.arc(fx, fy, r * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i += 1) {
        const angle = t * 0.9 + i * Math.PI / 2 + tile.col * 0.13;
        const len = r * (1.25 + (i % 2) * 0.32 + flicker * 0.22);
        ctx.strokeStyle = i % 2 ? 'rgba(255, 238, 160, 0.58)' : 'rgba(255, 145, 32, 0.5)';
        ctx.lineWidth = Math.max(1, size * 0.009);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(angle) * len, fy + Math.sin(angle) * len);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 244, 188, 0.92)';
      ctx.beginPath();
      ctx.arc(fx, fy, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

  Renderer.prototype.getHintOffset = function (tile) {
      const hint = this.game.hintMove;
      if (!hint || this.game.state !== 'idle') return { x: 0, y: 0 };
      const isA = tile.col === hint.a.col && tile.row === hint.a.row;
      const isB = tile.col === hint.b.col && tile.row === hint.b.row;
      if (!isA && !isB) return { x: 0, y: 0 };

      const from = isA ? hint.a : hint.b;
      const to = isA ? hint.b : hint.a;
      const phase = Math.sin((this.game.hintTime || 0) * 0.008);
      const amplitude = this.layout.cell * 0.08 * Math.max(0, phase);
      return {
        x: (to.col - from.col) * amplitude,
        y: (to.row - from.row) * amplitude
      };
    };

  Renderer.prototype.drawHint = function (ctx) {
      const hint = this.game.hintMove;
      if (!hint || this.game.state !== 'idle') return;
      const l = this.layout;
      const pulse = 0.5 + Math.sin((this.game.hintTime || 0) * 0.006) * 0.5;
      const cells = [hint.a, hint.b];

      ctx.save();
      cells.forEach((cell) => {
        const x = l.boardX + cell.col * l.cell;
        const y = l.boardY + cell.row * l.cell;
        ctx.shadowColor = 'rgba(255, 229, 144, 0.95)';
        ctx.shadowBlur = this.shadow(16 + pulse * 14);
        this.roundRect(ctx, x + 5, y + 5, l.cell - 10, l.cell - 10, 16);
        ctx.strokeStyle = 'rgba(255, 229, 144, ' + (0.55 + pulse * 0.35) + ')';
        ctx.lineWidth = 2 + pulse * 1.5;
        ctx.stroke();
      });

      const ax = l.boardX + (hint.a.col + 0.5) * l.cell;
      const ay = l.boardY + (hint.a.row + 0.5) * l.cell;
      const bx = l.boardX + (hint.b.col + 0.5) * l.cell;
      const by = l.boardY + (hint.b.row + 0.5) * l.cell;
      ctx.shadowBlur = this.shadow(18);
      ctx.strokeStyle = 'rgba(255, 247, 207, ' + (0.32 + pulse * 0.34) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    };

  Renderer.prototype.drawStone = function (ctx, tile) {
      const l = this.layout;
      const size = l.cell * 0.98 * tile.scale;
      const dragOffset = this.getDragOffset(tile);
      const x = l.boardX + (tile.x + 0.5) * l.cell - size / 2 + dragOffset.x;
      const y = l.boardY + (tile.y + 0.5) * l.cell - size / 2 + dragOffset.y;
      if (this.stoneSprite && this.stoneSprite.complete && this.stoneSprite.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = tile.alpha;
        const cachedStone = this.shouldUseBakedTileSprites()
          ? this.getSizedSprite(this.stoneSprite, 'stone', l.cell * 0.98)
          : null;
        ctx.drawImage(cachedStone || this.stoneSprite, x, y, size, size);
        ctx.restore();
        return;
      }
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size * 0.45;
      const points = [];

      for (let i = 0; i < 10; i += 1) {
        const angle = -Math.PI / 2 + i * Math.PI * 2 / 10;
        const jag = i % 2 ? 0.82 : 1;
        points.push([cx + Math.cos(angle) * r * jag, cy + Math.sin(angle) * r * jag]);
      }

      ctx.save();
      ctx.globalAlpha = tile.alpha;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 0;
      const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.38, 2, cx, cy, r);
      body.addColorStop(0, '#8d929b');
      body.addColorStop(0.28, '#434954');
      body.addColorStop(0.7, '#1a1d23');
      body.addColorStop(1, '#07080b');
      ctx.fillStyle = body;
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 214, 126, 0.54)';
      ctx.lineWidth = Math.max(1.5, size * 0.035);
      ctx.stroke();

      ctx.globalAlpha *= 0.44;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1, size * 0.018);
      for (let i = 0; i < points.length; i += 2) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(points[i][0], points[i][1]);
        ctx.stroke();
      }

      ctx.globalAlpha = tile.alpha * 0.7;
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.28, cy - r * 0.34, r * 0.22, r * 0.08, -0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

  Renderer.prototype.drawSpecialMark = function (ctx, tile, x, y, size, color) {
      if (!tile.special) return;
      const cx = x + size / 2;
      const cy = y + size / 2;
      ctx.save();
      ctx.globalAlpha = Math.min(1, tile.alpha);
      ctx.shadowColor = color.glow;
      ctx.shadowBlur = this.shadow(size * 0.18);
      ctx.strokeStyle = '#fff7cf';
      ctx.fillStyle = 'rgba(255, 238, 166, 0.92)';
      ctx.lineWidth = Math.max(2, size * 0.045);
      ctx.lineCap = 'round';

      if (tile.special === 'lineH' || tile.special === 'lineV') {
        const horizontal = tile.special === 'lineH';
        const t = (this.decorTime ? this.decorTime() : (this.time || 0)) * 0.001;
        const breath = 0.5 + Math.sin(t * 2.1 + tile.col * 0.45 + tile.row * 0.32) * 0.5;
        const bandLength = size * (1.13 + breath * 0.05);
        const bandWidth = size * (0.135 + breath * 0.018);

        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = 'rgba(255, 214, 90, 0.95)';
        ctx.shadowBlur = 0;

        ctx.translate(cx, cy);
        if (!horizontal) ctx.rotate(Math.PI / 2);

        const glow = ctx.createLinearGradient(-bandLength / 2, 0, bandLength / 2, 0);
        glow.addColorStop(0, 'rgba(255, 196, 42, 0)');
        glow.addColorStop(0.16, 'rgba(255, 196, 42, 0.45)');
        glow.addColorStop(0.5, 'rgba(255, 250, 218, 0.92)');
        glow.addColorStop(0.84, 'rgba(255, 196, 42, 0.45)');
        glow.addColorStop(1, 'rgba(255, 196, 42, 0)');
        this.roundRect(ctx, -bandLength / 2, -bandWidth / 2, bandLength, bandWidth, bandWidth / 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.globalAlpha *= 0.7;
        ctx.strokeStyle = 'rgba(255, 247, 207, 0.95)';
        ctx.lineWidth = Math.max(1, size * 0.018);
        ctx.beginPath();
        ctx.moveTo(-bandLength * 0.42, -bandWidth * 0.38);
        ctx.lineTo(bandLength * 0.42, -bandWidth * 0.38);
        ctx.moveTo(-bandLength * 0.42, bandWidth * 0.38);
        ctx.lineTo(bandLength * 0.42, bandWidth * 0.38);
        ctx.stroke();


      } else if (tile.special === 'bomb') {
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i += 1) {
          const angle = i * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * size * 0.24, cy + Math.sin(angle) * size * 0.24);
          ctx.lineTo(cx + Math.cos(angle) * size * 0.34, cy + Math.sin(angle) * size * 0.34);
          ctx.stroke();
        }
      } else if (tile.special === 'rainbow') {
        for (let i = 0; i < GEM_COLORS.length; i += 1) {
          ctx.strokeStyle = GEM_COLORS[i].core;
          ctx.beginPath();
          ctx.arc(cx, cy, size * 0.24, i * 1.23, i * 1.23 + 0.95);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

  Renderer.prototype.drawParticles = function (ctx) {
      const l = this.layout;
      this.game.effects.forEach((effect) => {
        if (effect.delay && effect.delay > 0) return;
        const color = GEM_COLORS[effect.type] || { rim: '#c6c9cf', core: '#707782', glow: 'rgba(255, 214, 126, 0.5)' };
        const px = l.boardX + effect.x * l.cell;
        const py = l.boardY + effect.y * l.cell;
        const lifeRatio = effect.maxLife ? Math.max(0, effect.life / effect.maxLife) : effect.life;
        ctx.save();
        ctx.globalAlpha = Math.min(1, lifeRatio * 1.35);
        if (effect.kind === 'lineBeam') {
          const horizontal = effect.direction === 'h';
          const progress = 1 - lifeRatio;
          const eased = 1 - Math.pow(1 - Math.min(1, progress), 3);
          const alpha = Math.min(1, Math.sin(Math.PI * Math.min(1, progress)) * 1.35) * Math.min(1, lifeRatio * 4);
          const beamWidth = l.cell * (0.3 + alpha * 0.22);
          const leftMax = horizontal ? px - l.boardX + l.cell * 0.3 : py - l.boardY + l.cell * 0.3;
          const rightMax = horizontal
            ? l.boardX + l.boardWidth - px + l.cell * 0.3
            : l.boardY + l.boardHeight - py + l.cell * 0.3;
          const leftLen = leftMax * eased;
          const rightLen = rightMax * eased;

          ctx.globalAlpha = alpha;
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(px, py);
          if (!horizontal) ctx.rotate(Math.PI / 2);
          ctx.shadowColor = color.glow;
          ctx.shadowBlur = 0;

          const beam = ctx.createLinearGradient(-leftMax, 0, rightMax, 0);
          beam.addColorStop(0, 'rgba(255, 184, 38, 0)');
          beam.addColorStop(0.28, 'rgba(255, 184, 38, 0.62)');
          beam.addColorStop(0.5, 'rgba(255, 255, 236, 1)');
          beam.addColorStop(0.72, 'rgba(255, 184, 38, 0.62)');
          beam.addColorStop(1, 'rgba(255, 184, 38, 0)');
          this.roundRect(ctx, -leftLen, -beamWidth / 2, leftLen + rightLen, beamWidth, beamWidth / 2);
          ctx.fillStyle = beam;
          ctx.fill();

          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = 'rgba(255, 246, 206, 0.95)';
          ctx.lineWidth = Math.max(2, l.cell * 0.052);
          ctx.beginPath();
          ctx.moveTo(-leftLen, 0);
          ctx.lineTo(rightLen, 0);
          ctx.stroke();

          ctx.globalAlpha = alpha;
          [-leftLen, rightLen].forEach((headX) => {
            const head = ctx.createRadialGradient(headX, 0, 1, headX, 0, l.cell * 0.72);
            head.addColorStop(0, 'rgba(255,255,255,1)');
            head.addColorStop(0.24, 'rgba(255,213,84,0.82)');
            head.addColorStop(1, 'rgba(255,213,84,0)');
            ctx.fillStyle = head;
            ctx.beginPath();
            ctx.arc(headX, 0, l.cell * 0.72, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.globalAlpha = alpha * 0.7;
          ctx.strokeStyle = 'rgba(255, 204, 70, 0.9)';
          ctx.lineWidth = Math.max(1, l.cell * 0.018);
          ctx.beginPath();
          ctx.moveTo(-leftLen, -beamWidth * 0.62);
          ctx.lineTo(rightLen, -beamWidth * 0.62);
          ctx.moveTo(-leftLen, beamWidth * 0.62);
          ctx.lineTo(rightLen, beamWidth * 0.62);
          ctx.stroke();
        } else if (effect.kind === 'bombBlast') {
          const progress = 1 - lifeRatio;
          const eased = 1 - Math.pow(1 - Math.min(1, progress), 3);
          const alpha = Math.min(1, Math.sin(Math.PI * Math.min(1, progress)) * 1.35) * Math.min(1, lifeRatio * 4);
          const maxR = l.cell * 1.48;
          const radius = maxR * eased;
          const beamWidth = l.cell * (0.18 + alpha * 0.14);

          ctx.globalAlpha = alpha;
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(px, py);
          ctx.shadowColor = color.glow;
          ctx.shadowBlur = 0;

          const ring = ctx.createRadialGradient(0, 0, Math.max(1, radius * 0.18), 0, 0, Math.max(2, radius));
          ring.addColorStop(0, 'rgba(255,255,236,0.12)');
          ring.addColorStop(0.58, 'rgba(255, 203, 66, 0.08)');
          ring.addColorStop(0.8, 'rgba(255, 255, 236, 0.92)');
          ring.addColorStop(1, 'rgba(255, 184, 38, 0)');
          ctx.fillStyle = ring;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 246, 206, 0.98)';
          ctx.lineWidth = Math.max(2, l.cell * 0.045);
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.stroke();

          const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [0.72, 0.72], [-0.72, 0.72], [0.72, -0.72], [-0.72, -0.72]
          ];
          dirs.forEach((dir, index) => {
            const len = l.cell * (index < 4 ? 1.12 : 0.98) * eased;
            const headX = dir[0] * len;
            const headY = dir[1] * len;
            const angle = Math.atan2(dir[1], dir[0]);

            ctx.save();
            ctx.rotate(angle);
            const beam = ctx.createLinearGradient(0, 0, len, 0);
            beam.addColorStop(0, 'rgba(255, 255, 236, 0.96)');
            beam.addColorStop(0.45, 'rgba(255, 184, 38, 0.72)');
            beam.addColorStop(1, 'rgba(255, 184, 38, 0)');
            this.roundRect(ctx, 0, -beamWidth / 2, len, beamWidth, beamWidth / 2);
            ctx.fillStyle = beam;
            ctx.fill();
            ctx.restore();

            const head = ctx.createRadialGradient(headX, headY, 1, headX, headY, l.cell * 0.34);
            head.addColorStop(0, 'rgba(255,255,255,1)');
            head.addColorStop(0.28, 'rgba(255,213,84,0.82)');
            head.addColorStop(1, 'rgba(255,213,84,0)');
            ctx.fillStyle = head;
            ctx.beginPath();
            ctx.arc(headX, headY, l.cell * 0.34, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (effect.kind === 'rainbowBurst') {
          const progress = 1 - lifeRatio;
          const eased = 1 - Math.pow(1 - Math.min(1, progress), 3);
          const alpha = Math.min(1, Math.sin(Math.PI * Math.min(1, progress)) * 1.05) * Math.min(1, lifeRatio * 4);
          const flareR = l.cell * (0.22 + eased * 0.32);

          ctx.globalAlpha = alpha;
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(px, py);
          ctx.shadowColor = 'rgba(255, 214, 90, 0.95)';
          ctx.shadowBlur = 0;

          const flash = ctx.createRadialGradient(-flareR * 0.16, -flareR * 0.18, 1, 0, 0, flareR * 1.42);
          flash.addColorStop(0, 'rgba(255,255,255,1)');
          flash.addColorStop(0.22, 'rgba(255,248,216,0.9)');
          flash.addColorStop(0.48, 'rgba(255,205,72,0.42)');
          flash.addColorStop(0.76, 'rgba(255,184,38,0.14)');
          flash.addColorStop(1, 'rgba(255,184,38,0)');
          ctx.fillStyle = flash;
          ctx.beginPath();
          ctx.arc(0, 0, flareR * 1.42, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineCap = 'round';
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 246, 206, 0.9)';
          ctx.lineWidth = Math.max(1.5, l.cell * 0.026);
          ctx.beginPath();
          ctx.arc(0, 0, flareR * 0.95, 0, Math.PI * 2);
          ctx.stroke();

          ctx.globalAlpha = alpha * 0.78;
          ctx.lineWidth = Math.max(1, l.cell * 0.018);
          for (let i = 0; i < 8; i += 1) {
            const angle = i * Math.PI / 4 + eased * 0.45;
            const inner = flareR * (0.12 + (i % 2) * 0.1);
            const outer = flareR * (1.15 + (i % 2) * 0.28);
            ctx.strokeStyle = i % 2 ? 'rgba(255, 244, 186, 0.72)' : 'rgba(255, 187, 48, 0.58)';
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.stroke();
          }

          ctx.globalAlpha = alpha;
          ctx.fillStyle = 'rgba(255, 255, 238, 0.96)';
          ctx.beginPath();
          ctx.moveTo(0, -flareR * 0.35);
          ctx.lineTo(flareR * 0.28, 0);
          ctx.lineTo(0, flareR * 0.35);
          ctx.lineTo(-flareR * 0.28, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 206, 72, 0.76)';
          ctx.lineWidth = Math.max(1, l.cell * 0.012);
          ctx.stroke();
        } else if (effect.kind === 'rainbowHit') {
          const progress = 1 - lifeRatio;
          const eased = 1 - Math.pow(1 - Math.min(1, progress), 2);
          const alpha = Math.min(1, Math.sin(Math.PI * Math.min(1, progress)) * 1.28) * Math.min(1, lifeRatio * 4);

          ctx.globalAlpha = alpha;
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(px, py);
          ctx.shadowColor = 'rgba(255, 214, 90, 0.9)';
          ctx.shadowBlur = 0;

          const flash = ctx.createRadialGradient(0, 0, 1, 0, 0, l.cell * (0.22 + eased * 0.3));
          flash.addColorStop(0, 'rgba(255,255,255,1)');
          flash.addColorStop(0.26, 'rgba(255,246,206,0.86)');
          flash.addColorStop(0.58, 'rgba(255,184,38,0.36)');
          flash.addColorStop(1, 'rgba(255,184,38,0)');
          ctx.fillStyle = flash;
          ctx.beginPath();
          ctx.arc(0, 0, l.cell * (0.26 + eased * 0.26), 0, Math.PI * 2);
          ctx.fill();
        } else if (effect.kind === 'matchFlash') {
          const progress = 1 - lifeRatio;
          const eased = 1 - Math.pow(1 - Math.min(1, progress), 2);
          const alpha = Math.min(1, Math.sin(Math.PI * Math.min(1, progress)) * 1.2) * Math.min(1, lifeRatio * 4);
          const radius = l.cell * (0.18 + eased * 0.28) * (effect.size || 1);

          ctx.globalAlpha = alpha;
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(px, py);
          ctx.shadowColor = 'rgba(255, 214, 90, 0.72)';
          ctx.shadowBlur = 0;

          const flash = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 1.45);
          flash.addColorStop(0, 'rgba(255,255,245,0.96)');
          flash.addColorStop(0.28, 'rgba(255,229,126,0.68)');
          flash.addColorStop(0.72, 'rgba(255,178,46,0.22)');
          flash.addColorStop(1, 'rgba(255,178,46,0)');
          ctx.fillStyle = flash;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(255, 248, 214, 0.72)';
          ctx.lineWidth = Math.max(1, l.cell * 0.018);
          for (let i = 0; i < 4; i += 1) {
            const angle = i * Math.PI / 2 + eased * 0.28;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * radius * 0.22, Math.sin(angle) * radius * 0.22);
            ctx.lineTo(Math.cos(angle) * radius * 0.95, Math.sin(angle) * radius * 0.95);
            ctx.stroke();
          }        } else if (effect.kind === 'lightning') {
          const fullSize = l.cell * effect.size;
          ctx.globalAlpha = Math.min(1, lifeRatio * 2.2);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(156, 219, 255, 0.82)';
          ctx.shadowBlur = 0;
          (effect.bolts || []).forEach((bolt) => {
            const points = bolt.points || bolt;
            ctx.beginPath();
            points.forEach((point, index) => {
              const x = px + point.x * fullSize;
              const y = py + point.y * fullSize;
              if (index === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
            ctx.lineWidth = Math.max(0.9, l.cell * (bolt.branch ? 0.012 : 0.018));
            ctx.stroke();
            ctx.strokeStyle = 'rgba(105, 189, 255, 0.82)';
            ctx.lineWidth = Math.max(0.45, l.cell * (bolt.branch ? 0.006 : 0.008));
            ctx.stroke();
          });
        } else if (effect.kind === 'spritePiece') {
          const fullSize = l.cell * effect.size;
          const sprite = effect.type < 0
            ? this.stoneSprite
            : effect.special === 'bomb'
              ? this.getBombBreakSprite(effect.type)
              : this.sprites[effect.type];
          const fallbackSprite = effect.type < 0 ? null : this.fallbackSprites[effect.type];
          const piece = effect.piece || [];
          ctx.shadowBlur = 0;
          ctx.beginPath();
          piece.forEach((point, index) => {
            const x = px + point.x * fullSize;
            const y = py + point.y * fullSize;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.clip();
          if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, px - fullSize / 2, py - fullSize / 2, fullSize, fullSize);
          } else if (fallbackSprite) {
            ctx.drawImage(fallbackSprite, px - fullSize / 2, py - fullSize / 2, fullSize, fullSize);
          } else {
            ctx.fillStyle = '#9ea4ad';
            ctx.fillRect(px - fullSize / 2, py - fullSize / 2, fullSize, fullSize);
          }
        } else {
          ctx.fillStyle = color.rim;
          ctx.shadowColor = color.glow;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2, l.cell * (effect.size || 0.045)), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    };

  Renderer.prototype.getBombBreakSprite = function (type) {
      const source = this.bombSprites && this.bombSprites[type];
      if (!source || !source.complete || source.naturalWidth <= 0) return source;
      const cached = this.bombBreakSprites[type];
      if (cached && cached.source === source && cached.width === source.naturalWidth && cached.height === source.naturalHeight) {
        return cached.canvas;
      }

      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0);

      // The break sprite intentionally has the lit fuse removed: the fuse goes out
      // before the bomb body falls apart into pieces.
      const sparkX = canvas.width * 0.79;
      const sparkY = canvas.height * 0.13;
      const radius = canvas.width * 0.095;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const erase = ctx.createRadialGradient(sparkX, sparkY, radius * 0.25, sparkX, sparkY, radius);
      erase.addColorStop(0, 'rgba(0,0,0,1)');
      erase.addColorStop(0.56, 'rgba(0,0,0,0.98)');
      erase.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = erase;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.bombBreakSprites[type] = {
        source,
        width: source.naturalWidth,
        height: source.naturalHeight,
        canvas
      };
      return canvas;
    };

  Renderer.prototype.drawPopups = function (ctx) {
      const l = this.layout;
      this.game.popups.forEach((popup) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, popup.life * 1.5);
        ctx.fillStyle = '#ffe590';
        ctx.shadowColor = 'rgba(255, 196, 61, 0.82)';
        ctx.shadowBlur = this.shadow(18);
        ctx.font = '800 ' + Math.max(18, l.cell * 0.3) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(popup.text, l.boardX + (popup.x + 0.5) * l.cell, l.boardY + (popup.y + 0.5) * l.cell);
        ctx.restore();
      });
    };

  Renderer.prototype.drawReactions = function (ctx) {
      const l = this.layout;
      const reactions = this.game.reactions || [];
      if (!reactions.length || this.game.menuOpen) return;

      reactions.forEach((reaction, index) => {
        const ratio = reaction.maxLife ? Math.max(0, Math.min(1, reaction.life / reaction.maxLife)) : 1;
        const progress = 1 - ratio;
        const intro = Math.min(1, progress / 0.22);
        const outro = Math.min(1, ratio / 0.22);
        const alpha = Math.min(intro, outro);
        const bounce = intro < 1 ? (1 + Math.sin(intro * Math.PI) * 0.12) : 1;
        const strong = reaction.power === 'strong' || reaction.power === 'rank';
        const medium = reaction.power === 'medium';
        const baseSize = strong ? 38 : medium ? 30 : 23;
        const fontSize = Math.max(18, Math.min(baseSize, l.boardWidth * (strong ? 0.092 : medium ? 0.074 : 0.058)));
        const hudBottom = (l.safeTop || 0) + (l.hudHeight || 0);
        const upperBaseY = Math.max(
          hudBottom + l.cell * 0.85,
          Math.min(this.height * 0.34, l.boardY + l.boardHeight * 0.22)
        );
        const x = this.width * 0.5 + (reaction.offsetX || 0) * l.cell;
        const y = upperBaseY + ((reaction.offsetY || 0) + reaction.y + index * 0.28) * l.cell;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.scale(bounce, bounce);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '1000 ' + fontSize + 'px Arial';
        ctx.lineJoin = 'round';
        ctx.shadowColor = reaction.power === 'rank' ? 'rgba(255, 229, 144, 0.92)' : 'rgba(246, 189, 76, 0.78)';
        ctx.shadowBlur = this.shadow(strong ? 24 : medium ? 16 : 10);

        const text = reaction.text || '';
        const maxTextW = l.boardWidth + l.cell * 0.7;
        if (ctx.measureText(text).width > maxTextW && this.fitFont) {
          ctx.font = this.fitFont(ctx, text, '1000', fontSize, 15, maxTextW);
        }
        ctx.strokeStyle = 'rgba(16, 8, 4, 0.88)';
        ctx.lineWidth = Math.max(4, fontSize * 0.16);
        ctx.strokeText(text, 0, 0);

        const grd = ctx.createLinearGradient(0, -fontSize * 0.7, 0, fontSize * 0.7);
        grd.addColorStop(0, '#fff8d8');
        grd.addColorStop(0.44, reaction.power === 'rank' ? '#ffe590' : '#ffd76b');
        grd.addColorStop(1, '#c57a18');
        ctx.fillStyle = grd;
        ctx.fillText(text, 0, 0);

        if (reaction.subtext) {
          ctx.shadowBlur = this.shadow(8);
          ctx.font = '900 ' + Math.max(12, fontSize * 0.38) + 'px Arial';
          ctx.strokeStyle = 'rgba(16, 8, 4, 0.72)';
          ctx.lineWidth = Math.max(2, fontSize * 0.08);
          ctx.strokeText(reaction.subtext, 0, fontSize * 0.74);
          ctx.fillStyle = '#fff4d6';
          ctx.fillText(reaction.subtext, 0, fontSize * 0.74);
        }
        ctx.restore();

        if (reaction.sparks && reaction.sparks.length) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          reaction.sparks.forEach((spark) => {
            const sparkRatio = spark.maxLife ? Math.max(0, Math.min(1, spark.life / spark.maxLife)) : 1;
            const sx = x + spark.x * l.cell;
            const sy = y + spark.y * l.cell;
            const r = Math.max(1.5, l.cell * spark.size);
            ctx.globalAlpha = alpha * Math.min(1, sparkRatio * 2.2);
            ctx.shadowColor = 'rgba(255, 229, 144, 0.82)';
            ctx.shadowBlur = this.shadow(r * 5);
            ctx.fillStyle = 'rgba(255, 246, 210, 0.92)';
            ctx.beginPath();
            ctx.moveTo(sx, sy - r * 1.8);
            ctx.lineTo(sx + r * 0.72, sy);
            ctx.lineTo(sx, sy + r * 1.8);
            ctx.lineTo(sx - r * 0.72, sy);
            ctx.closePath();
            ctx.fill();
          });
          ctx.restore();
        }
      });
    };

  Renderer.prototype.drawCoinFlights = function (ctx) {
      const target = this.coinTarget;
      if (!target || !this.game.coinFlights || !this.game.coinFlights.length) return;
      const l = this.layout;
      this.game.coinFlights.forEach((coin) => {
        const activeElapsed = coin.elapsed - coin.delay;
        if (activeElapsed < 0) return;
        const t = Math.max(0, Math.min(1, activeElapsed / coin.duration));
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const start = this.coinFlightStart(coin.source);
        const burstX = start.x + coin.spreadX * l.cell;
        const burstY = start.y + coin.spreadY * l.cell;
        const arc = Math.sin(Math.PI * t) * l.cell * coin.arc * 2.2;
        const x = burstX + (target.x - burstX) * eased;
        const y = burstY + (target.y - burstY) * eased - arc;
        const scale = 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 5) * Math.min(1, (1 - t) * 5);
        ctx.translate(x, y);
        ctx.rotate(coin.spin + t * Math.PI * 2.4);
        this.drawCoin(ctx, 0, 0, target.r * scale);
        ctx.restore();
      });
    };

  Renderer.prototype.drawCoinSpendBursts = function (ctx) {
      const target = this.coinTarget;
      if (!target || !this.game.coinSpendBursts || !this.game.coinSpendBursts.length) return;
      this.game.coinSpendBursts.forEach((coin) => {
        const activeElapsed = coin.elapsed - coin.delay;
        if (activeElapsed < 0) return;
        const t = Math.max(0, Math.min(1, activeElapsed / coin.duration));
        const eased = 1 - Math.pow(1 - t, 3);
        const wobble = Math.sin(t * Math.PI * 2.2 + coin.spin) * 7;
        const x = target.x + Math.cos(coin.angle) * coin.distance * eased + Math.cos(coin.angle + Math.PI / 2) * wobble * t;
        const y = target.y + Math.sin(coin.angle) * coin.distance * eased - Math.sin(Math.PI * t) * 12;
        const scale = 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 5) * Math.max(0, 1 - t);
        ctx.translate(x, y);
        ctx.rotate(coin.spin + t * Math.PI * 3);
        this.drawCoin(ctx, 0, 0, target.r * scale);
        ctx.restore();
      });
    };

  Renderer.prototype.coinFlightStart = function (source) {
      const l = this.layout;
      if (!source) return { x: this.width / 2, y: this.height / 2 };
      if (source.kind === 'goal') {
        return {
          x: l.goalX + l.goalWidth * 0.5,
          y: l.goalY + l.goalHeight * 0.5
        };
      }
      if (source.kind === 'levelWinStars' && this.levelWinStarsSource) {
        return {
          x: this.levelWinStarsSource.x,
          y: this.levelWinStarsSource.y
        };
      }
      if (source.kind === 'daily' && this.dailyBonusButtonRect) {
        return {
          x: this.dailyBonusButtonRect.x + this.dailyBonusButtonRect.w * 0.5,
          y: this.dailyBonusButtonRect.y + this.dailyBonusButtonRect.h * 0.5
        };
      }
      if (source.kind === 'screen') {
        return {
          x: Number.isFinite(source.x) ? source.x : this.width / 2,
          y: Number.isFinite(source.y) ? source.y : this.height / 2
        };
      }
      return {
        x: l.boardX + source.x * l.cell,
        y: l.boardY + source.y * l.cell
      };
    };

  Renderer.prototype.makeGemSprite = function (color) {
      const size = 180;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.43;

      ctx.save();
      ctx.shadowColor = color.glow;
      ctx.shadowBlur = this.shadow(26);
      const body = ctx.createRadialGradient(cx - 34, cy - 42, 4, cx, cy, r);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.13, color.rim);
      body.addColorStop(0.55, color.core);
      body.addColorStop(1, '#14050a');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = '#fff';
      const facets = [
        [cx - 58, cy - 52, cx - 10, cy - 70, cx - 30, cy - 8],
        [cx - 8, cy - 70, cx + 56, cy - 42, cx + 18, cy - 8],
        [cx - 48, cy + 10, cx - 8, cy - 5, cx - 25, cy + 58],
        [cx + 14, cy - 3, cx + 58, cy + 16, cx + 20, cy + 58],
        [cx - 18, cy - 2, cx + 15, cy - 3, cx, cy + 48]
      ];
      facets.forEach((points, index) => {
        ctx.globalAlpha = index % 2 ? 0.18 : 0.3;
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        ctx.lineTo(points[2], points[3]);
        ctx.lineTo(points[4], points[5]);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      ctx.save();
      const shine = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      shine.addColorStop(0, 'rgba(255,255,255,0.72)');
      shine.addColorStop(0.28, 'rgba(255,255,255,0.02)');
      shine.addColorStop(0.62, 'rgba(255,255,255,0.18)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = shine;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 5, -2.6, 0.9);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.32, cy - r * 0.4, r * 0.22, r * 0.1, -0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return canvas;
    };

  Renderer.prototype.drawCoin = function (ctx, x, y, r) {
      r *= 1.35;
      if (this.coinSprite && this.coinSprite.complete && this.coinSprite.naturalWidth > 0) {
        const size = Math.max(8, Math.round(r * 2.35));
        const drawX = Math.round(x - size / 2);
        const drawY = Math.round(y - size / 2);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.coinSprite, drawX, drawY, size, size);
        ctx.restore();
        return;
      }

      const grd = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 2, x, y, r);
      grd.addColorStop(0, '#fff1a1');
      grd.addColorStop(0.42, '#ffb72f');
      grd.addColorStop(1, '#8c5311');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6a3b0b';
      ctx.lineWidth = 2;
      ctx.stroke();
    };


})();










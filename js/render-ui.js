(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;
  const GEM_COLORS = window.CrystalMatchRenderAssets.GEM_COLORS;


  Renderer.prototype.fitTextFontSize = function (ctx, text, maxWidth, startSize, minSize, weight, family) {
      let size = Math.max(minSize || 8, startSize || 12);
      const safeWidth = Math.max(1, maxWidth || 1);
      const fontWeight = weight || '800';
      const fontFamily = family || 'CrystalUI, Arial';
      ctx.font = fontWeight + ' ' + size + 'px ' + fontFamily;
      while (size > (minSize || 8) && ctx.measureText(String(text || '')).width > safeWidth) {
        size -= 0.5;
        ctx.font = fontWeight + ' ' + size + 'px ' + fontFamily;
      }
      return size;
    };

  Renderer.prototype.fitWrappedFont = function (ctx, text, maxWidth, maxHeight, startSize, minSize, weight, lineGap, family) {
      let size = Math.max(minSize || 8, startSize || 12);
      const fontWeight = weight || '700';
      const fontFamily = family || 'CrystalUI, Arial';
      const gap = lineGap === undefined ? 2 : lineGap;
      let lineHeight = Math.max(size + gap, size * 1.12);
      const fits = () => {
        const words = String(text || '').split(' ');
        const longest = words.reduce((max, word) => Math.max(max, ctx.measureText(word).width), 0);
        return longest <= maxWidth && this.wrappedLineCount(ctx, text, maxWidth) * lineHeight <= maxHeight;
      };
      ctx.font = fontWeight + ' ' + size + 'px ' + fontFamily;
      while (size > (minSize || 8) && !fits()) {
        size -= 0.5;
        lineHeight = Math.max(size + gap, size * 1.12);
        ctx.font = fontWeight + ' ' + size + 'px ' + fontFamily;
      }
      return { size, lineHeight };
    };

  Renderer.prototype.wrapText = function (ctx, text, x, y, maxWidth, lineHeight) {
      let lineY = y;
      String(text || '').split('\n').forEach((paragraph, paragraphIndex, paragraphs) => {
        const words = paragraph.split(' ').filter(Boolean);
        let line = '';
        words.forEach((word) => {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x + maxWidth / 2, lineY);
            line = word;
            lineY += lineHeight;
          } else {
            line = test;
          }
        });
        if (line) ctx.fillText(line, x + maxWidth / 2, lineY);
        if (paragraphIndex < paragraphs.length - 1) lineY += lineHeight;
      });
    };

  Renderer.prototype.wrapTextLeft = function (ctx, text, x, y, maxWidth, lineHeight, maxY) {
      const words = text.split(' ');
      let line = '';
      let lineY = y;
      words.forEach((word) => {
        if (maxY && lineY > maxY) return;
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, lineY);
          line = word;
          lineY += lineHeight;
        } else {
          line = test;
        }
      });
      if (line && (!maxY || lineY <= maxY)) ctx.fillText(line, x, lineY);
    };

  Renderer.prototype.wrappedLineCount = function (ctx, text, maxWidth) {
      const words = String(text || '').split(' ');
      let line = '';
      let lines = 0;
      words.forEach((word) => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines += 1;
          line = word;
        } else {
          line = test;
        }
      });
      return line ? lines + 1 : lines;
    };





















  Renderer.prototype.formatCoins = function (value) {
      return String(Math.max(0, Math.floor(Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

  Renderer.prototype.formatDuration = function (ms) {
      const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return minutes + ':' + String(seconds).padStart(2, '0');
    };

  Renderer.prototype.fitFont = function (ctx, text, weight, size, minSize, maxWidth) {
      let fontSize = size;
      do {
        ctx.font = weight + ' ' + fontSize + 'px CrystalUI, Arial';
        if (ctx.measureText(text).width <= maxWidth || fontSize <= minSize) break;
        fontSize -= 1;
      } while (fontSize > minSize);
      return weight + ' ' + fontSize + 'px CrystalUI, Arial';
    };

  Renderer.prototype.drawCoinShopPlus = function (ctx, x, y, r) {
      const now = this.decorTime ? this.decorTime() : (this.time || 0);
      const shinePhase = (now % 4200) / 4200;
      const shine = shinePhase > 0.78 ? Math.sin((shinePhase - 0.78) / 0.22 * Math.PI) : 0;
      const sprite = this.uiIconSprites && this.uiIconSprites.coinShopPlus;
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const size = Math.max(8, Math.round(r * 2.15));
        const drawX = Math.round(x - size / 2);
        const drawY = Math.round(y - size / 2);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sprite, drawX, drawY, size, size);
        if (shine > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = shine * 0.9;
          ctx.shadowColor = 'rgba(255, 247, 204, 0.88)';
          ctx.shadowBlur = this.shadow(r * 0.22);
          ctx.strokeStyle = 'rgba(255, 255, 238, 0.9)';
          ctx.lineWidth = Math.max(1, r * 0.09);
          ctx.lineCap = 'round';
          const sparkleX = x + r * 0.28;
          const sparkleY = y - r * 0.24;
          const sparkleR = r * (0.14 + shine * 0.1);
          ctx.beginPath();
          ctx.moveTo(sparkleX - sparkleR, sparkleY);
          ctx.lineTo(sparkleX + sparkleR, sparkleY);
          ctx.moveTo(sparkleX, sparkleY - sparkleR);
          ctx.lineTo(sparkleX, sparkleY + sparkleR);
          ctx.moveTo(sparkleX - sparkleR * 0.62, sparkleY - sparkleR * 0.62);
          ctx.lineTo(sparkleX + sparkleR * 0.62, sparkleY + sparkleR * 0.62);
          ctx.moveTo(sparkleX + sparkleR * 0.62, sparkleY - sparkleR * 0.62);
          ctx.lineTo(sparkleX - sparkleR * 0.62, sparkleY + sparkleR * 0.62);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      const pulse = 0.5 + Math.sin(now * 0.003) * 0.5;
      const arm = r * 0.56;
      const thick = Math.max(3.2, r * 0.42);
      ctx.save();

      ctx.shadowColor = 'rgba(255, 214, 90, 0.62)';
      ctx.shadowBlur = this.shadow(6 + pulse * 4);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeStyle = 'rgba(45, 22, 2, 0.82)';
      ctx.lineWidth = thick + Math.max(1.8, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
      ctx.stroke();

      const grd = ctx.createLinearGradient(x - arm, y - arm, x + arm, y + arm);
      grd.addColorStop(0, '#fff8d6');
      grd.addColorStop(0.28, '#ffd86a');
      grd.addColorStop(0.55, '#f0a72a');
      grd.addColorStop(0.78, '#fff0a8');
      grd.addColorStop(1, '#a96112');
      ctx.strokeStyle = grd;
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = 'rgba(255, 247, 204, 0.86)';
      ctx.shadowBlur = this.shadow(6);
      ctx.strokeStyle = 'rgba(255, 250, 218, 0.62)';
      ctx.lineWidth = Math.max(1, r * 0.11);
      ctx.beginPath();
      ctx.moveTo(x - arm * 0.72, y - thick * 0.28);
      ctx.lineTo(x + arm * 0.2, y - thick * 0.28);
      ctx.moveTo(x - thick * 0.28, y - arm * 0.72);
      ctx.lineTo(x - thick * 0.28, y + arm * 0.2);
      ctx.stroke();

      if (shine > 0) {
        ctx.globalAlpha = shine;
        ctx.strokeStyle = 'rgba(255, 255, 240, 0.95)';
        ctx.lineWidth = Math.max(1.2, r * 0.14);
        const sweep = -arm + shinePhase * arm * 4.5;
        ctx.beginPath();
        ctx.moveTo(x + sweep - r * 0.32, y + arm * 0.62);
        ctx.lineTo(x + sweep + r * 0.34, y - arm * 0.62);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    };



  Renderer.prototype.drawRotateDeviceOverlay = function (ctx) {
      this.boosterRects = [];
      this.boosterShopRects = [];
      this.endRoundRect = null;
      this.exitEndlessRoundRect = null;
      this.playButtonRect = null;
      this.recordButtonRect = null;
      this.levelButtonRects = [];
      this.levelNavRects = [];
      this.levelPlayButtonRect = null;
      this.dailyBonusButtonRect = null;
      this.ourGamesButtonRect = null;
      this.mainMenuButtonRect = null;
      this.leaderboardButtonRect = null;
      this.leaderboardCloseRect = null;
      this.leaderboardTabRects = [];
      this.soundButtonRect = null;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, 0, this.width, this.height);

      const w = Math.min(390, this.width - 42);
      const h = Math.min(230, this.height - 34);
      const x = Math.round((this.width - w) / 2);
      const y = Math.round((this.height - h) / 2);
      this.roundPanel(ctx, x, y, w, h, 22, 0.94);
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.78)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, w, h, 22);
      ctx.stroke();

      const cx = x + w / 2;
      const iconY = y + 58;
      ctx.save();
      ctx.translate(cx, iconY);
      ctx.rotate(-0.26);
      this.roundRect(ctx, -18, -32, 36, 64, 8);
      ctx.fillStyle = 'rgba(16, 20, 29, 0.95)';
      ctx.shadowColor = 'rgba(246, 189, 76, 0.74)';
      ctx.shadowBlur = this.shadow(18);
      ctx.fill();
      ctx.strokeStyle = '#f6bd4c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-10, -22, 20, 38);
      ctx.restore();

      ctx.strokeStyle = '#ffe590';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx + 38, iconY, 22, -1.9, 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 51, iconY + 18);
      ctx.lineTo(cx + 39, iconY + 19);
      ctx.lineTo(cx + 45, iconY + 7);
      ctx.stroke();

      const ru = window.CrystalMatchI18n && window.CrystalMatchI18n.lang === 'ru';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4d6';
      ctx.font = '800 22px CrystalUI, Arial';
      ctx.fillText(ru ? 'Р СџР С•Р Р†Р ВµРЎР‚Р Р…Р С‘РЎвЂљР Вµ РЎРЊР С”РЎР‚Р В°Р Р…' : 'Rotate your device', cx, y + h - 88);
      ctx.fillStyle = 'rgba(255, 244, 214, 0.78)';
      ctx.font = '700 14px CrystalUI, Arial';
      this.wrapText(
        ctx,
        ru ? 'Р ВР С–РЎР‚Р В° РЎС“Р Т‘Р С•Р В±Р Р…Р ВµР Вµ РЎР‚Р В°Р В±Р С•РЎвЂљР В°Р ВµРЎвЂљ Р Р† Р С—Р С•РЎР‚РЎвЂљРЎР‚Р ВµРЎвЂљР Р…Р С•Р С РЎР‚Р ВµР В¶Р С‘Р СР Вµ' : 'This game works best in portrait mode',
        x + 28,
        y + h - 58,
        w - 56,
        18
      );
      ctx.restore();
    };























  Renderer.prototype.drawBoosterIcon = function (ctx, id, x, y, r) {
      const sprite = this.boosterSprites && this.boosterSprites[id];
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const size = r * 2.35;
        ctx.save();
        ctx.shadowColor = id === 'rainbow' ? 'rgba(112, 202, 255, 0.72)' : 'rgba(246, 189, 76, 0.78)';
        ctx.shadowBlur = this.shadow(14);
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.shadowColor = 'rgba(246, 189, 76, 0.82)';
      ctx.shadowBlur = this.shadow(16);
      if (id === 'hammer') {
        ctx.strokeStyle = '#b77735';
        ctx.lineWidth = r * 0.35;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.45, y + r * 0.58);
        ctx.lineTo(x + r * 0.45, y - r * 0.24);
        ctx.stroke();
        ctx.fillStyle = '#e9edf0';
        this.roundRect(ctx, x - r * 0.38, y - r * 0.68, r * 1.22, r * 0.5, 5);
        ctx.fill();
      } else if (id === 'bomb') {
        const grd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 2, x, y, r);
        grd.addColorStop(0, '#686d78');
        grd.addColorStop(1, '#060607');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f6bd4c';
        ctx.fillRect(x - 4, y - r - 7, 8, 9);
      } else {
        for (let i = 0; i < 5; i += 1) {
          ctx.strokeStyle = GEM_COLORS[i].core;
          ctx.lineWidth = r * 0.34;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.78, i * 1.2, i * 1.2 + 1.1);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

  Renderer.prototype.circleButton = function (ctx, x, y, r, label) {
      if (label === 'leaderboard' || label === 'soundOn' || label === 'soundOff') {
        this.drawButtonIcon(ctx, label, x, y, r);
        return;
      }

      ctx.save();
      const fill = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, 2, x, y, r);
      fill.addColorStop(0, 'rgba(42, 48, 61, 0.98)');
      fill.addColorStop(0.58, 'rgba(13, 16, 23, 0.94)');
      fill.addColorStop(1, 'rgba(4, 5, 8, 0.96)');
      ctx.fillStyle = fill;
      ctx.strokeStyle = 'rgba(246, 189, 76, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(246, 189, 76, 0.32)';
      ctx.shadowBlur = this.shadow(14);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r - 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff4d6';
      ctx.shadowColor = 'rgba(255, 229, 144, 0.45)';
      ctx.shadowBlur = this.shadow(8);
      ctx.font = '800 ' + Math.floor(r * 0.9) + 'px CrystalUI, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 1);
      ctx.restore();
    };

  Renderer.prototype.drawButtonIcon = function (ctx, label, x, y, r) {
      const sprite = this.uiIconSprites && this.uiIconSprites[label];
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const size = r * 2.28;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r * 1.05 - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.shadowColor = 'rgba(255, 229, 144, 0.66)';
        ctx.shadowBlur = this.shadow(r * 0.32);
        ctx.drawImage(sprite, x - size / 2, y - size / 2 - r * 0.14, size, size);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 229, 144, 0.72)';
      ctx.shadowBlur = this.shadow(r * 0.42);
      const gold = '#f6bd4c';
      const ivory = '#fff4d6';
      const dark = '#2a1705';

      if (label === 'leaderboard') {
        const cupW = r * 0.92;
        const cupH = r * 0.68;
        const topY = y - r * 0.38;
        ctx.fillStyle = gold;
        ctx.strokeStyle = ivory;
        ctx.lineWidth = Math.max(1.4, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(x - cupW * 0.32, topY);
        ctx.lineTo(x + cupW * 0.32, topY);
        ctx.quadraticCurveTo(x + cupW * 0.26, y + cupH * 0.28, x, y + cupH * 0.36);
        ctx.quadraticCurveTo(x - cupW * 0.26, y + cupH * 0.28, x - cupW * 0.32, topY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = gold;
        ctx.lineWidth = Math.max(1.5, r * 0.1);
        ctx.beginPath();
        ctx.arc(x - cupW * 0.36, y - r * 0.12, r * 0.24, Math.PI * 0.7, Math.PI * 1.55);
        ctx.arc(x + cupW * 0.36, y - r * 0.12, r * 0.24, Math.PI * 1.45, Math.PI * 0.3, true);
        ctx.stroke();

        ctx.fillStyle = gold;
        ctx.fillRect(x - r * 0.08, y + r * 0.12, r * 0.16, r * 0.28);
        this.roundRect(ctx, x - r * 0.34, y + r * 0.36, r * 0.68, r * 0.16, r * 0.07);
        ctx.fill();

        ctx.fillStyle = dark;
        ctx.shadowBlur = 0;
        ctx.font = '800 ' + Math.floor(r * 0.42) + 'px CrystalUI, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1', x, y - r * 0.1);
        ctx.restore();
        return;
      }

      const speakerX = x - r * 0.42;
      const speakerY = y - r * 0.18;
      ctx.fillStyle = gold;
      ctx.strokeStyle = ivory;
      ctx.lineWidth = Math.max(1.4, r * 0.075);
      ctx.beginPath();
      ctx.moveTo(speakerX, speakerY);
      ctx.lineTo(x - r * 0.18, speakerY);
      ctx.lineTo(x + r * 0.08, y - r * 0.38);
      ctx.lineTo(x + r * 0.08, y + r * 0.38);
      ctx.lineTo(x - r * 0.18, y + r * 0.18);
      ctx.lineTo(speakerX, y + r * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (label === 'soundOn') {
        ctx.strokeStyle = ivory;
        ctx.lineWidth = Math.max(1.4, r * 0.08);
        for (let i = 0; i < 2; i += 1) {
          ctx.beginPath();
          ctx.arc(x + r * 0.1, y, r * (0.34 + i * 0.2), -0.7, 0.7);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = '#fff4d6';
        ctx.lineWidth = Math.max(2, r * 0.12);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.38, y + r * 0.38);
        ctx.lineTo(x + r * 0.42, y - r * 0.42);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 81, 63, 0.85)';
        ctx.lineWidth = Math.max(1.2, r * 0.06);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.34, y + r * 0.34);
        ctx.lineTo(x + r * 0.38, y - r * 0.38);
        ctx.stroke();
      }
      ctx.restore();
    };

  Renderer.prototype.drawRunningFrameLight = function (ctx, x, y, w, h, r, phase) {
      const radius = Math.max(2, Math.min(r, w / 2, h / 2));
      const topLen = Math.max(0, w - radius * 2);
      const sideLen = Math.max(0, h - radius * 2);
      const arcLen = Math.PI * radius / 2;
      const perimeter = topLen * 2 + sideLen * 2 + arcLen * 4;
      const now = this.decorTime ? this.decorTime() : (this.time || 0);
      const progress = ((now * 0.00016 + (phase || 0)) % 1 + 1) % 1;

      const pointAt = (distance) => {
        let d = ((distance % perimeter) + perimeter) % perimeter;
        if (d <= topLen) return { x: x + radius + d, y, angle: 0 };
        d -= topLen;
        if (d <= arcLen) {
          const a = -Math.PI / 2 + d / arcLen * Math.PI / 2;
          return { x: x + w - radius + Math.cos(a) * radius, y: y + radius + Math.sin(a) * radius, angle: a + Math.PI / 2 };
        }
        d -= arcLen;
        if (d <= sideLen) return { x: x + w, y: y + radius + d, angle: Math.PI / 2 };
        d -= sideLen;
        if (d <= arcLen) {
          const a = d / arcLen * Math.PI / 2;
          return { x: x + w - radius + Math.cos(a) * radius, y: y + h - radius + Math.sin(a) * radius, angle: a + Math.PI / 2 };
        }
        d -= arcLen;
        if (d <= topLen) return { x: x + w - radius - d, y: y + h, angle: Math.PI };
        d -= topLen;
        if (d <= arcLen) {
          const a = Math.PI / 2 + d / arcLen * Math.PI / 2;
          return { x: x + radius + Math.cos(a) * radius, y: y + h - radius + Math.sin(a) * radius, angle: a + Math.PI / 2 };
        }
        d -= arcLen;
        if (d <= sideLen) return { x, y: y + h - radius - d, angle: -Math.PI / 2 };
        d -= sideLen;
        const a = Math.PI + d / arcLen * Math.PI / 2;
        return { x: x + radius + Math.cos(a) * radius, y: y + radius + Math.sin(a) * radius, angle: a + Math.PI / 2 };
      };

      const distance = progress * perimeter;
      const head = pointAt(distance);
      const size = Math.max(5, Math.min(9, Math.min(w, h) * 0.12));
      const qualityLevel = this.quality && this.quality.level !== undefined ? this.quality.level : 2;
      const lowQuality = qualityLevel <= 0;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 222, 128, 0.72)';
      ctx.shadowBlur = this.shadow(size * (lowQuality ? 0.35 : 0.72));

      const glowRadius = size * (lowQuality ? 1.05 : 1.28);
      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, glowRadius);
      glow.addColorStop(0, 'rgba(255, 255, 238, 0.9)');
      glow.addColorStop(0.24, 'rgba(255, 229, 145, 0.62)');
      glow.addColorStop(0.62, 'rgba(255, 181, 54, 0.16)');
      glow.addColorStop(1, 'rgba(255, 181, 54, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(head.x, head.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 248, 214, 0.82)';
      ctx.beginPath();
      ctx.arc(head.x, head.y, Math.max(1.8, size * 0.34), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

  Renderer.prototype.pointToCell = function (clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const l = this.layout;
      if (!l || x < l.boardX || x >= l.boardX + l.boardWidth || y < l.boardY || y >= l.boardY + l.boardHeight) {
        return null;
      }
      return {
        col: Math.floor((x - l.boardX) / l.cell),
        row: Math.floor((y - l.boardY) / l.cell)
      };
    };

  Renderer.prototype.pointToBooster = function (clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return this.boosterRects.find((booster) => (
        x >= booster.x && x <= booster.x + booster.w &&
        y >= booster.y && y <= booster.y + booster.h
      )) || null;
    };

  Renderer.prototype.pointToBoosterShop = function (clientX, clientY) {
      if (!this.boosterShopRects || !this.boosterShopRects.length) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return this.boosterShopRects.find((button) => (
        x >= button.x && x <= button.x + button.w &&
        y >= button.y && y <= button.y + button.h
      )) || null;
    };

  Renderer.prototype.pointToEndRound = function (clientX, clientY) {
      if (!this.endRoundRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.endRoundRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToLeaderboardButton = function (clientX, clientY) {
      if (!this.leaderboardButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.leaderboardButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToProfileButton = function (clientX, clientY) {
      if (!this.profileButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.profileButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToSoundButton = function (clientX, clientY) {
      if (!this.soundButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.soundButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToCoinShopButton = function (clientX, clientY) {
      if (!this.coinShopButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.coinShopButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToCoinShopClose = function (clientX, clientY) {
      if (!this.coinShopCloseRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.coinShopCloseRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToCoinShopAdReward = function (clientX, clientY) {
      if (!this.coinShopAdRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.coinShopAdRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToCoinShopPackage = function (clientX, clientY) {
      if (!this.coinShopPackageRects || !this.coinShopPackageRects.length) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return this.coinShopPackageRects.find((pack) => (
        x >= pack.x && x <= pack.x + pack.w &&
        y >= pack.y && y <= pack.y + pack.h
      )) || null;
    };

  Renderer.prototype.drawExitRoundConfirm = function (ctx) {
      this.exitRoundConfirmCancelRect = null;
      this.exitRoundConfirmConfirmRect = null;
      if (!this.game.exitRoundConfirmOpen) return;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
      ctx.fillRect(0, 0, this.width, this.height);

      const compact = this.width < 460 || this.height < 680;
      const w = Math.min(compact ? 336 : 410, this.width - 32);
      const h = compact ? 196 : 220;
      const x = Math.round((this.width - w) / 2);
      const y = Math.round((this.height - h) / 2);
      this.roundPanel(ctx, x, y, w, h, 22, 0.96);
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.78)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, w, h, 22);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4d6';
      ctx.shadowColor = 'rgba(246, 189, 76, 0.62)';
      ctx.shadowBlur = this.shadow(12);
      ctx.font = '800 ' + (compact ? 22 : 26) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('exitRound.title'), x + w / 2, y + (compact ? 42 : 50));
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255, 244, 214, 0.82)';
      ctx.font = '700 ' + (compact ? 14 : 16) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('exitRound.text'), x + w / 2, y + (compact ? 78 : 92), w - 42);

      const gap = compact ? 10 : 14;
      const buttonH = compact ? 48 : 52;
      const buttonW = Math.floor((w - 44 - gap) / 2);
      const buttonY = y + h - buttonH - (compact ? 24 : 28);
      const cancelX = x + 22;
      const confirmX = cancelX + buttonW + gap;
      this.exitRoundConfirmCancelRect = { x: cancelX, y: buttonY, w: buttonW, h: buttonH };
      this.exitRoundConfirmConfirmRect = { x: confirmX, y: buttonY, w: buttonW, h: buttonH };

      this.drawExitRoundButton(ctx, cancelX, buttonY, buttonW, buttonH, this.t('exitRound.cancel'), false);
      this.drawExitRoundButton(ctx, confirmX, buttonY, buttonW, buttonH, this.t('exitRound.confirm'), true);
      ctx.restore();
    };

  Renderer.prototype.drawExitRoundButton = function (ctx, x, y, w, h, label, primary) {
      this.roundRect(ctx, x, y, w, h, 15);
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      if (primary) {
        grd.addColorStop(0, '#fff1a6');
        grd.addColorStop(0.52, '#f6bd4c');
        grd.addColorStop(1, '#b87518');
      } else {
        grd.addColorStop(0, 'rgba(31, 35, 47, 0.96)');
        grd.addColorStop(1, 'rgba(9, 12, 18, 0.98)');
      }
      ctx.fillStyle = grd;
      ctx.shadowColor = primary ? 'rgba(246, 189, 76, 0.46)' : 'rgba(255, 229, 144, 0.16)';
      ctx.shadowBlur = this.shadow(primary ? 14 : 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.78)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = primary ? '#120b05' : '#fff4d6';
      ctx.font = '800 ' + Math.max(13, Math.min(16, h * 0.31)) + 'px CrystalUI, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 1, w - 16);
    };

  Renderer.prototype.pointToExitRoundConfirmCancel = function (clientX, clientY) {
      if (!this.exitRoundConfirmCancelRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.exitRoundConfirmCancelRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToExitRoundConfirmConfirm = function (clientX, clientY) {
      if (!this.exitRoundConfirmConfirmRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.exitRoundConfirmConfirmRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToLeaderboardClose = function (clientX, clientY) {
      if (!this.leaderboardCloseRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.leaderboardCloseRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToLeaderboardTab = function (clientX, clientY) {
      if (!this.leaderboardTabRects || !this.leaderboardTabRects.length) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return this.leaderboardTabRects.find((button) => (
        x >= button.x && x <= button.x + button.w &&
        y >= button.y && y <= button.y + button.h
      )) || null;
    };

  Renderer.prototype.pointToProfileClose = function (clientX, clientY) {
      if (!this.profileCloseRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.profileCloseRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToProfileXp = function (clientX, clientY) {
      if (!this.profileXpRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.profileXpRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToLevelContinueAdButton = function (clientX, clientY) {
      if (!this.levelContinueAdButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.levelContinueAdButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToLevelRewardDoubleAdButton = function (clientX, clientY) {
      if (!this.levelRewardDoubleAdButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.levelRewardDoubleAdButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToRestartLevelButton = function (clientX, clientY) {
      if (!this.restartLevelButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.restartLevelButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToNextLevelButton = function (clientX, clientY) {
      if (!this.nextLevelButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.nextLevelButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
  };

  Renderer.prototype.pointToPlayButton = function (clientX, clientY) {
      if (!this.playButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.playButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToRecordButton = function (clientX, clientY) {
      if (!this.recordButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.recordButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToLevelButton = function (clientX, clientY) {
      if (!this.levelButtonRects || !this.levelButtonRects.length) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return this.levelButtonRects.find((button) => (
        x >= button.x && x <= button.x + button.w &&
        y >= button.y && y <= button.y + button.h
      )) || null;
    };

  Renderer.prototype.pointToLevelNavButton = function (clientX, clientY) {
      if (!this.levelNavRects || !this.levelNavRects.length) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return this.levelNavRects.find((button) => (
        button.available &&
        x >= button.x && x <= button.x + button.w &&
        y >= button.y && y <= button.y + button.h
      )) || null;
    };

  Renderer.prototype.pointToLevelPlayButton = function (clientX, clientY) {
      if (!this.levelPlayButtonRect || !this.levelPlayButtonRect.available) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.levelPlayButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToDailyBonusButton = function (clientX, clientY) {
      if (!this.dailyBonusButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.dailyBonusButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToOurGamesButton = function (clientX, clientY) {
      if (!this.ourGamesButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.ourGamesButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

  Renderer.prototype.pointToExitEndlessRoundButton = function (clientX, clientY) {
      if (!this.exitEndlessRoundRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.exitEndlessRoundRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };
  Renderer.prototype.pointToEndlessBonusClaim = function (clientX, clientY) {
      if (!this.endlessBonusClaimRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.endlessBonusClaimRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };
  Renderer.prototype.pointToEndlessBonusAd = function (clientX, clientY) {
      if (!this.endlessBonusAdRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.endlessBonusAdRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };
  Renderer.prototype.pointToMainMenuButton = function (clientX, clientY) {
      if (!this.mainMenuButtonRect) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const button = this.mainMenuButtonRect;
      return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h ? button : null;
    };

})();


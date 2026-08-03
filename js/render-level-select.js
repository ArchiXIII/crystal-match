(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;

  Renderer.prototype.drawLevelSelect = function (ctx) {
      this.levelButtonRects = [];
      this.levelNavRects = [];
      this.levelPlayButtonRect = null;
      const levels = (this.game.levelConfig && this.game.levelConfig.levels) || [];
      if (!levels.length) return;
      const compact = this.width < 560 || this.height < 760;
      const mobilePortrait = this.width < 620 && this.height > this.width;
      const chapters = this.game.levelChapterCount ? this.game.levelChapterCount() : Math.ceil(levels.length / 10);
      const chapter = Math.max(0, Math.min(chapters - 1, Math.floor(this.game.levelSelectChapter || 0)));
      const firstLevel = chapter * 10 + 1;
      const chapterLevels = this.game.levelChapterLevels
        ? this.game.levelChapterLevels(chapter)
        : levels.filter((level) => level.n >= firstLevel && level.n < firstLevel + 10);
      const unlocked = this.game.highestUnlockedLevel || 1;
      const selected = this.game.selectedLevelNumber || unlocked;
      const chapterEarnedStars = chapterLevels.reduce((sum, level) => {
        return sum + (this.game.levelStarsFor ? this.game.levelStarsFor(level.n) : 0);
      }, 0);
      const chapterMaxStars = chapterLevels.length * 3;
      const chapterComplete = this.game.hasChapterTrophy
        ? this.game.hasChapterTrophy(chapter)
        : (chapterMaxStars > 0 && chapterEarnedStars >= chapterMaxStars);
      const l = this.layout || {};
      const overlayY = (l.safeTop || 0) + (l.hudHeight || 0) + 8;
      const mobileOuterGap = mobilePortrait ? Math.max(22, Math.min(30, this.width * 0.065)) : 0;
      const w = Math.min(this.width - (mobilePortrait ? mobileOuterGap * 2 : 22), mobilePortrait ? 354 : (compact ? 500 : 640));
      const maxMobileH = Math.max(420, this.height - overlayY - (mobilePortrait ? 24 : 28));
      const h = Math.min(mobilePortrait ? maxMobileH : this.height - 28, mobilePortrait ? 562 : (compact ? 540 : 570));
      const x = Math.round((this.width - w) / 2);
      const centeredY = Math.round((this.height - h) / 2);
      const y = mobilePortrait ? Math.max(Math.round(overlayY + 8), centeredY) : centeredY;
      const bottomReserve = mobilePortrait ? 78 : 92;
      const titleH = mobilePortrait ? 58 : 76;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
      ctx.fillRect(0, overlayY, this.width, Math.max(0, this.height - overlayY));
      this.drawChapterVitrineFrame(ctx, x, y, w, h, mobilePortrait ? 0.67 : 1, chapter);

      const titleW = Math.min(w - (mobilePortrait ? 104 : 230), mobilePortrait ? 232 : 330);
      const titleX = x + (w - titleW) / 2;
      const titleY = y + (mobilePortrait ? 15 : 24);
      const titlePanelH = mobilePortrait ? 48 : 58;
      this.roundRect(ctx, titleX, titleY, titleW, titlePanelH, 18);
      const titleGrad = ctx.createLinearGradient(titleX, titleY, titleX, titleY + titlePanelH);
      titleGrad.addColorStop(0, 'rgba(42, 31, 54, 0.96)');
      titleGrad.addColorStop(1, 'rgba(10, 11, 18, 0.96)');
      ctx.fillStyle = titleGrad;
      ctx.shadowColor = 'rgba(255, 207, 86, 0.36)';
      ctx.shadowBlur = this.shadow(12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 222, 132, 0.78)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chapterTitle = this.t('levels.chapterTitle', { number: chapter + 1 });
      const chapterNameKey = 'levels.chapter.' + (chapter + 1);
      const chapterName = this.t(chapterNameKey);
      const hasChapterName = chapterName && chapterName !== chapterNameKey;
      const chapterTitleY = hasChapterName ? titleY + (mobilePortrait ? 14 : 17) : titleY + titlePanelH / 2;
      const chapterNameY = titleY + (mobilePortrait ? 32 : 38);
      ctx.font = '800 ' + (mobilePortrait ? 13 : 16) + 'px CrystalUI, Arial';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(20, 10, 4, 0.88)';
      ctx.lineWidth = 3;
      ctx.strokeText(chapterTitle, x + w / 2, chapterTitleY);
      ctx.fillStyle = '#ffe590';
      ctx.shadowColor = 'rgba(255, 207, 86, 0.32)';
      ctx.shadowBlur = this.shadow(5);
      ctx.fillText(chapterTitle, x + w / 2, chapterTitleY);
      ctx.shadowBlur = 0;

      if (hasChapterName) {
        ctx.font = '800 ' + (mobilePortrait ? 15 : 19) + 'px CrystalUI, Arial';
        ctx.strokeStyle = 'rgba(20, 10, 4, 0.9)';
        ctx.lineWidth = 3.4;
        ctx.strokeText(chapterName, x + w / 2, chapterNameY);
        ctx.fillStyle = '#fff4d6';
        ctx.shadowColor = 'rgba(255, 207, 86, 0.28)';
        ctx.shadowBlur = this.shadow(5);
        ctx.fillText(chapterName, x + w / 2, chapterNameY);
        ctx.shadowBlur = 0;
      }
      const starIcon = this.uiIconSprites && this.uiIconSprites.levelStar;
      const starSize = mobilePortrait ? 18 : 25;
      const starsText = this.t('levels.starsCount', { earned: chapterEarnedStars, max: chapterMaxStars || 30 });
      let starsFontSize = mobilePortrait ? 14 : 15;
      ctx.font = '800 ' + starsFontSize + 'px CrystalUI, Arial';
      const maxStarsW = Math.max(54, x + w - (titleX + titleW + 22) - 18);
      while (starsFontSize > 11 && Math.max(starSize, ctx.measureText(starsText).width) > maxStarsW) {
        starsFontSize -= 1;
        ctx.font = '800 ' + starsFontSize + 'px CrystalUI, Arial';
      }
      const starsW = Math.max(starSize, ctx.measureText(starsText).width);
      const starsAreaLeft = titleX + titleW;
      const starsAreaRight = x + w - (mobilePortrait ? 16 : 24);
      const starsCenterX = Math.max(
        starsAreaLeft + starsW / 2 + 6,
        Math.min((starsAreaLeft + starsAreaRight) / 2, starsAreaRight - starsW / 2)
      );
      const starX = starsCenterX - starSize / 2;
      const starY = titleY + (mobilePortrait ? 4 : 4);
      if (starIcon && starIcon.complete && starIcon.naturalWidth) {
        ctx.drawImage(starIcon, starX, starY, starSize, starSize);
      } else {
        this.drawLevelStars(ctx, starX + starSize / 2, starY + starSize / 2, starSize * 0.33, 1, 0.92);
      }
      ctx.fillStyle = '#ffe590';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(246, 189, 76, 0.42)';
      ctx.shadowBlur = this.shadow(8);
      ctx.fillText(starsText, starsCenterX, starY + starSize + (mobilePortrait ? 14 : 15));
      ctx.shadowBlur = 0;

      if (chapterComplete) {
        const trophyCenterX = (x + titleX) / 2;
        this.drawChapterTrophy(ctx, trophyCenterX, titleY + titlePanelH / 2 + 1, mobilePortrait ? 33 : 42, 1, { glow: true });
      }

      this.drawChapterArrow(ctx, x - (mobilePortrait ? 9 : 44), y + h / 2, 'left', chapter > 0, mobilePortrait);
      this.drawChapterArrow(ctx, x + w + (mobilePortrait ? 9 : 44), y + h / 2, 'right', chapter < chapters - 1, mobilePortrait);
      this.levelNavRects.push({ dir: -1, x: x - (mobilePortrait ? 34 : 78), y: y + h / 2 - 44, w: 64, h: 88, available: chapter > 0 });
      this.levelNavRects.push({ dir: 1, x: x + w + (mobilePortrait ? -30 : 10), y: y + h / 2 - 44, w: 64, h: 88, available: chapter < chapters - 1 });

      const gridTop = y + titleH + (mobilePortrait ? 18 : 22);
      const gridBottom = y + h - bottomReserve;
      const cols = mobilePortrait ? 3 : 5;
      const rows = mobilePortrait ? 4 : 2;
      const gapX = mobilePortrait ? 8 : 18;
      const gapY = mobilePortrait ? 9 : 18;
      const availableW = w - (mobilePortrait ? 38 : 74);
      const availableH = gridBottom - gridTop;
      const slotW = Math.min(mobilePortrait ? 80 : 106, Math.floor((availableW - gapX * (cols - 1)) / cols));
      const slotH = Math.min(mobilePortrait ? 86 : 110, Math.floor((availableH - gapY * (rows - 1)) / rows));
      const gridW = cols * slotW + (cols - 1) * gapX;
      const gridX = x + (w - gridW) / 2;

      chapterLevels.forEach((level, index) => {
        const pos = mobilePortrait && index === 9
          ? { col: 1, row: 3 }
          : { col: index % cols, row: Math.floor(index / cols) };
        const bx = Math.round(gridX + pos.col * (slotW + gapX));
        const by = Math.round(gridTop + pos.row * (slotH + gapY));
        const available = level.n <= unlocked;
        const isSelected = level.n === selected;
        this.levelButtonRects.push({ level: level.n, x: bx, y: by, w: slotW, h: slotH, available });
        const stars = this.game.levelStarsFor ? this.game.levelStarsFor(level.n) : 0;
        this.drawLevelCrystalButton(ctx, bx, by, slotW, slotH, level.n, available, isSelected, stars);
      });

      const buttonW = Math.min(mobilePortrait ? 122 : 160, (w - (mobilePortrait ? 38 : 58)) / 2);
      const buttonH = mobilePortrait ? 42 : 50;
      const buttonInset = mobilePortrait ? 16 : 24;
      const buttonY = y + h - buttonH - buttonInset;
      this.mainMenuButtonRect = { x: x + buttonInset, y: buttonY, w: buttonW, h: buttonH };
      const selectedAvailable = selected <= unlocked;
      this.levelPlayButtonRect = { x: x + w - buttonInset - buttonW, y: buttonY, w: buttonW, h: buttonH, available: selectedAvailable };
      this.drawLevelSelectButton(ctx, this.mainMenuButtonRect, this.t('menu.back'), false, true);
      this.drawLevelSelectButton(ctx, this.levelPlayButtonRect, this.t('menu.play'), true, selectedAvailable);

      if (this.game.levelSelectMessage && this.game.levelSelectMessageUntil > this.game.time) {
        ctx.fillStyle = '#fff4d6';
        ctx.font = '800 ' + (mobilePortrait ? 13 : 14) + 'px CrystalUI, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.game.levelSelectMessage, x + w / 2, buttonY - 16);
      }
      ctx.restore();
    };

  Renderer.prototype.levelChapterTheme = function (chapter) {
      const themes = [
        { top: 'rgba(47, 31, 69, 0.76)', mid: 'rgba(18, 15, 35, 0.74)', bottom: 'rgba(9, 8, 17, 0.88)', glow: 'rgba(150, 84, 255, 0.16)' },
        { top: 'rgba(28, 42, 77, 0.76)', mid: 'rgba(10, 20, 42, 0.74)', bottom: 'rgba(5, 8, 18, 0.88)', glow: 'rgba(72, 151, 255, 0.15)' },
        { top: 'rgba(24, 58, 45, 0.74)', mid: 'rgba(8, 30, 25, 0.74)', bottom: 'rgba(5, 13, 13, 0.88)', glow: 'rgba(79, 230, 145, 0.13)' },
        { top: 'rgba(67, 27, 43, 0.76)', mid: 'rgba(34, 10, 22, 0.74)', bottom: 'rgba(14, 5, 10, 0.89)', glow: 'rgba(255, 82, 132, 0.14)' },
        { top: 'rgba(70, 47, 22, 0.76)', mid: 'rgba(36, 22, 8, 0.74)', bottom: 'rgba(15, 9, 4, 0.89)', glow: 'rgba(255, 178, 64, 0.15)' },
        { top: 'rgba(24, 52, 73, 0.76)', mid: 'rgba(8, 25, 39, 0.74)', bottom: 'rgba(4, 10, 16, 0.89)', glow: 'rgba(77, 214, 255, 0.14)' },
        { top: 'rgba(31, 64, 36, 0.74)', mid: 'rgba(12, 32, 17, 0.74)', bottom: 'rgba(5, 14, 8, 0.89)', glow: 'rgba(154, 236, 86, 0.13)' },
        { top: 'rgba(58, 32, 76, 0.76)', mid: 'rgba(28, 12, 42, 0.74)', bottom: 'rgba(11, 5, 18, 0.89)', glow: 'rgba(217, 88, 255, 0.15)' },
        { top: 'rgba(47, 40, 31, 0.76)', mid: 'rgba(18, 17, 18, 0.76)', bottom: 'rgba(7, 7, 9, 0.9)', glow: 'rgba(255, 210, 92, 0.13)' },
        { top: 'rgba(52, 50, 65, 0.76)', mid: 'rgba(16, 17, 27, 0.76)', bottom: 'rgba(5, 6, 11, 0.91)', glow: 'rgba(255, 242, 194, 0.14)' }
      ];
      return themes[Math.max(0, Math.floor(chapter || 0)) % themes.length];
    };
  Renderer.prototype.drawChapterVitrineFrame = function (ctx, x, y, w, h, scale, chapter) {
      const frameScale = scale || 1;
      const theme = this.levelChapterTheme(chapter);
      ctx.save();
      this.roundPanel(ctx, x, y, w, h, 24 * frameScale, 0.9);
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      grd.addColorStop(0, theme.top);
      grd.addColorStop(0.52, theme.mid);
      grd.addColorStop(1, theme.bottom);
      this.roundRect(ctx, x, y, w, h, 24 * frameScale);
      ctx.fillStyle = grd;
      ctx.fill();

      const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.46, 0, x + w * 0.5, y + h * 0.46, Math.max(w, h) * 0.58);
      glow.addColorStop(0, theme.glow);
      glow.addColorStop(0.52, 'rgba(255, 210, 92, 0.035)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fill();

      const decor = this.uiIconSprites && this.uiIconSprites.levelVitrineDecor;
      let decorX = x + w / 2;
      let decorY = y + h;
      let decorW = 0;
      let decorH = 0;
      let railY = y + h;
      const frameBaseLineWidth = 8 * frameScale;
      const frameGoldLineWidth = 4.8 * frameScale;
      const frameHighlightWidth = 1.4 * frameScale;
      if (decor && decor.complete && decor.naturalWidth) {
        decorW = Math.min(w * 0.46, 220) * frameScale;
        decorH = decorW * (decor.naturalHeight / decor.naturalWidth);
        decorX = x + (w - decorW) / 2;
        railY = y + h;
        const decorSideBandTop = decorH * 0.5;
        const lowerFrameTop = railY - frameBaseLineWidth / 2;
        decorY = lowerFrameTop - decorSideBandTop + 2;
      }

      const radius = 24 * frameScale;
      const drawRailPath = () => {
        this.roundRect(ctx, x, y, w, h, radius);
      };

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawRailPath();
      ctx.strokeStyle = 'rgba(72, 39, 8, 0.92)';
      ctx.lineWidth = frameBaseLineWidth;
      ctx.shadowColor = 'rgba(255, 191, 64, 0.24)';
      ctx.shadowBlur = this.shadow(10 * frameScale);
      ctx.stroke();

      drawRailPath();
      const railGrad = ctx.createLinearGradient(x, railY - 8, x, railY + 8);
      railGrad.addColorStop(0, '#fff2b5');
      railGrad.addColorStop(0.42, '#f2b84c');
      railGrad.addColorStop(1, '#8d4f14');
      ctx.strokeStyle = railGrad;
      ctx.lineWidth = frameGoldLineWidth;
      ctx.shadowBlur = this.shadow(5 * frameScale);
      ctx.stroke();

      drawRailPath();
      ctx.strokeStyle = 'rgba(255, 248, 205, 0.72)';
      ctx.lineWidth = frameHighlightWidth;
      ctx.shadowBlur = 0;
      ctx.stroke();

      if (decor && decor.complete && decor.naturalWidth) {
        ctx.drawImage(decor, decorX, decorY, decorW, decorH);
      }
      ctx.restore();
    };

  Renderer.prototype.drawLevelCrystalButton = function (ctx, x, y, w, h, number, available, selected, stars) {
      const crystal = this.uiIconSprites && this.uiIconSprites.levelCrystal;
      ctx.save();
      const time = this.game.time || Date.now();
      const isMobileSlot = w <= 86;
      const baseSize = Math.min(w * (isMobileSlot ? 1.02 : 1.05), h * (isMobileSlot ? 0.9 : 0.88));
      const selectedScale = 1;
      const imgSize = baseSize * selectedScale;
      const imgX = x + (w - imgSize) / 2;
      const imgY = y + (isMobileSlot ? 0 : 1);

      if (available) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        const footW = imgSize * 0.68;
        const footH = Math.max(5, imgSize * 0.085);
        const footY = imgY + imgSize * 0.86;
        const foot = ctx.createRadialGradient(x + w / 2, footY, 0, x + w / 2, footY, footW / 2);
        foot.addColorStop(0, 'rgba(255, 223, 116, 0.72)');
        foot.addColorStop(0.5, 'rgba(246, 189, 76, 0.28)');
        foot.addColorStop(1, 'rgba(246, 189, 76, 0)');
        ctx.fillStyle = foot;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, footY, footW / 2, footH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (crystal && crystal.complete && crystal.naturalWidth) {
        ctx.globalAlpha = available ? 1 : 0.48;
        if (!available) ctx.filter = 'grayscale(0.38) brightness(0.76) contrast(0.92)';
        ctx.drawImage(crystal, imgX, imgY, imgSize, imgSize);
        ctx.filter = 'none';
      } else {
        this.roundRect(ctx, imgX, imgY, imgSize, imgSize, 14);
        ctx.fillStyle = available ? '#b87516' : 'rgba(35, 35, 42, 0.58)';
        ctx.fill();
      }

      if (!available) {
        ctx.globalAlpha = 1;
        this.drawLevelCrystalDimPath(ctx, imgX, imgY, imgSize);
        ctx.fillStyle = 'rgba(8, 9, 16, 0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 214, 108, 0.12)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      ctx.globalAlpha = available ? 1 : 0.42;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = available ? '#fff1c9' : 'rgba(255, 235, 190, 0.52)';
      ctx.strokeStyle = 'rgba(50, 25, 5, 0.72)';
      ctx.lineWidth = available ? 2.2 : 2;
      ctx.shadowColor = available ? 'rgba(42, 20, 4, 0.5)' : 'transparent';
      ctx.shadowBlur = this.shadow(3);
      ctx.font = '800 ' + Math.max(18, Math.min(26, imgSize * 0.28)) + 'px CrystalUI, Arial';
      ctx.strokeText(number, x + w / 2, imgY + imgSize * 0.5);
      ctx.fillText(number, x + w / 2, imgY + imgSize * 0.5);
      ctx.shadowBlur = 0;
      if (available) {
        this.drawLevelStarsBadge(ctx, x + w / 2, imgY + imgSize * 0.88, imgSize, stars);
      }
      if (selected && available) {
        const pulse = 0.5 + Math.sin(time * 0.004) * 0.5;
        const starR = Math.max(9.2, Math.min(13.8, imgSize * 0.132));
        const badgeW = starR * 7.25;
        const badgeH = starR * 2.36;
        const badgeCx = x + w / 2;
        const badgeCy = imgY + imgSize * 0.88;
        const contentLeft = Math.min(imgX, badgeCx - badgeW / 2);
        const contentRight = Math.max(imgX + imgSize, badgeCx + badgeW / 2);
        const contentTop = imgY;
        const contentBottom = Math.max(imgY + imgSize, badgeCy + badgeH / 2);
        const framePad = Math.max(5, Math.min(8, w * 0.075));
        const rx = contentLeft - framePad;
        const ry = contentTop - framePad;
        const rw = contentRight - contentLeft + framePad * 2;
        const rh = contentBottom - contentTop + framePad * 2;
        const radius = Math.max(11, Math.min(16, rw * 0.16));
        ctx.save();
        this.roundRect(ctx, rx, ry, rw, rh, radius);
        ctx.strokeStyle = 'rgba(255, 241, 174, ' + (0.44 + pulse * 0.56) + ')';
        ctx.lineWidth = Math.max(3.4, Math.min(5.8, w * (0.042 + pulse * 0.018)));
        ctx.shadowColor = 'rgba(255, 207, 86, ' + (0.34 + pulse * 0.58) + ')';
        ctx.shadowBlur = this.shadow(10 + pulse * 24);
        ctx.stroke();
        this.roundRect(ctx, rx + 2, ry + 2, rw - 4, rh - 4, Math.max(9, radius - 3));
        ctx.strokeStyle = 'rgba(150, 83, 18, ' + (0.16 + pulse * 0.2) + ')';
        ctx.lineWidth = 1.1;
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };

  Renderer.prototype.drawLevelCrystalDimPath = function (ctx, x, y, size) {
      const c = size * 0.17;
      ctx.beginPath();
      ctx.moveTo(x + c, y + size * 0.05);
      ctx.lineTo(x + size - c, y + size * 0.05);
      ctx.lineTo(x + size * 0.95, y + c);
      ctx.lineTo(x + size * 0.95, y + size - c);
      ctx.lineTo(x + size - c, y + size * 0.95);
      ctx.lineTo(x + c, y + size * 0.95);
      ctx.lineTo(x + size * 0.05, y + size - c);
      ctx.lineTo(x + size * 0.05, y + c);
      ctx.closePath();
    };

  Renderer.prototype.drawLevelStarsBadge = function (ctx, cx, cy, crystalSize, stars) {
      const count = Math.max(0, Math.min(3, Math.floor(Number(stars) || 0)));
      const starR = Math.max(9.2, Math.min(13.8, crystalSize * 0.132));
      const badgeW = starR * 7.25;
      const badgeH = starR * 2.36;
      const badgeX = cx - badgeW / 2;
      const badgeY = cy - badgeH / 2;
      ctx.save();
      this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
      const grd = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
      grd.addColorStop(0, 'rgba(32, 22, 12, 0.88)');
      grd.addColorStop(0.52, 'rgba(9, 8, 13, 0.78)');
      grd.addColorStop(1, 'rgba(0, 0, 0, 0.64)');
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.48)';
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.shadowColor = 'rgba(255, 207, 86, 0.22)';
      ctx.shadowBlur = this.shadow(starR * 0.55);
      this.drawLevelStars(ctx, cx, cy + starR * 0.02, starR, count, 1);
      ctx.restore();
    };

  Renderer.prototype.drawLevelSelectButton = function (ctx, rect, label, primary, enabled) {
      ctx.save();
      this.roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
      const grd = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      if (primary && enabled) {
        grd.addColorStop(0, '#fff0a8');
        grd.addColorStop(0.48, '#f6bd4c');
        grd.addColorStop(1, '#a85f12');
      } else {
        grd.addColorStop(0, enabled ? 'rgba(38, 44, 56, 0.94)' : 'rgba(28, 30, 38, 0.64)');
        grd.addColorStop(1, enabled ? 'rgba(7, 9, 14, 0.96)' : 'rgba(7, 8, 12, 0.7)');
      }
      ctx.fillStyle = grd;
      ctx.shadowColor = enabled ? 'rgba(255, 207, 86, 0.48)' : 'rgba(0, 0, 0, 0)';
      ctx.shadowBlur = this.shadow(enabled ? 10 : 0);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = enabled ? 'rgba(255, 231, 155, 0.86)' : 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = primary ? 2 : 1.5;
      ctx.stroke();
      ctx.fillStyle = primary && enabled ? '#140b04' : (enabled ? '#fff4d6' : 'rgba(255, 244, 214, 0.4)');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 ' + Math.max(15, Math.min(20, rect.w * 0.14)) + 'px CrystalUI, Arial';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
      ctx.restore();
    };

  Renderer.prototype.drawChapterArrow = function (ctx, cx, cy, dir, enabled, compact) {
      ctx.save();
      ctx.globalAlpha = enabled ? 1 : 0.24;
      ctx.translate(cx, cy);
      if (dir === 'left') ctx.scale(-1, 1);
      const scale = compact ? 1.15 : 1.28;
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.moveTo(-12, -26);
      ctx.lineTo(18, 0);
      ctx.lineTo(-12, 26);
      ctx.lineTo(-2, 0);
      ctx.closePath();
      const grd = ctx.createLinearGradient(-12, -26, 18, 26);
      grd.addColorStop(0, '#fff6c8');
      grd.addColorStop(0.45, '#f6bd4c');
      grd.addColorStop(1, '#8a4c0f');
      ctx.fillStyle = grd;
      ctx.shadowColor = 'rgba(255, 207, 86, 0.62)';
      ctx.shadowBlur = this.shadow(enabled ? 12 : 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 244, 214, 0.78)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };


  Renderer.prototype.drawChapterTrophy = function (ctx, cx, cy, size, alpha, options) {
      const glow = !!(options && options.glow);
      const progress = options && Number.isFinite(options.progress) ? Math.max(0, Math.min(1, options.progress)) : 1;
      const scale = 0.55 + progress * 0.45;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(size / 64 * scale, size / 64 * scale);
      ctx.globalAlpha = (alpha === undefined ? 1 : alpha) * Math.min(1, progress * 1.4);
      if (glow || progress < 1) {
        const pulse = 0.65 + Math.sin((this.game.time || Date.now()) * 0.004) * 0.18;
        const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 40);
        halo.addColorStop(0, 'rgba(255, 236, 160, ' + (0.24 * pulse) + ')');
        halo.addColorStop(0.55, 'rgba(246, 189, 76, ' + (0.14 * pulse) + ')');
        halo.addColorStop(1, 'rgba(246, 189, 76, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      const trophySprite = this.uiIconSprites && this.uiIconSprites.chapterTrophy;
      if (trophySprite && trophySprite.complete && trophySprite.naturalWidth > 0) {
        const drawSize = 76;
        ctx.drawImage(trophySprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
        return;
      }
      const cupGrad = ctx.createLinearGradient(-26, -26, 24, 28);
      cupGrad.addColorStop(0, '#fff8d8');
      cupGrad.addColorStop(0.22, '#ffd86a');
      cupGrad.addColorStop(0.52, '#d99522');
      cupGrad.addColorStop(0.78, '#fff0a8');
      cupGrad.addColorStop(1, '#8a4c0f');
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.strokeStyle = 'rgba(255, 244, 214, 0.82)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-22, -12);
      ctx.bezierCurveTo(-38, -12, -38, 8, -22, 9);
      ctx.moveTo(22, -12);
      ctx.bezierCurveTo(38, -12, 38, 8, 22, 9);
      ctx.stroke();
      ctx.strokeStyle = '#b87516';
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(-22, -10);
      ctx.bezierCurveTo(-33, -8, -32, 5, -22, 6);
      ctx.moveTo(22, -10);
      ctx.bezierCurveTo(33, -8, 32, 5, 22, 6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-24, -20);
      ctx.quadraticCurveTo(0, -28, 24, -20);
      ctx.lineTo(18, 10);
      ctx.quadraticCurveTo(0, 21, -18, 10);
      ctx.closePath();
      ctx.fillStyle = cupGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(72, 36, 8, 0.62)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const shine = ctx.createLinearGradient(-18, -22, 8, 10);
      shine.addColorStop(0, 'rgba(255,255,255,0.75)');
      shine.addColorStop(0.45, 'rgba(255,255,255,0.12)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.moveTo(-13, -17);
      ctx.quadraticCurveTo(-3, -20, 5, -16);
      ctx.lineTo(0, 6);
      ctx.quadraticCurveTo(-8, 6, -15, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = cupGrad;
      ctx.fillRect(-5, 14, 10, 12);
      this.roundRect(ctx, -18, 24, 36, 7, 4);
      ctx.fill();
      this.roundRect(ctx, -25, 30, 50, 8, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 244, 214, 0.48)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };

  Renderer.prototype.drawStarShape = function (ctx, x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 === 0 ? r : r * 0.45;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

  Renderer.prototype.drawLevelStars = function (ctx, cx, cy, r, count, alpha, options) {
      const safeCount = Math.max(0, Math.min(3, Math.floor(Number(count) || 0)));
      const spacing = r * 2.25;
      const sprite = this.uiIconSprites && this.uiIconSprites.levelStar;
      const hasSprite = sprite && sprite.complete && sprite.naturalWidth > 0;
      const animated = !!(options && options.animated);
      const startTime = Number(options && options.startTime) || Date.now();
      const now = Date.now();
      const easeOutBack = (t) => {
        const c1 = 1.55;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      ctx.save();
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      for (let i = 0; i < 3; i += 1) {
        const x = cx + (i - 1) * spacing;
        const active = i < safeCount;
        let appear = 1;
        let popScale = 1;
        let flash = 0;
        if (animated && active) {
          const delay = i * 330;
          const local = now - startTime - delay;
          if (local < 0) {
            appear = 0;
            popScale = 0.35;
          } else {
            const t = Math.max(0, Math.min(1, local / 680));
            appear = Math.min(1, t * 1.35);
            popScale = 0.35 + easeOutBack(t) * 0.65;
            flash = Math.max(0, 1 - local / 560);
          }
        }
        if (hasSprite) {
          const size = r * 2.28 * popScale;
          ctx.save();
          ctx.globalAlpha *= active ? appear : 0.28;
          if (!active) {
            ctx.filter = 'grayscale(1) brightness(0.72)';
          } else {
            ctx.shadowColor = 'rgba(255, 215, 104, 0.72)';
            ctx.shadowBlur = this.shadow(r * (1.1 + flash * 1.5));
            if (flash > 0.02) {
              const glowR = r * (1.2 + flash * 1.3);
              const glow = ctx.createRadialGradient(x, cy, 0, x, cy, glowR);
              glow.addColorStop(0, 'rgba(255, 255, 238, ' + (0.38 * flash) + ')');
              glow.addColorStop(0.45, 'rgba(255, 217, 109, ' + (0.24 * flash) + ')');
              glow.addColorStop(1, 'rgba(255, 181, 54, 0)');
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(x, cy, glowR, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.drawImage(sprite, x - size / 2, cy - size / 2, size, size);
          ctx.restore();
          continue;
        }
        ctx.save();
        this.drawStarShape(ctx, x, cy, r * popScale);
        if (active) {
          const grd = ctx.createRadialGradient(x - r * 0.35, cy - r * 0.35, r * 0.15, x, cy, r);
          grd.addColorStop(0, '#fff8d6');
          grd.addColorStop(0.48, '#ffd96d');
          grd.addColorStop(1, '#b87516');
          ctx.fillStyle = grd;
          ctx.shadowColor = 'rgba(255, 215, 104, 0.72)';
          ctx.shadowBlur = this.shadow(r * (1.4 + flash * 1.4));
          ctx.globalAlpha *= appear;
        } else {
          ctx.fillStyle = 'rgba(255, 244, 214, 0.18)';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      ctx.restore();
    };

})();


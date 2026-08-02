(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;

  Renderer.prototype.drawMainMenu = function (ctx) {
      if (this.game.gameOver) return;
      this.playButtonRect = null;
      this.recordButtonRect = null;
      this.levelButtonRects = [];
      this.dailyBonusButtonRect = null;
      this.ourGamesButtonRect = null;
      if (!this.game.menuOpen) return;

      ctx.save();
      const l = this.layout;
      const overlayY = l.safeTop + l.hudHeight + 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, overlayY, this.width, this.height - overlayY);

      const cx = this.width / 2;
      const cy = this.height / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = 'rgba(246, 189, 76, 0.95)';
      ctx.shadowBlur = this.shadow(32);
      ctx.fillStyle = '#fff4d6';
      const menuTight = this.height < 680;
      const mobileMenu = this.width < 620;
      const mobileLift = mobileMenu ? (menuTight ? 40 : 52) : 0;
      const titleShift = mobileMenu ? (menuTight ? 24 : 34) : 0;
      const titleBox = this.drawMenuTitle(ctx, this.t('menu.title'), cx, cy - (menuTight ? 118 : 128) + titleShift, Math.min(this.width - 36, l.boardWidth + 18));
      const developerGap = mobileMenu ? 20 : 28;
      const developerY = Math.max(overlayY + 18, titleBox.top - developerGap);
      ctx.fillStyle = '#ffe590';
      ctx.font = '900 16px CrystalUI, Arial';
      ctx.fillText(this.t('menu.developer'), cx, developerY);
      ctx.shadowBlur = this.shadow(16);
      ctx.strokeStyle = 'rgba(246, 189, 76, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 92, developerY + 16);
      ctx.lineTo(cx + 92, developerY + 16);
      ctx.stroke();

      const buttonW = Math.min(280, this.width - 62, l.boardWidth + 8);
      const buttonH = menuTight ? 54 : 58;
      const buttonX = Math.round(cx - buttonW / 2);
      const buttonY = Math.round(cy + (menuTight ? -6 : 2) + (mobileMenu ? 8 - mobileLift : 0));
      this.playButtonRect = { x: buttonX, y: buttonY, w: buttonW, h: buttonH };

      this.drawMenuButton(ctx, buttonX, buttonY, buttonW, buttonH, 'primary');

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#140b04';
      ctx.font = '900 ' + (menuTight ? 21 : 24) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('menu.play'), cx, buttonY + buttonH / 2 + 1);

      const recordY = buttonY + buttonH + (menuTight ? 10 : 12);
      this.recordButtonRect = { x: buttonX, y: recordY, w: buttonW, h: buttonH };
      this.drawMenuButton(ctx, buttonX, recordY, buttonW, buttonH, 'secondary');
      ctx.fillStyle = '#fff4d6';
      ctx.font = '900 ' + (menuTight ? 19 : 22) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('menu.record'), cx, recordY + buttonH / 2 + 1);

      const dailyH = buttonH;
      const dailyY = recordY + buttonH + (menuTight ? 10 : 12);
      this.dailyBonusButtonRect = { x: buttonX, y: dailyY, w: buttonW, h: dailyH };
      this.drawDailyBonusButton(ctx, buttonX, dailyY, buttonW, dailyH);

      if (this.game.platformFeatures.developerGames !== false) {
        const secondaryH = buttonH;
        const secondaryY = dailyY + dailyH + (menuTight ? 10 : 12);
        this.ourGamesButtonRect = { x: buttonX, y: secondaryY, w: buttonW, h: secondaryH };
        this.drawMenuButton(ctx, buttonX, secondaryY, buttonW, secondaryH, 'secondary');

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff4d6';
        ctx.font = '900 ' + (menuTight ? 15 : 16) + 'px CrystalUI, Arial';
        ctx.fillText(this.t('menu.ourGames'), cx, secondaryY + secondaryH / 2 + 1);
      }
      if (this.game.levelSelectOpen) this.drawLevelSelect(ctx);
      ctx.restore();
    };

  Renderer.prototype.drawMenuButton = function (ctx, x, y, w, h, style) {
      const primary = style === 'primary';
      this.roundRect(ctx, x, y, w, h, 20);
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      if (primary) {
        grd.addColorStop(0, '#fff0a8');
        grd.addColorStop(0.48, '#f6bd4c');
        grd.addColorStop(1, '#a85f12');
      } else {
        grd.addColorStop(0, 'rgba(38, 44, 56, 0.94)');
        grd.addColorStop(0.48, 'rgba(16, 20, 29, 0.94)');
        grd.addColorStop(1, 'rgba(7, 9, 14, 0.96)');
      }
      ctx.fillStyle = grd;
      ctx.shadowColor = 'rgba(255, 207, 86, 0.72)';
      ctx.shadowBlur = this.shadow(18);
      ctx.fill();
      ctx.strokeStyle = primary ? '#fff7cf' : 'rgba(246, 189, 76, 0.72)';
      ctx.lineWidth = primary ? 2 : 1.6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

  Renderer.prototype.drawDailyBonusButton = function (ctx, x, y, w, h) {
      const info = this.game.dailyBonusInfo ? this.game.dailyBonusInfo() : { available: false, reward: 0, nextStreak: 1 };
      const adActive = !!info.adAvailable;
      const active = !!info.available || adActive;
      ctx.save();
      this.roundRect(ctx, x, y, w, h, 20);
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      if (active) {
        grd.addColorStop(0, '#fff2ad');
        grd.addColorStop(0.38, '#f6bd4c');
        grd.addColorStop(1, '#7c4a13');
        ctx.shadowColor = 'rgba(255, 207, 86, 0.72)';
        ctx.shadowBlur = this.shadow(18);
      } else {
        grd.addColorStop(0, 'rgba(37, 43, 55, 0.94)');
        grd.addColorStop(1, 'rgba(8, 10, 16, 0.94)');
        ctx.shadowColor = 'rgba(255, 207, 86, 0.72)';
        ctx.shadowBlur = this.shadow(18);
      }
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = active ? '#fff7cf' : 'rgba(246, 189, 76, 0.48)';
      ctx.lineWidth = active ? 2 : 1.4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const rewardText = '+' + info.reward;
      const rewardCoinR = 10;
      const rewardCoinX = x + w - 24;
      const rewardTextX = rewardCoinX - rewardCoinR - 7;
      const textX = x + 18;
      const textMaxW = Math.max(120, w - 104);
      const title = info.available
        ? this.t('daily.claim')
        : (adActive ? this.t('daily.claimAd') : (info.adPending ? this.t('daily.adPending') : this.t('daily.claimed')));
      const subText = this.t('daily.streak', { streak: Math.max(1, info.nextStreak || 1) });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = active ? '#140b04' : '#fff4d6';
      ctx.font = '900 15px CrystalUI, Arial';
      ctx.fillText(title, textX, y + h * 0.35, w - 36);
      ctx.font = '800 12px CrystalUI, Arial';
      ctx.fillStyle = active ? 'rgba(20, 11, 4, 0.74)' : 'rgba(255, 244, 214, 0.68)';
      ctx.fillText(subText, textX, y + h * 0.68, textMaxW);

      ctx.fillStyle = active ? '#140b04' : '#ffe590';
      ctx.font = '900 16px CrystalUI, Arial';
      ctx.textAlign = 'right';
      ctx.fillText(rewardText, rewardTextX, y + h * 0.68 + 1);
      this.drawCoin(ctx, rewardCoinX, y + h * 0.68, rewardCoinR);
      ctx.restore();
    };

  Renderer.prototype.drawMenuTitle = function (ctx, title, cx, y, maxWidth) {
      let fontSize = Math.max(28, Math.min(56, this.width * 0.078));
      const words = title.split(' ');
      const half = Math.ceil(words.length / 2);
      const lines = [
        words.slice(0, half).join(' '),
        words.slice(half).join(' ')
      ].filter(Boolean);

      while (fontSize > 24 && lines.some((item) => {
        ctx.font = '900 ' + fontSize + 'px CrystalUI, Arial';
        return ctx.measureText(item).width > maxWidth;
      })) {
        fontSize -= 1;
      }
      ctx.font = '900 ' + fontSize + 'px CrystalUI, Arial';
      const lineHeight = fontSize * 1.02;
      const startY = y - (lines.length - 1) * lineHeight * 0.5;
      lines.slice(0, 2).forEach((item, index) => {
        ctx.fillText(item, cx, startY + index * lineHeight);
      });
      return {
        top: startY - fontSize * 0.5,
        bottom: startY + (Math.min(lines.length, 2) - 1) * lineHeight + fontSize * 0.5
      };
    };

})();

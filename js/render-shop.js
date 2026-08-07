(function () {
  'use strict';

  const Renderer = window.CrystalMatchRenderer;
  if (!Renderer) return;

  Renderer.prototype.drawCoinShop = function (ctx) {
      this.coinShopCloseRect = null;
      this.coinShopAdRect = null;
      this.coinShopPackageRects = [];
      if (!this.game.coinShopOpen) return;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      ctx.fillRect(0, 0, this.width, this.height);

      const compact = this.width < 430 || this.height < 720;
      const paidCoinPacks = this.game.platformFeatures.paidCoinPacks !== false;
      const w = Math.min(compact ? 390 : (paidCoinPacks ? 500 : 460), this.width - 28);
      const h = Math.min(
        paidCoinPacks ? (compact ? 530 : 590) : (compact ? 152 : 166),
        this.height - 28
      );
      const x = Math.round((this.width - w) / 2);
      const y = Math.round((this.height - h) / 2);
      this.roundPanel(ctx, x, y, w, h, 22, 0.95);
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.78)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, w, h, 22);
      ctx.stroke();

      const closeSize = 36;
      this.coinShopCloseRect = { x: x + w - closeSize - 12, y: y + 12, w: closeSize, h: closeSize };
      this.circleButton(ctx, this.coinShopCloseRect.x + closeSize / 2, this.coinShopCloseRect.y + closeSize / 2, closeSize / 2, '×');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4d6';
      ctx.font = '800 ' + (compact ? 22 : 25) + 'px CrystalUI, Arial';
      ctx.fillText(this.t('shop.title'), x + w / 2, y + 38);

      const adX = x + (compact ? 14 : 18);
      const adY = y + (compact ? 62 : 68);
      const adW = w - (adX - x) * 2;
      const adH = compact ? 54 : 58;
      this.drawCoinShopAdReward(ctx, adX, adY, adW, adH, compact);

      if (!paidCoinPacks) {
        this.drawCoinShopStatus(ctx, x, y, w, h, compact);
        ctx.restore();
        return;
      }

      const packages = this.game.coinPurchasePackages || [];
      const gridX = x + (compact ? 14 : 18);
      const gridY = adY + adH + (compact ? 10 : 12);
      const gap = compact ? 10 : 12;
      const gridW = w - (gridX - x) * 2;
      const bottomReserve = 18;
      const gridH = h - (gridY - y) - bottomReserve;
      const cardW = Math.floor((gridW - gap) / 2);
      const cardH = Math.floor((gridH - gap) / 2);
      packages.forEach((pack, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cardX = gridX + col * (cardW + gap);
        const cardY = gridY + row * (cardH + gap);
        this.drawCoinShopPack(ctx, pack, cardX, cardY, cardW, cardH, compact);
      });
      this.drawCoinShopStatus(ctx, x, y, w, h, compact);

      ctx.restore();
    };

  Renderer.prototype.drawCoinShopStatus = function (ctx, x, y, w, h, compact) {
      const message = String(this.game.coinShopError || '');
      if (!message) return;
      const statusW = Math.min(w - 36, compact ? 330 : 390);
      const statusH = compact ? 64 : 72;
      const statusX = x + (w - statusW) / 2;
      const statusY = y + (h - statusH) / 2;
      ctx.save();
      this.roundRect(ctx, statusX, statusY, statusW, statusH, 14);
      ctx.fillStyle = 'rgba(10, 11, 16, 0.96)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 229, 144, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff4d6';
      ctx.font = '700 ' + (compact ? 13 : 14) + 'px CrystalUI, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.wrapText(ctx, message, statusX + 16, statusY + (compact ? 20 : 22), statusW - 32, compact ? 18 : 20);
      ctx.restore();
    };

  Renderer.prototype.drawCoinShopAdReward = function (ctx, x, y, w, h, compact) {
      const info = this.game.adRewardInfo ? this.game.adRewardInfo() : { reward: 5000, available: false, pending: false, remainingMs: 0 };
      const freeReward = this.game.platformFeatures.freeBasicRewards === true;
      this.coinShopAdRect = { x, y, w, h };
      ctx.save();
      this.roundRect(ctx, x, y, w, h, 14);
      const grd = ctx.createLinearGradient(x, y, x + w, y + h);
      grd.addColorStop(0, info.available ? 'rgba(45, 52, 62, 0.94)' : 'rgba(35, 39, 47, 0.82)');
      grd.addColorStop(0.55, info.available ? 'rgba(14, 18, 25, 0.96)' : 'rgba(11, 13, 18, 0.86)');
      grd.addColorStop(1, info.available ? 'rgba(7, 8, 12, 0.98)' : 'rgba(5, 6, 9, 0.9)');
      ctx.fillStyle = grd;
      ctx.shadowColor = info.available ? 'rgba(122, 242, 255, 0.28)' : 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = this.shadow(info.available ? 16 : 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = info.available ? 'rgba(122, 242, 255, 0.72)' : 'rgba(246, 189, 76, 0.34)';
      ctx.lineWidth = info.available ? 1.6 : 1.1;
      ctx.stroke();

      if (!freeReward) {
        const iconR = compact ? 12 : 14;
        const iconX = x + 24;
        const iconY = y + h / 2;
        ctx.save();
        ctx.strokeStyle = info.available ? '#7af2ff' : 'rgba(255, 244, 214, 0.5)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(iconX - iconR * 0.45, iconY - iconR * 0.48);
        ctx.lineTo(iconX + iconR * 0.5, iconY);
        ctx.lineTo(iconX - iconR * 0.45, iconY + iconR * 0.48);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = info.available ? '#fff4d6' : 'rgba(255, 244, 214, 0.58)';
      ctx.font = '800 ' + (compact ? 13 : 15) + 'px CrystalUI, Arial';
      const textX = x + (freeReward ? 18 : 44);
      ctx.fillText(this.t(freeReward ? 'bonus.reward.title' : 'ad.reward.title'), textX, y + h * 0.34, w * 0.48);
      ctx.fillStyle = info.available ? '#f6bd4c' : 'rgba(246, 189, 76, 0.58)';
      ctx.font = '800 ' + (compact ? 16 : 18) + 'px CrystalUI, Arial';
      const rewardText = this.t('ad.reward.action');
      ctx.fillText(rewardText, textX, y + h * 0.68);
      const rewardW = ctx.measureText(rewardText).width;
      this.drawCoin(ctx, textX + rewardW + 14, y + h * 0.68 - 1, compact ? 8 : 9);

      const buttonW = compact ? 104 : 118;
      const buttonH = compact ? 30 : 32;
      const buttonX = x + w - buttonW - 10;
      const buttonY = y + (h - buttonH) / 2;
      this.roundRect(ctx, buttonX, buttonY, buttonW, buttonH, 13);
      const buy = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonH);
      buy.addColorStop(0, info.available ? '#fff0a8' : 'rgba(83, 88, 96, 0.94)');
      buy.addColorStop(0.5, info.available ? '#f6bd4c' : 'rgba(52, 58, 68, 0.94)');
      buy.addColorStop(1, info.available ? '#9a5813' : 'rgba(24, 29, 38, 0.96)');
      ctx.fillStyle = buy;
      ctx.fill();
      ctx.strokeStyle = info.available ? '#fff7cf' : 'rgba(255, 244, 214, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = info.available ? '#130a04' : 'rgba(255, 244, 214, 0.68)';
      ctx.textAlign = 'center';
      const label = info.pending
        ? this.t('ad.reward.pending')
        : (info.available ? this.t(freeReward ? 'bonus.reward.ready' : 'ad.reward.ready') : this.formatDuration(info.remainingMs));
      ctx.font = '800 ' + (info.available || info.pending ? (compact ? 10 : 11) : (compact ? 15 : 17)) + 'px CrystalUI, Arial';
      ctx.fillText(label, buttonX + buttonW / 2, buttonY + buttonH / 2 + 1);
      ctx.restore();
    };

  Renderer.prototype.drawCoinShopPack = function (ctx, pack, x, y, w, h, compact) {
      const pending = this.game.coinShopPendingId === pack.id;
      const disabled = !!this.game.coinShopPendingId && !pending;
      this.coinShopPackageRects.push({ id: pack.id, x, y, w, h });
      ctx.save();
      this.roundRect(ctx, x, y, w, h, 16);
      const grd = ctx.createLinearGradient(x, y, x + w, y + h);
      grd.addColorStop(0, disabled ? 'rgba(40, 43, 50, 0.72)' : 'rgba(40, 46, 58, 0.94)');
      grd.addColorStop(0.55, disabled ? 'rgba(14, 16, 22, 0.72)' : 'rgba(12, 15, 22, 0.96)');
      grd.addColorStop(1, disabled ? 'rgba(6, 7, 10, 0.72)' : 'rgba(5, 6, 9, 0.98)');
      ctx.fillStyle = grd;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = this.shadow(10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(246, 189, 76, 0.46)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const spriteName = this.coinShopPackSpriteName(pack.id);
      const sprite = this.uiIconSprites && this.uiIconSprites[spriteName];
      const imageSize = Math.min(w * (compact ? 0.62 : 0.66), h * (compact ? 0.48 : 0.52));
      const imageCx = x + w / 2;
      const imageCy = y + h * (compact ? 0.3 : 0.32);
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = disabled ? 0.55 : 1;
        const imageShine = disabled ? 0 : (0.5 + 0.5 * Math.sin((this.decorTime ? this.decorTime() : this.time || 0) * 0.002 + pack.coins * 0.00003));
        ctx.shadowColor = 'rgba(255, 214, 90, ' + (0.24 + imageShine * 0.22).toFixed(3) + ')';
        ctx.shadowBlur = this.shadow(8 + imageShine * 5);
        ctx.drawImage(sprite, imageCx - imageSize / 2, imageCy - imageSize / 2, imageSize, imageSize);
        ctx.restore();
      } else {
        this.drawCoin(ctx, imageCx, imageCy, Math.min(imageSize * 0.28, 24));
      }

      const amountText = this.formatCoins(pack.coins);
      const amountY = y + h * (compact ? 0.62 : 0.64);
      const coinR = Math.max(9, Math.min(compact ? 13 : 15, h * 0.082));
      const amountFontSize = compact ? 19 : 22;
      const amountGap = 6;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const amountShine = disabled ? 0 : (0.5 + 0.5 * Math.sin((this.decorTime ? this.decorTime() : this.time || 0) * 0.0025 + pack.coins * 0.00001));
      ctx.fillStyle = disabled ? 'rgba(255, 244, 214, 0.5)' : (amountShine > 0.52 ? '#fff7cf' : '#ffe590');
      ctx.shadowColor = disabled ? 'transparent' : 'rgba(246, 189, 76, ' + (0.26 + amountShine * 0.24).toFixed(3) + ')';
      ctx.shadowBlur = this.shadow(disabled ? 0 : 5 + amountShine * 5);
      ctx.font = this.fitFont(ctx, amountText, '800', amountFontSize, 11, w - 36 - coinR * 2 - amountGap);
      const amountW = ctx.measureText(amountText).width;
      const amountX = x + (w - amountW - amountGap - coinR * 2) / 2;
      ctx.fillText(amountText, amountX, amountY + 1);
      ctx.shadowBlur = 0;
      this.drawCoin(ctx, amountX + amountW + amountGap + coinR, amountY, coinR);

      const buttonW = Math.min(w - 24, compact ? 102 : 118);
      const buttonH = compact ? 28 : 31;
      const buttonX = x + (w - buttonW) / 2;
      const buttonY = y + h - buttonH - (compact ? 8 : 10);
      this.roundRect(ctx, buttonX, buttonY, buttonW, buttonH, 14);
      const buy = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonH);
      buy.addColorStop(0, disabled ? 'rgba(92, 95, 104, 0.94)' : '#fff0a8');
      buy.addColorStop(0.5, disabled ? 'rgba(58, 62, 72, 0.94)' : '#f6bd4c');
      buy.addColorStop(1, disabled ? 'rgba(29, 33, 42, 0.96)' : '#9a5813');
      ctx.fillStyle = buy;
      ctx.fill();
      ctx.strokeStyle = disabled ? 'rgba(255, 244, 214, 0.2)' : '#fff7cf';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = disabled ? 'rgba(255, 244, 214, 0.5)' : '#130a04';
      ctx.font = '800 ' + (compact ? 12 : 13) + 'px CrystalUI, Arial';
      ctx.textAlign = 'center';
      if (pending) {
        ctx.fillText(this.t('shop.pending'), buttonX + buttonW / 2, buttonY + buttonH / 2 + 1);
      } else {
        this.drawCoinShopPackPrice(ctx, pack, buttonX, buttonY, buttonW, buttonH, compact);
      }
      ctx.restore();
    };

  Renderer.prototype.drawCoinShopPackPrice = function (ctx, pack, x, y, w, h, compact) {
      const value = pack.priceValue || '';
      const icon = this.getCurrencyIcon(pack.currencyIconSrc);
      if (value && icon && icon.complete && icon.naturalWidth > 0) {
        const iconSize = compact ? 21 : 23;
        const gap = compact ? 5 : 6;
        ctx.save();
        ctx.font = this.fitFont(ctx, value, '800', compact ? 16 : 18, 12, w - iconSize - gap - 14);
        ctx.textBaseline = 'middle';
        const textW = ctx.measureText(value).width;
        const totalW = textW + gap + iconSize;
        const startX = x + (w - totalW) / 2;
        const centerY = y + h / 2 + 1;
        ctx.textAlign = 'left';
        ctx.fillText(value, startX, centerY);
        ctx.drawImage(icon, startX + textW + gap, centerY - iconSize / 2, iconSize, iconSize);
        ctx.restore();
        return;
      }
      const price = pack.priceText || this.t('shop.buy', { price: pack.priceYan });
      ctx.font = this.fitFont(ctx, price, '800', compact ? 15 : 17, 11, w - 12);
      ctx.fillText(price, x + w / 2, y + h / 2 + 1, w - 12);
    };

  Renderer.prototype.getCurrencyIcon = function (src) {
      if (!src) return null;
      if (!this.currencyIconSprites) this.currencyIconSprites = {};
      if (!this.currencyIconSprites[src]) {
        const image = new Image();
        image.src = src;
        this.currencyIconSprites[src] = image;
      }
      return this.currencyIconSprites[src];
    };

  Renderer.prototype.coinShopPackSpriteName = function (id) {
      if (id === 'coins_10000') return 'shopPackCoins';
      if (id === 'coins_25000') return 'shopPackPouch';
      if (id === 'coins_60000') return 'shopPackChest';
      if (id === 'coins_150000') return 'shopPackLuxuryChest';
      return 'shopPackCoins';
    };

})();

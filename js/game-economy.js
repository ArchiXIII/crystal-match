(function () {
  'use strict';

  const Game = window.CrystalMatchGame;
  if (!Game) return;

  Game.prototype.setCoinPurchaseCatalog = function (products) {
      const list = Array.isArray(products) ? products : [];
      this.coinPurchasePackages = this.coinPurchasePackages.map((pack) => {
        const product = list.find((item) => (
          item && (item.id === pack.id || item.productID === pack.id || item.productId === pack.id)
        ));
        if (!product) return pack;
        let currencyIconSrc = '';
        if (typeof product.getPriceCurrencyImage === 'function') {
          try {
            currencyIconSrc = product.getPriceCurrencyImage('medium') || product.getPriceCurrencyImage('small') || '';
          } catch (error) {
            currencyIconSrc = '';
          }
        }
        return Object.assign({}, pack, {
          sdkProduct: product,
          priceText: product.price ? String(product.price) : '',
          priceValue: product.priceValue !== undefined && product.priceValue !== null ? String(product.priceValue) : '',
          priceCurrencyCode: product.priceCurrencyCode ? String(product.priceCurrencyCode) : '',
          currencyIconSrc
        });
      });

  };

  Game.prototype.loadCoins = function (defaultValue) {
      try {
        const saved = window.localStorage.getItem(this.coinStorageKey);
        if (saved === null || saved === '') return defaultValue;
        const coins = Number(saved);
        return Number.isFinite(coins) && coins >= 0 ? Math.floor(coins) : defaultValue;
      } catch (error) {
        return defaultValue;
      }

  };

  Game.prototype.loadDailyBonus = function () {
      try {
        const saved = window.localStorage.getItem(this.dailyBonusStorageKey);
        if (!saved) return {};
        return JSON.parse(saved) || {};
      } catch (error) {
        return {};
      }

  };

  Game.prototype.loadAdBonus = function () {
      try {
        const saved = window.localStorage.getItem(this.adBonusStorageKey);
        if (!saved) return {};
        return JSON.parse(saved) || {};
      } catch (error) {
        return {};
      }

  };

  Game.prototype.normalizeDailyBonus = function (value) {
      const source = value && typeof value === 'object' ? value : {};
      const streak = Number(source.streak);
      const lastClaimDate = String(source.lastClaimDate || '');
      const adClaimedDate = String(source.adClaimedDate || '');
      return {
        streak: Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0,
        lastClaimDate: /^\d{4}-\d{2}-\d{2}$/.test(lastClaimDate) ? lastClaimDate : '',
        adClaimedDate: /^\d{4}-\d{2}-\d{2}$/.test(adClaimedDate) ? adClaimedDate : ''
      };

  };

  Game.prototype.normalizeAdBonus = function (value) {
      const source = value && typeof value === 'object' ? value : {};
      const lastClaimAt = Number(source.lastClaimAt);
      return {
        lastClaimAt: Number.isFinite(lastClaimAt) && lastClaimAt > 0 ? Math.floor(lastClaimAt) : 0
      };

  };

  Game.prototype.loadSettings = function () {
      try {
        const saved = window.localStorage.getItem(this.settingsStorageKey);
        return saved ? JSON.parse(saved) || {} : {};
      } catch (error) {
        return {};
      }

  };

  Game.prototype.normalizeSettings = function (value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        soundOn: source.soundOn !== false
      };

  };

  Game.prototype.saveSettings = function (options) {
      const settings = this.normalizeSettings({ soundOn: this.soundOn });
      this.settings = settings;
      try {
        window.localStorage.setItem(this.settingsStorageKey, JSON.stringify(settings));
      } catch (error) {}
      if (this.saveSettingsExternal && (!options || options.cloud !== false)) {
        this.saveSettingsExternal(settings, options || null);
      }

  };

  Game.prototype.saveCoins = function (options) {
      const settings = options && typeof options === 'object' ? options : {};
      const value = Math.max(0, Math.floor(this.coins));
      try {
        window.localStorage.setItem(this.coinStorageKey, String(value));
      } catch (error) {
        // Storage may be unavailable in some embedded contexts; the game can still run for the session.
      }
      if (this.saveCoinsExternal && settings.cloud !== false) {
        this.saveCoinsExternal(value, {
          initial: !!settings.initial,
          forceValue: !!settings.initial && !!settings.cloud,
          immediate: !!settings.immediate
        });
      }
      this.coinSyncBase = value;

  };

  Game.prototype.saveDailyBonus = function (options) {
      const settings = options && typeof options === 'object' ? options : {};
      const data = this.normalizeDailyBonus(this.dailyBonus);
      this.dailyBonus = data;
      try {
        window.localStorage.setItem(this.dailyBonusStorageKey, JSON.stringify(data));
      } catch (error) {}
      if (this.saveDailyBonusExternal && settings.cloud !== false) {
        this.saveDailyBonusExternal(data, options || null);
      }

  };

  Game.prototype.saveAdBonus = function (options) {
      const settings = options && typeof options === 'object' ? options : {};
      const data = this.normalizeAdBonus(this.adBonus);
      this.adBonus = data;
      try {
        window.localStorage.setItem(this.adBonusStorageKey, JSON.stringify(data));
      } catch (error) {}
      if (this.saveAdBonusExternal && settings.cloud !== false) {
        this.saveAdBonusExternal(data, options || null);
      }

  };

  Game.prototype.todayKey = function () {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;

  };

  Game.prototype.dayNumber = function (dateKey) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return null;
      const parts = dateKey.split('-').map((part) => Number(part));
      return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);

  };

  Game.prototype.dailyBonusRewards = function () {
      return [1000, 1200, 1400, 1600, 1800, 2000, 2500];

  };

  Game.prototype.dailyBonusInfo = function () {
      const today = this.todayKey();
      const data = this.normalizeDailyBonus(this.dailyBonus);
      const lastDay = this.dayNumber(data.lastClaimDate);
      const todayDay = this.dayNumber(today);
      const claimedToday = data.lastClaimDate === today;
      const adClaimedToday = data.adClaimedDate === today;
      const continued = lastDay !== null && todayDay !== null && todayDay - lastDay === 1;
      const activeStreak = claimedToday ? data.streak : (continued ? data.streak : 0);
      const nextStreak = claimedToday ? Math.max(1, data.streak + 1) : Math.max(1, activeStreak + 1);
      const rewards = this.dailyBonusRewards();
      const rewardIndex = Math.min(rewards.length - 1, Math.max(0, nextStreak - 1));
      return {
        available: !claimedToday,
        adAvailable: this.platformFeatures.adsEnabled !== false && claimedToday && !adClaimedToday && !this.adBonusPending,
        adClaimedToday,
        adPending: this.adBonusPending,
        claimedToday,
        streak: data.streak,
        nextStreak,
        reward: rewards[rewardIndex],
        maxed: nextStreak >= rewards.length
      };

  };

  Game.prototype.claimDailyBonus = function () {
      const info = this.dailyBonusInfo();
      if (!info.available) return false;
      const today = this.todayKey();
      this.dailyBonus = {
        streak: info.nextStreak,
        lastClaimDate: today,
        adClaimedDate: ''
      };
      this.addCoins(info.reward, { kind: 'daily' }, false, { immediate: true });
      this.saveDailyBonus({ immediate: true });
      return true;

  };

  Game.prototype.claimDailyBonusAd = function () {
      const info = this.dailyBonusInfo();
      if (!info.adAvailable || !this.showRewardedAdExternal) return false;
      this.adBonusPending = true;
      Promise.resolve(this.showRewardedAdExternal())
        .then((rewarded) => {
          if (!rewarded) return;
          const today = this.todayKey();
          const data = this.normalizeDailyBonus(this.dailyBonus);
          data.adClaimedDate = today;
          this.dailyBonus = data;
          this.addCoins(info.reward, { kind: 'daily' }, false, { immediate: true });
          this.saveDailyBonus({ immediate: true });
        })
        .finally(() => {
          this.adBonusPending = false;
        });
      return true;

  };

  Game.prototype.adRewardInfo = function () {
      const reward = 5000;
      const cooldown = 30 * 60 * 1000;
      const elapsed = Math.max(0, Date.now() - (this.adBonus.lastClaimAt || 0));
      const remainingMs = Math.max(0, cooldown - elapsed);
      return {
        reward,
        cooldown,
        remainingMs,
        available: remainingMs <= 0 && !this.adBonusPending,
        pending: this.adBonusPending
      };

  };

  Game.prototype.claimAdReward = function (source) {
      const info = this.adRewardInfo();
      if (!info.available) return false;
      if (this.platformFeatures.freeBasicRewards === true) {
        this.adBonus = { lastClaimAt: Date.now() };
        this.addCoins(info.reward, source || null, false, { immediate: true });
        this.saveAdBonus({ immediate: true });
        return true;
      }
      if (!this.showRewardedAdExternal) {
        this.coinShopError = this.t('ad.unavailable');
        return false;
      }
      this.adBonusPending = true;
      this.coinShopRewardSource = source || null;
      this.coinShopError = '';
      Promise.resolve(this.showRewardedAdExternal())
        .then((rewarded) => {
          if (!rewarded) {
            this.coinShopError = this.t('ad.error');
            return;
          }
          this.adBonus = { lastClaimAt: Date.now() };
          this.addCoins(info.reward, this.coinShopRewardSource || null, false, { immediate: true });
          this.saveAdBonus({ immediate: true });
        })
        .catch(() => {
          this.coinShopError = this.t('ad.error');
        })
        .finally(() => {
          this.adBonusPending = false;
          this.coinShopRewardSource = null;
        });
      return true;

  };

  Game.prototype.endlessMoveBonusInfo = function () {
      const target = 30;
      const moves = Math.max(0, Math.min(target, Math.floor(this.endlessMoveBonusMoves || 0)));
      const enabled = this.platformFeatures.endlessMoveBonus === true && this.gameMode === 'endless';
      const ready = enabled && moves >= target;
      let adAvailable = ready && !this.endlessMoveBonusPending && !!this.showRewardedAdExternal;
      if (adAvailable && this.isRewardedAdAvailableExternal) {
        try {
          adAvailable = this.isRewardedAdAvailableExternal() !== false;
        } catch (_) {
          adAvailable = false;
        }
      }
      return {
        enabled,
        target,
        moves,
        ready,
        pending: !!this.endlessMoveBonusPending,
        adAvailable,
        reward: 500,
        adReward: 2000
      };

  };

  Game.prototype.addEndlessMoveBonusMove = function () {
      if (this.platformFeatures.endlessMoveBonus !== true || this.gameMode !== 'endless' || this.menuOpen || this.gameOver) return false;
      this.endlessMoveBonusMoves = Math.min(30, Math.max(0, Math.floor(this.endlessMoveBonusMoves || 0)) + 1);
      return true;

  };

  Game.prototype.claimEndlessMoveBonus = function (source) {
      const info = this.endlessMoveBonusInfo();
      if (!info.ready || info.pending) return false;
      this.endlessMoveBonusMoves = 0;
      this.addCoins(info.reward, source || null, true, { immediate: true });
      return true;

  };

  Game.prototype.claimEndlessMoveBonusAd = function (source) {
      const info = this.endlessMoveBonusInfo();
      if (!info.ready || !info.adAvailable || info.pending) return false;
      this.endlessMoveBonusPending = true;
      Promise.resolve()
        .then(() => this.showRewardedAdExternal())
        .then((rewarded) => {
          if (!rewarded) return;
          this.endlessMoveBonusMoves = 0;
          this.addCoins(info.adReward, source || null, true, { immediate: true });
        })
        .catch(() => false)
        .finally(() => {
          this.endlessMoveBonusPending = false;
        });
      return true;

  };

  Game.prototype.addCoins = function (amount, source, countAsEarned = true, options) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const coins = Math.floor(amount);
      this.coins += coins;
      if (countAsEarned) this.roundEarnedCoins += coins;
      if (!this.audio || !this.audio.hasSample || !this.audio.hasSample('coins')) {
        this.playSound('coinGain');
      }
      if (source) {
        this.spawnCoinFlights(source, coins);
      } else {
        this.displayCoins += coins;
        this.playSound('coinCollect');
      }
      this.saveCoins(options);

  };

  Game.prototype.openCoinShop = function () {
      this.coinShopOpen = true;
      this.coinShopError = '';
      this.profilePanelOpen = false;
      if (this.processPendingPurchasesExternal) this.processPendingPurchasesExternal({ source: 'shop' });
      return true;

  };

  Game.prototype.closeCoinShop = function () {
      this.coinShopOpen = false;
      this.coinShopError = '';
      return true;

  };

  Game.prototype.buyCoinPackage = function (packageId, source) {
      const pack = this.coinPurchasePackages.find((item) => item.id === packageId);
      if (!pack || this.coinShopPendingId) return false;
      if (!this.purchaseCoinsExternal) {
        this.coinShopError = this.t('shop.unavailable');
        return false;
      }
      this.coinShopPendingId = pack.id;
      this.coinShopPurchaseSources[pack.id] = source || null;
      this.coinShopError = '';
      Promise.resolve(this.purchaseCoinsExternal(pack))
        .then((success) => {
          if (!success && !this.coinShopError) this.coinShopError = this.t('shop.purchaseError');
        })
        .catch(() => {
          if (!this.coinShopError) this.coinShopError = this.t('shop.purchaseError');
        })
        .finally(() => {
          this.coinShopPendingId = '';
        });
      return true;

  };

  Game.prototype.applyCoinPurchase = function (productId) {
      const pack = this.coinPurchasePackages.find((item) => item.id === productId);
      if (!pack) return false;
      const source = this.coinShopPurchaseSources[pack.id] || null;
      this.addCoins(pack.coins, source, false, { cloud: false });
      delete this.coinShopPurchaseSources[pack.id];
      this.coinShopError = '';
      return true;

  };

  Game.prototype.spendCoins = function (amount) {
      if (!Number.isFinite(amount) || amount <= 0 || this.coins < amount) return false;
      this.coins -= Math.floor(amount);
      this.displayCoins = Math.min(this.displayCoins, this.coins);
      this.spawnCoinSpendBurst(amount);
      this.saveCoins({ immediate: true });
      return true;

  };

  Game.prototype.spawnCoinSpendBurst = function (amount) {
      const minCount = this.effectDensity < 0.8 ? 3 : 4;
      const count = Math.max(minCount, Math.min(this.maxCoinSpendBursts || 14, Math.ceil(amount / 350)));
      for (let i = 0; i < count; i += 1) {
        this.coinSpendBursts.push({
          angle: -Math.PI * 0.9 + Math.random() * Math.PI * 1.8,
          distance: 36 + Math.random() * 51,
          delay: i * 18 + Math.random() * 45,
          duration: 520 + Math.random() * 180,
          elapsed: 0,
          spin: Math.random() * Math.PI * 2
        });
      }
      const limit = this.maxCoinSpendBursts || 14;
      if (this.coinSpendBursts.length > limit) {
        this.coinSpendBursts.splice(0, this.coinSpendBursts.length - limit);
      }

  };

  Game.prototype.spawnCoinFlights = function (source, amount) {
      const minCount = this.effectDensity < 0.8 ? 3 : 4;
      const count = Math.max(minCount, Math.min(this.maxCoinFlights || 14, Math.ceil(amount / 20)));
      const baseValue = Math.floor(amount / count);
      const baseDelay = source && source.kind === 'levelWinStars' ? 1450 : 0;
      let remainder = amount - baseValue * count;
      for (let i = 0; i < count; i += 1) {
        const value = baseValue + (remainder > 0 ? 1 : 0);
        remainder -= remainder > 0 ? 1 : 0;
        this.coinFlights.push({
          source,
          value,
          delay: baseDelay + i * 34 + Math.random() * 110,
          duration: 1440 + Math.random() * 520,
          elapsed: 0,
          arc: 0.22 + Math.random() * 0.26,
          spreadX: (Math.random() - 0.5) * 1.32,
          spreadY: (Math.random() - 0.5) * 0.92,
          spin: Math.random() * Math.PI * 2
        });
      }
      const limit = this.maxCoinFlights || 14;
      if (this.coinFlights.length > limit) {
        const removed = this.coinFlights.splice(0, this.coinFlights.length - limit);
        const remainingValue = removed.reduce((sum, coin) => sum + Math.max(0, Math.floor(coin.value || 0)), 0);
        if (remainingValue > 0) {
          this.displayCoins = Math.min(this.coins, this.displayCoins + remainingValue);
        }
      }

  };

  Game.prototype.roundCoinsEarned = function () {
      return Math.max(0, this.roundEarnedCoins);

  };

  Game.prototype.hasUsableBoosters = function () {
      return this.availableBoosters().some((booster) => this.coins >= this.currentBoosterCost(booster));

  };

  Game.prototype.availableBoosters = function () {
      if (this.gameMode !== 'level' || !this.currentLevel) return this.boosters;
      const allowed = this.currentLevel.boosters || [];
      return this.boosters.filter((booster) => allowed.indexOf(booster.id) !== -1);

  };

  Game.prototype.currentBoosterCost = function (booster) {
      const uses = this.boosterUsesThisRound && this.boosterUsesThisRound[booster.id] ? this.boosterUsesThisRound[booster.id] : 0;
      return Math.ceil(booster.cost * Math.pow(1.2, uses));

  };

  Game.prototype.createBoosterUseMap = function () {
      return {
        hammer: 0,
        bomb: 0,
        rainbow: 0
      };

  };

})();

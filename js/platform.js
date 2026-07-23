(function () {
  'use strict';

  const Platform = {
    canvas: null,
    game: null,
    renderer: null,
    input: null,
    audio: null,
    lastTime: 0,
    ysdk: null,
    player: null,
    playerMode: '',
    leaderboards: null,
    payments: null,
    leaderboardName: 'CrystalTreasuresMatch3',
    starsLeaderboardName: 'CrystalTreasuresStars',
    xpLeaderboardName: 'CrystalTreasuresXP',
    localBestScoreKey: 'crystal-match-best-score',
    lang: 'ru',
    pendingCoinSave: null,
    pendingCoinDelta: 0,
    pendingCoinForceValue: false,
    coinCloudDataLoaded: false,
    pendingRankXpSave: null,
    pendingDailyBonusSave: null,
    pendingAdBonusSave: null,
    pendingLevelProgressSave: null,
    processedPurchaseTokens: [],
    coinSaveTimer: null,
    rankXpSaveTimer: null,
    dailyBonusSaveTimer: null,
    adBonusSaveTimer: null,
    levelProgressSaveTimer: null,
    rankXpSaveDelay: 30000,
    qualityLevel: 2,
    qualityProfile: null,
    fpsWindowStart: 0,
    fpsFrameCount: 0,
    fpsSlowWindows: 0,
    fpsFastWindows: 0,
    backGuardBound: false,
    backGuardDepth: 0,

    async boot() {
      this.canvas = document.getElementById('gameCanvas');
      this.bindInteractionGuards();
      this.bindBackButtonGuard();
      await this.initYandex();
      this.ensureStickyBanner();
      this.lang = this.detectLanguage();
      if (window.CrystalMatchI18n) window.CrystalMatchI18n.setLanguage(this.lang);
      this.notifyGameReady();
      await this.loadPlayer();
      const savedProgress = await this.loadCloudProgress() || {};
      const serverBackedProgress = !!savedProgress.cloudDataLoaded && this.isServerBackedPlayer();
      this.processedPurchaseTokens = Array.isArray(savedProgress.coinPurchaseTokens) ? savedProgress.coinPurchaseTokens : this.loadLocalPurchaseTokens();
      const playerName = this.getPlayerDisplayName();
      this.audio = window.CrystalMatchAudio ? new CrystalMatchAudio() : null;
      this.game = new CrystalMatchGame({
        columns: 7,
        rows: 8,
        colors: 5,
        playerName,
        savedCoins: savedProgress.coins,
        initialCoinCloudSave: serverBackedProgress && !Number.isFinite(savedProgress.coins),
        serverBackedProgress,
        savedRankXp: savedProgress.rankXp,
        savedDailyBonus: savedProgress.dailyBonus,
        savedAdBonus: savedProgress.adBonus,
        savedLevelProgress: savedProgress.levelProgress,
        i18n: window.CrystalMatchI18n,
        audio: this.audio,
        saveCoins: (coins, meta) => this.saveCloudCoins(coins, meta),
        saveRankXp: (rankXp, force) => this.saveCloudRankXp(rankXp, force),
        saveDailyBonus: (dailyBonus, meta) => this.saveCloudDailyBonus(dailyBonus, meta),
        saveAdBonus: (adBonus, meta) => this.saveCloudAdBonus(adBonus, meta),
        saveLevelProgress: (progress, meta) => this.saveCloudLevelProgress(progress, meta),
        submitScore: (score) => this.submitLeaderboardScore(score),
        submitStars: (stars) => this.submitStarsLeaderboard(stars),
        openLeaderboard: (type) => this.openLeaderboard(type),
        openXpLeaderboard: (xp) => this.openXpLeaderboard(xp),
        openDeveloperGames: () => this.openDeveloperGames(),
        loadGameOverLeaderboard: (score, type) => this.loadGameOverLeaderboard(score, type),
        purchaseCoins: (pack) => this.purchaseCoins(pack),
        showRewardedAd: () => this.showRewardedAd(),
        isRewardedAdAvailable: () => this.isRewardedAdAvailable(),
        showInterstitialAd: () => this.showInterstitialAd()
      });
      this.renderer = new CrystalMatchRenderer(this.canvas, this.game);
      this.input = new CrystalMatchInput(this.canvas, this.game, this.renderer);
      this.applyPerformanceProfile(true);
      this.loadCoinPurchaseCatalog();
      this.processPendingPurchases();

      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
      window.addEventListener('orientationchange', () => this.resize(), { passive: true });
      window.addEventListener('pagehide', () => this.flushCloudCoins(), { passive: true });
      window.addEventListener('pagehide', () => this.flushCloudRankXp(), { passive: true });
      window.addEventListener('pagehide', () => this.flushCloudDailyBonus(), { passive: true });
      window.addEventListener('pagehide', () => this.flushCloudAdBonus(), { passive: true });
      window.addEventListener('pagehide', () => this.flushCloudLevelProgress(), { passive: true });
      window.addEventListener('pagehide', () => this.pauseAudioForSystem(), { passive: true });
      window.addEventListener('beforeunload', () => this.flushCloudCoins(), { passive: true });
      window.addEventListener('beforeunload', () => this.flushCloudRankXp(), { passive: true });
      window.addEventListener('beforeunload', () => this.flushCloudDailyBonus(), { passive: true });
      window.addEventListener('beforeunload', () => this.flushCloudAdBonus(), { passive: true });
      window.addEventListener('beforeunload', () => this.flushCloudLevelProgress(), { passive: true });
      window.addEventListener('blur', () => this.pauseAudioForSystem(), { passive: true });
      window.addEventListener('focus', () => {
        this.resumeAudioFromSystem();
        this.refreshCloudCoins();
        this.ensureStickyBanner();
      }, { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.pauseAudioForSystem();
        else {
          this.resumeAudioFromSystem();
          this.refreshCloudCoins();
          this.ensureStickyBanner();
        }
      }, { passive: true });
      this.bindYandexPauseEvents();
      requestAnimationFrame((time) => this.loop(time));
    },

    notifyGameReady() {
      if (this.readyNotified) return;
      if (!this.ysdk || !this.ysdk.features || !this.ysdk.features.LoadingAPI || !this.ysdk.features.LoadingAPI.ready) return;
      try {
        this.ysdk.features.LoadingAPI.ready();
        this.readyNotified = true;
      } catch (error) {}
    },

    bindInteractionGuards() {
      const root = document.querySelector('.game-shell');
      const targets = [root, this.canvas].filter(Boolean);
      const prevent = (event) => event.preventDefault();
      targets.forEach((target) => {
        target.addEventListener('contextmenu', prevent);
        target.addEventListener('selectstart', prevent);
        target.addEventListener('dragstart', prevent);
        target.addEventListener('dragover', prevent);
        target.addEventListener('drop', prevent);
        target.addEventListener('auxclick', prevent);
        target.addEventListener('mousedown', (event) => {
          if (event.button !== 0) event.preventDefault();
        });
      });
      if (this.canvas) {
        this.canvas.setAttribute('draggable', 'false');
        this.canvas.setAttribute('aria-draggable', 'false');
      }
    },

    bindBackButtonGuard() {
      if (this.backGuardBound || !window.history || !window.history.pushState) return;
      this.backGuardBound = true;
      this.ensureBackHistoryGuard(2);
      window.addEventListener('popstate', () => {
        this.backGuardDepth = Math.max(0, this.backGuardDepth - 1);
        const game = this.game;
        if (game && game.exitRoundConfirmOpen && game.cancelExitRoundConfirm) {
          game.cancelExitRoundConfirm();
          this.ensureBackHistoryGuard(2);
          return;
        }
        const shouldAsk = game && game.shouldConfirmBackExit && game.shouldConfirmBackExit();
        if (shouldAsk) {
          game.requestExitRoundConfirm();
          this.ensureBackHistoryGuard(2);
        }
      });
    },

    ensureBackHistoryGuard(depth) {
      if (!window.history || !window.history.pushState) return;
      const targetDepth = Math.max(1, Math.floor(depth || 1));
      try {
        if (!this.backGuardDepth) {
          window.history.replaceState({ crystalMatch: true }, '', window.location.href);
        }
        while (this.backGuardDepth < targetDepth) {
          window.history.pushState({ crystalMatchBackGuard: true }, '', window.location.href);
          this.backGuardDepth += 1;
        }
      } catch (error) {}
    },

    bindYandexPauseEvents() {
      if (!this.ysdk || !this.ysdk.on) return;
      try {
        this.ysdk.on('game_api_pause', () => this.pauseAudioForSystem());
        this.ysdk.on('game_api_resume', () => {
          this.resumeAudioFromSystem();
          this.ensureStickyBanner();
        });
      } catch (error) {}
    },

    pauseAudioForSystem() {
      if (this.audio && this.audio.pauseForSystem) this.audio.pauseForSystem();
    },

    resumeAudioFromSystem() {
      if (this.audio && this.audio.resumeFromSystem) this.audio.resumeFromSystem();
    },

    async initYandex() {
      if (!window.YaGames || !window.YaGames.init) return;
      try {
        this.ysdk = await window.YaGames.init();
      } catch (error) {
        this.ysdk = null;
      }
    },

    async ensureStickyBanner() {
      const adv = this.ysdk && this.ysdk.adv;
      if (!adv || !adv.showBannerAdv) return false;
      try {
        if (adv.getBannerAdvStatus) {
          const status = await adv.getBannerAdvStatus();
          if (status && status.stickyAdvIsShowing) return true;
          if (status && status.reason === 'ADV_IS_NOT_CONNECTED') return false;
        }
        const result = await adv.showBannerAdv();
        return !!(result && result.stickyAdvIsShowing);
      } catch (error) {
        return false;
      }
    },

    async loadPlayer() {
      this.player = null;
      this.playerMode = '';
      if (!this.ysdk || !this.ysdk.getPlayer) return;
      try {
        this.player = await this.ysdk.getPlayer({ scopes: true });
      } catch (error) {
        try {
          this.player = await this.ysdk.getPlayer({ scopes: false });
        } catch (fallbackError) {
          this.player = null;
        }
      }
      this.playerMode = this.getPlayerMode();
    },

    getPlayerMode() {
      if (!this.player || typeof this.player.getMode !== 'function') return '';
      try {
        return String(this.player.getMode() || '');
      } catch (error) {
        return '';
      }
    },

    isServerBackedPlayer() {
      return !!(this.player && this.player.getData && this.player.setData);
    },

    detectLanguage() {
      const sdkLang = this.ysdk && this.ysdk.environment && this.ysdk.environment.i18n
        ? this.ysdk.environment.i18n.lang
        : '';
      const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'ru';
      const lang = sdkLang || browserLang;
      return window.CrystalMatchI18n ? window.CrystalMatchI18n.normalize(lang) : (String(lang).toLowerCase().indexOf('ru') === 0 ? 'ru' : 'en');
    },

    t(key, params) {
      return window.CrystalMatchI18n ? window.CrystalMatchI18n.t(key, params) : key;
    },

    getPlayerDisplayName() {
      const fallback = this.t('leaderboard.player');
      if (!this.player) return fallback;
      try {
        const rawName = typeof this.player.getName === 'function'
          ? this.player.getName()
          : (this.player.publicName || this.player.name || '');
        const name = String(rawName || '').trim();
        return name || fallback;
      } catch (error) {
        return fallback;
      }
    },

    async loadCloudProgress() {
      if (!this.isServerBackedPlayer()) return {};
      try {
        const data = await this.player.getData(['crystalProgress']);
        return this.normalizeCloudProgress(data);
      } catch (error) {
        return {};
      }
    },

    loadLocalPurchaseTokens() {
      try {
        const raw = window.localStorage.getItem('crystal-match-purchase-tokens');
        const tokens = JSON.parse(raw || '[]');
        return Array.isArray(tokens) ? tokens.map((token) => String(token)).filter(Boolean).slice(-50) : [];
      } catch (error) {
        return [];
      }
    },

    saveLocalPurchaseTokens() {
      try {
        window.localStorage.setItem('crystal-match-purchase-tokens', JSON.stringify(this.processedPurchaseTokens.slice(-50)));
      } catch (error) {}
    },

    normalizeDailyBonusForCloud(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        streak: Math.max(0, Math.floor(Number(source.streak) || 0)),
        lastClaimDate: String(source.lastClaimDate || ''),
        adClaimedDate: String(source.adClaimedDate || '')
      };
    },

    normalizeAdBonusForCloud(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        lastClaimAt: Math.max(0, Math.floor(Number(source.lastClaimAt) || 0))
      };
    },

    normalizeLevelProgressForCloud(value) {
      const source = value && typeof value === 'object' ? value : {};
      const stars = {};
      const rawStars = source.stars && typeof source.stars === 'object' ? source.stars : {};
      Object.keys(rawStars).forEach((key) => {
        const level = Math.max(1, Math.floor(Number(key) || 0));
        const score = Math.max(0, Math.min(3, Math.floor(Number(rawStars[key]) || 0)));
        if (level > 0 && score > 0) stars[level] = score;
      });
      const chapterTrophies = {};
      const rawTrophies = source.chapterTrophies && typeof source.chapterTrophies === 'object' ? source.chapterTrophies : {};
      Object.keys(rawTrophies).forEach((key) => {
        const chapter = Math.max(0, Math.floor(Number(key) || 0));
        if (rawTrophies[key]) chapterTrophies[chapter] = true;
      });
      return {
        highestUnlockedLevel: Math.max(1, Math.floor(Number(source.highestUnlockedLevel) || 1)),
        stars,
        chapterTrophies
      };
    },

    normalizePurchaseTokens(value) {
      return Array.isArray(value) ? value.map((token) => String(token)).filter(Boolean).slice(-50) : [];
    },

    normalizeCloudProgress(data) {
      const result = { cloudDataLoaded: true };
      const root = data && typeof data === 'object' && data.crystalProgress && typeof data.crystalProgress === 'object'
        ? data.crystalProgress
        : {};
      const coins = Number(root.coins);
      const rankXp = Number(root.rankXp);
      if (Number.isFinite(coins) && coins >= 0) result.coins = Math.floor(coins);
      if (Number.isFinite(rankXp) && rankXp >= 0) result.rankXp = Math.floor(rankXp);
      if (root.dailyBonus && typeof root.dailyBonus === 'object') result.dailyBonus = this.normalizeDailyBonusForCloud(root.dailyBonus);
      if (root.adBonus && typeof root.adBonus === 'object') result.adBonus = this.normalizeAdBonusForCloud(root.adBonus);
      if (root.levelProgress && typeof root.levelProgress === 'object') result.levelProgress = this.normalizeLevelProgressForCloud(root.levelProgress);
      result.coinPurchaseTokens = this.normalizePurchaseTokens(root.coinPurchaseTokens);
      return result;
    },

    buildCloudProgressPayload(overrides) {
      const game = this.game;
      const source = overrides && typeof overrides === 'object' ? overrides : {};
      const coinsSource = Object.prototype.hasOwnProperty.call(source, 'coins') ? source.coins : (game ? game.coins : 0);
      const rankXpSource = Object.prototype.hasOwnProperty.call(source, 'rankXp') ? source.rankXp : (game ? game.rankXp : 0);
      const dailySource = Object.prototype.hasOwnProperty.call(source, 'dailyBonus')
        ? source.dailyBonus
        : (game ? game.dailyBonus : null);
      const adSource = Object.prototype.hasOwnProperty.call(source, 'adBonus')
        ? source.adBonus
        : (game ? game.adBonus : null);
      let levelSource = Object.prototype.hasOwnProperty.call(source, 'levelProgress') ? source.levelProgress : null;
      if (!levelSource && game) {
        levelSource = {
          highestUnlockedLevel: game.highestUnlockedLevel,
          stars: game.levelStars,
          chapterTrophies: game.levelChapterTrophies
        };
      }
      const tokensSource = Object.prototype.hasOwnProperty.call(source, 'coinPurchaseTokens')
        ? source.coinPurchaseTokens
        : this.processedPurchaseTokens;
      const progress = {
        coins: Math.max(0, Math.floor(Number(coinsSource) || 0)),
        rankXp: Math.max(0, Math.floor(Number(rankXpSource) || 0)),
        dailyBonus: this.normalizeDailyBonusForCloud(dailySource),
        adBonus: this.normalizeAdBonusForCloud(adSource),
        levelProgress: this.normalizeLevelProgressForCloud(levelSource),
        coinPurchaseTokens: this.normalizePurchaseTokens(tokensSource)
      };
      return { crystalProgress: progress };
    },

    saveCloudCoins(coins, meta) {
      if (!this.isServerBackedPlayer()) return;
      const value = Math.max(0, Math.floor(coins));
      const info = meta && typeof meta === 'object' ? meta : {};
      this.pendingCoinSave = value;
      window.clearTimeout(this.coinSaveTimer);
      if (info.immediate || info.forceValue) {
        this.flushCloudCoins();
        return;
      }
      this.coinSaveTimer = window.setTimeout(() => {
        this.flushCloudCoins();
      }, 450);
    },

    async readCloudCoinsAndTokens() {
      if (!this.isServerBackedPlayer()) return {};
      try {
        const data = await this.player.getData(['crystalProgress']);
        const progress = this.normalizeCloudProgress(data);
        return {
          coins: Number.isFinite(progress.coins) ? progress.coins : null,
          coinPurchaseTokens: progress.coinPurchaseTokens || []
        };
      } catch (error) {
        return {};
      }
    },

    async flushCloudCoins() {
      if (!this.isServerBackedPlayer() || this.pendingCoinSave === null) return Promise.resolve();
      window.clearTimeout(this.coinSaveTimer);
      const nextCoins = Math.max(0, Math.floor(this.pendingCoinSave));
      this.pendingCoinSave = null;
      this.pendingCoinDelta = 0;
      this.pendingCoinForceValue = false;
      const payload = this.buildCloudProgressPayload({ coins: nextCoins });
      try {
        await this.player.setData(payload, true);
        this.applySyncedCoins(nextCoins);
      } catch (error) {
        this.pendingCoinSave = nextCoins;
      }
    },

    applySyncedCoins(coins, options) {
      const value = Math.max(0, Math.floor(Number(coins) || 0));
      const settings = options && typeof options === 'object' ? options : {};
      try {
        window.localStorage.setItem('crystal-match-coins', String(value));
      } catch (error) {}
      if (!this.game) return;
      const previousCoins = Math.max(0, Math.floor(Number(this.game.coins) || 0));
      this.game.coins = value;
      this.game.coinSyncBase = value;
      if (Number.isFinite(settings.displayBase)) {
        this.game.displayCoins = Math.min(value, Math.max(this.game.displayCoins || 0, Math.floor(settings.displayBase)));
      } else if (previousCoins !== value) {
        this.game.displayCoins = value;
      }
    },

    async refreshCloudCoins() {
      if (!this.isServerBackedPlayer() || !this.game) return;
      const cloud = await this.loadCloudProgress();
      if (!cloud || !cloud.cloudDataLoaded) return;
      if (this.pendingCoinSave === null && Number.isFinite(cloud.coins) && Math.floor(this.game.coins || 0) !== cloud.coins) {
        this.applySyncedCoins(cloud.coins);
      }
      if (this.pendingRankXpSave === null && Number.isFinite(cloud.rankXp)) {
        const nextXp = Math.max(0, Math.floor(cloud.rankXp));
        if (nextXp !== Math.max(0, Math.floor(this.game.rankXp || 0))) {
          this.game.rankXp = nextXp;
          try {
            window.localStorage.setItem(this.game.rankXpStorageKey, String(nextXp));
          } catch (error) {}
        }
      }
      if (this.pendingDailyBonusSave === null && cloud.dailyBonus && typeof cloud.dailyBonus === 'object') {
        this.game.dailyBonus = this.game.normalizeDailyBonus ? this.game.normalizeDailyBonus(cloud.dailyBonus) : cloud.dailyBonus;
        this.game.saveDailyBonus({ cloud: false });
      }
      if (this.pendingAdBonusSave === null && cloud.adBonus && typeof cloud.adBonus === 'object') {
        this.game.adBonus = this.game.normalizeAdBonus ? this.game.normalizeAdBonus(cloud.adBonus) : cloud.adBonus;
        this.game.saveAdBonus({ cloud: false });
      }
      if (this.pendingLevelProgressSave === null && cloud.levelProgress && typeof cloud.levelProgress === 'object' && this.game.normalizeLevelProgress) {
        const progress = this.game.normalizeLevelProgress(cloud.levelProgress);
        this.game.highestUnlockedLevel = progress.highestUnlockedLevel;
        this.game.levelStars = progress.stars;
        this.game.levelChapterTrophies = progress.chapterTrophies || {};
        this.game.saveLevelProgress({ cloud: false });
      }
      if (Array.isArray(cloud.coinPurchaseTokens)) {
        this.processedPurchaseTokens = cloud.coinPurchaseTokens.slice(-50);
        this.saveLocalPurchaseTokens();
      }
    },

    saveCloudRankXp(rankXp, force) {
      if (!this.isServerBackedPlayer()) return;
      const value = Math.max(0, Math.floor(rankXp));
      this.pendingRankXpSave = value;
      window.clearTimeout(this.rankXpSaveTimer);
      if (force) {
        this.flushCloudRankXp();
        return;
      }
      this.rankXpSaveTimer = window.setTimeout(() => {
        this.flushCloudRankXp();
      }, this.rankXpSaveDelay);
    },

    flushCloudRankXp() {
      if (!this.isServerBackedPlayer() || this.pendingRankXpSave === null) return Promise.resolve();
      window.clearTimeout(this.rankXpSaveTimer);
      const savedXp = this.pendingRankXpSave;
      const payload = this.buildCloudProgressPayload({ rankXp: savedXp });
      this.pendingRankXpSave = null;
      this.submitXpLeaderboard(savedXp);
      return this.player.setData(payload, true).catch(() => {
        this.pendingRankXpSave = savedXp;
      });
    },

    saveCloudDailyBonus(dailyBonus, meta) {
      if (!this.isServerBackedPlayer()) return;
      const source = dailyBonus && typeof dailyBonus === 'object' ? dailyBonus : {};
      this.pendingDailyBonusSave = {
        streak: Math.max(0, Math.floor(Number(source.streak) || 0)),
        lastClaimDate: String(source.lastClaimDate || ''),
        adClaimedDate: String(source.adClaimedDate || '')
      };
      const info = meta && typeof meta === 'object' ? meta : {};
      window.clearTimeout(this.dailyBonusSaveTimer);
      if (info.immediate) {
        this.flushCloudDailyBonus();
        return;
      }
      this.dailyBonusSaveTimer = window.setTimeout(() => {
        this.flushCloudDailyBonus();
      }, 350);
    },

    flushCloudDailyBonus() {
      if (!this.isServerBackedPlayer() || this.pendingDailyBonusSave === null) return;
      window.clearTimeout(this.dailyBonusSaveTimer);
      const savedDailyBonus = this.pendingDailyBonusSave;
      const payload = this.buildCloudProgressPayload({ dailyBonus: savedDailyBonus });
      this.pendingDailyBonusSave = null;
      this.player.setData(payload, true).catch(() => {
        this.pendingDailyBonusSave = savedDailyBonus;
      });
    },

    saveCloudAdBonus(adBonus, meta) {
      if (!this.isServerBackedPlayer()) return;
      const source = adBonus && typeof adBonus === 'object' ? adBonus : {};
      this.pendingAdBonusSave = {
        lastClaimAt: Math.max(0, Math.floor(Number(source.lastClaimAt) || 0))
      };
      const info = meta && typeof meta === 'object' ? meta : {};
      window.clearTimeout(this.adBonusSaveTimer);
      if (info.immediate) {
        this.flushCloudAdBonus();
        return;
      }
      this.adBonusSaveTimer = window.setTimeout(() => {
        this.flushCloudAdBonus();
      }, 350);
    },

    flushCloudAdBonus() {
      if (!this.isServerBackedPlayer() || this.pendingAdBonusSave === null) return;
      window.clearTimeout(this.adBonusSaveTimer);
      const savedAdBonus = this.pendingAdBonusSave;
      const payload = this.buildCloudProgressPayload({ adBonus: savedAdBonus });
      this.pendingAdBonusSave = null;
      this.player.setData(payload, true).catch(() => {
        this.pendingAdBonusSave = savedAdBonus;
      });
    },

    saveCloudLevelProgress(progress, meta) {
      if (!this.isServerBackedPlayer()) return;
      const source = progress && typeof progress === 'object' ? progress : {};
      const stars = {};
      const rawStars = source.stars && typeof source.stars === 'object' ? source.stars : {};
      Object.keys(rawStars).forEach((key) => {
        const level = Math.max(1, Math.floor(Number(key) || 0));
        const value = Math.max(0, Math.min(3, Math.floor(Number(rawStars[key]) || 0)));
        if (level > 0 && value > 0) stars[level] = value;
      });
      const chapterTrophies = {};
      const rawTrophies = source.chapterTrophies && typeof source.chapterTrophies === 'object' ? source.chapterTrophies : {};
      Object.keys(rawTrophies).forEach((key) => {
        const chapter = Math.max(0, Math.floor(Number(key) || 0));
        if (rawTrophies[key]) chapterTrophies[chapter] = true;
      });
      this.pendingLevelProgressSave = {
        highestUnlockedLevel: Math.max(1, Math.floor(Number(source.highestUnlockedLevel) || 1)),
        stars,
        chapterTrophies
      };
      const info = meta && typeof meta === 'object' ? meta : {};
      window.clearTimeout(this.levelProgressSaveTimer);
      if (info.immediate) {
        this.flushCloudLevelProgress();
        return;
      }
      this.levelProgressSaveTimer = window.setTimeout(() => {
        this.flushCloudLevelProgress();
      }, 500);
    },

    flushCloudLevelProgress() {
      if (!this.isServerBackedPlayer() || this.pendingLevelProgressSave === null) return Promise.resolve();
      window.clearTimeout(this.levelProgressSaveTimer);
      const savedLevelProgress = this.pendingLevelProgressSave;
      const payload = this.buildCloudProgressPayload({ levelProgress: savedLevelProgress });
      this.pendingLevelProgressSave = null;
      return this.player.setData(payload, true).catch(() => {
        this.pendingLevelProgressSave = savedLevelProgress;
      });
    },

    async getLeaderboards() {
      if (!this.ysdk || !this.ysdk.getLeaderboards) return null;
      if (this.leaderboards) return this.leaderboards;
      try {
        this.leaderboards = await this.ysdk.getLeaderboards();
        return this.leaderboards;
      } catch (error) {
        this.leaderboards = null;
        return null;
      }
    },

    async getPayments() {
      if (!this.ysdk || !this.ysdk.getPayments) return null;
      if (this.payments) return this.payments;
      try {
        this.payments = await this.ysdk.getPayments();
        return this.payments;
      } catch (error) {
        this.payments = null;
        return null;
      }
    },

    async loadCoinPurchaseCatalog() {
      const payments = await this.getPayments();
      if (!payments || !payments.getCatalog || !this.game || !this.game.setCoinPurchaseCatalog) return false;
      try {
        const catalog = await payments.getCatalog();
        const products = Array.isArray(catalog) ? catalog : (catalog && catalog.products) || [];
        this.game.setCoinPurchaseCatalog(products);
        return true;
      } catch (error) {
        return false;
      }
    },

    async purchaseCoins(pack) {
      if (!pack || !pack.id || !this.game) return false;
      const payments = await this.getPayments();
      if (!payments || !payments.purchase) return false;
      try {
        const purchase = await payments.purchase({ id: pack.id });
        return this.applyPurchase(purchase || { productID: pack.id });
      } catch (error) {
        return false;
      }
    },

    isRewardedAdAvailable() {
      return !!(this.ysdk && this.ysdk.adv && this.ysdk.adv.showRewardedVideo);
    },

    showRewardedAd() {
      if (!this.isRewardedAdAvailable()) return Promise.resolve(false);
      return new Promise((resolve) => {
        let rewarded = false;
        this.pauseAudioForSystem();
        try {
          this.ysdk.adv.showRewardedVideo({
            callbacks: {
              onOpen: () => this.pauseAudioForSystem(),
              onRewarded: () => {
                rewarded = true;
              },
              onClose: () => {
                this.resumeAudioFromSystem();
                resolve(rewarded);
              },
              onError: () => {
                this.resumeAudioFromSystem();
                resolve(false);
              }
            }
          });
        } catch (error) {
          this.resumeAudioFromSystem();
          resolve(false);
        }
      });
    },

    showInterstitialAd() {
      if (!this.ysdk || !this.ysdk.adv || !this.ysdk.adv.showFullscreenAdv) return Promise.resolve(false);
      return new Promise((resolve) => {
        this.pauseAudioForSystem();
        try {
          this.ysdk.adv.showFullscreenAdv({
            callbacks: {
              onOpen: () => {
                this.pauseAudioForSystem();
              },
              onClose: (wasShown) => {
                this.resumeAudioFromSystem();
                resolve(!!wasShown);
              },
              onError: () => {
                this.resumeAudioFromSystem();
                resolve(false);
              }
            }
          });
        } catch (error) {
          this.resumeAudioFromSystem();
          resolve(false);
        }
      });
    },

    async processPendingPurchases() {
      const payments = await this.getPayments();
      if (!payments || !payments.getPurchases || !this.game) return;
      try {
        const purchases = await payments.getPurchases();
        const list = Array.isArray(purchases) ? purchases : (purchases && purchases.purchases) || [];
        for (const purchase of list) {
          await this.applyPurchase(purchase);
        }
      } catch (error) {}
    },

    async applyPurchase(purchase) {
      if (!purchase || !this.game) return false;
      const productId = purchase.productID || purchase.productId || purchase.id;
      const payments = await this.getPayments();
      const rawToken = purchase.purchaseToken || purchase.token;
      const token = rawToken ? String(rawToken) : '';
      if (token && this.processedPurchaseTokens.indexOf(token) !== -1) {
        if (payments && payments.consumePurchase) {
          await payments.consumePurchase(rawToken).catch(() => {});
        }
        return true;
      }
      if (token && this.player && this.player.getData) {
        const cloud = await this.readCloudCoinsAndTokens();
        if (Array.isArray(cloud.coinPurchaseTokens) && cloud.coinPurchaseTokens.indexOf(token) !== -1) {
          this.processedPurchaseTokens = cloud.coinPurchaseTokens.slice(-50);
          this.saveLocalPurchaseTokens();
          if (Number.isFinite(cloud.coins)) this.applySyncedCoins(cloud.coins);
          if (payments && payments.consumePurchase) {
            await payments.consumePurchase(rawToken).catch(() => {});
          }
          return true;
        }
      }

      const pack = this.game.coinPurchasePackages.find((item) => item && item.id === productId);
      const purchasedCoins = pack ? Math.max(0, Math.floor(pack.coins || 0)) : 0;
      const beforeCoins = this.game.coins;
      const beforeDisplayCoins = this.game.displayCoins;
      if (!productId || !this.game.applyCoinPurchase(productId)) return false;
      const saved = await this.savePurchaseProgress(token, purchasedCoins);
      if (!saved && this.player && this.player.setData) {
        this.game.coins = beforeCoins;
        this.game.coinSyncBase = beforeCoins;
        this.game.displayCoins = Math.min(beforeDisplayCoins, beforeCoins);
        this.game.saveCoins({ cloud: false });
        return false;
      }
      if (payments && payments.consumePurchase && rawToken) {
        await payments.consumePurchase(rawToken).catch(() => {});
      }
      return true;
    },

    async savePurchaseProgress(token, coinDelta) {
      if (!this.game) return false;
      const coins = Math.max(0, Math.floor(this.game.coins || 0));
      this.pendingCoinSave = null;
      this.pendingCoinDelta = 0;
      this.pendingCoinForceValue = false;
      window.clearTimeout(this.coinSaveTimer);
      const tokens = token && this.processedPurchaseTokens.indexOf(token) === -1
        ? this.processedPurchaseTokens.concat(token).slice(-50)
        : this.processedPurchaseTokens.slice(-50);
      try {
        window.localStorage.setItem('crystal-match-coins', String(coins));
      } catch (error) {}
      if (!this.isServerBackedPlayer()) {
        this.processedPurchaseTokens = tokens;
        this.saveLocalPurchaseTokens();
        return true;
      }
      try {
        await this.player.setData(this.buildCloudProgressPayload({ coins, coinPurchaseTokens: tokens }), true);
        this.processedPurchaseTokens = tokens;
        this.saveLocalPurchaseTokens();
        this.applySyncedCoins(coins);
        return true;
      } catch (error) {
        return false;
      }
    },

    submitLeaderboardScore(score) {
      const value = Math.max(0, Math.floor(score || 0));
      this.saveLocalBestScore(value);
      const submitValue = Math.max(value, this.loadLocalBestScore());
      return this.getLeaderboards().then((leaderboards) => {
        if (!leaderboards || !leaderboards.setLeaderboardScore) return;
        return leaderboards.setLeaderboardScore(this.leaderboardName, submitValue).catch(() => {});
      });
    },

    submitStarsLeaderboard(stars) {
      const value = Math.max(0, Math.floor(stars || 0));
      if (value <= 0) return Promise.resolve();
      return this.getLeaderboards().then((leaderboards) => {
        if (!leaderboards || !leaderboards.setLeaderboardScore) return;
        return leaderboards.setLeaderboardScore(this.starsLeaderboardName, value).catch(() => {});
      });
    },

    submitXpLeaderboard(xp) {
      const value = Math.max(0, Math.floor(xp || 0));
      if (value <= 0) return Promise.resolve();
      return this.getLeaderboards().then((leaderboards) => {
        if (!leaderboards || !leaderboards.setLeaderboardScore) return;
        return leaderboards.setLeaderboardScore(this.xpLeaderboardName, value).catch(() => {});
      });
    },

    saveLocalBestScore(score) {
      try {
        const current = Number(window.localStorage.getItem(this.localBestScoreKey) || 0);
        if (!Number.isFinite(current) || score > current) {
          window.localStorage.setItem(this.localBestScoreKey, String(score));
        }
      } catch (error) {}
    },

    loadLocalBestScore() {
      try {
        const score = Number(window.localStorage.getItem(this.localBestScoreKey) || 0);
        return Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
      } catch (error) {
        return 0;
      }
    },

    async openLeaderboard(type) {
      if (!this.game) return;
      const tab = type === 'endless' ? 'endless' : 'stars';
      const leaderboardName = tab === 'stars' ? this.starsLeaderboardName : this.leaderboardName;
      const fallbackScore = tab === 'stars'
        ? (this.game.totalLevelStars ? this.game.totalLevelStars() : 0)
        : Math.max(this.game.score, this.loadLocalBestScore());
      const leaderboards = await this.getLeaderboards();
      if (!leaderboards || !leaderboards.getLeaderboardEntries) {
        this.game.setLeaderboardEntries([{
          rank: 1,
          name: 'Archi',
          score: fallbackScore,
          isPlayer: true
        }]);
        return;
      }
      try {
        const result = await leaderboards.getLeaderboardEntries(leaderboardName, {
          quantityTop: 10,
          includeUser: true,
          quantityAround: 2
        });
        this.game.setLeaderboardEntries(this.mapLeaderboardEntries(result));
      } catch (error) {
        this.game.setLeaderboardError(this.t('leaderboard.yandexOnly'));
      }
    },

    async openXpLeaderboard(xp) {
      if (!this.game) return;
      const value = Math.max(0, Math.floor(xp || 0));
      const leaderboards = await this.getLeaderboards();
      if (!leaderboards || !leaderboards.getLeaderboardEntries) {
        this.game.setXpLeaderboardEntries([{
          rank: 1,
          name: this.game.playerName || this.t('leaderboard.player'),
          score: value,
          isPlayer: true
        }]);
        return;
      }
      try {
        if (leaderboards.setLeaderboardScore && value > 0) {
          await leaderboards.setLeaderboardScore(this.xpLeaderboardName, value).catch(() => {});
        }
        const result = await leaderboards.getLeaderboardEntries(this.xpLeaderboardName, {
          quantityTop: 30,
          includeUser: true,
          quantityAround: 1
        });
        this.game.setXpLeaderboardEntries(this.mapLeaderboardEntries(result));
      } catch (error) {
        this.game.setXpLeaderboardError(this.t('leaderboard.yandexOnly'));
      }
    },

    mapLeaderboardEntries(result) {
      return (result && result.entries || []).map((entry) => ({
        rank: entry.rank,
        name: entry.player && (entry.player.publicName || entry.player.uniqueID) ? (entry.player.publicName || entry.player.uniqueID) : this.t('leaderboard.player'),
        score: entry.score || 0,
        isPlayer: !!entry.isUser
      }));
    },

    async loadGameOverLeaderboard(score, type) {
      if (!this.game) return;
      const starsMode = type === 'stars';
      const value = Math.max(0, Math.floor(score || 0));
      const submitValue = starsMode ? value : Math.max(value, this.loadLocalBestScore());
      const leaderboardName = starsMode ? this.starsLeaderboardName : this.leaderboardName;
      const leaderboards = await this.getLeaderboards();
      if (!leaderboards || !leaderboards.getLeaderboardEntries) {
        this.game.setGameOverLeaderboardEntries([{
          rank: 1,
          name: this.game.playerName || this.t('leaderboard.player'),
          score: submitValue,
          isPlayer: true
        }]);
        return;
      }
      try {
        if (leaderboards.setLeaderboardScore) {
          await leaderboards.setLeaderboardScore(leaderboardName, submitValue).catch(() => {});
        }
        const result = await leaderboards.getLeaderboardEntries(leaderboardName, {
          quantityTop: starsMode ? 1 : 5,
          includeUser: true,
          quantityAround: starsMode ? 1 : 2
        });
        this.game.setGameOverLeaderboardEntries(this.mapLeaderboardEntries(result));
      } catch (error) {
        this.game.setGameOverLeaderboardError(this.t('leaderboard.yandexOnly'));
      }
    },

    openDeveloperGames() {
      if (!this.ysdk || !this.ysdk.features || !this.ysdk.features.GamesAPI || !this.ysdk.features.GamesAPI.getAllGames) {
        return;
      }
      this.ysdk.features.GamesAPI.getAllGames()
        .then((result) => {
          const url = result && result.developerURL;
          if (!url) return;
          window.open(url, '_blank', 'noopener');
        })
        .catch(() => {});
    },

    resize() {
      if (!this.renderer) return;
      const rawDpr = window.devicePixelRatio || 1;
      const profile = this.qualityProfile || this.makePerformanceProfile();
      const dpr = Math.min(rawDpr, profile.dprCap);
      const width = Math.max(320, window.innerWidth);
      const height = Math.max(360, window.innerHeight);
      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.renderer.resize(width, height, dpr);
    },

    isMobileLike() {
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    },

    makePerformanceProfile() {
      const mobile = this.isMobileLike();
      const width = window.innerWidth || 0;
      const smallScreen = width > 0 && width <= 620;
      const level = Math.max(0, Math.min(2, this.qualityLevel));
      const mobileCaps = [
        { dprCap: 1.15, panelBlur: 10, shadowScale: 0.52, decorStep: 100, effects: 54, coinFlights: 5, coinBursts: 5, effectDensity: 0.72 },
        { dprCap: 1.45, panelBlur: 14, shadowScale: 0.68, decorStep: 75, effects: 78, coinFlights: 7, coinBursts: 7, effectDensity: 0.84 },
        { dprCap: 1.75, panelBlur: 18, shadowScale: 0.82, decorStep: 55, effects: 108, coinFlights: 9, coinBursts: 9, effectDensity: 0.95 }
      ];
      const desktopCaps = [
        { dprCap: 1.35, panelBlur: 12, shadowScale: 0.62, decorStep: 75, effects: 90, coinFlights: 8, coinBursts: 8, effectDensity: 0.84 },
        { dprCap: 1.8, panelBlur: 20, shadowScale: 0.78, decorStep: 45, effects: 130, coinFlights: 11, coinBursts: 11, effectDensity: 0.94 },
        { dprCap: 2.25, panelBlur: 28, shadowScale: 1, decorStep: 0, effects: 180, coinFlights: 14, coinBursts: 14, effectDensity: 1 }
      ];
      const base = (mobile || smallScreen ? mobileCaps : desktopCaps)[level];
      return Object.assign({ level, mobile: mobile || smallScreen }, base);
    },

    applyPerformanceProfile(forceResize) {
      this.qualityProfile = this.makePerformanceProfile();
      if (this.game && this.game.setPerformanceQuality) this.game.setPerformanceQuality(this.qualityProfile);
      if (this.renderer && this.renderer.setPerformanceQuality) this.renderer.setPerformanceQuality(this.qualityProfile);
      if (forceResize) this.resize();
    },

    updateAdaptiveQuality(time) {
      const mobile = this.isMobileLike() || !!(this.qualityProfile && this.qualityProfile.mobile);
      if (!this.fpsWindowStart) {
        this.fpsWindowStart = time;
        this.fpsFrameCount = 0;
        return;
      }
      this.fpsFrameCount += 1;
      const elapsed = time - this.fpsWindowStart;
      if (elapsed < 2600) return;
      const fps = this.fpsFrameCount * 1000 / elapsed;
      this.fpsWindowStart = time;
      this.fpsFrameCount = 0;
      const slowFps = mobile ? 43 : 39;
      const fastFps = mobile ? 55 : 56;
      const slowWindowsNeeded = mobile ? 2 : 3;
      const fastWindowsNeeded = mobile ? 5 : 7;
      this.fpsSlowWindows = fps < slowFps ? this.fpsSlowWindows + 1 : 0;
      this.fpsFastWindows = fps > fastFps ? this.fpsFastWindows + 1 : 0;
      if (this.fpsSlowWindows >= slowWindowsNeeded && this.qualityLevel > 0) {
        this.qualityLevel -= 1;
        this.fpsSlowWindows = 0;
        this.fpsFastWindows = 0;
        this.applyPerformanceProfile(true);
      } else if (this.fpsFastWindows >= fastWindowsNeeded && this.qualityLevel < 2) {
        this.qualityLevel += 1;
        this.fpsSlowWindows = 0;
        this.fpsFastWindows = 0;
        this.applyPerformanceProfile(true);
      }
    },

    loop(time) {
      const dt = Math.min(32, time - (this.lastTime || time));
      this.lastTime = time;
      this.updateAdaptiveQuality(time);
      this.game.update(dt);
      this.renderer.render(time);
      requestAnimationFrame((nextTime) => this.loop(nextTime));
    }
  };

  window.CrystalMatchPlatform = Platform;
})();

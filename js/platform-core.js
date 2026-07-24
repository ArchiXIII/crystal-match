(function () {
  'use strict';

  const Platform = {
    canvas: null,
    game: null,
    renderer: null,
    input: null,
    audio: null,
    adapterName: 'local',
    lastTime: 0,
    lang: 'ru',
    qualityLevel: 2,
    qualityProfile: null,
    fpsWindowStart: 0,
    fpsFrameCount: 0,
    fpsSlowWindows: 0,
    fpsFastWindows: 0,
    backGuardBound: false,
    backGuardDepth: 0,

    registerAdapter(adapter) {
      const source = adapter && typeof adapter === 'object' ? adapter : {};
      this.adapterName = String(source.name || 'local');
      Object.keys(source).forEach((key) => {
        if (key !== 'name') this[key] = source[key];
      });
      return this;
    },

    async boot() {
      this.canvas = document.getElementById('gameCanvas');
      this.bindInteractionGuards();
      this.bindBackButtonGuard();
      if (this.initPlatform) await this.initPlatform();
      if (this.ensureStickyBanner) this.ensureStickyBanner();
      this.lang = this.detectLanguage ? this.detectLanguage() : this.detectBrowserLanguage();
      if (window.CrystalMatchI18n) window.CrystalMatchI18n.setLanguage(this.lang);
      if (this.notifyGameReady) this.notifyGameReady();
      if (this.loadPlayer) await this.loadPlayer();
      const savedProgress = this.loadCloudProgress ? await this.loadCloudProgress() || {} : {};
      const serverBackedProgress = !!savedProgress.cloudDataLoaded && !!(this.isServerBackedPlayer && this.isServerBackedPlayer());
      this.processedPurchaseTokens = Array.isArray(savedProgress.coinPurchaseTokens)
        ? savedProgress.coinPurchaseTokens
        : (this.loadLocalPurchaseTokens ? this.loadLocalPurchaseTokens() : []);
      const playerName = this.getPlayerDisplayName ? this.getPlayerDisplayName() : this.t('leaderboard.player');
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
        saveCoins: this.adapterCallback('saveCloudCoins'),
        saveRankXp: this.adapterCallback('saveCloudRankXp'),
        saveDailyBonus: this.adapterCallback('saveCloudDailyBonus'),
        saveAdBonus: this.adapterCallback('saveCloudAdBonus'),
        saveLevelProgress: this.adapterCallback('saveCloudLevelProgress'),
        submitScore: this.adapterCallback('submitLeaderboardScore'),
        submitStars: this.adapterCallback('submitStarsLeaderboard'),
        openLeaderboard: this.adapterCallback('openLeaderboard'),
        openXpLeaderboard: this.adapterCallback('openXpLeaderboard'),
        openDeveloperGames: this.adapterCallback('openDeveloperGames'),
        loadGameOverLeaderboard: this.adapterCallback('loadGameOverLeaderboard'),
        purchaseCoins: this.adapterCallback('purchaseCoins'),
        showRewardedAd: this.adapterCallback('showRewardedAd'),
        isRewardedAdAvailable: this.adapterCallback('isRewardedAdAvailable'),
        showInterstitialAd: this.adapterCallback('showInterstitialAd')
      });
      this.renderer = new CrystalMatchRenderer(this.canvas, this.game);
      this.input = new CrystalMatchInput(this.canvas, this.game, this.renderer);
      this.applyPerformanceProfile(true);
      this.callAdapter('loadCoinPurchaseCatalog');
      this.callAdapter('processPendingPurchases');
      this.bindRuntimeEvents();
      if (this.bindPlatformEvents) this.bindPlatformEvents();
      requestAnimationFrame((time) => this.loop(time));
    },

    callAdapter(method) {
      const fn = this[method];
      if (typeof fn !== 'function') return null;
      const args = Array.prototype.slice.call(arguments, 1);
      return fn.apply(this, args);
    },

    adapterCallback(method) {
      if (typeof this[method] !== 'function') return null;
      return (...args) => this[method].apply(this, args);
    },

    bindRuntimeEvents() {
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
      window.addEventListener('orientationchange', () => this.resize(), { passive: true });
      window.addEventListener('pagehide', () => {
        this.flushPersistence();
        this.pauseAudioForSystem();
      }, { passive: true });
      window.addEventListener('beforeunload', () => this.flushPersistence(), { passive: true });
      window.addEventListener('blur', () => this.pauseAudioForSystem(), { passive: true });
      window.addEventListener('focus', () => {
        this.resumeAudioFromSystem();
        this.callAdapter('refreshCloudCoins');
        this.callAdapter('ensureStickyBanner');
      }, { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseAudioForSystem();
          return;
        }
        this.resumeAudioFromSystem();
        this.callAdapter('refreshCloudCoins');
        this.callAdapter('ensureStickyBanner');
      }, { passive: true });
    },

    flushPersistence() {
      this.callAdapter('flushCloudCoins');
      this.callAdapter('flushCloudRankXp');
      this.callAdapter('flushCloudDailyBonus');
      this.callAdapter('flushCloudAdBonus');
      this.callAdapter('flushCloudLevelProgress');
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

    pauseAudioForSystem() {
      if (this.audio && this.audio.pauseForSystem) this.audio.pauseForSystem();
    },

    resumeAudioFromSystem() {
      if (this.audio && this.audio.resumeFromSystem) this.audio.resumeFromSystem();
    },

    detectBrowserLanguage() {
      const lang = navigator.language || (navigator.languages && navigator.languages[0]) || 'ru';
      return window.CrystalMatchI18n
        ? window.CrystalMatchI18n.normalize(lang)
        : (String(lang).toLowerCase().indexOf('ru') === 0 ? 'ru' : 'en');
    },

    t(key, params) {
      return window.CrystalMatchI18n ? window.CrystalMatchI18n.t(key, params) : key;
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

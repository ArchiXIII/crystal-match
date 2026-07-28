(function () {
  'use strict';

  const config = window.CrystalMatchPlatformConfig || {};
  const Adapter = {
    name: 'vk',
    vkBridge: null,
    vkUser: null,
    vkLaunchParams: null,
    rawLaunchParams: '',
    backendClient: null,
    vkApiToken: '',
    vkApiTokenPromise: null,
    nativeLeaderboardSubmitInFlight: null,
    lastNativeLeaderboardScore: 0,
    pendingNativeLeaderboardScore: 0,
    bridgeListener: null,
    features: config.features || {},
    storageKey: config.storageKey || 'crystalProgress',
    purchaseEventsLocalKey: config.purchaseEventsLocalKey || 'crystal-match-vk-purchase-events',
    localBestScoreKey: config.localBestScoreKey || 'crystal-match-vk-best-score',
    storageAvailable: false,
    cloudProgress: null,
    cloudDirty: false,
    cloudRevision: 0,
    cloudSaveTimer: null,
    cloudSaveDueAt: 0,
    cloudSaveInFlight: false,
    cloudSavePromise: null,
    lastStoredValue: '',
    cloudRetryDelay: 4000,
    adInFlight: false,
    purchaseInFlight: false,
    purchaseEventsInFlight: false,
    purchaseBackendReady: null,
    appliedPurchaseEventIds: [],
    purchaseAwaitingConfirmation: false,
    leaderboardSyncInFlight: null,
    lastLeaderboardSyncValues: '',

    async initPlatform() {
      this.rawLaunchParams = String(window.location.search || '').replace(/^\?/, '');
      const source = window.vkBridge && (window.vkBridge.default || window.vkBridge);
      this.vkBridge = source && typeof source.send === 'function' ? source : null;
      if (!this.vkBridge) return;
      if (typeof this.vkBridge.isEmbedded === 'function' && !this.vkBridge.isEmbedded()) {
        this.vkBridge = null;
        return;
      }
      try {
        await this.vkBridge.send('VKWebAppInit');
      } catch (error) {
        this.vkBridge = null;
        return;
      }
      try {
        this.vkLaunchParams = await this.vkBridge.send('VKWebAppGetLaunchParams');
      } catch (error) {
        this.vkLaunchParams = null;
      }
      if (window.CrystalMatchVkBackendClient) {
        this.backendClient = new window.CrystalMatchVkBackendClient({
          baseUrl: config.backendUrl,
          timeout: 3000,
          getLaunchParams: () => this.rawLaunchParams
        });
      }
    },

    bindPlatformEvents() {
      if (!this.vkBridge || typeof this.vkBridge.subscribe !== 'function' || this.bridgeListener) return;
      this.bridgeListener = (event) => {
        const type = event && event.detail ? event.detail.type : '';
        if (type === 'VKWebAppViewHide') {
          this.flushCloudProgress();
          this.pauseAudioForSystem();
          return;
        }
        if (type === 'VKWebAppViewRestore') {
          this.resumeAudioFromSystem();
          this.refreshCloudCoins();
        }
      };
      this.vkBridge.subscribe(this.bridgeListener);
    },

    async loadPlayer() {
      this.vkUser = null;
      if (!this.vkBridge) return;
      try {
        this.vkUser = await this.vkBridge.send('VKWebAppGetUserInfo');
      } catch (error) {}
    },

    detectLanguage() {
      const params = new URLSearchParams(window.location.search || '');
      const launchLanguage = this.vkLaunchParams && this.vkLaunchParams.vk_language;
      const lang = launchLanguage || params.get('vk_language') || params.get('lang') || '';
      return lang && window.CrystalMatchI18n
        ? window.CrystalMatchI18n.normalize(lang)
        : this.detectBrowserLanguage();
    },

    getPlayerDisplayName() {
      const user = this.vkUser || {};
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      return name || this.t('leaderboard.player');
    },

    isServerBackedPlayer() {
      return !!(this.vkBridge && this.storageAvailable);
    },

    normalizeDailyBonus(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        streak: Math.max(0, Math.floor(Number(source.streak) || 0)),
        lastClaimDate: String(source.lastClaimDate || ''),
        adClaimedDate: String(source.adClaimedDate || '')
      };
    },

    normalizeAdBonus(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        lastClaimAt: Math.max(0, Math.floor(Number(source.lastClaimAt) || 0))
      };
    },

    normalizeSettings(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        soundOn: source.soundOn !== false
      };
    },

    normalizeBoosters(value) {
      const source = value && typeof value === 'object' ? value : {};
      const boosters = {};
      Object.keys(source).forEach((key) => {
        const count = Math.max(0, Math.floor(Number(source[key]) || 0));
        if (count > 0) boosters[String(key)] = count;
      });
      return boosters;
    },

    normalizePurchaseEventIds(value) {
      if (!Array.isArray(value)) return [];
      const result = [];
      const seen = new Set();
      value.forEach((item) => {
        const id = this.purchaseEventStorageId(item);
        if (!id || seen.has(id)) return;
        seen.add(id);
        result.push(id);
      });
      return result.slice(-100);
    },

    purchaseEventStorageId(value) {
      const source = String(value || '');
      if (!source) return '';
      if (/^h:[0-9a-f]{16}$/.test(source)) return source;
      let first = 2166136261;
      let second = 2246822507;
      for (let index = 0; index < source.length; index += 1) {
        const code = source.charCodeAt(index);
        first = Math.imul(first ^ code, 16777619);
        second = Math.imul(second ^ code, 3266489917);
      }
      return 'h:' +
        (first >>> 0).toString(16).padStart(8, '0') +
        (second >>> 0).toString(16).padStart(8, '0');
    },

    loadLocalPurchaseEventIds() {
      try {
        return this.normalizePurchaseEventIds(JSON.parse(window.localStorage.getItem(this.purchaseEventsLocalKey) || '[]'));
      } catch (error) {
        return [];
      }
    },

    saveLocalPurchaseEventIds() {
      try {
        window.localStorage.setItem(
          this.purchaseEventsLocalKey,
          JSON.stringify(this.normalizePurchaseEventIds(this.appliedPurchaseEventIds))
        );
        return true;
      } catch (error) {
        return false;
      }
    },

    loadLocalBestScore() {
      try {
        const value = Number(window.localStorage.getItem(this.localBestScoreKey));
        return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      } catch (error) {
        return 0;
      }
    },

    saveLocalBestScore(score) {
      const value = Math.max(0, Math.floor(Number(score) || 0));
      try {
        window.localStorage.setItem(this.localBestScoreKey, String(value));
      } catch (error) {}
      return value;
    },

    normalizeLevelProgress(value) {
      const source = value && typeof value === 'object' ? value : {};
      const stars = {};
      const rawStars = source.stars && typeof source.stars === 'object' ? source.stars : {};
      Object.keys(rawStars).forEach((key) => {
        const level = Math.max(1, Math.floor(Number(key) || 0));
        const count = Math.max(0, Math.min(3, Math.floor(Number(rawStars[key]) || 0)));
        if (level > 0 && count > 0) stars[level] = count;
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

    normalizeCloudProgress(value) {
      const source = value && typeof value === 'object' ? value : {};
      const progress = {};
      const coins = Number(source.coins);
      const rankXp = Number(source.rankXp);
      const endlessBestScore = Number(source.endlessBestScore);
      if (Number.isFinite(coins) && coins >= 0) progress.coins = Math.floor(coins);
      if (Number.isFinite(rankXp) && rankXp >= 0) progress.rankXp = Math.floor(rankXp);
      if (Number.isFinite(endlessBestScore) && endlessBestScore >= 0) progress.endlessBestScore = Math.floor(endlessBestScore);
      if (source.dailyBonus && typeof source.dailyBonus === 'object') progress.dailyBonus = this.normalizeDailyBonus(source.dailyBonus);
      if (source.adBonus && typeof source.adBonus === 'object') progress.adBonus = this.normalizeAdBonus(source.adBonus);
      if (source.levelProgress && typeof source.levelProgress === 'object') progress.levelProgress = this.normalizeLevelProgress(source.levelProgress);
      if (source.settings && typeof source.settings === 'object') progress.settings = this.normalizeSettings(source.settings);
      progress.boosters = this.normalizeBoosters(source.boosters);
      progress.appliedPurchaseEventIds = this.normalizePurchaseEventIds(source.appliedPurchaseEventIds);
      return progress;
    },

    async readStoredProgress() {
      if (!this.vkBridge) return null;
      const response = await this.vkBridge.send('VKWebAppStorageGet', { keys: [this.storageKey] });
      const entries = response && Array.isArray(response.keys) ? response.keys : [];
      const entry = entries.find((item) => item && item.key === this.storageKey);
      const raw = entry ? String(entry.value || '') : '';
      let value = {};
      if (raw) value = JSON.parse(raw);
      return { raw, progress: this.normalizeCloudProgress(value) };
    },

    async loadCloudProgress() {
      if (!this.vkBridge) return {};
      try {
        const stored = await this.readStoredProgress();
        this.storageAvailable = true;
        this.cloudProgress = stored.progress;
        this.cloudProgress.endlessBestScore = Math.max(
          Math.max(0, Math.floor(Number(this.cloudProgress.endlessBestScore) || 0)),
          this.loadLocalBestScore()
        );
        this.appliedPurchaseEventIds = stored.raw
          ? this.normalizePurchaseEventIds(this.cloudProgress.appliedPurchaseEventIds)
          : this.loadLocalPurchaseEventIds();
        this.cloudProgress.appliedPurchaseEventIds = this.appliedPurchaseEventIds.slice();
        this.saveLocalPurchaseEventIds();
        this.saveLocalBestScore(this.cloudProgress.endlessBestScore);
        this.lastStoredValue = stored.raw;
        return Object.assign({
          cloudDataLoaded: true,
          coinPurchaseTokens: []
        }, stored.progress);
      } catch (error) {
        this.storageAvailable = false;
        this.cloudProgress = null;
        return {};
      }
    },

    buildCloudProgress() {
      const source = this.cloudProgress || {};
      const game = this.game;
      return {
        coins: Math.max(0, Math.floor(Number.isFinite(source.coins) ? source.coins : (game ? game.coins : 5000))),
        rankXp: Math.max(0, Math.floor(Number.isFinite(source.rankXp) ? source.rankXp : (game ? game.rankXp : 0))),
        endlessBestScore: Math.max(0, Math.floor(Number(source.endlessBestScore) || 0)),
        dailyBonus: this.normalizeDailyBonus(source.dailyBonus || (game && game.dailyBonus)),
        adBonus: this.normalizeAdBonus(source.adBonus || (game && game.adBonus)),
        settings: this.normalizeSettings(source.settings || (game && game.settings)),
        boosters: this.normalizeBoosters(source.boosters),
        appliedPurchaseEventIds: this.normalizePurchaseEventIds(
          this.appliedPurchaseEventIds.length ? this.appliedPurchaseEventIds : source.appliedPurchaseEventIds
        ),
        levelProgress: this.normalizeLevelProgress(source.levelProgress || (game ? {
          highestUnlockedLevel: game.highestUnlockedLevel,
          stars: game.levelStars,
          chapterTrophies: game.levelChapterTrophies
        } : null))
      };
    },

    initializeCloudProgressFromGame() {
      if (!this.game || !this.isServerBackedPlayer()) return false;
      const source = this.cloudProgress || {};
      this.applyStoredProgress(source);
      this.cloudProgress = this.buildCloudProgress();
      this.cloudProgress.endlessBestScore = Math.max(
        this.cloudProgress.endlessBestScore,
        this.loadLocalBestScore()
      );
      this.cloudProgress.boosters = this.normalizeBoosters(source.boosters);
      this.cloudProgress.appliedPurchaseEventIds = this.normalizePurchaseEventIds(this.appliedPurchaseEventIds);
      this.markCloudDirty(0);
      return true;
    },

    markCloudDirty(delay) {
      if (!this.isServerBackedPlayer()) return;
      this.cloudDirty = true;
      this.cloudRevision += 1;
      this.scheduleCloudSave(delay);
    },

    scheduleCloudSave(delay) {
      if (!this.cloudDirty || !this.isServerBackedPlayer()) return;
      const wait = Math.max(0, Math.floor(Number(delay) || 0));
      const dueAt = Date.now() + wait;
      if (this.cloudSaveTimer && this.cloudSaveDueAt <= dueAt) return;
      window.clearTimeout(this.cloudSaveTimer);
      this.cloudSaveDueAt = dueAt;
      this.cloudSaveTimer = window.setTimeout(() => {
        this.cloudSaveTimer = null;
        this.cloudSaveDueAt = 0;
        this.flushCloudProgress();
      }, wait);
    },

    flushCloudProgress() {
      if (!this.isServerBackedPlayer()) return Promise.resolve(false);
      if (this.cloudSaveInFlight) return this.cloudSavePromise || Promise.resolve(false);
      window.clearTimeout(this.cloudSaveTimer);
      this.cloudSaveTimer = null;
      this.cloudSaveDueAt = 0;
      if (!this.cloudDirty) return Promise.resolve(true);
      const revision = this.cloudRevision;
      const payload = this.buildCloudProgress();
      const value = JSON.stringify(payload);
      this.cloudProgress = payload;
      this.cloudDirty = false;
      if (value === this.lastStoredValue) return Promise.resolve(true);
      this.cloudSaveInFlight = true;
      let saveFailed = false;
      this.cloudSavePromise = this.vkBridge.send('VKWebAppStorageSet', {
        key: this.storageKey,
        value
      }).then(() => {
        this.lastStoredValue = value;
        return true;
      }).catch(() => {
        saveFailed = true;
        this.cloudDirty = true;
        return false;
      }).finally(() => {
        this.cloudSaveInFlight = false;
        this.cloudSavePromise = null;
        if (this.cloudDirty || this.cloudRevision !== revision) {
          this.cloudDirty = true;
          this.scheduleCloudSave(saveFailed ? this.cloudRetryDelay : 0);
        }
      });
      return this.cloudSavePromise;
    },

    async flushCloudProgressFully() {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const saved = await this.flushCloudProgress();
        if (!saved) return false;
        if (!this.cloudDirty && !this.cloudSaveInFlight) return true;
      }
      return !this.cloudDirty && !this.cloudSaveInFlight;
    },

    saveCloudCoins(coins, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.coins = Math.max(0, Math.floor(Number(coins) || 0));
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate || info.forceValue ? 0 : 450);
    },

    saveCloudRankXp(rankXp, force) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.rankXp = Math.max(0, Math.floor(Number(rankXp) || 0));
      this.markCloudDirty(force ? 0 : 30000);
    },

    saveCloudDailyBonus(dailyBonus, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.dailyBonus = this.normalizeDailyBonus(dailyBonus);
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate ? 0 : 350);
    },

    saveCloudAdBonus(adBonus, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.adBonus = this.normalizeAdBonus(adBonus);
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate ? 0 : 350);
    },

    saveCloudLevelProgress(levelProgress, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.levelProgress = this.normalizeLevelProgress(levelProgress);
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate ? 0 : 500);
    },

    saveCloudSettings(settings, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.settings = this.normalizeSettings(settings);
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate ? 0 : 350);
    },

    flushCloudCoins() {
      return this.flushCloudProgress();
    },

    flushCloudRankXp() {
      return this.flushCloudProgress();
    },

    flushCloudDailyBonus() {
      return this.flushCloudProgress();
    },

    flushCloudAdBonus() {
      return this.flushCloudProgress();
    },

    flushCloudLevelProgress() {
      return this.flushCloudProgress();
    },

    flushCloudSettings() {
      return this.flushCloudProgress();
    },

    applyStoredProgress(progress) {
      if (!this.game || !progress) return;
      if (Number.isFinite(progress.coins)) {
        const coins = Math.max(0, Math.floor(progress.coins));
        this.game.coins = coins;
        this.game.displayCoins = coins;
        this.game.coinSyncBase = coins;
        try {
          window.localStorage.setItem(this.game.coinStorageKey, String(coins));
        } catch (error) {}
      }
      if (Number.isFinite(progress.rankXp)) {
        const rankXp = Math.max(0, Math.floor(progress.rankXp));
        this.game.rankXp = rankXp;
        try {
          window.localStorage.setItem(this.game.rankXpStorageKey, String(rankXp));
        } catch (error) {}
      }
      if (progress.dailyBonus) {
        this.game.dailyBonus = this.game.normalizeDailyBonus(progress.dailyBonus);
        this.game.saveDailyBonus({ cloud: false });
      }
      if (progress.adBonus) {
        this.game.adBonus = this.game.normalizeAdBonus(progress.adBonus);
        this.game.saveAdBonus({ cloud: false });
      }
      if (progress.levelProgress && this.game.normalizeLevelProgress) {
        const levelProgress = this.game.normalizeLevelProgress(progress.levelProgress);
        this.game.highestUnlockedLevel = levelProgress.highestUnlockedLevel;
        this.game.levelStars = levelProgress.stars;
        this.game.levelChapterTrophies = levelProgress.chapterTrophies || {};
        this.game.saveLevelProgress({ cloud: false });
      }
      if (progress.settings && this.game.normalizeSettings) {
        this.game.settings = this.game.normalizeSettings(progress.settings);
        this.game.soundOn = this.game.settings.soundOn;
        if (this.game.audio && this.game.audio.setEnabled) this.game.audio.setEnabled(this.game.soundOn);
        this.game.saveSettings({ cloud: false });
      }
      if (Number.isFinite(progress.endlessBestScore)) {
        this.saveLocalBestScore(progress.endlessBestScore);
      }
      if (Array.isArray(progress.appliedPurchaseEventIds)) {
        this.appliedPurchaseEventIds = this.normalizePurchaseEventIds(progress.appliedPurchaseEventIds);
        this.saveLocalPurchaseEventIds();
      }
    },

    async refreshCloudCoins() {
      if (!this.isServerBackedPlayer() || this.cloudDirty || this.cloudSaveInFlight) return;
      try {
        const stored = await this.readStoredProgress();
        this.cloudProgress = stored.progress;
        this.lastStoredValue = stored.raw;
        this.appliedPurchaseEventIds = this.normalizePurchaseEventIds(stored.progress.appliedPurchaseEventIds);
        this.applyStoredProgress(stored.progress);
      } catch (error) {}
    },

    submitLeaderboardScore(score) {
      const value = Math.max(0, Math.floor(Number(score) || 0));
      if (!value) return false;
      if (!this.cloudProgress) this.cloudProgress = {};
      const current = Math.max(0, Math.floor(Number(this.cloudProgress.endlessBestScore) || 0));
      if (value <= current) return false;
      this.cloudProgress.endlessBestScore = value;
      this.pendingNativeLeaderboardScore = Math.max(this.pendingNativeLeaderboardScore, value);
      this.saveLocalBestScore(value);
      this.markCloudDirty(450);
      return true;
    },

    isRewardedAdAvailable() {
      return !!(this.vkBridge && !this.adInFlight);
    },

    showVkAd(format) {
      if (!this.vkBridge || this.adInFlight) return Promise.resolve(false);
      this.adInFlight = true;
      this.pauseAudioForSystem();
      return this.vkBridge.send('VKWebAppShowNativeAds', {
        ad_format: format
      }).then((response) => !!(response && response.result))
        .catch(() => false)
        .finally(() => {
          this.adInFlight = false;
          this.resumeAudioFromSystem();
        });
    },

    showRewardedAd() {
      return this.showVkAd('reward');
    },

    showInterstitialAd() {
      return this.showVkAd('interstitial');
    }
  };

  Object.assign(Adapter, window.CrystalMatchVkBackendIntegration || {});

  if (window.CrystalMatchPlatform && window.CrystalMatchPlatform.registerAdapter) {
    window.CrystalMatchPlatform.registerAdapter(Adapter);
  }
})();

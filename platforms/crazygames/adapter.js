(function () {
  'use strict';

  const config = window.CrystalMatchPlatformConfig || {};
  const Adapter = {
    name: 'crazygames',
    sdk: null,
    sdkReady: false,
    dataAvailable: false,
    systemInfo: null,
    player: null,
    gameSettings: null,
    settingsListener: null,
    lastReportedProgress: -1,
    features: config.features || {},
    storageKey: config.storageKey || 'crystalProgress',
    localBestScoreKey: config.localBestScoreKey || 'crystal-match-crazygames-best-score',
    cloudProgress: null,
    cloudDirty: false,
    cloudSaveTimer: null,
    cloudSaveDueAt: 0,
    lastStoredValue: '',

    async initPlatform() {
      const source = window.CrazyGames && window.CrazyGames.SDK;
      this.sdk = source || null;
      if (!this.sdk || typeof this.sdk.init !== 'function') return;
      try {
        await this.sdk.init();
        this.sdkReady = true;
        this.systemInfo = this.sdk.user && this.sdk.user.systemInfo
          ? this.sdk.user.systemInfo
          : null;
        this.gameSettings = this.sdk.game && this.sdk.game.settings
          ? this.sdk.game.settings
          : null;
        this.dataAvailable = !!(
          this.sdk.data &&
          typeof this.sdk.data.getItem === 'function' &&
          typeof this.sdk.data.setItem === 'function'
        );
      } catch (error) {
        this.sdk = null;
        console.warn('[Crystal Match CrazyGames] SDK initialization failed');
      }
    },

    detectLanguage() {
      const locale = this.systemInfo && this.systemInfo.locale;
      return locale && window.CrystalMatchI18n
        ? window.CrystalMatchI18n.normalize(locale)
        : 'en';
    },

    async loadPlayer() {
      this.player = null;
      const userModule = this.sdkReady && this.sdk && this.sdk.user;
      if (!userModule || typeof userModule.getUser !== 'function') return;
      try {
        this.player = await userModule.getUser();
      } catch (error) {
        this.player = null;
      }
    },

    getPlayerDisplayName() {
      const username = this.player && String(this.player.username || '').trim();
      return username || this.t('leaderboard.player');
    },

    isServerBackedPlayer() {
      return this.sdkReady && this.dataAvailable;
    },

    bindPlatformEvents() {
      const gameModule = this.sdkReady && this.sdk && this.sdk.game;
      if (!gameModule) return;
      this.applyPlatformAudioSettings(this.gameSettings || gameModule.settings);
      if (typeof gameModule.addSettingsChangeListener !== 'function' || this.settingsListener) return;
      this.settingsListener = (settings) => this.applyPlatformAudioSettings(settings);
      gameModule.addSettingsChangeListener(this.settingsListener);
    },

    applyPlatformAudioSettings(settings) {
      this.gameSettings = settings && typeof settings === 'object' ? settings : {};
      this.setPlatformForcedAudioMuted(this.gameSettings.muteAudio === true);
    },

    notifyGameplayStart() {
      const gameModule = this.sdkReady && this.sdk && this.sdk.game;
      if (!gameModule || typeof gameModule.gameplayStart !== 'function') return;
      try {
        gameModule.gameplayStart();
      } catch (error) {
        console.warn('[Crystal Match CrazyGames] Gameplay start report failed');
      }
    },

    notifyGameplayStop() {
      const gameModule = this.sdkReady && this.sdk && this.sdk.game;
      if (!gameModule || typeof gameModule.gameplayStop !== 'function') return;
      try {
        gameModule.gameplayStop();
      } catch (error) {
        console.warn('[Crystal Match CrazyGames] Gameplay stop report failed');
      }
    },

    reportGameProgress(progress) {
      const gameModule = this.sdkReady && this.sdk && this.sdk.game;
      if (!gameModule || typeof gameModule.reportGameCompletedPercentage !== 'function') return false;
      const source = progress && typeof progress === 'object' ? progress : {};
      const stars = source.stars && typeof source.stars === 'object' ? source.stars : {};
      let completedLevel = 0;
      Object.keys(stars).forEach((key) => {
        if (Number(stars[key]) > 0) completedLevel = Math.max(completedLevel, Math.floor(Number(key) || 0));
      });
      const percentage = Math.max(0, Math.min(100, completedLevel));
      if (percentage === this.lastReportedProgress) return true;
      try {
        gameModule.reportGameCompletedPercentage(percentage);
        this.lastReportedProgress = percentage;
        return true;
      } catch (error) {
        console.warn('[Crystal Match CrazyGames] Progress report failed');
        return false;
      }
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
      const rawTrophies = source.chapterTrophies && typeof source.chapterTrophies === 'object'
        ? source.chapterTrophies
        : {};
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

    normalizeProgress(value) {
      const source = value && typeof value === 'object' ? value : {};
      const progress = {};
      const coins = Number(source.coins);
      const rankXp = Number(source.rankXp);
      const endlessBestScore = Number(source.endlessBestScore);
      if (Number.isFinite(coins) && coins >= 0) progress.coins = Math.floor(coins);
      if (Number.isFinite(rankXp) && rankXp >= 0) progress.rankXp = Math.floor(rankXp);
      if (Number.isFinite(endlessBestScore) && endlessBestScore >= 0) {
        progress.endlessBestScore = Math.floor(endlessBestScore);
      }
      if (source.dailyBonus && typeof source.dailyBonus === 'object') {
        progress.dailyBonus = this.normalizeDailyBonus(source.dailyBonus);
      }
      if (source.adBonus && typeof source.adBonus === 'object') {
        progress.adBonus = this.normalizeAdBonus(source.adBonus);
      }
      if (source.levelProgress && typeof source.levelProgress === 'object') {
        progress.levelProgress = this.normalizeLevelProgress(source.levelProgress);
      }
      if (source.settings && typeof source.settings === 'object') {
        progress.settings = this.normalizeSettings(source.settings);
      }
      return progress;
    },

    readLocalJson(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    },

    readLocalNumber(key) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null || raw === '') return null;
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
      } catch (error) {
        return null;
      }
    },

    buildLocalMigrationProgress() {
      const progress = {};
      const coins = this.readLocalNumber('crystal-match-coins');
      const rankXp = this.readLocalNumber('crystal-match-rank-xp');
      const endlessBestScore = this.readLocalNumber(this.localBestScoreKey);
      const dailyBonus = this.readLocalJson('crystal-match-daily-bonus');
      const adBonus = this.readLocalJson('crystal-match-ad-bonus');
      const levelProgress = this.readLocalJson('crystal-match-level-progress');
      const settings = this.readLocalJson('crystal-match-settings');
      if (coins !== null) progress.coins = coins;
      if (rankXp !== null) progress.rankXp = rankXp;
      if (endlessBestScore !== null) progress.endlessBestScore = endlessBestScore;
      if (dailyBonus) progress.dailyBonus = dailyBonus;
      if (adBonus) progress.adBonus = adBonus;
      if (levelProgress) progress.levelProgress = levelProgress;
      if (settings) progress.settings = settings;
      return this.normalizeProgress(progress);
    },

    async loadCloudProgress() {
      if (!this.isServerBackedPlayer()) return {};
      try {
        const raw = this.sdk.data.getItem(this.storageKey);
        const parsed = raw ? JSON.parse(String(raw)) : this.buildLocalMigrationProgress();
        this.cloudProgress = this.normalizeProgress(parsed);
        this.lastStoredValue = raw ? String(raw) : '';
        if (!raw && Object.keys(this.cloudProgress).length) {
          this.cloudDirty = true;
          this.flushCloudProgress();
        }
        return Object.assign({ cloudDataLoaded: true }, this.cloudProgress);
      } catch (error) {
        this.dataAvailable = false;
        this.cloudProgress = null;
        console.warn('[Crystal Match CrazyGames] Progress read failed');
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
        levelProgress: this.normalizeLevelProgress(source.levelProgress || (game ? {
          highestUnlockedLevel: game.highestUnlockedLevel,
          stars: game.levelStars,
          chapterTrophies: game.levelChapterTrophies
        } : null))
      };
    },

    initializeCloudProgressFromGame() {
      if (!this.game || !this.isServerBackedPlayer()) return false;
      this.cloudProgress = this.buildCloudProgress();
      this.markCloudDirty(0);
      return true;
    },

    markCloudDirty(delay) {
      if (!this.isServerBackedPlayer()) return;
      this.cloudDirty = true;
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
      if (!this.isServerBackedPlayer() || !this.cloudDirty) return Promise.resolve(false);
      window.clearTimeout(this.cloudSaveTimer);
      this.cloudSaveTimer = null;
      this.cloudSaveDueAt = 0;
      const payload = this.buildCloudProgress();
      const value = JSON.stringify(payload);
      this.cloudProgress = payload;
      this.cloudDirty = false;
      if (value === this.lastStoredValue) return Promise.resolve(true);
      try {
        this.sdk.data.setItem(this.storageKey, value);
        this.lastStoredValue = value;
        return Promise.resolve(true);
      } catch (error) {
        this.cloudDirty = true;
        this.scheduleCloudSave(5000);
        console.warn('[Crystal Match CrazyGames] Progress save failed');
        return Promise.resolve(false);
      }
    },

    saveCloudCoins(coins, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.coins = Math.max(0, Math.floor(Number(coins) || 0));
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate || info.forceValue ? 0 : 500);
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
      this.markCloudDirty(info.immediate ? 0 : 500);
    },

    saveCloudAdBonus(adBonus, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.adBonus = this.normalizeAdBonus(adBonus);
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate ? 0 : 500);
    },

    saveCloudLevelProgress(levelProgress, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.levelProgress = this.normalizeLevelProgress(levelProgress);
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate ? 0 : 750);
    },

    saveCloudSettings(settings, meta) {
      if (!this.isServerBackedPlayer()) return;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.settings = this.normalizeSettings(settings);
      const info = meta && typeof meta === 'object' ? meta : {};
      this.markCloudDirty(info.immediate ? 0 : 500);
    },

    submitLeaderboardScore(score) {
      if (!this.isServerBackedPlayer()) return Promise.resolve(false);
      if (!this.cloudProgress) this.cloudProgress = {};
      const value = Math.max(0, Math.floor(Number(score) || 0));
      const current = Math.max(0, Math.floor(Number(this.cloudProgress.endlessBestScore) || 0));
      if (value <= current) return Promise.resolve(true);
      this.cloudProgress.endlessBestScore = value;
      try {
        window.localStorage.setItem(this.localBestScoreKey, String(value));
      } catch (error) {}
      this.markCloudDirty(0);
      return this.flushCloudProgress();
    },

    refreshCloudCoins() {
      if (!this.isServerBackedPlayer() || !this.game || this.cloudDirty) return;
      try {
        const raw = this.sdk.data.getItem(this.storageKey);
        if (!raw || String(raw) === this.lastStoredValue) return;
        const progress = this.normalizeProgress(JSON.parse(String(raw)));
        this.cloudProgress = progress;
        this.lastStoredValue = String(raw);
        if (Number.isFinite(progress.coins)) {
          this.game.coins = progress.coins;
          this.game.displayCoins = progress.coins;
          this.game.coinSyncBase = progress.coins;
        }
      } catch (error) {
        console.warn('[Crystal Match CrazyGames] Progress refresh failed');
      }
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
    }
  };

  if (window.CrystalMatchPlatform && window.CrystalMatchPlatform.registerAdapter) {
    window.CrystalMatchPlatform.registerAdapter(Adapter);
  }
})();

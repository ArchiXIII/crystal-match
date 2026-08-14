(function () {
  'use strict';

  window.CrystalMatchVkBackendIntegration = {
    submitStarsLeaderboard() {
      return true;
    },

    getPlatformPlayerName() {
      const user = this.vkUser && typeof this.vkUser === 'object' ? this.vkUser : {};
      const firstName = typeof user.first_name === 'string' ? user.first_name.trim() : '';
      const lastName = typeof user.last_name === 'string' ? user.last_name.trim() : '';
      return [firstName, lastName].filter(Boolean).join(' ');
    },

    progressLeaderboardSyncKey() {
      const params = new URLSearchParams(window.location.search || '');
      const userId = String(
        (this.isOkClient() && params.get('vk_ok_user_id')) ||
        (this.vkUser && this.vkUser.id) ||
        (this.vkLaunchParams && this.vkLaunchParams.vk_user_id) ||
        ''
      );
      return userId
        ? 'crystal-match-' + (this.isOkClient() ? 'ok' : 'vk') + '-stars-submitted-' + userId
        : '';
    },

    loadProgressLeaderboardSync() {
      const key = this.progressLeaderboardSyncKey();
      if (!key) return null;
      try {
        const value = JSON.parse(window.localStorage.getItem(key) || 'null');
        if (!value || typeof value !== 'object') return null;
        return {
          totalStars: Math.max(0, Math.floor(Number(value.totalStars) || 0)),
          playerName: typeof value.playerName === 'string' ? value.playerName : ''
        };
      } catch (error) {
        return null;
      }
    },

    saveProgressLeaderboardSync(totalStars, playerName) {
      const key = this.progressLeaderboardSyncKey();
      if (!key) return false;
      try {
        window.localStorage.setItem(key, JSON.stringify({
          totalStars: Math.max(0, Math.floor(Number(totalStars) || 0)),
          playerName: typeof playerName === 'string' ? playerName : ''
        }));
        return true;
      } catch (error) {
        return false;
      }
    },

    syncProgressLeaderboards(options) {
      const source = options && typeof options === 'object' ? options : {};
      if (source.reason === 'boot') return Promise.resolve(true);
      if (source.reason === 'level' && !source.chapterComplete) {
        return Promise.resolve(true);
      }
      if (!this.backendClient || !this.game) return Promise.resolve(false);
      const totalStars = this.game.totalLevelStars ? this.game.totalLevelStars() : 0;
      const playerName = this.getPlatformPlayerName();
      if (!this.starsLeaderboardCache) {
        const storedTop = this.loadStoredStarsLeaderboard();
        if (storedTop) {
          this.starsLeaderboardCache = storedTop.entries;
          this.starsLeaderboardCacheAt = storedTop.savedAt;
          this.starsLeaderboardCacheStars = storedTop.totalStars;
        }
      }
      if (!this.starsLeaderboardCache ||
          !this.isStarsTopCandidate(this.starsLeaderboardCache, totalStars, playerName)) {
        return Promise.resolve(true);
      }
      const values = totalStars + ':' + playerName;
      if (this.leaderboardSyncInFlight) return this.leaderboardSyncInFlight;
      if (values === this.lastLeaderboardSyncValues) return Promise.resolve(true);
      const submitted = this.loadProgressLeaderboardSync();
      if (!totalStars || (submitted && submitted.totalStars >= totalStars &&
          (!playerName || submitted.playerName === playerName))) {
        this.lastLeaderboardSyncValues = values;
        return Promise.resolve(true);
      }
      this.leaderboardSyncInFlight = this.backendClient.syncLeaderboards(totalStars, playerName)
        .then((payload) => {
          this.lastLeaderboardSyncValues = values;
          this.saveProgressLeaderboardSync(
            Math.max(totalStars, submitted ? submitted.totalStars : 0),
            playerName || (submitted && submitted.playerName) || ''
          );
          const entries = this.mapBackendLeaderboard(payload);
          if (entries.length) {
            this.starsLeaderboardCache = entries;
            this.starsLeaderboardCacheAt = Date.now();
            this.starsLeaderboardCacheStars = totalStars;
            this.saveStoredStarsLeaderboard(entries);
          }
          return payload || true;
        })
        .catch(() => false)
        .finally(() => {
          this.leaderboardSyncInFlight = null;
        });
      return this.leaderboardSyncInFlight;
    },

    isStarsTopCandidate(entries, totalStars, playerName) {
      const value = Math.max(0, Math.floor(Number(totalStars) || 0));
      const userId = this.currentPlatformUserId();
      const top = (Array.isArray(entries) ? entries : [])
        .filter((entry) => entry && Number.isFinite(entry.rank) && entry.rank >= 1 && entry.rank <= 10)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 10);
      const current = top.find((entry) => entry.isPlayer || (userId && String(entry.userId || '') === userId));
      if (current) {
        return value > Math.max(0, Math.floor(Number(current.score) || 0)) ||
          (!!playerName && playerName !== String(current.name || ''));
      }
      if (top.length < 10) return true;
      const last = top[top.length - 1];
      const lastScore = Math.max(0, Math.floor(Number(last.score) || 0));
      const lastUserId = String(last.userId || '');
      return value > lastScore ||
        (value === lastScore && !!userId && (!lastUserId || userId < lastUserId));
    },

    starsLeaderboardStorageKey() {
      const syncKey = this.progressLeaderboardSyncKey();
      return syncKey ? syncKey.replace('-stars-submitted-', '-stars-cache-') : '';
    },

    loadStoredStarsLeaderboard() {
      const key = this.starsLeaderboardStorageKey();
      if (!key) return null;
      try {
        const stored = JSON.parse(window.localStorage.getItem(key) || 'null');
        if (!stored || !Array.isArray(stored.entries)) return null;
        return {
          entries: stored.entries.filter((entry) => entry && typeof entry === 'object'),
          savedAt: Math.max(0, Math.floor(Number(stored.savedAt) || 0)),
          totalStars: Math.max(0, Math.floor(Number(stored.totalStars) || 0))
        };
      } catch (error) {
        return null;
      }
    },

    saveStoredStarsLeaderboard(entries) {
      const key = this.starsLeaderboardStorageKey();
      if (!key) return false;
      try {
        window.localStorage.setItem(key, JSON.stringify({
          entries: Array.isArray(entries) ? entries.slice(0, 24) : [],
          savedAt: Date.now(),
          totalStars: this.game && this.game.totalLevelStars ? this.game.totalLevelStars() : 0
        }));
        return true;
      } catch (error) {
        return false;
      }
    },

    endlessLeaderboardStorageKey() {
      const syncKey = this.progressLeaderboardSyncKey();
      return syncKey ? syncKey.replace('-stars-submitted-', '-endless-cache-v4-') : '';
    },

    loadStoredEndlessLeaderboard() {
      const key = this.endlessLeaderboardStorageKey();
      if (!key) return null;
      try {
        const stored = JSON.parse(window.localStorage.getItem(key) || 'null');
        if (!stored || !Array.isArray(stored.entries)) return null;
        return {
          entries: stored.entries.filter((entry) => entry && typeof entry === 'object'),
          savedAt: Math.max(0, Math.floor(Number(stored.savedAt) || 0))
        };
      } catch (error) {
        return null;
      }
    },

    saveStoredEndlessLeaderboard(entries) {
      const key = this.endlessLeaderboardStorageKey();
      if (!key) return false;
      try {
        window.localStorage.setItem(key, JSON.stringify({
          entries: Array.isArray(entries) ? entries.slice(0, 12) : [],
          savedAt: Date.now()
        }));
        return true;
      } catch (error) {
        return false;
      }
    },

    currentPlatformUserId() {
      const params = new URLSearchParams(window.location.search || '');
      return String(
        (this.isOkClient() && params.get('vk_ok_user_id')) ||
        (this.vkUser && this.vkUser.id) ||
        (this.vkLaunchParams && this.vkLaunchParams.vk_user_id) ||
        ''
      );
    },

    mergePlayerIntoCachedTop(entries, score, name, limit) {
      const maxRows = Math.max(1, Math.floor(Number(limit) || 10));
      const value = Math.max(0, Math.floor(Number(score) || 0));
      const source = Array.isArray(entries) ? entries : [];
      const cachedPlayer = source.find((entry) => entry && entry.isPlayer) || null;
      const playerId = this.currentPlatformUserId();
      const top = source
        .filter((entry) => entry && Number.isFinite(entry.rank) && entry.rank >= 1 && entry.rank <= maxRows && !entry.isPlayer)
        .slice(0, maxRows)
        .map((entry) => Object.assign({}, entry));
      const player = {
        rank: cachedPlayer && Number.isFinite(cachedPlayer.rank) && cachedPlayer.score === value
          ? cachedPlayer.rank
          : null,
        userId: playerId || (cachedPlayer && cachedPlayer.userId) || '',
        name: name || (cachedPlayer && cachedPlayer.name) || this.t('leaderboard.player'),
        score: value,
        isPlayer: true
      };
      const combined = top.concat(player);
      combined.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        const leftId = String(left.userId || '');
        const rightId = String(right.userId || '');
        if (leftId && rightId && leftId !== rightId) return leftId < rightId ? -1 : 1;
        const leftRank = left.isPlayer && cachedPlayer && Number.isFinite(cachedPlayer.rank)
          ? cachedPlayer.rank
          : (left.rank || maxRows + 1);
        const rightRank = right.isPlayer && cachedPlayer && Number.isFinite(cachedPlayer.rank)
          ? cachedPlayer.rank
          : (right.rank || maxRows + 1);
        return leftRank - rightRank;
      });
      const playerIndex = combined.indexOf(player);
      if (playerIndex < maxRows) {
        return combined.slice(0, maxRows).map((entry, index) => Object.assign(entry, { rank: index + 1 }));
      }
      top.sort((left, right) => left.rank - right.rank);
      top.push(player);
      return top;
    },

    leaderboardPayloadEntries(payload) {
      if (Array.isArray(payload)) return payload;
      if (!payload || typeof payload !== 'object') return [];
      const result = [];
      const append = (value) => {
        if (Array.isArray(value)) value.forEach((item) => result.push(item));
        else if (value && typeof value === 'object') result.push(value);
      };
      append(payload.entries);
      append(payload.items);
      append(payload.rows);
      append(payload.leaderboard);
      append(payload.top);
      append(payload.around);
      append(payload.bottom);
      append(payload.player);
      append(payload.currentUser);
      if (!result.length && payload.data && typeof payload.data === 'object') {
        return this.leaderboardPayloadEntries(payload.data);
      }
      return result;
    },

    mapBackendLeaderboard(payload) {
      const userId = String(
        (this.isOkClient() && new URLSearchParams(window.location.search || '').get('vk_ok_user_id')) ||
        (this.vkUser && this.vkUser.id) ||
        (this.vkLaunchParams && this.vkLaunchParams.vk_user_id) ||
        ''
      );
      const seen = new Set();
      const result = [];
      this.leaderboardPayloadEntries(payload).forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const rank = Math.floor(Number(entry.rank !== undefined ? entry.rank : (entry.place !== undefined ? entry.place : entry.position)));
        if (!Number.isFinite(rank) || rank < 1) return;
        const entryUserId = String(entry.userId !== undefined ? entry.userId : (entry.vkUserId !== undefined ? entry.vkUserId : (entry.vk_user_id || '')));
        const key = entryUserId ? 'u:' + entryUserId : 'r:' + rank;
        if (seen.has(key)) return;
        seen.add(key);
        const scoreSource = entry.score !== undefined
          ? entry.score
          : (entry.value !== undefined
            ? entry.value
            : entry.totalStars);
        const score = Math.max(0, Math.floor(Number(scoreSource) || 0));
        const name = String(
          entry.name ||
          entry.displayName ||
          entry.playerName ||
          entry.userName ||
          (entry.player && (entry.player.name || entry.player.displayName)) ||
          this.t('leaderboard.player')
        );
        result.push({
          rank,
          userId: entryUserId,
          name,
          score,
          isPlayer: !!(entry.isPlayer || entry.isCurrentUser || entry.currentUser || (userId && entryUserId === userId))
        });
      });
      return result.sort((a, b) => a.rank - b.rank);
    },

    async loadStarsLeaderboard(force) {
      if (!this.backendClient) throw new Error('BACKEND_UNAVAILABLE');
      const now = Date.now();
      if (!this.starsLeaderboardCache) {
        const stored = this.loadStoredStarsLeaderboard();
        if (stored) {
          this.starsLeaderboardCache = stored.entries;
          this.starsLeaderboardCacheAt = stored.savedAt;
          this.starsLeaderboardCacheStars = stored.totalStars;
        }
      }
      const currentStars = this.game && this.game.totalLevelStars ? this.game.totalLevelStars() : 0;
      if (!force && this.starsLeaderboardCache &&
          now - this.starsLeaderboardCacheAt < this.starsLeaderboardCacheTtl) {
        return this.starsLeaderboardCache.slice();
      }
      if (this.starsLeaderboardLoadPromise) return this.starsLeaderboardLoadPromise;
      this.starsLeaderboardLoadPromise = this.backendClient.getStarsLeaderboard(10, 0)
        .then((payload) => {
          const entries = this.mapBackendLeaderboard(payload);
          this.starsLeaderboardCache = entries;
          this.starsLeaderboardCacheAt = Date.now();
          this.starsLeaderboardCacheStars = currentStars;
          this.saveStoredStarsLeaderboard(entries);
          return entries.slice();
        })
        .finally(() => {
          this.starsLeaderboardLoadPromise = null;
        });
      return this.starsLeaderboardLoadPromise;
    },

    getVkApiToken() {
      if (this.vkApiToken) return Promise.resolve(this.vkApiToken);
      if (this.vkApiTokenPromise) return this.vkApiTokenPromise;
      if (!this.vkBridge) return Promise.reject(new Error('VK_UNAVAILABLE'));
      const platformConfig = window.CrystalMatchPlatformConfig || {};
      const appId = Math.max(0, Math.floor(Number(platformConfig.appId) || 0));
      if (!appId) return Promise.reject(new Error('VK_APP_ID_UNAVAILABLE'));
      this.vkApiTokenPromise = this.vkBridge.send('VKWebAppGetAuthToken', {
        app_id: appId,
        scope: ''
      }).then((response) => {
        const token = String(response && response.access_token || '');
        if (!token) throw new Error('VK_TOKEN_UNAVAILABLE');
        this.vkApiToken = token;
        return token;
      }).finally(() => {
        this.vkApiTokenPromise = null;
      });
      return this.vkApiTokenPromise;
    },

    mapVkEndlessLeaderboard(payload) {
      const source = payload && payload.response && typeof payload.response === 'object'
        ? payload.response
        : payload;
      const items = source && Array.isArray(source.items) ? source.items : [];
      const profiles = source && Array.isArray(source.profiles) ? source.profiles : [];
      const names = new Map();
      profiles.forEach((profile) => {
        if (!profile || typeof profile !== 'object') return;
        const firstName = typeof profile.first_name === 'string' ? profile.first_name.trim() : '';
        const lastName = typeof profile.last_name === 'string' ? profile.last_name.trim() : '';
        names.set(String(profile.id || ''), [firstName, lastName].filter(Boolean).join(' '));
      });
      const userId = String(
        (this.vkUser && this.vkUser.id) ||
        (this.vkLaunchParams && this.vkLaunchParams.vk_user_id) ||
        ''
      );
      return items.map((item, index) => {
        const entry = item && typeof item === 'object' ? item : {};
        const entryUserId = String(entry.user_id || entry.userId || '');
        const rank = Math.max(1, Math.floor(Number(entry.rank || entry.place || index + 1)));
        const score = Math.max(0, Math.floor(Number(entry.points !== undefined ? entry.points : entry.score) || 0));
        return {
          rank,
          userId: entryUserId,
          name: names.get(entryUserId) || this.t('leaderboard.player'),
          score,
          isPlayer: !!(userId && entryUserId === userId)
        };
      });
    },

    async loadVkEndlessLeaderboard(force) {
      if (!this.vkBridge) {
        const error = new Error('VK_UNAVAILABLE');
        this.warnPlatformIssue('Endless leaderboard read failed', error);
        throw error;
      }
      try {
        await this.retryPendingEndlessScore();
      } catch (error) {
        this.warnPlatformIssue('Endless score submit failed', error);
      }
      if (this.endlessLeaderboardLoadPromise) return this.endlessLeaderboardLoadPromise;
      try {
        this.endlessLeaderboardLoadPromise = this.getVkApiToken().then((token) => {
          const platformConfig = window.CrystalMatchPlatformConfig || {};
          return this.vkBridge.send('VKWebAppCallAPIMethod', {
            method: 'apps.getLeaderboard',
            params: {
              type: 'score',
              global: 1,
              extended: 1,
              access_token: token,
              v: String(platformConfig.apiVersion || '5.199')
            }
          });
        }).then((response) => {
          const entries = this.mapVkEndlessLeaderboard(response).filter((entry) => entry.rank <= 10 || entry.isPlayer);
          this.endlessLeaderboardCache = entries;
          this.endlessLeaderboardCacheAt = Date.now();
          return entries.slice();
        }).finally(() => {
          this.endlessLeaderboardLoadPromise = null;
        });
        return await this.endlessLeaderboardLoadPromise;
      } catch (error) {
        this.warnPlatformIssue('Endless leaderboard read failed', error);
        throw error;
      }
    },

    publishOkEndlessScore(score) {
      const progress = this.mergeEndlessScoreProgress(this.cloudProgress || {});
      this.cloudProgress = progress;
      const value = Math.max(
        Math.floor(Number(score) || 0),
        progress.endlessBestScore
      );
      if (value <= progress.endlessSubmittedScore) return Promise.resolve(true);
      if (!this.backendClient || !value) return Promise.resolve(false);
      if (!this.endlessLeaderboardCache) {
        const stored = this.loadStoredEndlessLeaderboard();
        if (stored) {
          this.endlessLeaderboardCache = stored.entries;
          this.endlessLeaderboardCacheAt = stored.savedAt;
        }
      }
      const playerName = this.getPlatformPlayerName();
      if (this.endlessLeaderboardCache &&
          !this.isStarsTopCandidate(this.endlessLeaderboardCache, value, playerName)) {
        this.markOkEndlessScoreSubmitted(value);
        return Promise.resolve(true);
      }
      if (this.okEndlessScoreSubmitInFlight) return this.okEndlessScoreSubmitInFlight;
      this.okEndlessScoreSubmitInFlight = this.backendClient
        .submitOkEndlessScore(value, playerName)
        .then((payload) => {
          const entries = this.mapBackendLeaderboard(payload);
          if (entries.length) {
            this.endlessLeaderboardCache = entries;
            this.endlessLeaderboardCacheAt = Date.now();
            this.saveStoredEndlessLeaderboard(entries);
          }
          this.markOkEndlessScoreSubmitted(value);
          return true;
        })
        .catch((error) => {
          this.warnPlatformIssue('OK endless score submit failed', error);
          return false;
        })
        .finally(() => {
          this.okEndlessScoreSubmitInFlight = null;
        });
      return this.okEndlessScoreSubmitInFlight;
    },

    markOkEndlessScoreSubmitted(score) {
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.endlessSubmittedScore = Math.max(
        Math.floor(Number(this.cloudProgress.endlessSubmittedScore) || 0),
        Math.max(0, Math.floor(Number(score) || 0))
      );
      this.saveLocalSubmittedScore(this.cloudProgress.endlessSubmittedScore);
      this.markCloudDirty(0);
      this.flushCloudProgress();
    },

    retryPendingOkEndlessScore() {
      const progress = this.mergeEndlessScoreProgress(this.cloudProgress || {});
      this.cloudProgress = progress;
      if (progress.endlessBestScore <= progress.endlessSubmittedScore) return Promise.resolve(true);
      return this.publishOkEndlessScore(progress.endlessBestScore).then((sent) => {
        if (!sent) return false;
        const current = this.mergeEndlessScoreProgress(this.cloudProgress || {});
        this.cloudProgress = current;
        return current.endlessBestScore <= current.endlessSubmittedScore
          ? true
          : this.publishOkEndlessScore(current.endlessBestScore);
      });
    },

    async loadOkEndlessLeaderboard(force) {
      if (!this.backendClient) throw new Error('BACKEND_UNAVAILABLE');
      const now = Date.now();
      if (!this.endlessLeaderboardCache) {
        const stored = this.loadStoredEndlessLeaderboard();
        if (stored) {
          this.endlessLeaderboardCache = stored.entries;
          this.endlessLeaderboardCacheAt = stored.savedAt;
        }
      }
      if (!force && this.endlessLeaderboardCache &&
          now - this.endlessLeaderboardCacheAt < this.endlessLeaderboardCacheTtl) {
        return this.endlessLeaderboardCache.slice();
      }
      if (this.endlessLeaderboardLoadPromise) return this.endlessLeaderboardLoadPromise;
      this.endlessLeaderboardLoadPromise = this.backendClient.getOkEndlessLeaderboard(10, 0)
        .then((payload) => {
          const entries = this.mapBackendLeaderboard(payload).filter((entry) => entry.rank <= 10 || entry.isPlayer);
          this.endlessLeaderboardCache = entries;
          this.endlessLeaderboardCacheAt = Date.now();
          this.saveStoredEndlessLeaderboard(entries);
          return entries.slice();
        })
        .finally(() => {
          this.endlessLeaderboardLoadPromise = null;
        });
      return this.endlessLeaderboardLoadPromise;
    },

    retryPendingEndlessScore() {
      const progress = this.mergeEndlessScoreProgress(this.cloudProgress || {});
      this.cloudProgress = progress;
      if (progress.endlessBestScore <= progress.endlessSubmittedScore) return Promise.resolve(true);
      return this.publishVkEndlessScore(progress.endlessBestScore).then((sent) => {
        if (!sent) return false;
        const current = this.mergeEndlessScoreProgress(this.cloudProgress || {});
        this.cloudProgress = current;
        return current.endlessBestScore <= current.endlessSubmittedScore
          ? true
          : this.publishVkEndlessScore(current.endlessBestScore);
      });
    },

    publishVkEndlessScore(score) {
      const progress = this.mergeEndlessScoreProgress(this.cloudProgress || {});
      this.cloudProgress = progress;
      const value = Math.max(
        Math.floor(Number(score) || 0),
        progress.endlessBestScore
      );
      if (value <= progress.endlessSubmittedScore) return Promise.resolve(true);
      if (!this.backendClient || !value) return Promise.resolve(false);
      if (this.endlessScoreSubmitInFlight) return this.endlessScoreSubmitInFlight;
      this.endlessScoreSubmitInFlight = this.backendClient.submitVkEndlessScore(value)
        .then(() => {
          if (!this.cloudProgress) this.cloudProgress = {};
          this.cloudProgress.endlessSubmittedScore = Math.max(
            Math.floor(Number(this.cloudProgress.endlessSubmittedScore) || 0),
            value
          );
          this.saveLocalSubmittedScore(this.cloudProgress.endlessSubmittedScore);
          this.markCloudDirty(0);
          this.flushCloudProgress();
          return true;
        })
        .catch((error) => {
          this.warnPlatformIssue('Endless score submit failed', error);
          return false;
        })
        .finally(() => {
          this.endlessScoreSubmitInFlight = null;
      });
      return this.endlessScoreSubmitInFlight;
    },

    async openLeaderboard(type) {
      if (type === 'stars') {
        if (!this.game) return false;
        try {
          const totalStars = this.game.totalLevelStars ? this.game.totalLevelStars() : 0;
          const playerName = this.getPlatformPlayerName();
          let entries = await this.loadStarsLeaderboard(false);
          await this.syncProgressLeaderboards({ immediate: true, reason: 'leaderboard' });
          entries = this.starsLeaderboardCache || entries;
          this.game.setLeaderboardEntries(this.mergePlayerIntoCachedTop(entries, totalStars, playerName, 10));
          return true;
        } catch (error) {
          this.game.setLeaderboardError(this.t('leaderboard.backendUnavailable'));
          return false;
        }
      }
      if (!this.game) return false;
      const cloudBest = this.cloudProgress ? Number(this.cloudProgress.endlessBestScore) : 0;
      const score = Math.max(
        0,
        Math.floor(Number(cloudBest) || 0),
        this.loadLocalBestScore(),
        Math.floor(Number(this.game && this.game.score) || 0)
      );
      this.submitLeaderboardScore(score);
      if (this.isOkClient()) {
        try {
          await this.retryPendingOkEndlessScore();
          const entries = await this.loadOkEndlessLeaderboard(false);
          this.game.setLeaderboardEntries(this.mergePlayerIntoCachedTop(
            entries,
            score,
            this.getPlatformPlayerName(),
            10
          ));
          return true;
        } catch (error) {
          this.warnPlatformIssue('OK endless leaderboard read failed', error);
          this.game.setLeaderboardError(this.t('leaderboard.backendUnavailable'));
          return false;
        }
      }
      try {
        const entries = await this.loadVkEndlessLeaderboard(false);
        this.game.setLeaderboardEntries(this.mergePlayerIntoCachedTop(
          entries,
          score,
          this.getPlatformPlayerName(),
          10
        ));
        return true;
      } catch (error) {
        this.game.setLeaderboardError(this.t('leaderboard.unavailable'));
        return false;
      }
    },

    async loadGameOverLeaderboard(score, type) {
      if (!this.game) return false;
      if (type !== 'stars') {
        try {
          if (this.isOkClient()) await this.retryPendingOkEndlessScore();
          const entries = this.isOkClient()
            ? await this.loadOkEndlessLeaderboard(false)
            : await this.loadVkEndlessLeaderboard(false);
          this.game.setGameOverLeaderboardEntries(this.mergePlayerIntoCachedTop(
            entries,
            score,
            this.getPlatformPlayerName(),
            10
          ));
          return true;
        } catch (error) {
          this.warnPlatformIssue('Game over endless leaderboard read failed', error);
          this.game.setGameOverLeaderboardError(this.t(
            this.isOkClient() ? 'leaderboard.backendUnavailable' : 'leaderboard.unavailable'
          ));
          return false;
        }
      }
      const stored = this.loadStoredStarsLeaderboard();
      let cached = this.starsLeaderboardCache || (stored && stored.entries) || [];
      const cacheSavedAt = Math.max(
        Math.max(0, Number(this.starsLeaderboardCacheAt) || 0),
        stored ? Math.max(0, Number(stored.savedAt) || 0) : 0
      );
      if (!cached.length && Date.now() - cacheSavedAt >= this.starsLeaderboardCacheTtl) {
        try {
          cached = await this.loadStarsLeaderboard(true);
        } catch (error) {
          this.warnPlatformIssue('Game over stars leaderboard read failed', error);
        }
      }
      await this.syncProgressLeaderboards({ immediate: true, reason: 'gameover' });
      cached = this.starsLeaderboardCache || cached;
      this.game.setGameOverLeaderboardEntries(this.mergePlayerIntoCachedTop(
        cached,
        score,
        this.getPlatformPlayerName() || this.game.playerName,
        10
      ));
      return true;
    },

    getPurchaseProduct(packId) {
      const platformConfig = window.CrystalMatchPlatformConfig || {};
      const products = platformConfig.products || {};
      const compactId = String(packId || '').replace('coins_', 'coins');
      const product = products[packId] || products[compactId];
      if (!product) return null;
      if (typeof product === 'string') {
        return product ? { item: product, votes: 0 } : null;
      }
      const item = String(product.item || '');
      if (!item) return null;
      return {
        item,
        votes: Math.max(0, Math.floor(Number(product.votes) || 0)),
        okPrice: Math.max(0, Math.floor(Number(product.okPrice) || 0))
      };
    },

    loadCoinPurchaseCatalog() {
      if (!this.game || !this.game.setCoinPurchaseCatalog) return false;
      const suffix = this.isOkClient()
        ? ' \u041E\u041A'
        : (this.lang === 'ru' ? ' \u0433\u043E\u043B\u043E\u0441\u043E\u0432' : ' votes');
      const catalog = this.game.coinPurchasePackages.map((pack) => {
        const product = this.getPurchaseProduct(pack.id);
        if (!product) return null;
        const price = this.isOkClient() ? product.okPrice : product.votes;
        return {
          id: pack.id,
          price: price ? String(price) + suffix : ''
        };
      }).filter(Boolean);
      this.game.setCoinPurchaseCatalog(catalog);
      return catalog.length > 0;
    },

    async purchaseCoins(pack) {
      if (!pack || !pack.id || !this.game || !this.vkBridge || this.purchaseInFlight) return false;
      if (!this.backendClient || !this.isServerBackedPlayer()) {
        this.game.coinShopError = this.t('shop.backendUnavailable');
        return false;
      }
      const product = this.getPurchaseProduct(pack.id);
      if (!product) return false;
      this.purchaseInFlight = true;
      this.beginPlatformOverlayAudioPause();
      try {
        if (this.hideStickyBannerForOverlay) await this.hideStickyBannerForOverlay();
        await this.vkBridge.send('VKWebAppShowOrderBox', {
          type: 'item',
          item: product.item
        });
        this.purchaseAwaitingConfirmation = true;
        this.savePurchaseAwaitingConfirmation(true);
        this.game.coinShopError = this.t('shop.processing');
        this.pollPurchaseConfirmation();
        return true;
      } catch (error) {
        this.warnPlatformIssue('Coin purchase failed', error);
        this.game.coinShopError = '';
        return true;
      } finally {
        this.purchaseInFlight = false;
        this.endPlatformOverlayAudioPause();
        this.scheduleRuntimeRestore();
        if (this.restoreStickyBannerAfterOverlay) this.restoreStickyBannerAfterOverlay();
      }
    },

    pollPurchaseConfirmation() {
      if (this.purchaseConfirmationPromise) return this.purchaseConfirmationPromise;
      const delays = [0, 4000, 8000, 18000];
      this.purchaseConfirmationPromise = (async () => {
        for (const delay of delays) {
          if (!this.purchaseAwaitingConfirmation) return true;
          if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
          const confirmed = await this.processPendingPurchases({
            source: 'purchase',
            afterPurchase: true
          });
          if (confirmed || !this.purchaseAwaitingConfirmation) return true;
        }
        return false;
      })().finally(() => {
        this.purchaseConfirmationPromise = null;
      });
      return this.purchaseConfirmationPromise;
    },

    pendingPurchaseEvents(payload) {
      if (Array.isArray(payload)) return payload;
      if (!payload || typeof payload !== 'object') return [];
      if (Array.isArray(payload.events)) return payload.events;
      if (Array.isArray(payload.items)) return payload.items;
      if (payload.data && typeof payload.data === 'object') return this.pendingPurchaseEvents(payload.data);
      return [];
    },

    normalizePurchaseEvent(value) {
      if (!value || typeof value !== 'object') return null;
      const eventId = String(value.eventId || '');
      const type = value.type === 'refund' ? 'refund' : (value.type === 'grant' ? 'grant' : '');
      const coinsDelta = Math.floor(Number(value.coinsDelta));
      if (!eventId || !type || !Number.isFinite(coinsDelta)) return null;
      if (type === 'grant' && coinsDelta <= 0) return null;
      if (type === 'refund' && coinsDelta >= 0) return null;
      return {
        eventId,
        orderId: String(value.orderId || ''),
        type,
        coinsDelta
      };
    },

    purchaseRewardSource() {
      if (!this.game || !this.game.coinShopPurchaseSources) return null;
      const keys = Object.keys(this.game.coinShopPurchaseSources);
      return keys.length ? this.game.coinShopPurchaseSources[keys[0]] : null;
    },

    clearPurchaseRewardSources() {
      if (this.game) this.game.coinShopPurchaseSources = {};
    },

    purchaseStateStorageKey(baseKey) {
      const userKey = this.progressLeaderboardSyncKey();
      return userKey ? String(baseKey || '') + '-' + userKey : String(baseKey || '');
    },

    loadPurchaseAwaitingConfirmation() {
      try {
        const key = this.purchaseStateStorageKey(this.purchaseAwaitingLocalKey);
        const raw = window.localStorage.getItem(key);
        if (!raw) return false;
        const now = Date.now();
        if (raw === '1') {
          this.purchaseAwaitingExpiresAt = now + 60 * 60 * 1000;
          window.localStorage.setItem(key, JSON.stringify({
            expiresAt: this.purchaseAwaitingExpiresAt
          }));
          return true;
        }
        const value = JSON.parse(raw);
        if (value && Number(value.expiresAt) > now) {
          this.purchaseAwaitingExpiresAt = Number(value.expiresAt);
          return true;
        }
        this.purchaseAwaitingExpiresAt = 0;
        window.localStorage.removeItem(key);
        return false;
      } catch (error) {
        this.purchaseAwaitingExpiresAt = 0;
        return false;
      }
    },

    savePurchaseAwaitingConfirmation(value) {
      this.purchaseAwaitingConfirmation = !!value;
      try {
        const key = this.purchaseStateStorageKey(this.purchaseAwaitingLocalKey);
        if (value) {
          this.purchaseAwaitingExpiresAt = Date.now() + this.purchaseAwaitingTtlMs;
          window.localStorage.setItem(key, JSON.stringify({
            expiresAt: this.purchaseAwaitingExpiresAt
          }));
        } else {
          this.purchaseAwaitingExpiresAt = 0;
          window.localStorage.removeItem(key);
        }
        return true;
      } catch (error) {
        return false;
      }
    },

    async persistPurchaseEvents(coins, eventIds, grantedCoins) {
      if (!this.game || !this.isServerBackedPlayer()) return false;
      const value = Math.max(0, Math.floor(Number(coins) || 0));
      const ids = this.normalizePurchaseEventIds(eventIds);
      const previousCoins = Math.max(0, Math.floor(Number(this.game.coins) || 0));
      this.game.coins = value;
      this.game.coinSyncBase = value;
      if (value < previousCoins) this.game.displayCoins = Math.min(this.game.displayCoins, value);
      let localSaved = true;
      try {
        window.localStorage.setItem(this.game.coinStorageKey, String(value));
      } catch (error) {
        localSaved = false;
      }
      this.appliedPurchaseEventIds = ids;
      if (!this.saveLocalPurchaseEventIds()) localSaved = false;
      if (!this.cloudProgress) this.cloudProgress = {};
      this.cloudProgress.coins = value;
      this.cloudProgress.appliedPurchaseEventIds = ids.slice();
      this.markCloudDirty(0);
      const cloudSaved = await this.flushCloudProgressFully();
      if (!cloudSaved || !localSaved) return false;
      if (grantedCoins > 0) {
        const source = this.purchaseRewardSource();
        if (source && this.game.spawnCoinFlights) this.game.spawnCoinFlights(source, grantedCoins);
        else this.game.displayCoins = value;
        this.game.playSound('coinCollect');
      }
      this.clearPurchaseRewardSources();
      return true;
    },

    processPendingPurchases(options) {
      const source = options && typeof options === 'object' ? options : {};
      if (this.purchaseAwaitingConfirmation && this.purchaseAwaitingExpiresAt &&
          this.purchaseAwaitingExpiresAt <= Date.now()) {
        this.savePurchaseAwaitingConfirmation(false);
      }
      if (!this.purchaseAwaitingConfirmation) {
        this.purchaseAwaitingConfirmation = this.loadPurchaseAwaitingConfirmation();
      }
      if (!this.purchaseAwaitingConfirmation && !source.afterPurchase) return Promise.resolve(false);
      if (this.purchaseEventsInFlight) {
        return this.purchaseEventsPromise || Promise.resolve(false);
      }
      if (!this.backendClient || !this.game) {
        this.purchaseBackendReady = false;
        if (this.game && (this.game.coinShopOpen || source.afterPurchase)) {
          this.game.coinShopError = this.t('shop.backendUnavailable');
        }
        return Promise.resolve(false);
      }
      this.purchaseEventsInFlight = true;
      this.purchaseEventsPromise = this.backendClient.getPendingPurchaseEvents()
        .then(async (payload) => {
          const known = new Set(this.normalizePurchaseEventIds(this.appliedPurchaseEventIds));
          const ackIds = [];
          const nextIds = this.appliedPurchaseEventIds.slice();
          let coins = Math.max(0, Math.floor(Number(this.game.coins) || 0));
          let grantedCoins = 0;
          let changed = false;
          this.pendingPurchaseEvents(payload).forEach((rawEvent) => {
            const event = this.normalizePurchaseEvent(rawEvent);
            if (!event) return;
            ackIds.push(event.eventId);
            const storedEventId = this.purchaseEventStorageId(event.eventId);
            if (known.has(storedEventId)) return;
            known.add(storedEventId);
            nextIds.push(storedEventId);
            const nextCoins = Math.max(0, coins + event.coinsDelta);
            if (event.coinsDelta > 0) grantedCoins += nextCoins - coins;
            coins = nextCoins;
            changed = true;
          });
          if (changed) {
            const saved = await this.persistPurchaseEvents(coins, nextIds, grantedCoins);
            if (!saved) throw new Error('PURCHASE_SAVE_FAILED');
          } else if (ackIds.length && this.cloudDirty) {
            const saved = await this.flushCloudProgressFully();
            if (!saved) throw new Error('PURCHASE_SAVE_FAILED');
          }
          for (const eventId of ackIds) {
            await this.backendClient.ackPurchaseEvent(eventId);
          }
          if (ackIds.length) this.purchaseAwaitingConfirmation = false;
          if (ackIds.length) this.savePurchaseAwaitingConfirmation(false);
          if (this.game.coinShopOpen) {
            this.game.coinShopError = (source.afterPurchase || this.purchaseAwaitingConfirmation) && !ackIds.length
              ? this.t('shop.processing')
              : '';
          }
          this.purchaseBackendReady = true;
          return ackIds.length > 0;
        })
        .catch((error) => {
          if (this.isOkClient()) this.warnPlatformIssue('OK purchase confirmation failed', error);
          this.purchaseBackendReady = false;
          if (this.game && (this.game.coinShopOpen || source.afterPurchase)) {
            this.game.coinShopError = this.purchaseAwaitingConfirmation
              ? this.t('shop.processing')
              : this.t('shop.backendUnavailable');
          }
          return false;
        })
        .finally(() => {
          this.purchaseEventsInFlight = false;
          this.purchaseEventsPromise = null;
        });
      return this.purchaseEventsPromise;
    },

  };
})();

(function () {
  'use strict';

  window.CrystalMatchVkBackendIntegration = {
    submitStarsLeaderboard() {
      return true;
    },

    syncProgressLeaderboards() {
      this.retryPendingEndlessScore();
      if (!this.backendClient || !this.game) return Promise.resolve(false);
      const totalStars = this.game.totalLevelStars ? this.game.totalLevelStars() : 0;
      const totalXp = Math.max(0, Math.floor(Number(this.game.rankXp) || 0));
      const user = this.vkUser && typeof this.vkUser === 'object' ? this.vkUser : {};
      const firstName = typeof user.first_name === 'string' ? user.first_name.trim() : '';
      const lastName = typeof user.last_name === 'string' ? user.last_name.trim() : '';
      const playerName = [firstName, lastName].filter(Boolean).join(' ');
      const values = totalStars + ':' + totalXp + ':' + playerName;
      if (this.leaderboardSyncInFlight) return this.leaderboardSyncInFlight;
      if (values === this.lastLeaderboardSyncValues) return Promise.resolve(true);
      this.leaderboardSyncInFlight = this.backendClient.syncLeaderboards(totalStars, totalXp, playerName)
        .then(() => {
          this.lastLeaderboardSyncValues = values;
          return true;
        })
        .catch(() => false)
        .finally(() => {
          this.leaderboardSyncInFlight = null;
        });
      return this.leaderboardSyncInFlight;
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

    mapBackendLeaderboard(payload, type) {
      const userId = String(
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
            : (type === 'xp' ? entry.totalXp : entry.totalStars));
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
          name,
          score,
          isPlayer: !!(entry.isPlayer || entry.isCurrentUser || entry.currentUser || (userId && entryUserId === userId))
        });
      });
      return result.sort((a, b) => a.rank - b.rank);
    },

    async loadBackendLeaderboard(type) {
      if (!this.backendClient) throw new Error('BACKEND_UNAVAILABLE');
      const synced = await this.syncProgressLeaderboards();
      if (!synced) throw new Error('BACKEND_UNAVAILABLE');
      const payload = await this.backendClient.getLeaderboard(type, 20, 0);
      return this.mapBackendLeaderboard(payload, type);
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
          name: names.get(entryUserId) || this.t('leaderboard.player'),
          score,
          isPlayer: !!(userId && entryUserId === userId)
        };
      });
    },

    async loadVkEndlessLeaderboard() {
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
      try {
        const token = await this.getVkApiToken();
        const platformConfig = window.CrystalMatchPlatformConfig || {};
        const response = await this.vkBridge.send('VKWebAppCallAPIMethod', {
          method: 'apps.getLeaderboard',
          params: {
            type: 'points',
            global: 1,
            extended: 1,
            access_token: token,
            v: String(platformConfig.apiVersion || '5.199')
          }
        });
        return this.mapVkEndlessLeaderboard(response);
      } catch (error) {
        this.warnPlatformIssue('Endless leaderboard read failed', error);
        throw error;
      }
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
          this.game.setLeaderboardEntries(await this.loadBackendLeaderboard('stars'));
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
      try {
        this.game.setLeaderboardEntries(await this.loadVkEndlessLeaderboard());
        return true;
      } catch (error) {
        this.game.setLeaderboardError(this.t('leaderboard.unavailable'));
        return false;
      }
    },

    async openXpLeaderboard() {
      if (!this.game) return false;
      try {
        this.game.setXpLeaderboardEntries(await this.loadBackendLeaderboard('xp'));
        return true;
      } catch (error) {
        this.game.setXpLeaderboardError(this.t('leaderboard.backendUnavailable'));
        return false;
      }
    },

    async loadGameOverLeaderboard(score, type) {
      if (!this.game || type !== 'stars') return false;
      try {
        this.game.setGameOverLeaderboardEntries(await this.loadBackendLeaderboard('stars'));
        return true;
      } catch (error) {
        this.game.setGameOverLeaderboardError(this.t('leaderboard.backendUnavailable'));
        return false;
      }
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
        votes: Math.max(0, Math.floor(Number(product.votes) || 0))
      };
    },

    loadCoinPurchaseCatalog() {
      if (!this.game || !this.game.setCoinPurchaseCatalog) return false;
      const suffix = this.lang === 'ru' ? ' голосов' : ' votes';
      const catalog = this.game.coinPurchasePackages.map((pack) => {
        const product = this.getPurchaseProduct(pack.id);
        if (!product) return null;
        return {
          id: pack.id,
          price: product.votes ? String(product.votes) + suffix : ''
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
      if (this.purchaseEventsInFlight && this.purchaseEventsPromise) {
        await this.purchaseEventsPromise;
      }
      if (this.purchaseBackendReady !== true) {
        const ready = await this.processPendingPurchases({ source: 'purchaseCheck' });
        if (!ready) return false;
      }
      const product = this.getPurchaseProduct(pack.id);
      if (!product) return false;
      this.purchaseInFlight = true;
      this.pauseAudioForSystem();
      try {
        const response = await this.vkBridge.send('VKWebAppShowOrderBox', {
          type: 'item',
          item: product.item
        });
        if (!response || response.status !== 'success') return false;
        this.purchaseAwaitingConfirmation = true;
        this.game.coinShopError = this.t('shop.processing');
        await this.processPendingPurchases({ source: 'purchase', afterPurchase: true });
        return true;
      } catch (error) {
        return false;
      } finally {
        this.purchaseInFlight = false;
        this.resumeAudioFromSystem();
      }
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
      if (this.purchaseEventsInFlight) {
        if (source.afterPurchase && this.purchaseEventsPromise) {
          return this.purchaseEventsPromise.then(() => this.processPendingPurchases({
            source: source.source,
            afterPurchase: true
          }));
        }
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
          if (this.game.coinShopOpen) {
            this.game.coinShopError = (source.afterPurchase || this.purchaseAwaitingConfirmation) && !ackIds.length
              ? this.t('shop.processing')
              : '';
          }
          this.purchaseBackendReady = true;
          return true;
        })
        .catch(() => {
          this.purchaseBackendReady = false;
          if (this.game && (this.game.coinShopOpen || source.afterPurchase)) {
            this.game.coinShopError = this.t('shop.backendUnavailable');
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

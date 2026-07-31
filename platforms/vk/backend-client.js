(function () {
  'use strict';

  class CrystalMatchVkBackendClient {
    constructor(options) {
      const source = options && typeof options === 'object' ? options : {};
      this.baseUrl = String(source.baseUrl || '').replace(/\/+$/, '');
      this.timeout = Math.max(1000, Math.floor(Number(source.timeout) || 3000));
      this.getLaunchParams = typeof source.getLaunchParams === 'function'
        ? source.getLaunchParams
        : () => '';
    }

    async request(path, options) {
      if (!this.baseUrl || !window.fetch) throw new Error('BACKEND_UNAVAILABLE');
      const source = options && typeof options === 'object' ? options : {};
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const headers = Object.assign({}, source.headers || {});
      const launchParams = String(this.getLaunchParams() || '');
      headers.Accept = 'application/json';
      if (launchParams) headers['X-VK-Launch-Params'] = launchParams;
      if (source.body !== undefined) headers['Content-Type'] = 'application/json';
      const timer = controller
        ? window.setTimeout(() => controller.abort(), this.timeout)
        : null;
      try {
        const response = await window.fetch(this.baseUrl + path, {
          method: source.method || 'GET',
          headers,
          body: source.body === undefined ? undefined : JSON.stringify(source.body),
          signal: controller ? controller.signal : undefined,
          cache: 'no-store',
          credentials: 'omit'
        });
        if (!response.ok) {
          const error = new Error('BACKEND_HTTP_' + response.status);
          error.status = response.status;
          try {
            const text = await response.text();
            const payload = text ? JSON.parse(text) : null;
            const source = payload && typeof payload === 'object' ? payload : {};
            const nested = source.error && typeof source.error === 'object' ? source.error : {};
            const code = Number(
              source.vkErrorCode ||
              source.errorCode ||
              source.error_code ||
              nested.error_code ||
              nested.code
            );
            const message = String(
              source.message ||
              source.errorMessage ||
              source.error_msg ||
              nested.error_msg ||
              nested.message ||
              ''
            );
            if (code === 7 && /cannot add points to not verified app/i.test(message)) {
              error.safeCode = 'VK_API_7_CANNOT_ADD_POINTS_TO_NOT_VERIFIED_APP';
            }
          } catch (parseError) {}
          throw error;
        }
        if (response.status === 204) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      } catch (error) {
        if (error && error.name === 'AbortError') throw new Error('BACKEND_TIMEOUT');
        throw error;
      } finally {
        if (timer !== null) window.clearTimeout(timer);
      }
    }

    syncLeaderboards(totalStars, playerName) {
      const body = {
        totalStars: Math.max(0, Math.floor(Number(totalStars) || 0))
      };
      const name = typeof playerName === 'string' ? playerName.trim() : '';
      if (name) body.playerName = name;
      return this.request('/v1/leaderboards/sync', {
        method: 'POST',
        body
      });
    }

    getStarsLeaderboard(limit, offset) {
      const count = Math.max(1, Math.min(100, Math.floor(Number(limit) || 20)));
      const start = Math.max(0, Math.floor(Number(offset) || 0));
      return this.request('/v1/leaderboards/stars?limit=' + count + '&offset=' + start);
    }

    submitVkEndlessScore(score) {
      return this.request('/v1/vk/endless-score', {
        method: 'POST',
        body: {
          score: Math.max(0, Math.floor(Number(score) || 0))
        }
      });
    }

    getPendingPurchaseEvents() {
      return this.request('/v1/purchase-events/pending');
    }

    ackPurchaseEvent(eventId) {
      return this.request('/v1/purchase-events/ack', {
        method: 'POST',
        body: { eventId: String(eventId || '') }
      });
    }
  }

  window.CrystalMatchVkBackendClient = CrystalMatchVkBackendClient;
})();

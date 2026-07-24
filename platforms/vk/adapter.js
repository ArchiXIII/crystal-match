(function () {
  'use strict';

  const Adapter = {
    name: 'vk',
    vkBridge: null,
    vkUser: null,

    async initPlatform() {
      const source = window.vkBridge && (window.vkBridge.default || window.vkBridge);
      this.vkBridge = source && typeof source.send === 'function' ? source : null;
      if (!this.vkBridge) return;
      try {
        await this.vkBridge.send('VKWebAppInit');
      } catch (error) {
        this.vkBridge = null;
      }
    },

    async loadPlayer() {
      if (!this.vkBridge) return;
      try {
        this.vkUser = await this.vkBridge.send('VKWebAppGetUserInfo');
      } catch (error) {
        this.vkUser = null;
      }
    },

    detectLanguage() {
      const params = new URLSearchParams(window.location.search || '');
      const lang = params.get('vk_language') || params.get('lang') || '';
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
      return false;
    }
  };

  if (window.CrystalMatchPlatform && window.CrystalMatchPlatform.registerAdapter) {
    window.CrystalMatchPlatform.registerAdapter(Adapter);
  }
})();

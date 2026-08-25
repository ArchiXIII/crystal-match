(function () {
  'use strict';

  const Adapter = {
    name: 'local',
    features: {
      endlessMoveBonus: true
    },

    initPlatform() {
      return Promise.resolve();
    },

    detectLanguage() {
      return this.detectBrowserLanguage();
    },

    getPlayerDisplayName() {
      return this.t('leaderboard.player');
    },

    isServerBackedPlayer() {
      return false;
    },

    isRewardedAdAvailable() {
      return true;
    },

    showRewardedAd() {
      return Promise.resolve(true);
    }
  };

  if (window.CrystalMatchPlatform && window.CrystalMatchPlatform.registerAdapter) {
    window.CrystalMatchPlatform.registerAdapter(Adapter);
  }
})();

(function () {
  'use strict';

  const Adapter = {
    name: 'local',

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
    }
  };

  if (window.CrystalMatchPlatform && window.CrystalMatchPlatform.registerAdapter) {
    window.CrystalMatchPlatform.registerAdapter(Adapter);
  }
})();

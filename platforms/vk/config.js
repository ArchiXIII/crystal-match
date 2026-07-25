(function () {
  'use strict';

  window.CrystalMatchPlatformConfig = {
    name: 'vk',
    appId: 54691807,
    storageKey: 'crystalProgress',
    features: {
      nativeLeaderboard: true,
      starsLeaderboard: false,
      xpLeaderboard: false,
      gameOverLeaderboard: false,
      paidCoinPacks: false,
      developerGames: false
    },
    leaderboards: {
      endless: '',
      stars: '',
      xp: ''
    },
    products: {
      coins10000: {
        item: 'coins_10000',
        votes: 5
      },
      coins25000: {
        item: 'coins_25000',
        votes: 10
      },
      coins60000: {
        item: 'coins_60000',
        votes: 20
      },
      coins150000: {
        item: 'coins_150000',
        votes: 45
      }
    }
  };
})();

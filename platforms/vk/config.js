(function () {
  'use strict';

  window.CrystalMatchPlatformConfig = {
    name: 'vk',
    appId: 54691807,
    storageKey: 'crystalProgress',
    purchaseEventsLocalKey: 'crystal-match-vk-purchase-events',
    localBestScoreKey: 'crystal-match-vk-best-score',
    backendUrl: 'https://d5dl7q0eh16ojp505u1v.6brbn2wz.apigw.yandexcloud.net',
    features: {
      nativeLeaderboard: false,
      nativeEndlessLeaderboard: true,
      starsLeaderboard: true,
      xpLeaderboard: true,
      gameOverLeaderboard: true,
      endlessGameOverLeaderboard: false,
      paidCoinPacks: true,
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

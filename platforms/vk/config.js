(function () {
  'use strict';

  window.CrystalMatchPlatformConfig = {
    name: 'vk',
    backendClientVersion: 3,
    appId: 54691807,
    storageKey: 'crystalProgress',
    purchaseEventsLocalKey: 'crystal-match-vk-purchase-events',
    purchaseAwaitingLocalKey: 'crystal-match-vk-purchase-awaiting',
    purchaseAwaitingTtlMs: 24 * 60 * 60 * 1000,
    localBestScoreKey: 'crystal-match-vk-best-score',
    localSubmittedScoreKey: 'crystal-match-vk-endless-submitted-score',
    backendUrl: 'https://d5dl7q0eh16ojp505u1v.6brbn2wz.apigw.yandexcloud.net',
    apiVersion: '5.199',
    layout: {
      sideGoalMinWidth: 720,
      sideGoalMinHeight: 460,
      desktopSidePadMax: 24,
      reserveSideGoalColumn: true,
      mobileLevelExitRow: true
    },
    features: {
      nativeLeaderboard: false,
      nativeEndlessLeaderboard: false,
      starsLeaderboard: true,
      xpLeaderboard: false,
      gameOverLeaderboard: true,
      endlessGameOverLeaderboard: true,
      paidCoinPacks: true,
      developerGames: false,
      levelExitButton: true,
      levelExitToMainMenu: true
    },
    leaderboards: {
      endless: '',
      stars: '',
      xp: ''
    },
    products: {
      coins10000: {
        item: 'coins_10000',
        votes: 5,
        okPrice: 19
      },
      coins25000: {
        item: 'coins_25000',
        votes: 10,
        okPrice: 49
      },
      coins60000: {
        item: 'coins_60000',
        votes: 20,
        okPrice: 99
      },
      coins150000: {
        item: 'coins_150000',
        votes: 45,
        okPrice: 199
      }
    }
  };
})();

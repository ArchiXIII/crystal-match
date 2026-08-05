(function () {
  'use strict';

  window.CrystalMatchPlatformConfig = {
    name: 'vk',
    backendClientVersion: 2,
    appId: 54691807,
    storageKey: 'crystalProgress',
    purchaseEventsLocalKey: 'crystal-match-vk-purchase-events',
    purchaseAwaitingLocalKey: 'crystal-match-vk-purchase-awaiting',
    localBestScoreKey: 'crystal-match-vk-best-score',
    localSubmittedScoreKey: 'crystal-match-vk-endless-submitted-score',
    backendUrl: 'https://d5dl7q0eh16ojp505u1v.6brbn2wz.apigw.yandexcloud.net',
    apiVersion: '5.199',
    layout: {
      sideGoalMinWidth: 880,
      sideGoalMinHeight: 620,
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

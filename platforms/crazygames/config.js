(function () {
  'use strict';

  window.CrystalMatchPlatformConfig = {
    name: 'crazygames',
    storageKey: 'crystalProgress',
    localBestScoreKey: 'crystal-match-crazygames-best-score',
    leaderboardEncryptionKey: 'GORMr6vE2H3idEV2Un043rmWXUCBJxhTziN3mXTzkac=',
    layout: {
      attachBoostersToBoard: true
    },
    features: {
      nativeLeaderboard: false,
      leaderboardButton: false,
      nativeEndlessLeaderboard: false,
      starsLeaderboard: false,
      xpLeaderboard: false,
      gameOverLeaderboard: false,
      endlessGameOverLeaderboard: false,
      gameOverXpEarned: true,
      compactGameOver: true,
      adsEnabled: false,
      freeBasicRewards: true,
      paidCoinPacks: false,
      developerGames: false,
      levelExitButton: false,
      levelExitToMainMenu: false
    }
  };
})();

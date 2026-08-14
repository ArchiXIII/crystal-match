(function () {
  'use strict';

  const Game = window.CrystalMatchGame;
  if (!Game) return;

  Game.prototype.normalizeLevelProgress = function (progress) {
    const source = progress && typeof progress === 'object' ? progress : { highestUnlockedLevel: progress };
    const staticCount = Math.max(1, Math.floor((this.levelConfig && this.levelConfig.staticCount) || 50));
    const stars = {};
    const rawStars = source.stars && typeof source.stars === 'object' ? source.stars : {};
    Object.keys(rawStars).forEach((key) => {
      const level = Math.max(1, Math.floor(Number(key) || 0));
      const value = Math.max(0, Math.min(3, Math.floor(Number(rawStars[key]) || 0)));
      if (level > 0 && value > 0) stars[level] = value;
    });
    const trophies = {};
    const rawTrophies = source.chapterTrophies && typeof source.chapterTrophies === 'object' ? source.chapterTrophies : {};
    Object.keys(rawTrophies).forEach((key) => {
      const chapter = Math.max(0, Math.floor(Number(key) || 0));
      if (rawTrophies[key]) trophies[chapter] = true;
    });
    const completedMax = Object.keys(stars).reduce((max, key) => {
      return Math.max(max, Math.floor(Number(key) || 0));
    }, 0);
    const savedUnlocked = Math.floor(Number(source.highestUnlockedLevel) || 1);
    const unlocked = Math.max(1, Math.max(savedUnlocked, Math.max(staticCount > 0 ? 1 : 0, completedMax + 2)));
    return {
      highestUnlockedLevel: unlocked,
      stars,
      chapterTrophies: trophies
    };
  };

  Game.prototype.loadLevelProgress = function () {
    try {
      const raw = window.localStorage.getItem(this.levelProgressStorageKey);
      if (!raw) return { highestUnlockedLevel: 1, stars: {} };
      if (raw.charAt(0) === '{') return JSON.parse(raw);
      const saved = Number(raw);
      return Number.isFinite(saved) && saved > 0 ? { highestUnlockedLevel: Math.max(1, Math.floor(saved)), stars: {} } : { highestUnlockedLevel: 1, stars: {} };
    } catch (error) {
      return { highestUnlockedLevel: 1, stars: {} };
    }
  };

  Game.prototype.saveLevelProgress = function (options) {
    const settings = options && typeof options === 'object' ? options : {};
    const progress = {
      highestUnlockedLevel: Math.max(1, Math.floor(this.highestUnlockedLevel || 1)),
      stars: this.levelStars || {},
      chapterTrophies: this.levelChapterTrophies || {}
    };
    try {
      window.localStorage.setItem(this.levelProgressStorageKey, JSON.stringify(progress));
    } catch (error) {}
    if (this.saveLevelProgressExternal && settings.cloud !== false) this.saveLevelProgressExternal(progress, options || null);
    if (this.reportGameProgressExternal) this.reportGameProgressExternal(progress);
  };

  Game.prototype.levelStarsFor = function (levelNumber) {
    const key = String(Math.max(1, Math.floor(Number(levelNumber) || 1)));
    return Math.max(0, Math.min(3, Math.floor(Number(this.levelStars && this.levelStars[key]) || 0)));
  };

  Game.prototype.totalLevelStars = function () {
    return Object.keys(this.levelStars || {}).reduce((sum, key) => {
      return sum + Math.max(0, Math.min(3, Math.floor(Number(this.levelStars[key]) || 0)));
    }, 0);
  };

  Game.prototype.levelChapterStarInfo = function (chapterIndex) {
    const levels = this.levelChapterLevels ? this.levelChapterLevels(chapterIndex) : [];
    const earned = levels.reduce((sum, level) => sum + (this.levelStarsFor ? this.levelStarsFor(level.n) : 0), 0);
    return { earned, max: levels.length * 3 };
  };

  Game.prototype.hasChapterTrophy = function (chapterIndex) {
    const chapter = Math.max(0, Math.floor(Number(chapterIndex) || 0));
    const info = this.levelChapterStarInfo ? this.levelChapterStarInfo(chapter) : { earned: 0, max: 0 };
    return info.max > 0 && info.earned >= info.max;
  };

  Game.prototype.recommendedLevelNumber = function () {
    const unlocked = Math.max(1, Math.floor(Number(this.highestUnlockedLevel) || 1));
    return Math.max(1, unlocked - 1 || 1);
  };

  Game.prototype.levelChapterLevels = function (chapterIndex) {
    const chapter = Math.max(0, Math.floor(Number(chapterIndex) || 0));
    const first = chapter * 10 + 1;
    const result = [];
    for (let levelNumber = first; levelNumber < first + 10; levelNumber += 1) {
      result.push(this.levelByNumber(levelNumber));
    }
    return result.filter(Boolean);
  };

  Game.prototype.openLevelSelect = function () {
    this.levelSelectOpen = true;
    this.menuOpen = true;
    this.gameOver = false;
    this.syncLevelSelection(this.recommendedLevelNumber ? this.recommendedLevelNumber() : this.highestUnlockedLevel || this.selectedLevelNumber || 1);
    return true;
  };

  Game.prototype.closeLevelSelect = function () {
    this.levelSelectOpen = false;
    return true;
  };

  Game.prototype.startGame = function () {
    return this.openLevelSelect();
  };

  Game.prototype.selectLevel = function (levelNumber) {
    const level = this.levelByNumber(levelNumber);
    if (!level) return false;
    this.selectedLevelNumber = level.n;
    this.levelSelectChapter = Math.max(0, Math.floor((level.n - 1) / 10));
    if (level.n > this.highestUnlockedLevel) {
      this.levelSelectMessage = this.t ? this.t('levels.locked') : 'Complete previous level';
      this.levelSelectMessageUntil = this.time + 1700;
      return false;
    }
    this.levelSelectMessage = '';
    return true;
  };

  Game.prototype.changeLevelChapter = function (delta) {
    const chapters = this.levelChapterCount();
    const next = Math.max(0, Math.min(chapters - 1, (this.levelSelectChapter || 0) + delta));
    if (next === this.levelSelectChapter) return false;
    this.levelSelectChapter = next;
    const first = next * 10 + 1;
    const last = first + 9;
    const selectedInChapter = this.selectedLevelNumber >= first && this.selectedLevelNumber <= last;
    if (!selectedInChapter) {
      const recommended = this.recommendedLevelNumber ? this.recommendedLevelNumber() : this.highestUnlockedLevel;
      this.selectedLevelNumber = recommended >= first && recommended <= last
        ? recommended
        : first;
    }
    this.levelSelectMessage = '';
    return true;
  };

  Game.prototype.startSelectedLevel = function () {
    const levelNumber = this.selectedLevelNumber || (this.recommendedLevelNumber ? this.recommendedLevelNumber() : this.highestUnlockedLevel) || 1;
    return this.startLevel(levelNumber);
  };

  Game.prototype.startLevel = function (levelNumber) {
    const level = this.levelByNumber(levelNumber);
    if (!level || level.n > this.highestUnlockedLevel) return false;
    this.selectedLevelNumber = level.n;
    this.levelSelectChapter = Math.max(0, Math.floor((level.n - 1) / 10));
    this.gameMode = 'level';
    this.currentLevel = level;
    this.levelMovesLeft = level.moves || 20;
    this.levelMovesSpent = 0;
    this.levelExtraMovesGranted = 0;
    this.levelWon = false;
    this.levelResult = '';
    this.pendingLevelWin = false;
    this.pendingLevelReward = 0;
    this.levelRewardDoubleAmount = 0;
    this.levelRewardDoubleEligible = false;
    this.levelRewardDoubleUsed = false;
    this.levelRewardDoublePending = false;
    this.levelContinueAdUsed = false;
    this.levelContinueAdPending = false;
    this.levelSurrendered = false;
    this.nextLevelAdPending = false;
    this.exitRoundConfirmOpen = false;
    this.levelSelectOpen = false;
    this.resizeBoard(level.cols, level.rows, level.colors);
    this.resetRound(true);
    this.menuOpen = false;
    this.roundStartCoins = this.coins;
    this.notePlayerAction();
    return true;
  };

  Game.prototype.restartCurrentLevel = function () {
    const levelNumber = this.currentLevel ? this.currentLevel.n : this.selectedLevelNumber;
    if (!levelNumber) return false;
    return this.startLevel(levelNumber);
  };

  Game.prototype.startNextLevel = function () {
    const current = this.currentLevel ? this.currentLevel.n : this.selectedLevelNumber;
    const next = Math.max(1, Math.floor(Number(current) || 1) + 1);
    const shouldShowAd = this.platformFeatures.adsEnabled !== false && current >= 10 && !!this.showInterstitialAdExternal;
    if (!shouldShowAd) return this.startLevel(next);
    if (this.nextLevelAdPending) return false;
    this.nextLevelAdPending = true;
    Promise.resolve(this.showInterstitialAdExternal())
      .finally(() => {
        this.nextLevelAdPending = false;
        this.startLevel(next);
      });
    return true;
  };

  Game.prototype.levelByNumber = function (levelNumber) {
    const number = Math.floor(Number(levelNumber) || 0);
    if (number < 1) return null;
    const staticLevel = (this.levelConfig.levels || []).find((level) => level.n === number);
    if (staticLevel) return staticLevel;
    const staticCount = Math.max(1, Math.floor((this.levelConfig && this.levelConfig.staticCount) || 50));
    if (number <= staticCount) return null;
    return this.generateLevel(number);
  };

  Game.prototype.generatedRandom = function (levelNumber) {
    let seed = Math.max(1, Math.floor(Number(levelNumber) || 1));
    seed = (seed ^ 0x9e3779b9) >>> 0;
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  };

  Game.prototype.generateLevel = function (levelNumber) {
    const n = Math.max(101, Math.floor(Number(levelNumber) || 101));
    const rnd = this.generatedRandom(n);
    const distance = n - 100;
    const decade = Math.floor((distance - 1) / 10);
    const local = (distance - 1) % 10;
    const goalOrder = ['color', 'stones', 'score', 'special', 'combo', 'color', 'rainbowUse', 'stones', 'createRainbow', 'score'];
    const type = goalOrder[local] || 'score';
    const reward = Math.min(3500, Math.round((2000 + distance * 5 + decade * 8 + local * 2) / 10) * 10);
    const spawnBase = 0.12 + Math.min(0.04, decade * 0.0035);
    const stoneSpawnChance = Math.min(0.16, Math.round((spawnBase + rnd() * 0.007) * 1000) / 1000);
    const stoneSpawnMax = Math.min(38, 31 + Math.floor(decade * 0.7) + Math.floor(rnd() * 4));
    const movesBase = 45 + Math.min(5, Math.floor(decade / 2));
    const level = {
      n,
      cols: 7,
      rows: 8,
      colors: 5,
      stonesStart: 5,
      stoneSpawnChance,
      stoneSpawnMax,
      moves: movesBase,
      goal: null,
      boosters: ['hammer', 'bomb', 'rainbow'],
      generated: true
    };

    if (type === 'color') {
      level.moves += 1;
      level.goal = {
        type: 'color',
        color: Math.floor(rnd() * 5),
        target: Math.min(40, 32 + Math.floor(decade * 0.85) + Math.floor(rnd() * 4)),
        reward
      };
    } else if (type === 'stones') {
      level.moves += 2;
      const stoneTargetBase = 22 + Math.floor(decade * 0.45) + Math.floor(rnd() * 2);
      const stoneTargetCap = Math.max(20, stoneSpawnMax - 9);
      level.goal = {
        type: 'stones',
        target: Math.min(28, stoneTargetCap, stoneTargetBase),
        reward
      };
    } else if (type === 'special') {
      level.goal = {
        type: 'special',
        target: Math.min(11, 7 + Math.floor(decade / 3)),
        reward
      };
    } else if (type === 'combo') {
      level.goal = {
        type: 'combo',
        target: Math.min(11, 7 + Math.floor(decade / 3)),
        reward
      };
    } else if (type === 'rainbowUse') {
      level.moves += 1;
      level.goal = {
        type: 'rainbowUse',
        target: 2,
        reward
      };
    } else if (type === 'createRainbow') {
      level.moves += 1;
      level.goal = {
        type: 'createRainbow',
        target: 2,
        reward
      };
    } else {
      level.moves += 2;
      level.goal = {
        type: 'score',
        target: Math.min(44000, 32000 + decade * 900 + Math.floor(rnd() * 1200)),
        reward
      };
    }

    return level;
  };

  Game.prototype.finishLevel = function (won, options) {
    if (this.gameOver) return false;
    this.noMoves = false;
    this.activeBooster = null;
    this.selected = null;
    this.hintMove = null;
    this.levelWon = !!won;
    this.levelSurrendered = !won && !!(options && options.surrendered);
    this.levelResult = won ? 'won' : 'lost';
    this.gameOver = true;
    if (won && this.currentLevel) {
      const previousStars = this.levelStarsFor(this.currentLevel.n);
      const levelReward = Math.max(0, Math.floor(Number(this.pendingLevelReward || (this.currentGoal && this.currentGoal.reward) || 0)));
      this.levelRewardDoubleAmount = levelReward;
      this.levelRewardDoubleEligible = this.platformFeatures.levelRewardDoubleAd === true && levelReward > 0;
      this.levelRewardDoubleUsed = false;
      this.levelRewardDoublePending = false;
      if (levelReward > 0) {
        this.addCoins(levelReward, { kind: 'levelWinStars' }, true, { immediate: true });
        this.pendingLevelReward = 0;
      }
      const earnedStars = this.calculateLevelStars();
      const key = String(this.currentLevel.n);
      const chapter = Math.max(0, Math.floor((this.currentLevel.n - 1) / 10));
      const beforeChapterStars = this.levelChapterStarInfo ? this.levelChapterStarInfo(chapter) : { earned: 0, max: 0 };
      this.lastLevelStarsEarned = earnedStars;
      this.lastChapterTrophyEarned = null;
      if (earnedStars > previousStars) {
        this.levelStars[key] = earnedStars;
      }
      const afterChapterStars = this.levelChapterStarInfo ? this.levelChapterStarInfo(chapter) : beforeChapterStars;
      const trophyKey = String(chapter);
      const firstChapterTrophy = afterChapterStars.max > 0 &&
        afterChapterStars.earned >= afterChapterStars.max &&
        beforeChapterStars.earned < beforeChapterStars.max &&
        !(this.levelChapterTrophies && this.levelChapterTrophies[trophyKey]);
      if (firstChapterTrophy) {
        this.levelChapterTrophies = this.levelChapterTrophies || {};
        this.levelChapterTrophies[trophyKey] = true;
        this.lastChapterTrophyEarned = chapter;
      }
      this.highestUnlockedLevel = Math.max(this.highestUnlockedLevel, this.currentLevel.n + 2);
      this.saveLevelProgress({ immediate: true });
      this.submitStars();
    } else {
      this.pendingLevelReward = 0;
      this.levelRewardDoubleAmount = 0;
      this.levelRewardDoubleEligible = false;
      this.levelRewardDoubleUsed = false;
      this.levelRewardDoublePending = false;
      this.lastLevelStarsEarned = 0;
      this.lastChapterTrophyEarned = null;
    }
      this.playSound(won ? 'goalComplete' : 'roundEnd');
      this.saveRankXp(true);
      this.syncPlatformLeaderboards({
        reason: 'level',
        chapterComplete: won && this.currentLevel && this.currentLevel.n % 10 === 0
      });
      if (won) this.loadGameOverLeaderboard('stars');
      this.finishedAt = Date.now();
      return true;
  };

  Game.prototype.calculateLevelStars = function () {
    if (!this.currentLevel) return 0;
    const baseMoves = Math.max(1, Math.floor(Number(this.currentLevel.moves) || 1));
    const left = Math.max(0, Math.floor(Number(this.levelMovesLeft) || 0));
    if (this.levelExtraMovesGranted > 0 || this.levelContinueAdUsed) {
      return left >= 2 ? 2 : 1;
    }
    const strongReserve = Math.max(3, Math.ceil(baseMoves * 0.18));
    const tightReserve = Math.max(1, Math.ceil(baseMoves * 0.06));
    if (left >= strongReserve) return 3;
    if (left >= tightReserve) return 2;
    return 1;
  };

  Game.prototype.submitStars = function () {
    if (!this.submitStarsExternal) return;
    this.submitStarsExternal(this.totalLevelStars());
  };

  Game.prototype.syncPlatformLeaderboards = function (options) {
    if (!this.syncPlatformLeaderboardsExternal) return false;
    this.syncPlatformLeaderboardsExternal(options);
    return true;
  };

  Game.prototype.checkLevelOutOfMoves = function () {
    if (this.gameMode !== 'level' || this.gameOver || this.state !== 'idle') return false;
    if (this.levelMovesLeft <= 0 && this.currentGoal && this.currentGoal.progress < this.currentGoal.target) {
      this.finishLevel(false);
      return true;
    }
    return false;
  };

  Game.prototype.canContinueLevelWithAd = function () {
    const freeReward = this.platformFeatures.freeBasicRewards === true;
    return this.gameMode === 'level' &&
      this.gameOver &&
      !this.levelWon &&
      !this.levelContinueAdUsed &&
      !this.levelContinueAdPending &&
      !this.levelSurrendered &&
      (freeReward || (
        !!this.showRewardedAdExternal &&
        (!this.isRewardedAdAvailableExternal || this.isRewardedAdAvailableExternal())
      ));
  };

  Game.prototype.shouldShowLevelRewardDoubleAd = function () {
    return this.gameMode === 'level' &&
      this.gameOver &&
      this.levelWon &&
      this.platformFeatures.levelRewardDoubleAd === true &&
      this.levelRewardDoubleEligible &&
      !this.levelRewardDoubleUsed &&
      this.levelRewardDoubleAmount > 0 &&
      !!this.showRewardedAdExternal &&
      (!this.isRewardedAdAvailableExternal || this.isRewardedAdAvailableExternal());
  };

  Game.prototype.doubleLevelRewardWithAd = function () {
    if (!this.shouldShowLevelRewardDoubleAd() || this.levelRewardDoublePending) return false;
    const levelNumber = this.currentLevel ? this.currentLevel.n : 0;
    const reward = this.levelRewardDoubleAmount;
    this.levelRewardDoublePending = true;
    Promise.resolve(this.showRewardedAdExternal())
      .then((rewarded) => {
        if (!rewarded || this.levelRewardDoubleUsed || !this.gameOver || !this.levelWon ||
          !this.currentLevel || this.currentLevel.n !== levelNumber) return;
        this.levelRewardDoubleUsed = true;
        this.levelRewardDoubleEligible = false;
        this.addCoins(reward, { kind: 'levelWinRewardDouble' }, true, { immediate: true });
      })
      .catch(() => {})
      .finally(() => {
        this.levelRewardDoublePending = false;
      });
    return true;
  };

  Game.prototype.continueLevelWithAd = function () {
    if (!this.canContinueLevelWithAd()) return false;
    if (this.platformFeatures.freeBasicRewards === true) {
      this.grantLevelContinueMoves();
      return true;
    }
    this.levelContinueAdPending = true;
    Promise.resolve(this.showRewardedAdExternal())
      .then((rewarded) => {
        if (!rewarded) return;
        this.grantLevelContinueMoves();
      })
      .catch(() => {})
      .finally(() => {
        this.levelContinueAdPending = false;
      });
    return true;
  };

  Game.prototype.grantLevelContinueMoves = function () {
    this.levelContinueAdUsed = true;
    this.levelExtraMovesGranted += 5;
    this.levelContinueAdPending = false;
    this.levelMovesLeft = 5;
    this.gameOver = false;
    this.levelWon = false;
    this.levelSurrendered = false;
    this.levelResult = '';
    this.noMoves = false;
    this.activeBooster = null;
    this.selected = null;
    this.hintMove = null;
    this.finishedAt = null;
    this.state = 'idle';
    this.notePlayerAction();
    if (!this.findHintMove()) this.reshuffleLevelBoard();
    this.checkMoveAvailability();
  };

})();




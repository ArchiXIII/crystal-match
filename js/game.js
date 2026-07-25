(function () {
  'use strict';

  const STATE_IDLE = 'idle';
  const STATE_SWAP = 'swap';
  const STATE_CLEAR = 'clear';
  const STATE_DROP = 'drop';

  class CrystalMatchGame {
    constructor(options) {
      this.columns = options.columns;
      this.rows = options.rows;
      this.colorCount = options.colors;
      this.defaultColumns = options.columns;
      this.defaultRows = options.rows;
      this.defaultColorCount = options.colors;
      this.levelConfig = window.CrystalMatchLevels || { levels: [], shuffleGraceUntil: 25, staticCount: 50 };
      this.i18n = options.i18n || window.CrystalMatchI18n || null;
      this.audio = options.audio || null;
      this.platformFeatures = Object.assign({
        nativeLeaderboard: false,
        starsLeaderboard: true,
        xpLeaderboard: true,
        gameOverLeaderboard: true,
        paidCoinPacks: true,
        developerGames: true
      }, options.platformFeatures || {});
      this.playerName = String(options.playerName || this.t('leaderboard.player') || '').trim() || this.t('leaderboard.player');
      this.score = 0;
      this.coinStorageKey = 'crystal-match-coins';
      this.rankXpStorageKey = 'crystal-match-rank-xp';
      this.dailyBonusStorageKey = 'crystal-match-daily-bonus';
      this.adBonusStorageKey = 'crystal-match-ad-bonus';
      this.levelProgressStorageKey = 'crystal-match-level-progress';
      this.saveCoinsExternal = typeof options.saveCoins === 'function' ? options.saveCoins : null;
      this.saveRankXpExternal = typeof options.saveRankXp === 'function' ? options.saveRankXp : null;
      this.saveDailyBonusExternal = typeof options.saveDailyBonus === 'function' ? options.saveDailyBonus : null;
      this.saveAdBonusExternal = typeof options.saveAdBonus === 'function' ? options.saveAdBonus : null;
      this.saveLevelProgressExternal = typeof options.saveLevelProgress === 'function' ? options.saveLevelProgress : null;
      this.submitScoreExternal = typeof options.submitScore === 'function' ? options.submitScore : null;
      this.submitStarsExternal = typeof options.submitStars === 'function' ? options.submitStars : null;
      this.openLeaderboardExternal = typeof options.openLeaderboard === 'function' ? options.openLeaderboard : null;
      this.openXpLeaderboardExternal = typeof options.openXpLeaderboard === 'function' ? options.openXpLeaderboard : null;
      this.openDeveloperGamesExternal = typeof options.openDeveloperGames === 'function' ? options.openDeveloperGames : null;
      this.loadGameOverLeaderboardExternal = typeof options.loadGameOverLeaderboard === 'function' ? options.loadGameOverLeaderboard : null;
      this.purchaseCoinsExternal = typeof options.purchaseCoins === 'function' ? options.purchaseCoins : null;
      this.showRewardedAdExternal = typeof options.showRewardedAd === 'function' ? options.showRewardedAd : null;
      this.isRewardedAdAvailableExternal = typeof options.isRewardedAdAvailable === 'function' ? options.isRewardedAdAvailable : null;
      this.showInterstitialAdExternal = typeof options.showInterstitialAd === 'function' ? options.showInterstitialAd : null;
      this.startingCoins = 5000;
      this.serverBackedProgress = !!options.serverBackedProgress;
      this.coins = Number.isFinite(options.savedCoins)
        ? Math.floor(options.savedCoins)
        : this.loadCoins(this.startingCoins);
      this.coinSyncBase = this.coins;
      this.initialCoinCloudSave = !!options.initialCoinCloudSave;
      if (this.coins < this.startingCoins && !Number.isFinite(options.savedCoins)) {
        this.coins = this.startingCoins;
      }
      this.rankXp = Number.isFinite(options.savedRankXp)
        ? Math.floor(options.savedRankXp)
        : this.loadRankXp();
      this.dailyBonus = this.normalizeDailyBonus(options.savedDailyBonus || this.loadDailyBonus());
      this.adBonus = this.normalizeAdBonus(options.savedAdBonus || this.loadAdBonus());
      this.displayCoins = this.coins;
      this.saveCoins({ cloud: this.initialCoinCloudSave, initial: true, immediate: this.initialCoinCloudSave });
      this.saveRankXp();
      this.saveDailyBonus();
      this.saveAdBonus();
      this.soundOn = true;
      this.state = STATE_IDLE;
      this.selected = null;
      this.tiles = [];
      this.effects = [];
      this.popups = [];
      this.reactions = [];
      this.reactionCooldown = 0;
      this.boardBounce = { life: 0, maxLife: 0, power: 0 };
      this.coinFlights = [];
      this.coinSpendBursts = [];
      this.mobileLike = this.isMobileLike();
      this.performanceQuality = null;
      this.setPerformanceQuality({ level: this.mobileLike ? 1 : 2, mobile: this.mobileLike });
      this.animations = [];
      this.pendingRevert = null;
      this.lastSwap = null;
      this.combo = 0;
      this.turns = 0;
      this.goalLevel = 0;
      this.currentGoal = null;
      this.idleTime = 0;
      this.hintDelay = 9000;
      this.hintMove = null;
      this.hintTime = 0;
      this.dragPreview = null;
      this.noMoves = false;
      this.gameOver = false;
      this.exitRoundConfirmOpen = false;
      this.gameMode = 'endless';
      this.levelSelectOpen = false;
      this.levelSelectChapter = 0;
      this.selectedLevelNumber = 1;
      this.levelSelectMessage = '';
      this.levelSelectMessageUntil = 0;
      this.currentLevel = null;
      this.levelMovesLeft = 0;
      this.levelMovesSpent = 0;
      this.levelExtraMovesGranted = 0;
      this.levelWon = false;
      this.levelResult = '';
      this.pendingLevelWin = false;
      this.pendingLevelReward = 0;
      this.lastChapterTrophyEarned = null;
      this.levelContinueAdUsed = false;
      this.levelContinueAdPending = false;
      this.levelSurrendered = false;
      this.nextLevelAdPending = false;
      const levelProgress = this.normalizeLevelProgress(options.savedLevelProgress || this.loadLevelProgress());
      this.highestUnlockedLevel = levelProgress.highestUnlockedLevel;
      this.levelStars = levelProgress.stars;
      this.levelChapterTrophies = levelProgress.chapterTrophies || {};
      this.lastLevelStarsEarned = 0;
      this.lastChapterTrophyEarned = null;
      this.scoreSubmitted = false;
      this.scoreSubmitInterval = 30000;
      this.scoreSubmitElapsed = 0;
      this.lastSubmittedScore = 0;
      this.gameOverLeaderboardLoading = false;
      this.gameOverLeaderboardError = '';
      this.gameOverLeaderboardEntries = [];
      this.gameOverLeaderboardType = 'endless';
      this.leaderboardOpen = false;
      this.leaderboardTab = 'stars';
      this.leaderboardLoading = false;
      this.leaderboardError = '';
      this.leaderboardEntries = [];
      this.xpLeaderboardOpen = false;
      this.xpLeaderboardLoading = false;
      this.xpLeaderboardError = '';
      this.xpLeaderboardEntries = [];
      this.profilePanelOpen = false;
      this.coinShopOpen = false;
      this.coinShopError = '';
      this.coinShopPendingId = '';
      this.coinShopRewardSource = null;
      this.coinShopPurchaseSources = {};
      this.adBonusPending = false;
      this.interstitialPending = false;
      this.menuOpen = true;
      this.needsNewRound = true;
      this.finishedAt = null;
      this.roundStartCoins = this.coins;
      this.roundEarnedCoins = 0;
      this.activeBooster = null;
      this.boosters = [
        { id: 'hammer', label: this.t('booster.hammer'), cost: 800 },
        { id: 'bomb', label: this.t('booster.bomb'), cost: 1800 },
        { id: 'rainbow', label: this.t('booster.rainbow'), cost: 4500 }
      ];
      this.coinPurchasePackages = [
        { id: 'coins_10000', coins: 10000, priceYan: 49, labelKey: 'shop.pack.small', badgeKey: '' },
        { id: 'coins_25000', coins: 25000, priceYan: 119, labelKey: 'shop.pack.value', badgeKey: '' },
        { id: 'coins_60000', coins: 60000, priceYan: 249, labelKey: 'shop.pack.big', badgeKey: '' },
        { id: 'coins_150000', coins: 150000, priceYan: 599, labelKey: 'shop.pack.best', badgeKey: '' }
      ];
      this.boosterUsesThisRound = this.createBoosterUseMap();
      this.roundStartRankLevel = this.rankInfo().level;
      this.roundNewRank = null;
      this.clearBoard();
      this.nextGoal();
    }











    levelChapterCount() {
      const visibleLevel = Math.max(1, Math.floor(Number(this.highestUnlockedLevel) || 1));
      return Math.max(1, Math.ceil(visibleLevel / 10));
    }

    clampLevelNumber(levelNumber) {
      const visibleLevel = Math.max(1, Math.floor(Number(this.highestUnlockedLevel) || 1));
      return Math.max(1, Math.min(visibleLevel, Math.floor(Number(levelNumber) || 1)));
    }

    syncLevelSelection(levelNumber) {
      const selected = this.clampLevelNumber(levelNumber || this.highestUnlockedLevel || 1);
      this.selectedLevelNumber = selected;
      this.levelSelectChapter = Math.max(0, Math.min(this.levelChapterCount() - 1, Math.floor((selected - 1) / 10)));
      return selected;
    }

    playSound(name) {
      if (this.audio && this.audio.play) this.audio.play(name);
    }

    toggleSound() {
      this.soundOn = !this.soundOn;
      if (this.audio && this.audio.setEnabled) this.audio.setEnabled(this.soundOn);
      return this.soundOn;
    }

    t(key, params) {
      return this.i18n && this.i18n.t ? this.i18n.t(key, params) : key;
    }

    isMobileLike() {
      const ua = String((window.navigator && window.navigator.userAgent) || '');
      return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    }

    setPerformanceQuality(profile) {
      const mobile = profile && profile.mobile !== undefined ? !!profile.mobile : this.mobileLike;
      const level = profile && profile.level !== undefined ? Math.max(0, Math.min(2, profile.level)) : (mobile ? 1 : 2);
      const fallback = mobile
        ? [
            { effects: 42, coinFlights: 5, coinBursts: 5, effectDensity: 0.66 },
            { effects: 62, coinFlights: 7, coinBursts: 7, effectDensity: 0.78 },
            { effects: 84, coinFlights: 9, coinBursts: 9, effectDensity: 0.88 }
          ]
        : [
            { effects: 70, coinFlights: 8, coinBursts: 8, effectDensity: 0.76 },
            { effects: 100, coinFlights: 11, coinBursts: 11, effectDensity: 0.86 },
            { effects: 130, coinFlights: 14, coinBursts: 14, effectDensity: 0.92 }
          ];
      const base = fallback[level];
      this.performanceQuality = Object.assign({}, base, profile || {}, { level, mobile });
      this.maxEffects = this.performanceQuality.effects || base.effects;
      this.maxSpritePieces = this.performanceQuality.spritePieces || Math.floor(this.maxEffects * (mobile ? 0.52 : 0.58));
      this.maxCoinFlights = this.performanceQuality.coinFlights || base.coinFlights;
      this.maxCoinSpendBursts = this.performanceQuality.coinBursts || base.coinBursts;
      this.effectDensity = this.performanceQuality.effectDensity || base.effectDensity;
      this.trimEffects();
      if (this.coinFlights.length > this.maxCoinFlights) this.coinFlights.splice(0, this.coinFlights.length - this.maxCoinFlights);
      if (this.coinSpendBursts.length > this.maxCoinSpendBursts) this.coinSpendBursts.splice(0, this.coinSpendBursts.length - this.maxCoinSpendBursts);
    }

    clearBoard() {
      this.tiles = [];
      for (let row = 0; row < this.rows; row += 1) {
        this.tiles[row] = [];
        for (let col = 0; col < this.columns; col += 1) {
          this.tiles[row][col] = null;
        }
      }
    }

    makeBoard(animated = false) {
      this.clearBoard();
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          const startRow = animated ? row - this.rows - 1.2 - Math.random() * 2.2 : row;
          const tile = this.createSafeTile(col, row, startRow);
          this.tiles[row][col] = tile;
          if (animated) {
            const delay = col * 22 + row * 16 + Math.random() * 130;
            const duration = 520 + (this.rows - row) * 28 + Math.random() * 120;
            this.animations.push(this.tween(tile, { x: col, y: row }, duration, 'drop', delay));
          }
        }
      }
      this.state = animated ? STATE_DROP : STATE_IDLE;
    }

    createSafeTile(col, row, visualRow = row) {
      let type = this.randomType();
      let guard = 0;
      while (guard < 30 && this.wouldMatch(col, row, type)) {
        type = this.randomType();
        guard += 1;
      }
      return this.createTile(type, col, row, visualRow);
    }

    createTile(type, col, row, visualRow) {
      return {
        id: Math.random().toString(36).slice(2),
        type,
        col,
        row,
        x: col,
        y: visualRow,
        scale: 1,
        alpha: 1,
        special: null,
        specialExpanded: false,
        removing: false
      };
    }

    createStone(col, row, visualRow) {
      return {
        id: Math.random().toString(36).slice(2),
        kind: 'stone',
        hp: 1,
        col,
        row,
        x: col,
        y: visualRow,
        scale: 1,
        alpha: 1,
        removing: false
      };
    }

    createIncomingTile(col, row, visualRow) {
      if (this.shouldSpawnIncomingStone()) {
        return this.createStone(col, row, visualRow);
      }
      return this.createTile(this.randomType(), col, row, visualRow);
    }

    shouldSpawnIncomingStone() {
      const chance = this.stoneSpawnChance();
      if (chance <= 0) return false;
      if (this.gameMode === 'level') {
        const max = Math.max(0, Math.floor(Number(this.currentLevel && this.currentLevel.stoneSpawnMax) || 0));
        if (!max || this.stoneCountOnBoard() >= max) return false;
      }
      return Math.random() < chance;
    }

    stoneSpawnChance() {
      if (this.gameMode === 'level') {
        return Math.max(0, Number(this.currentLevel && this.currentLevel.stoneSpawnChance) || 0);
      }
      const pressure = Math.min(0.06, this.turns * 0.00125 + Math.floor(this.score / 4500) * 0.006);
      return 0.004 + pressure;
    }

    stoneCountOnBoard() {
      let count = 0;
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          if (this.isStone(this.tileAt(col, row))) count += 1;
        }
      }
      return count;
    }

    isStone(tile) {
      return tile && tile.kind === 'stone';
    }

    isMatchable(tile) {
      return tile && !this.isStone(tile) && tile.special !== 'rainbow' && typeof tile.type === 'number';
    }

    resizeBoard(columns, rows, colors) {
      this.columns = Math.max(5, Math.min(7, Math.floor(columns || this.defaultColumns)));
      this.rows = Math.max(5, Math.min(8, Math.floor(rows || this.defaultRows)));
      this.colorCount = Math.max(4, Math.min(5, Math.floor(colors || this.defaultColorCount)));
      this.clearBoard();
    }

    randomType() {
      return Math.floor(Math.random() * this.colorCount);
    }

    loadRankXp() {
      try {
        const saved = window.localStorage.getItem(this.rankXpStorageKey);
        if (saved === null || saved === '') return 0;
        const xp = Number(saved);
        return Number.isFinite(xp) && xp >= 0 ? Math.floor(xp) : 0;
      } catch (error) {
        return 0;
      }
    }

    currentTutorialHint() {
      if (this.gameMode !== 'level' || !this.currentLevel || this.menuOpen || this.gameOver || this.pendingLevelWin) return null;
      if (this.levelSelectOpen || this.exitRoundConfirmOpen || this.coinShopOpen || this.leaderboardOpen || this.profilePanelOpen || this.xpLeaderboardOpen) return null;
      const levelNumber = Math.max(1, Math.floor(Number(this.currentLevel.n) || 1));
      const boosters = this.availableBoosters ? this.availableBoosters() : [];
      if (levelNumber === 1) {
        return { id: 'goal', text: this.t('tutorial.goal'), anchor: 'bottom' };
      }
      if (levelNumber === 2) {
        return { id: 'moves', text: this.t('tutorial.moves'), anchor: 'bottom' };
      }
      if (boosters.length === 1 && boosters[0].id === 'hammer') {
        return { id: 'specialMoves', text: this.t('tutorial.specialMoves'), anchor: 'hammer' };
      }
      return null;
    }

    saveRankXp(force) {
      try {
        window.localStorage.setItem(this.rankXpStorageKey, String(Math.max(0, Math.floor(this.rankXp))));
      } catch (error) {}
      if (this.saveRankXpExternal) {
        this.saveRankXpExternal(this.rankXp, !!force);
      }
    }

    awardRankXp(amount) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      this.rankXp += Math.floor(amount);
      this.saveRankXp(true);
    }

    addScore(amount) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const value = Math.floor(amount);
      const before = this.rankInfo();
      this.score += value;
      this.awardRankXp(value);
      const after = this.rankInfo();
      if (after.level > before.level) {
        this.roundNewRank = after;
        this.triggerReaction({
          kind: 'rank',
          power: 'rank',
          priority: 100,
          text: this.t('reaction.rank'),
          subtext: after.title,
          force: true
        });
      }
    }

    rankThresholds() {
      return [
        0, 10000, 25000, 45000, 75000,
        120000, 180000, 260000, 365000, 500000,
        675000, 900000, 1190000, 1560000, 2025000,
        2600000, 3325000, 4225000, 5350000, 6750000,
        8500000, 10700000, 13400000, 16800000, 21000000,
        26200000, 32600000, 40500000, 50000000, 62000000
      ];
    }

    rankInfo() {
      const thresholds = this.rankThresholds();
      let index = 0;
      for (let i = thresholds.length - 1; i >= 0; i -= 1) {
        if (this.rankXp >= thresholds[i]) {
          index = i;
          break;
        }
      }
      const current = thresholds[index];
      const next = thresholds[index + 1] === undefined ? current : thresholds[index + 1];
      const span = Math.max(1, next - current);
      const progress = thresholds[index + 1] === undefined ? 1 : Math.max(0, Math.min(1, (this.rankXp - current) / span));
      return {
        index,
        level: index + 1,
        title: this.t('rank.' + (index + 1)),
        xp: this.rankXp,
        current,
        next,
        progress,
        maxed: thresholds[index + 1] === undefined
      };
    }

    notePlayerAction() {
      this.idleTime = 0;
      this.hintTime = 0;
      this.hintMove = null;
    }













    startEndlessGame() {
      this.gameMode = 'endless';
      this.exitRoundConfirmOpen = false;
      this.currentLevel = null;
      this.levelMovesLeft = 0;
      this.levelMovesSpent = 0;
      this.levelExtraMovesGranted = 0;
      this.levelWon = false;
      this.levelResult = '';
      this.pendingLevelWin = false;
      this.pendingLevelReward = 0;
      this.levelContinueAdUsed = false;
      this.levelContinueAdPending = false;
      this.levelSurrendered = false;
      this.nextLevelAdPending = false;
      this.levelSelectOpen = false;
      this.resizeBoard(this.defaultColumns, this.defaultRows, this.defaultColorCount);
      if (this.gameOver || this.needsNewRound) {
        this.resetRound(true);
      }
      this.menuOpen = false;
      this.roundStartCoins = this.coins;
      this.notePlayerAction();
      if (!this.animations.length) {
        this.checkMoveAvailability();
      }
      return true;
    }







    goToMainMenu() {
      this.menuOpen = true;
      this.exitRoundConfirmOpen = false;
      this.levelSelectOpen = false;
      this.gameOver = false;
      this.needsNewRound = true;
      this.noMoves = false;
      this.currentLevel = null;
      this.levelMovesLeft = 0;
      this.levelMovesSpent = 0;
      this.levelExtraMovesGranted = 0;
      this.levelWon = false;
      this.levelResult = '';
      this.levelContinueAdPending = false;
      this.levelSurrendered = false;
      this.nextLevelAdPending = false;
      this.activeBooster = null;
      this.selected = null;
      this.hintMove = null;
      this.dragPreview = null;
      this.finishedAt = null;
      this.effects = [];
      this.popups = [];
      this.reactions = [];
      this.reactionCooldown = 0;
      this.boardBounce = { life: 0, maxLife: 0, power: 0 };
      this.coinFlights = [];
      this.coinSpendBursts = [];
      this.displayCoins = this.coins;
      this.animations = [];
      this.pendingRevert = null;
      this.lastSwap = null;
      this.state = STATE_IDLE;
      this.resizeBoard(this.defaultColumns, this.defaultRows, this.defaultColorCount);
      return true;
    }

    goToMainMenuWithAd() {
      if (!this.gameOver || !this.showInterstitialAdExternal) {
        return this.goToMainMenu();
      }
      if (this.interstitialPending) return false;
      this.interstitialPending = true;
      Promise.resolve(this.showInterstitialAdExternal())
        .finally(() => {
          this.interstitialPending = false;
          this.goToMainMenu();
        });
      return true;
    }

    resetRound(animated = false) {
      this.score = 0;
      this.state = STATE_IDLE;
      this.selected = null;
      this.effects = [];
      this.popups = [];
      this.reactions = [];
      this.reactionCooldown = 0;
      this.boardBounce = { life: 0, maxLife: 0, power: 0 };
      this.coinFlights = [];
      this.coinSpendBursts = [];
      this.animations = [];
      this.pendingRevert = null;
      this.lastSwap = null;
      this.combo = 0;
      this.turns = 0;
      this.goalLevel = 0;
      this.currentGoal = null;
      this.idleTime = 0;
      this.hintMove = null;
      this.hintTime = 0;
      this.dragPreview = null;
      this.noMoves = false;
      this.gameOver = false;
      this.levelWon = false;
      this.levelResult = '';
      this.lastLevelStarsEarned = 0;
      this.scoreSubmitted = false;
      this.scoreSubmitElapsed = 0;
      this.lastSubmittedScore = 0;
      this.gameOverLeaderboardLoading = false;
      this.gameOverLeaderboardError = '';
      this.gameOverLeaderboardEntries = [];
      this.gameOverLeaderboardType = 'endless';
      this.needsNewRound = false;
      this.finishedAt = null;
      this.roundEarnedCoins = 0;
      this.pendingLevelReward = 0;
      this.lastChapterTrophyEarned = null;
      this.roundNewRank = null;
      this.roundStartRankLevel = this.rankInfo().level;
      this.activeBooster = null;
      this.boosterUsesThisRound = this.createBoosterUseMap();
      this.makeBoard(animated);
      if (this.gameMode === 'level') {
        this.applyLevelGoal();
        this.seedLevelStones();
      } else {
        this.nextGoal();
      }
      if (!animated) {
        this.checkMoveAvailability();
      }
    }

    finishRound() {
      if (this.gameMode === 'level' && !this.gameOver) return this.finishLevel(false, { surrendered: true });
      if (this.gameOver) return false;
      this.noMoves = false;
      this.activeBooster = null;
      this.selected = null;
      this.hintMove = null;
      this.gameOver = true;
      this.playSound('roundEnd');
      this.saveRankXp(true);
      this.submitScore();
      this.loadGameOverLeaderboard();
      this.finishedAt = Date.now();
      return true;
    }



    consumeLevelMove() {
      if (this.gameMode !== 'level' || !this.currentLevel || this.gameOver) return;
      this.levelMovesLeft = Math.max(0, this.levelMovesLeft - 1);
      this.levelMovesSpent += 1;
    }











    submitScore() {
      if (this.scoreSubmitted) return;
      this.scoreSubmitted = true;
      this.submitCurrentScore(true);
    }

    submitCurrentScore(force) {
      const value = Math.max(0, Math.floor(this.score || 0));
      if (this.gameMode !== 'endless' || !value || !this.submitScoreExternal) return false;
      if (!force && value === this.lastSubmittedScore) return false;
      this.lastSubmittedScore = value;
      this.submitScoreExternal(value);
      return true;
    }

    loadGameOverLeaderboard(type) {
      if (this.platformFeatures.gameOverLeaderboard === false) {
        this.gameOverLeaderboardLoading = false;
        this.gameOverLeaderboardError = '';
        this.gameOverLeaderboardEntries = [];
        return false;
      }
      this.gameOverLeaderboardLoading = true;
      this.gameOverLeaderboardError = '';
      this.gameOverLeaderboardEntries = [];
      const starsMode = type === 'stars';
      this.gameOverLeaderboardType = starsMode ? 'stars' : 'endless';
      const value = starsMode && this.totalLevelStars ? this.totalLevelStars() : this.score;
      if (this.loadGameOverLeaderboardExternal) {
        this.loadGameOverLeaderboardExternal(value, starsMode ? 'stars' : 'endless');
      } else {
        this.setGameOverLeaderboardEntries([{
          rank: 1,
          name: this.playerName || this.t('leaderboard.player'),
          score: value,
          isPlayer: true
        }]);
      }
      return true;
    }

    setGameOverLeaderboardEntries(entries) {
      this.gameOverLeaderboardEntries = Array.isArray(entries) ? entries : [];
      this.gameOverLeaderboardLoading = false;
      this.gameOverLeaderboardError = '';
    }

    setGameOverLeaderboardError(message) {
      this.gameOverLeaderboardEntries = [];
      this.gameOverLeaderboardLoading = false;
      this.gameOverLeaderboardError = message || this.t('leaderboard.platformOnly');
    }

    openLeaderboard(tab) {
      if (this.platformFeatures.nativeLeaderboard) {
        this.leaderboardOpen = false;
        this.profilePanelOpen = false;
        if (this.openLeaderboardExternal) {
          this.openLeaderboardExternal('endless');
          return true;
        }
        return false;
      }
      this.leaderboardOpen = true;
      const defaultTab = this.gameMode === 'endless' ? 'endless' : 'stars';
      this.leaderboardTab = tab === 'endless' ? 'endless' : (tab === 'stars' ? 'stars' : defaultTab);
      this.profilePanelOpen = false;
      this.leaderboardLoading = true;
      this.leaderboardError = '';
      this.leaderboardEntries = [];
      if (this.openLeaderboardExternal) {
        this.openLeaderboardExternal(this.leaderboardTab);
      } else {
        this.leaderboardLoading = false;
        this.leaderboardError = this.t('leaderboard.unavailable');
      }
      return true;
    }

    switchLeaderboardTab(tab) {
      const next = tab === 'endless' ? 'endless' : 'stars';
      if (next === this.leaderboardTab && this.leaderboardOpen) return true;
      return this.openLeaderboard(next);
    }

    openDeveloperGames() {
      if (this.platformFeatures.developerGames === false) return false;
      if (this.openDeveloperGamesExternal) this.openDeveloperGamesExternal();
      return true;
    }

    closeLeaderboard() {
      this.leaderboardOpen = false;
      return true;
    }

    openProfilePanel() {
      this.profilePanelOpen = true;
      this.leaderboardOpen = false;
      this.xpLeaderboardOpen = false;
      this.coinShopOpen = false;
      return true;
    }

    shouldConfirmBackExit() {
      if (this.exitRoundConfirmOpen) return false;
      if (this.menuOpen || this.gameOver || this.pendingLevelWin) return false;
      return this.gameMode === 'level' || this.gameMode === 'endless';
    }

    requestExitRoundConfirm() {
      if (!this.shouldConfirmBackExit()) return false;
      this.exitRoundConfirmOpen = true;
      this.activeBooster = null;
      this.selected = null;
      this.dragPreview = null;
      this.hintMove = null;
      return true;
    }

    cancelExitRoundConfirm() {
      if (!this.exitRoundConfirmOpen) return false;
      this.exitRoundConfirmOpen = false;
      this.notePlayerAction();
      return true;
    }

    confirmExitRound() {
      if (!this.exitRoundConfirmOpen) return false;
      const mode = this.gameMode;
      this.exitRoundConfirmOpen = false;
      this.activeBooster = null;
      this.selected = null;
      this.dragPreview = null;
      this.hintMove = null;
      this.noMoves = false;
      this.animations = [];
      this.pendingRevert = null;
      this.state = STATE_IDLE;
      if (mode === 'level' && this.openLevelSelect) {
        this.needsNewRound = true;
        this.currentLevel = null;
        this.levelMovesLeft = 0;
        this.levelMovesSpent = 0;
        this.levelExtraMovesGranted = 0;
        this.levelWon = false;
        this.levelResult = '';
        this.levelContinueAdPending = false;
        this.nextLevelAdPending = false;
        this.resizeBoard(this.defaultColumns, this.defaultRows, this.defaultColorCount);
        this.clearBoard();
        return this.openLevelSelect();
      }
      return this.goToMainMenu();
    }

    closeProfilePanel() {
      this.profilePanelOpen = false;
      this.xpLeaderboardOpen = false;
      return true;
    }

    openXpLeaderboard() {
      if (this.platformFeatures.xpLeaderboard === false) return false;
      this.xpLeaderboardOpen = true;
      this.xpLeaderboardLoading = true;
      this.xpLeaderboardError = '';
      this.xpLeaderboardEntries = [];
      if (this.openXpLeaderboardExternal) {
        this.openXpLeaderboardExternal(this.rankXp);
      } else {
        this.xpLeaderboardLoading = false;
        this.xpLeaderboardError = this.t('leaderboard.unavailable');
      }
      return true;
    }

    closeXpLeaderboard() {
      this.xpLeaderboardOpen = false;
      return true;
    }

    setXpLeaderboardEntries(entries) {
      this.xpLeaderboardEntries = Array.isArray(entries) ? entries : [];
      this.xpLeaderboardLoading = false;
      this.xpLeaderboardError = '';
    }

    setXpLeaderboardError(message) {
      this.xpLeaderboardEntries = [];
      this.xpLeaderboardLoading = false;
      this.xpLeaderboardError = message || this.t('leaderboard.loadError');
    }

    setLeaderboardEntries(entries) {
      this.leaderboardEntries = Array.isArray(entries) ? entries : [];
      this.leaderboardLoading = false;
      this.leaderboardError = '';
    }

    setLeaderboardError(message) {
      this.leaderboardEntries = [];
      this.leaderboardLoading = false;
      this.leaderboardError = message || this.t('leaderboard.loadError');
    }

    checkMoveAvailability() {
      if (this.state !== STATE_IDLE || this.gameOver || this.menuOpen) return;
      if (this.checkLevelOutOfMoves()) return;
      const move = this.findHintMove();
      this.noMoves = !move;
      if (this.noMoves) {
        this.hintMove = null;
        this.hintTime = 0;
        if (this.gameMode === 'level' && this.currentLevel && this.currentLevel.n <= (this.levelConfig.shuffleGraceUntil || 25)) {
          this.reshuffleLevelBoard();
          return;
        }
        if (this.gameMode !== 'level' && !this.hasUsableBoosters()) {
          this.finishRound();
        }
      }
    }

    reshuffleLevelBoard() {
      if (this.gameMode !== 'level') return false;
      this.noMoves = false;
      this.selected = null;
      this.activeBooster = null;
      this.makeBoard(true);
      this.seedLevelStones();
      return true;
    }

    seedLevelStones() {
      const level = this.currentLevel;
      const rawCount = level && level.stonesStart !== undefined ? level.stonesStart : level && level.stones;
      const count = Math.max(0, Math.floor(Number(rawCount) || 0));
      if (!count) return;
      const cells = [];
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          cells.push({ col, row });
        }
      }
      for (let i = cells.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = cells[i];
        cells[i] = cells[j];
        cells[j] = temp;
      }
      cells.slice(0, Math.min(count, cells.length)).forEach((cell) => {
        const stone = this.createStone(cell.col, cell.row, cell.row);
        stone.x = cell.col;
        stone.scale = 1;
        stone.alpha = 1;
        this.tiles[cell.row][cell.col] = stone;
      });
    }

    wouldMatch(col, row, type) {
      const leftA = this.tileAt(col - 1, row);
      const leftB = this.tileAt(col - 2, row);
      const upA = this.tileAt(col, row - 1);
      const upB = this.tileAt(col, row - 2);
      return (this.isMatchable(leftA) && this.isMatchable(leftB) && leftA.type === type && leftB.type === type) ||
        (this.isMatchable(upA) && this.isMatchable(upB) && upA.type === type && upB.type === type);
    }

    tileAt(col, row) {
      if (row < 0 || row >= this.rows || col < 0 || col >= this.columns) return null;
      return this.tiles[row][col];
    }

    setDragPreview(fromCol, fromRow, toCol, toRow, progress) {
      if (this.menuOpen || this.gameOver || this.noMoves) return false;
      if (this.state !== STATE_IDLE || this.activeBooster) return false;
      if (!this.areNeighbors({ col: fromCol, row: fromRow }, { col: toCol, row: toRow })) return false;
      const fromTile = this.tileAt(fromCol, fromRow);
      const toTile = this.tileAt(toCol, toRow);
      if (!fromTile || !toTile || this.isStone(fromTile) || this.isStone(toTile)) return false;
      const amount = Math.max(0, Math.min(0.86, progress));
      this.dragPreview = {
        from: { col: fromCol, row: fromRow },
        to: { col: toCol, row: toRow },
        dx: (toCol - fromCol) * amount,
        dy: (toRow - fromRow) * amount
      };
      this.notePlayerAction();
      return true;
    }

    clearDragPreview() {
      this.dragPreview = null;
    }

    trySelect(col, row) {
      if (this.menuOpen) return false;
      if (this.gameOver || this.pendingLevelWin) return false;
      if (this.state !== STATE_IDLE) return false;
      this.clearDragPreview();
      const tile = this.tileAt(col, row);
      if (!tile) return false;

      if (this.activeBooster) {
        return this.useBooster(col, row);
      }
      if (this.noMoves) return false;

      if (!this.selected) {
        if (this.isStone(tile)) return false;
        this.selected = { col, row };
        return true;
      }

      if (this.selected.col === col && this.selected.row === row) {
        this.selected = null;
        return true;
      }

      if (this.areNeighbors(this.selected, { col, row })) {
        const from = this.selected;
        this.selected = null;
        if (this.tryActivateRainbowPair(from, { col, row })) return true;
        if (this.isStone(tile)) return false;
        this.swapTiles(from, { col, row }, false);
        return true;
      }

      if (this.isStone(tile)) return false;
      this.selected = { col, row };
      return true;
    }

    trySwipe(fromCol, fromRow, toCol, toRow) {
      if (this.menuOpen) return false;
      if (this.gameOver || this.noMoves || this.pendingLevelWin) return false;
      if (this.state !== STATE_IDLE || this.activeBooster) return false;
      if (!this.tileAt(fromCol, fromRow) || !this.tileAt(toCol, toRow)) {
        this.clearDragPreview();
        return false;
      }
      if (!this.areNeighbors({ col: fromCol, row: fromRow }, { col: toCol, row: toRow })) {
        this.clearDragPreview();
        return false;
      }
      if (this.tryActivateRainbowPair({ col: fromCol, row: fromRow }, { col: toCol, row: toRow })) {
        this.clearDragPreview();
        return true;
      }
      if (this.isStone(this.tileAt(fromCol, fromRow)) || this.isStone(this.tileAt(toCol, toRow))) {
        this.clearDragPreview();
        return false;
      }
      this.selected = null;
      this.swapTiles({ col: fromCol, row: fromRow }, { col: toCol, row: toRow }, false);
      return true;
    }

    tryActivateRainbowPair(a, b) {
      const tileA = this.tileAt(a.col, a.row);
      const tileB = this.tileAt(b.col, b.row);
      if (!tileA || !tileB) return false;

      const rainbow = tileA.special === 'rainbow' ? tileA : tileB.special === 'rainbow' ? tileB : null;
      const target = rainbow === tileA ? tileB : rainbow === tileB ? tileA : null;
      if (!rainbow || !target) return false;

      const clearSet = new Map();
      rainbow.specialExpanded = true;
      clearSet.set(rainbow.id, rainbow);
      if (this.isStone(target)) {
        this.addStonesToClear(clearSet);
      } else {
        this.addTypeToClear(target.type, clearSet);
      }
      this.markRainbowClearDelays(rainbow.col, rainbow.row, clearSet);

      this.combo = 1;
      this.turns += 1;
      this.consumeLevelMove();
      this.noMoves = false;
      this.hintMove = null;
      this.addGoalProgress('special', 1);
      this.addGoalProgress('rainbowUse', 1);
      this.clearManualSet(clearSet, 'RAINBOW');
      return true;
    }

    areNeighbors(a, b) {
      return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
    }

    swapTiles(a, b, isRevert) {
      const tileA = this.tileAt(a.col, a.row);
      const tileB = this.tileAt(b.col, b.row);
      if (!tileA || !tileB) return;
      const drag = !isRevert ? this.dragPreview : null;

      this.tiles[a.row][a.col] = tileB;
      this.tiles[b.row][b.col] = tileA;
      tileA.col = b.col;
      tileA.row = b.row;
      tileB.col = a.col;
      tileB.row = a.row;
      if (drag && drag.from.col === a.col && drag.from.row === a.row && drag.to.col === b.col && drag.to.row === b.row) {
        tileA.x = a.col + drag.dx;
        tileA.y = a.row + drag.dy;
        tileB.x = b.col - drag.dx;
        tileB.y = b.row - drag.dy;
      } else if (drag && drag.from.col === b.col && drag.from.row === b.row && drag.to.col === a.col && drag.to.row === a.row) {
        tileA.x = a.col - drag.dx;
        tileA.y = a.row - drag.dy;
        tileB.x = b.col + drag.dx;
        tileB.y = b.row + drag.dy;
      }
      this.clearDragPreview();
      this.state = STATE_SWAP;
      this.lastSwap = isRevert ? null : { a: tileA, b: tileB };
      this.animations = [
        this.tween(tileA, { x: b.col, y: b.row }, 180, 'swap'),
        this.tween(tileB, { x: a.col, y: a.row }, 180, 'swap')
      ];
      this.pendingRevert = isRevert ? null : { a, b };
    }

    update(dt) {
      if (this.menuOpen) {
        this.updateEffects(dt);
        return;
      }
      if (this.gameOver) {
        this.updateEffects(dt);
        return;
      }
      this.updateTweens(dt);
      this.updateEffects(dt);
      this.updateHint(dt);
      this.updateScoreSubmission(dt);

      if (this.animations.length > 0) return;

      if (this.state === STATE_SWAP) {
        const matches = this.findMatches();
        if (matches.length) {
          this.pendingRevert = null;
          this.combo = 0;
          this.turns += 1;
          this.consumeLevelMove();
          this.clearMatches(matches);
        } else if (this.pendingRevert) {
          this.playSound('swapError');
          const reverse = this.pendingRevert;
          this.pendingRevert = null;
          this.swapTiles(reverse.b, reverse.a, true);
        } else {
          this.lastSwap = null;
          this.state = STATE_IDLE;
          this.checkMoveAvailability();
        }
      } else if (this.state === STATE_CLEAR) {
        this.dropTiles();
      } else if (this.state === STATE_DROP) {
        const chain = this.findMatches();
        if (chain.length) {
          this.lastSwap = null;
          this.clearMatches(chain);
        } else {
          this.combo = 0;
          this.lastSwap = null;
          this.state = STATE_IDLE;
          if (this.pendingLevelWin) {
            this.finishLevel(true);
            return;
          }
          if (this.checkLevelOutOfMoves()) return;
          this.checkMoveAvailability();
        }
      }
    }

    updateScoreSubmission(dt) {
      if (this.gameMode !== 'endless' || !this.submitScoreExternal || this.menuOpen || this.gameOver || this.score <= 0) return;
      this.scoreSubmitElapsed += dt;
      if (this.scoreSubmitElapsed < this.scoreSubmitInterval) return;
      this.scoreSubmitElapsed = 0;
      this.submitCurrentScore(false);
    }

    updateHint(dt) {
      if (this.state !== STATE_IDLE || this.animations.length > 0 || this.activeBooster) {
        this.idleTime = 0;
        this.hintTime = 0;
        this.hintMove = null;
        return;
      }

      this.idleTime += dt;
      if (this.idleTime < this.hintDelay) return;
      if (this.noMoves) return;

      if (!this.hintMove) {
        this.hintMove = this.findHintMove();
        this.hintTime = 0;
      } else {
        this.hintTime += dt;
        if (this.hintTime > 3600) {
          this.hintMove = this.findHintMove();
          this.hintTime = 0;
        }
      }
    }

    findHintMove() {
      const directions = [
        { col: 1, row: 0 },
        { col: 0, row: 1 }
      ];

      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          const tile = this.tileAt(col, row);
          if (!tile) continue;

          for (let i = 0; i < directions.length; i += 1) {
            const nextCol = col + directions[i].col;
            const nextRow = row + directions[i].row;
            const other = this.tileAt(nextCol, nextRow);
            if (!other) continue;
            if (tile.special === 'rainbow' || other.special === 'rainbow') {
              return {
                a: { col, row },
                b: { col: nextCol, row: nextRow }
              };
            }
            if (!this.isMatchable(tile) || !this.isMatchable(other)) continue;
            if (this.swapWouldMatch(col, row, nextCol, nextRow)) {
              return {
                a: { col, row },
                b: { col: nextCol, row: nextRow }
              };
            }
          }
        }
      }

      return null;
    }

    swapWouldMatch(aCol, aRow, bCol, bRow) {
      const tileA = this.tileAt(aCol, aRow);
      const tileB = this.tileAt(bCol, bRow);
      if (!this.isMatchable(tileA) || !this.isMatchable(tileB)) return false;

      this.tiles[aRow][aCol] = tileB;
      this.tiles[bRow][bCol] = tileA;
      tileA.col = bCol;
      tileA.row = bRow;
      tileB.col = aCol;
      tileB.row = aRow;

      const hasMatch = this.findMatches().length > 0;

      this.tiles[aRow][aCol] = tileA;
      this.tiles[bRow][bCol] = tileB;
      tileA.col = aCol;
      tileA.row = aRow;
      tileB.col = bCol;
      tileB.row = bRow;

      return hasMatch;
    }

    updateTweens(dt) {
      this.animations = this.animations.filter((animation) => {
        animation.elapsed += dt;
        const delay = animation.delay || 0;
        if (animation.elapsed < delay) {
          return true;
        }
        const activeElapsed = animation.elapsed - delay;
        const t = Math.min(1, activeElapsed / animation.duration);
        const eased = 1 - Math.pow(1 - t, 3);
        Object.keys(animation.to).forEach((key) => {
          animation.target[key] = animation.from[key] + (animation.to[key] - animation.from[key]) * eased;
        });
        return t < 1;
      });
    }

    tween(target, to, duration, kind, delay = 0) {
      const from = {};
      Object.keys(to).forEach((key) => {
        from[key] = target[key];
      });
      return { target, from, to, duration, elapsed: 0, kind, delay };
    }

    findMatches() {
      const matched = new Map();
      const groups = [];

      for (let row = 0; row < this.rows; row += 1) {
        let run = [];
        for (let col = 0; col < this.columns; col += 1) {
          const tile = this.tileAt(col, row);
          const prev = run.length ? run[0] : null;
          if (this.isMatchable(tile) && prev && tile.type === prev.type) {
            run.push(tile);
          } else {
            this.collectRun(run, matched, groups, 'h');
            run = this.isMatchable(tile) ? [tile] : [];
          }
        }
        this.collectRun(run, matched, groups, 'h');
      }

      for (let col = 0; col < this.columns; col += 1) {
        let run = [];
        for (let row = 0; row < this.rows; row += 1) {
          const tile = this.tileAt(col, row);
          const prev = run.length ? run[0] : null;
          if (this.isMatchable(tile) && prev && tile.type === prev.type) {
            run.push(tile);
          } else {
            this.collectRun(run, matched, groups, 'v');
            run = this.isMatchable(tile) ? [tile] : [];
          }
        }
        this.collectRun(run, matched, groups, 'v');
      }

      const tiles = Array.from(matched.values());
      tiles.groups = groups;
      return tiles;
    }

    collectRun(run, matched, groups, direction) {
      if (run.length < 3) return;
      groups.push({ tiles: run.slice(), direction, length: run.length });
      run.forEach((tile) => matched.set(tile.id, tile));
    }

    clearMatches(matches) {
      this.state = STATE_CLEAR;
      this.combo += 1;

      const clearSet = new Map();
      matches.forEach((tile) => clearSet.set(tile.id, tile));
      const createdSpecial = this.createSpecialFromMatches(matches.groups || []);
      const activatedSpecials = this.expandSpecialClears(clearSet);

      if (createdSpecial) {
        clearSet.delete(createdSpecial.tile.id);
      }

      const clearTiles = Array.from(clearSet.values());
      const gemCount = clearTiles.filter((tile) => !this.isStone(tile)).length;
      const stoneCount = clearTiles.length - gemCount;
      if (gemCount > 0) this.playSound('gemBreak');
      if (stoneCount > 0) this.playSound('stone');
      const gained = gemCount * 80 * this.combo + stoneCount * 45 + Math.max(0, this.combo - 1) * 120;
      this.addScore(gained);
      this.evaluateReaction({ combo: this.combo, cleared: clearTiles.length, gained });
      let centerCol = 0;
      let centerRow = 0;
      clearTiles.forEach((tile) => {
        centerCol += tile.col;
        centerRow += tile.row;
      });
      const hasClearCenter = clearTiles.length > 0;
      const source = hasClearCenter ? {
        kind: 'board',
        x: centerCol / clearTiles.length + 0.5,
        y: centerRow / clearTiles.length + 0.5
      } : null;
      this.addCoins((Math.max(1, Math.floor(gemCount / 3)) + stoneCount + Math.max(0, this.combo - 1)) * 10, source);
      this.addGoalProgress('score', gained);
      this.addGoalProgress('stones', stoneCount);
      this.addGoalProgress('combo', this.combo > 1 ? 1 : 0);
      this.addGoalProgress('special', activatedSpecials);
      this.addGoalProgress('match4', (matches.groups || []).filter((group) => group.length >= 4).length);

      for (let type = 0; type < this.colorCount; type += 1) {
        const colorClears = clearTiles.filter((tile) => !this.isStone(tile) && tile.type === type).length;
        this.addGoalProgress('color', colorClears, type);
      }

      centerCol = 0;
      centerRow = 0;
      clearTiles.forEach((tile) => {
        const delay = tile.clearDelay || 0;
        centerCol += tile.col;
        centerRow += tile.row;
        if (tile.special === 'rainbow') {
          this.spawnRainbowBurst(tile.col, tile.row, delay);
        } else {
          if (tile.clearEffect === 'rainbow') {
            this.spawnRainbowHit(tile.col, tile.row, this.isStone(tile) ? -1 : tile.type, delay);
          }
          this.spawnBurst(tile.col, tile.row, this.isStone(tile) ? -1 : tile.type, tile.special, delay, tile.clearEffect === 'special' || tile.clearEffect === 'rainbow');
        }
        tile.removing = true;
        this.animations.push(this.tween(tile, { scale: 0.15, alpha: 0 }, 230, 'clear', delay));
      });

      if (createdSpecial) {
        createdSpecial.tile.special = createdSpecial.kind;
        createdSpecial.tile.specialExpanded = false;
        createdSpecial.tile.removing = false;
        createdSpecial.tile.scale = 0.35;
        createdSpecial.tile.alpha = 0.35;
        this.animations.push(this.tween(createdSpecial.tile, { scale: 1, alpha: 1 }, 220, 'special'));
        if (createdSpecial.kind === 'bomb') this.addGoalProgress('createBomb', 1);
        if (createdSpecial.kind === 'rainbow') this.addGoalProgress('createRainbow', 1);
      }
    }

    createSpecialFromMatches(groups) {
      const groupByTile = new Map();
      groups.forEach((group) => {
        group.tiles.forEach((tile) => {
          if (!groupByTile.has(tile.id)) groupByTile.set(tile.id, []);
          groupByTile.get(tile.id).push(group);
        });
      });

      const intersection = Array.from(groupByTile.entries()).find((entry) => entry[1].length > 1);
      const candidates = groups.filter((group) => group.length >= 4);
      if (!intersection && !candidates.length) return null;

      const best = candidates.sort((a, b) => b.length - a.length)[0];
      let tile = best ? this.pickSpecialTile(best.tiles) : this.tileById(intersection[0]);
      let kind = best && best.direction === 'h' ? 'lineV' : 'lineH';
      let label = 'LINE';

      if (intersection) {
        tile = this.tileById(intersection[0]) || tile;
        const uniqueTiles = new Map();
        intersection[1].forEach((group) => {
          group.tiles.forEach((groupTile) => uniqueTiles.set(groupTile.id, groupTile));
        });
        if (uniqueTiles.size >= 7) {
          kind = 'rainbow';
          label = 'RAINBOW';
        } else {
          kind = 'bomb';
          label = 'BOMB';
        }
      } else if (best.length >= 5) {
        kind = 'rainbow';
        label = 'RAINBOW';
      }

      return { tile, kind, label };
    }

    pickSpecialTile(tiles) {
      if (this.lastSwap) {
        const swapped = tiles.find((tile) => tile.id === this.lastSwap.a.id || tile.id === this.lastSwap.b.id);
        if (swapped) return swapped;
      }
      return tiles[Math.floor(tiles.length / 2)];
    }

    tileById(id) {
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          const tile = this.tileAt(col, row);
          if (tile && tile.id === id) return tile;
        }
      }
      return null;
    }

    expandSpecialClears(clearSet) {
      let changed = true;
      let activated = 0;
      while (changed) {
        changed = false;
        Array.from(clearSet.values()).forEach((tile) => {
          if (!tile.special || tile.specialExpanded) return;
          tile.specialExpanded = true;
          activated += 1;
          const before = clearSet.size;
          if (tile.special === 'lineH') {
            this.spawnLineBeam(tile.col, tile.row, tile.type, 'h');
            this.addRowToClear(tile.row, clearSet, true);
            this.markLineClearDelays(tile.col, tile.row, 'h', clearSet);
          }
          if (tile.special === 'lineV') {
            this.spawnLineBeam(tile.col, tile.row, tile.type, 'v');
            this.addColumnToClear(tile.col, clearSet, true);
            this.markLineClearDelays(tile.col, tile.row, 'v', clearSet);
          }
          if (tile.special === 'bomb') {
            this.spawnBombBlast(tile.col, tile.row, tile.type);
            this.addAreaToClear(tile.col, tile.row, 1, clearSet);
            this.markBombClearDelays(tile.col, tile.row, clearSet);
          }
          if (tile.special === 'rainbow') {
            this.addTypeToClear(tile.type, clearSet);
            this.markRainbowClearDelays(tile.col, tile.row, clearSet);
          }
          if (clearSet.size > before) changed = true;
        });
      }
      return activated;
    }

    markBombClearDelays(originCol, originRow, clearSet) {
      const step = 95;
      Array.from(clearSet.values()).forEach((tile) => {
        if (!tile) return;
        const dx = Math.abs(tile.col - originCol);
        const dy = Math.abs(tile.row - originRow);
        if (dx > 1 || dy > 1) return;
        const distance = Math.max(dx, dy);
        const delay = distance * step;
        tile.clearDelay = tile.clearDelay === undefined ? delay : Math.min(tile.clearDelay, delay);
        tile.clearEffect = tile.clearEffect || 'special';
      });
    }

    markRainbowClearDelays(originCol, originRow, clearSet) {
      const step = 58;
      Array.from(clearSet.values()).forEach((tile) => {
        if (!tile) return;
        const dx = tile.col - originCol;
        const dy = tile.row - originRow;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = Math.round(distance * step);
        tile.clearDelay = tile.clearDelay === undefined ? delay : Math.min(tile.clearDelay, delay);
        tile.clearEffect = 'rainbow';
      });
    }

    markSpecialClear(clearSet) {
      Array.from(clearSet.values()).forEach((tile) => {
        if (tile) tile.clearEffect = tile.clearEffect || 'special';
      });
    }

    markLineClearDelays(originCol, originRow, direction, clearSet) {
      const step = 82;
      Array.from(clearSet.values()).forEach((tile) => {
        if (!tile) return;
        const onLine = direction === 'h' ? tile.row === originRow : tile.col === originCol;
        if (!onLine) return;
        const distance = direction === 'h' ? Math.abs(tile.col - originCol) : Math.abs(tile.row - originRow);
        const delay = distance * step;
        tile.clearDelay = tile.clearDelay === undefined ? delay : Math.min(tile.clearDelay, delay);
        tile.clearEffect = tile.clearEffect || 'special';
      });
    }

    addRowToClear(row, clearSet, includeStones) {
      for (let col = 0; col < this.columns; col += 1) {
        const tile = this.tileAt(col, row);
        if (tile && (includeStones || !this.isStone(tile))) clearSet.set(tile.id, tile);
      }
    }

    addColumnToClear(col, clearSet, includeStones) {
      for (let row = 0; row < this.rows; row += 1) {
        const tile = this.tileAt(col, row);
        if (tile && (includeStones || !this.isStone(tile))) clearSet.set(tile.id, tile);
      }
    }

    addAreaToClear(col, row, radius, clearSet) {
      for (let y = row - radius; y <= row + radius; y += 1) {
        for (let x = col - radius; x <= col + radius; x += 1) {
          const tile = this.tileAt(x, y);
          if (tile) clearSet.set(tile.id, tile);
        }
      }
    }

    addTypeToClear(type, clearSet) {
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          const tile = this.tileAt(col, row);
          if (tile && !this.isStone(tile) && tile.type === type) clearSet.set(tile.id, tile);
        }
      }
    }

    addStonesToClear(clearSet) {
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          const tile = this.tileAt(col, row);
          if (this.isStone(tile)) clearSet.set(tile.id, tile);
        }
      }
    }

    selectBooster(id) {
      if (this.menuOpen) return false;
      if (this.gameOver || this.pendingLevelWin) return false;
      if (this.state !== STATE_IDLE) return false;
      const booster = this.availableBoosters().find((item) => item.id === id);
      if (!booster || this.coins < this.currentBoosterCost(booster)) return false;
      this.selected = null;
      this.activeBooster = this.activeBooster === id ? null : id;
      return true;
    }

    useBooster(col, row) {
      if (this.gameOver || this.pendingLevelWin) return false;
      const booster = this.availableBoosters().find((item) => item.id === this.activeBooster);
      const tile = this.tileAt(col, row);
      const cost = booster ? this.currentBoosterCost(booster) : 0;
      if (!booster || this.coins < cost || !tile) return false;

      const clearSet = new Map();
      if (booster.id === 'hammer') clearSet.set(tile.id, tile);
      if (booster.id === 'hammer') this.playSound(this.isStone(tile) ? 'stone' : 'hammer');
      if (booster.id === 'bomb') {
        this.spawnBombBlast(col, row, this.isStone(tile) ? 4 : tile.type);
        this.addAreaToClear(col, row, 1, clearSet);
        this.markBombClearDelays(col, row, clearSet);
      }
      if (booster.id === 'rainbow') {
        if (this.isStone(tile)) {
          this.addStonesToClear(clearSet);
        } else {
          this.addTypeToClear(tile.type, clearSet);
        }
        this.markRainbowClearDelays(col, row, clearSet);
      }

      if (!this.spendCoins(cost)) return false;
      this.boosterUsesThisRound[booster.id] = (this.boosterUsesThisRound[booster.id] || 0) + 1;
      this.noMoves = false;
      this.activeBooster = null;
      this.selected = null;
      this.combo = 1;
      this.turns += 1;
      this.consumeLevelMove();
      this.addGoalProgress('useBooster', 1);
      this.clearManualSet(clearSet, booster.id.toUpperCase());
      return true;
    }

    clearManualSet(clearSet, label) {
      this.state = STATE_CLEAR;
      const activatedSpecials = this.expandSpecialClears(clearSet);
      const tiles = Array.from(clearSet.values());
      const stoneCount = tiles.filter((tile) => this.isStone(tile)).length;
      if (stoneCount > 0) this.playSound('stone');
      const gained = tiles.length * 60 + stoneCount * 40;
      this.addScore(gained);
      this.evaluateReaction({ combo: this.combo, cleared: tiles.length, gained });
      let centerCol = 0;
      let centerRow = 0;
      tiles.forEach((tile) => {
        centerCol += tile.col;
        centerRow += tile.row;
      });
      const source = tiles.length ? {
        kind: 'board',
        x: centerCol / tiles.length + 0.5,
        y: centerRow / tiles.length + 0.5
      } : null;
      this.addCoins((Math.max(1, Math.floor(tiles.length / 4)) + stoneCount) * 10, source);
      this.addGoalProgress('score', gained);
      this.addGoalProgress('stones', stoneCount);
      this.addGoalProgress('special', activatedSpecials);

      for (let type = 0; type < this.colorCount; type += 1) {
        const colorClears = tiles.filter((tile) => !this.isStone(tile) && tile.type === type).length;
        this.addGoalProgress('color', colorClears, type);
      }

      centerCol = 0;
      centerRow = 0;
      tiles.forEach((tile) => {
        const delay = tile.clearDelay || 0;
        centerCol += tile.col;
        centerRow += tile.row;
        if (tile.special === 'rainbow') {
          this.spawnRainbowBurst(tile.col, tile.row, delay);
        } else {
          if (tile.clearEffect === 'rainbow') {
            this.spawnRainbowHit(tile.col, tile.row, this.isStone(tile) ? -1 : tile.type, delay);
          }
          this.spawnBurst(tile.col, tile.row, this.isStone(tile) ? -1 : tile.type, tile.special, delay, true);
        }
        tile.removing = true;
        this.animations.push(this.tween(tile, { scale: 0.15, alpha: 0 }, 230, 'clear', delay));
      });

    }

    dropTiles() {
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.columns; col += 1) {
          const tile = this.tileAt(col, row);
          if (tile && tile.removing) {
            this.tiles[row][col] = null;
          } else if (tile) {
            tile.specialExpanded = false;
          }
        }
      }

      for (let col = 0; col < this.columns; col += 1) {
        let writeRow = this.rows - 1;
        for (let row = this.rows - 1; row >= 0; row -= 1) {
          const tile = this.tileAt(col, row);
          if (!tile) continue;
          this.tiles[writeRow][col] = tile;
          tile.row = writeRow;
          tile.col = col;
          if (writeRow !== row) {
            this.tiles[row][col] = null;
            const delay = col * 12 + Math.random() * 70;
            const duration = 280 + (writeRow - row) * 38 + Math.random() * 70;
            this.animations.push(this.tween(tile, { x: col, y: writeRow }, duration, 'drop', delay));
          }
          writeRow -= 1;
        }

        for (let row = writeRow; row >= 0; row -= 1) {
          const visualRow = row - writeRow - 1 - Math.random() * 1.4;
          const tile = this.createIncomingTile(col, row, visualRow);
          this.tiles[row][col] = tile;
          const delay = col * 18 + (writeRow - row) * 24 + Math.random() * 100;
          const duration = 360 + (writeRow - row + 1) * 48 + Math.random() * 90;
          this.animations.push(this.tween(tile, { x: col, y: row }, duration, 'drop', delay));
        }
      }

      this.state = STATE_DROP;
    }
  }

  window.CrystalMatchGame = CrystalMatchGame;
})();




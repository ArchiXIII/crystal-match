(function () {
  'use strict';

  class CrystalMatchInput {
    constructor(canvas, game, renderer) {
      this.canvas = canvas;
      this.game = game;
      this.renderer = renderer;
      this.startCell = null;
      this.startPoint = null;
      this.pointerId = null;
      this.bind();
    }

    bind() {
      this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
      this.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
      this.canvas.addEventListener('pointerup', (event) => this.onPointerUp(event));
      this.canvas.addEventListener('pointercancel', () => this.reset());
      this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
      this.canvas.addEventListener('auxclick', (event) => event.preventDefault());
      this.canvas.addEventListener('dragstart', (event) => event.preventDefault());
      this.canvas.addEventListener('drop', (event) => event.preventDefault());
    }

    onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        event.preventDefault();
        this.reset();
        return;
      }
      if (this.renderer.isMobileLandscapeBlocked && this.renderer.isMobileLandscapeBlocked()) {
        this.reset();
        return;
      }
      this.game.notePlayerAction();
      this.game.clearDragPreview();
      if (this.game.exitRoundConfirmOpen) {
        const confirmExit = this.renderer.pointToExitRoundConfirmConfirm && this.renderer.pointToExitRoundConfirmConfirm(event.clientX, event.clientY);
        const cancelExit = this.renderer.pointToExitRoundConfirmCancel && this.renderer.pointToExitRoundConfirmCancel(event.clientX, event.clientY);
        if (confirmExit) {
          this.game.playSound('button');
          this.game.confirmExitRound();
        } else if (cancelExit) {
          this.game.playSound('button');
          this.game.cancelExitRoundConfirm();
        }
        this.reset();
        return;
      }
      if (this.game.coinShopOpen) {
        const shopClose = this.renderer.pointToCoinShopClose(event.clientX, event.clientY);
        if (shopClose) {
          this.game.playSound('button');
          this.game.closeCoinShop();
          this.reset();
          return;
        }
        const adReward = this.renderer.pointToCoinShopAdReward(event.clientX, event.clientY);
        if (adReward) {
          const source = { kind: 'screen', x: adReward.x + adReward.w / 2, y: adReward.y + adReward.h / 2 };
          if (this.game.claimAdReward && this.game.claimAdReward(source)) {
            this.game.playSound('button');
          } else {
            this.game.playSound('swapError');
          }
          this.reset();
          return;
        }
        if (this.game.coinShopError) {
          this.reset();
          return;
        }
        const pack = this.renderer.pointToCoinShopPackage(event.clientX, event.clientY);
        if (pack) {
          this.game.playSound('button');
          this.game.buyCoinPackage(pack.id, { kind: 'screen', x: pack.x + pack.w / 2, y: pack.y + pack.h / 2 });
        }
        this.reset();
        return;
      }
      if (this.game.xpLeaderboardOpen) {
        const xpClose = this.renderer.pointToXpLeaderboardClose && this.renderer.pointToXpLeaderboardClose(event.clientX, event.clientY);
        if (xpClose) {
          this.game.playSound('button');
          this.game.closeXpLeaderboard();
        }
        this.reset();
        return;
      }
      if (this.game.profilePanelOpen) {
        const profileClose = this.renderer.pointToProfileClose(event.clientX, event.clientY);
        if (profileClose) {
          this.game.playSound('button');
          this.game.closeProfilePanel();
          this.reset();
          return;
        }
        const profileXp = this.renderer.pointToProfileXp && this.renderer.pointToProfileXp(event.clientX, event.clientY);
        if (profileXp) {
          this.game.playSound('button');
          this.game.openXpLeaderboard();
        }
        this.reset();
        return;
      }
      if (this.game.leaderboardOpen) {
        const leaderboardClose = this.renderer.pointToLeaderboardClose(event.clientX, event.clientY);
        if (leaderboardClose) {
          this.game.playSound('button');
          this.game.closeLeaderboard();
          this.reset();
          return;
        }
        const leaderboardTab = this.renderer.pointToLeaderboardTab && this.renderer.pointToLeaderboardTab(event.clientX, event.clientY);
        if (leaderboardTab) {
          const changed = this.game.switchLeaderboardTab && this.game.switchLeaderboardTab(leaderboardTab.tab);
          this.game.playSound(changed ? 'button' : 'swapError');
        }
        this.reset();
        return;
      }
      const levelContinueAdButton = this.renderer.pointToLevelContinueAdButton(event.clientX, event.clientY);
      if (levelContinueAdButton) {
        const started = this.game.continueLevelWithAd && this.game.continueLevelWithAd();
        this.game.playSound(started ? 'button' : 'swapError');
        this.reset();
        return;
      }
      const levelRewardDoubleAdButton = this.renderer.pointToLevelRewardDoubleAdButton && this.renderer.pointToLevelRewardDoubleAdButton(event.clientX, event.clientY);
      if (levelRewardDoubleAdButton) {
        const started = this.game.doubleLevelRewardWithAd && this.game.doubleLevelRewardWithAd();
        this.game.playSound(started ? 'button' : 'swapError');
        this.reset();
        return;
      }
      const restartLevelButton = this.renderer.pointToRestartLevelButton && this.renderer.pointToRestartLevelButton(event.clientX, event.clientY);
      if (restartLevelButton) {
        const restarted = this.game.restartCurrentLevel && this.game.restartCurrentLevel();
        this.game.playSound(restarted ? 'button' : 'swapError');
        this.reset();
        return;
      }
      const nextLevelButton = this.renderer.pointToNextLevelButton && this.renderer.pointToNextLevelButton(event.clientX, event.clientY);
      if (nextLevelButton) {
        const started = this.game.startNextLevel && this.game.startNextLevel();
        this.game.playSound(started ? 'button' : 'swapError');
        this.reset();
        return;
      }
      const mainMenuButton = this.renderer.pointToMainMenuButton(event.clientX, event.clientY);
      if (mainMenuButton) {
        this.game.playSound('button');
        if (this.game.levelSelectOpen && this.game.closeLevelSelect) {
          this.game.closeLevelSelect();
        } else if (this.game.goToMainMenuWithAd) this.game.goToMainMenuWithAd();
        else this.game.goToMainMenu();
        this.reset();
        return;
      }
      if (this.game.levelSelectOpen) {
        const leaderboardButton = this.renderer.pointToLeaderboardButton(event.clientX, event.clientY);
        if (leaderboardButton) {
          this.game.playSound('button');
          this.game.openLeaderboard();
          this.reset();
          return;
        }
        const coinShopButton = this.renderer.pointToCoinShopButton(event.clientX, event.clientY);
        if (coinShopButton) {
          this.game.playSound('button');
          this.game.openCoinShop();
          this.reset();
          return;
        }
        const soundButton = this.renderer.pointToSoundButton(event.clientX, event.clientY);
        if (soundButton) {
          this.game.toggleSound();
          this.game.playSound('button');
          this.reset();
          return;
        }
        const profileButton = this.renderer.pointToProfileButton(event.clientX, event.clientY);
        if (profileButton) {
          this.game.playSound('button');
          this.game.openProfilePanel();
          this.reset();
          return;
        }
      }
      if (this.game.levelSelectOpen) {
        const levelNav = this.renderer.pointToLevelNavButton(event.clientX, event.clientY);
        if (levelNav) {
          const changed = this.game.changeLevelChapter && this.game.changeLevelChapter(levelNav.dir);
          this.game.playSound(changed ? 'button' : 'swapError');
          this.reset();
          return;
        }
        const levelPlay = this.renderer.pointToLevelPlayButton(event.clientX, event.clientY);
        if (levelPlay) {
          const started = this.game.startSelectedLevel && this.game.startSelectedLevel();
          this.game.playSound(started ? 'button' : 'swapError');
          if (started && this.game.audio && this.game.audio.startMusic) this.game.audio.startMusic();
          this.reset();
          return;
        }
        const levelButton = this.renderer.pointToLevelButton(event.clientX, event.clientY);
        if (levelButton) {
          const selected = this.game.selectLevel ? this.game.selectLevel(levelButton.level) : false;
          this.game.playSound(selected ? 'button' : 'swapError');
        }
        this.reset();
        return;
      }
      const playButton = this.renderer.pointToPlayButton(event.clientX, event.clientY);
      if (playButton) {
        this.game.playSound('button');
        this.game.startGame();
        this.reset();
        return;
      }
      const recordButton = this.renderer.pointToRecordButton(event.clientX, event.clientY);
      if (recordButton) {
        this.game.playSound('button');
        if (this.game.audio && this.game.audio.startMusic) this.game.audio.startMusic();
        this.game.startEndlessGame();
        this.reset();
        return;
      }
      const dailyBonusButton = this.renderer.pointToDailyBonusButton(event.clientX, event.clientY);
      if (dailyBonusButton) {
        const dailyInfo = this.game.dailyBonusInfo ? this.game.dailyBonusInfo() : null;
        const claimed = dailyInfo && dailyInfo.adAvailable && this.game.claimDailyBonusAd
          ? this.game.claimDailyBonusAd()
          : (this.game.claimDailyBonus && this.game.claimDailyBonus());
        if (claimed) {
          this.game.playSound('button');
        } else {
          this.game.playSound('swapError');
        }
        this.reset();
        return;
      }
      if (this.game.platformFeatures.developerGames !== false) {
        const ourGamesButton = this.renderer.pointToOurGamesButton(event.clientX, event.clientY);
        if (ourGamesButton) {
          this.game.playSound('button');
          this.game.openDeveloperGames();
          this.reset();
          return;
        }
      }
      const leaderboardButton = this.renderer.pointToLeaderboardButton(event.clientX, event.clientY);
      if (leaderboardButton) {
        this.game.playSound('button');
        this.game.openLeaderboard();
        this.reset();
        return;
      }
      const coinShopButton = this.renderer.pointToCoinShopButton(event.clientX, event.clientY);
      if (coinShopButton) {
        this.game.playSound('button');
        this.game.openCoinShop();
        this.reset();
        return;
      }
      const soundButton = this.renderer.pointToSoundButton(event.clientX, event.clientY);
      if (soundButton) {
        this.game.toggleSound();
        this.game.playSound('button');
        this.reset();
        return;
      }
      const profileButton = this.renderer.pointToProfileButton(event.clientX, event.clientY);
      if (profileButton) {
        this.game.playSound('button');
        this.game.openProfilePanel();
        this.reset();
        return;
      }
      const exitEndlessRound = this.renderer.pointToExitEndlessRoundButton && this.renderer.pointToExitEndlessRoundButton(event.clientX, event.clientY);
      if (exitEndlessRound) {
        const opened = this.game.requestExitRoundConfirm && this.game.requestExitRoundConfirm();
        this.game.playSound(opened ? 'button' : 'swapError');
        this.reset();
        return;
      }
      const cell = this.renderer.pointToCell(event.clientX, event.clientY);
      if (!cell) {
        const endRound = this.renderer.pointToEndRound(event.clientX, event.clientY);
        if (endRound) {
          this.game.playSound('button');
          this.game.finishRound();
          this.reset();
          return;
        }
        const boosterShop = this.renderer.pointToBoosterShop(event.clientX, event.clientY);
        if (boosterShop) {
          this.game.playSound('button');
          this.game.openCoinShop();
          this.reset();
          return;
        }
        const booster = this.renderer.pointToBooster(event.clientX, event.clientY);
        if (booster) {
          const selected = this.game.selectBooster(booster.id);
          this.game.playSound(selected ? 'button' : 'swapError');
        }
        this.reset();
        return;
      }
      this.canvas.setPointerCapture(event.pointerId);
      this.pointerId = event.pointerId;
      this.startCell = cell;
      this.startPoint = { x: event.clientX, y: event.clientY };
    }

    onPointerMove(event) {
      if (this.renderer.isMobileLandscapeBlocked && this.renderer.isMobileLandscapeBlocked()) return;
      if (!this.startCell || !this.startPoint || event.pointerId !== this.pointerId) return;
      const l = this.renderer.layout;
      if (!l || !l.cell) return;
      const dx = event.clientX - this.startPoint.x;
      const dy = event.clientY - this.startPoint.y;
      const distance = Math.hypot(dx, dy);
      const minPreview = Math.max(6, l.cell * 0.08);
      if (distance < minPreview) {
        this.game.clearDragPreview();
        return;
      }

      const horizontal = Math.abs(dx) > Math.abs(dy);
      const direction = horizontal ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1);
      const toCol = this.startCell.col + (horizontal ? direction : 0);
      const toRow = this.startCell.row + (!horizontal ? direction : 0);
      const axisDistance = Math.abs(horizontal ? dx : dy);
      const progress = Math.min(0.86, axisDistance / l.cell);

      if (!this.game.setDragPreview(this.startCell.col, this.startCell.row, toCol, toRow, progress)) {
        this.game.clearDragPreview();
      }
    }

    onPointerUp(event) {
      if (this.renderer.isMobileLandscapeBlocked && this.renderer.isMobileLandscapeBlocked()) {
        this.reset();
        return;
      }
      if (!this.startCell || !this.startPoint) return;
      const endCell = this.renderer.pointToCell(event.clientX, event.clientY);
      const dx = event.clientX - this.startPoint.x;
      const dy = event.clientY - this.startPoint.y;
      const distance = Math.hypot(dx, dy);
      const minSwipe = Math.max(18, this.renderer.layout.cell * 0.28);

      if (distance >= minSwipe) {
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const toCol = this.startCell.col + (horizontal ? (dx > 0 ? 1 : -1) : 0);
        const toRow = this.startCell.row + (!horizontal ? (dy > 0 ? 1 : -1) : 0);
        this.game.trySwipe(this.startCell.col, this.startCell.row, toCol, toRow);
      } else if (endCell) {
        this.game.trySelect(endCell.col, endCell.row);
      }

      this.reset();
    }

    reset() {
      this.game.clearDragPreview();
      this.startCell = null;
      this.startPoint = null;
      this.pointerId = null;
    }
  }

  window.CrystalMatchInput = CrystalMatchInput;
})();


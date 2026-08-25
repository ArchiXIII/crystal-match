(function () {
  'use strict';

  const GEM_COLORS = [
    { core: '#f9352d', rim: '#ff8a62', glow: 'rgba(255, 46, 38, 0.62)' },
    { core: '#1f8fff', rim: '#77d6ff', glow: 'rgba(35, 152, 255, 0.62)' },
    { core: '#32c928', rim: '#a4ff6a', glow: 'rgba(65, 255, 61, 0.54)' },
    { core: '#b735ff', rim: '#ff9fff', glow: 'rgba(197, 58, 255, 0.62)' },
    { core: '#f8ae23', rim: '#ffe27a', glow: 'rgba(255, 194, 50, 0.7)' }
  ];

  const GEM_FILES = [
    'sprites/gems/energy_red.webp',
    'sprites/gems/energy_blue.webp',
    'sprites/gems/energy_green.webp',
    'sprites/gems/energy_purple.webp',
    'sprites/gems/energy_gold.webp'
  ];
  const BOMB_GEM_FILES = [
    'sprites/gems/bomb_red.webp',
    'sprites/gems/bomb_blue.webp',
    'sprites/gems/bomb_green.webp',
    'sprites/gems/bomb_purple.webp',
    'sprites/gems/bomb_gold.webp'
  ];
  const COIN_FILE = 'sprites/ui/coin.webp';
  const BACKGROUND_FILE = 'sprites/ui/background.webp';
  const STONE_FILE = 'sprites/blockers/stone.webp';
  const BOOSTER_FILES = {
    hammer: 'sprites/boosters/hammer.webp',
    bomb: 'sprites/boosters/bomb.webp',
    rainbow: 'sprites/boosters/rainbow.webp'
  };
  const UI_ICON_FILES = {
    leaderboard: 'sprites/ui/icon_leaderboard.webp',
    soundOn: 'sprites/ui/icon_sound_on.webp',
    soundOff: 'sprites/ui/icon_sound_off.webp',
    coinShopPlus: 'sprites/ui/coin_shop_plus.webp',
    shopPackCoins: 'sprites/ui/shop_pack_coins.webp',
    shopPackPouch: 'sprites/ui/shop_pack_pouch.webp',
    shopPackChest: 'sprites/ui/shop_pack_chest.webp',
    shopPackLuxuryChest: 'sprites/ui/shop_pack_luxury_chest.webp',
    levelCrystal: 'sprites/ui/level_crystal.webp',
    levelStar: 'sprites/ui/level_star.webp',
    levelVitrineDecor: 'sprites/ui/level_vitrine_decor.webp',
    chapterTrophy: 'sprites/ui/chapter_trophy.webp'
  };
  window.CrystalMatchRenderAssets = {
    GEM_COLORS
  };

  class CrystalMatchRenderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.game = game;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.layout = null;
      this.layoutBoardKey = '';
      this.boosterRects = [];
      this.boosterShopRects = [];
      this.endlessBonusPanelRect = null;
      this.endlessBonusClaimRect = null;
      this.endlessBonusAdRect = null;
      this.endRoundRect = null;
      this.playButtonRect = null;
      this.recordButtonRect = null;
      this.levelButtonRects = [];
      this.levelNavRects = [];
      this.levelPlayButtonRect = null;
      this.dailyBonusButtonRect = null;
      this.ourGamesButtonRect = null;
      this.mainMenuButtonRect = null;
      this.restartLevelButtonRect = null;
      this.nextLevelButtonRect = null;
      this.levelContinueAdButtonRect = null;
      this.levelRewardDoubleAdButtonRect = null;
      this.gameOverLeaderboardViewportRect = null;
      this.gameOverLeaderboardScroll = 0;
      this.gameOverLeaderboardScrollKey = '';
      this.leaderboardButtonRect = null;
      this.leaderboardCloseRect = null;
      this.leaderboardTabRects = [];
      this.profileButtonRect = null;
      this.profileCloseRect = null;
      this.profileXpRect = null;
      this.xpLeaderboardCloseRect = null;
      this.exitRoundConfirmCancelRect = null;
      this.exitRoundConfirmConfirmRect = null;
      this.soundButtonRect = null;
      this.coinShopButtonRect = null;
      this.coinShopCloseRect = null;
      this.coinShopAdRect = null;
      this.coinShopPackageRects = [];
      this.coinTarget = { x: 0, y: 0 };
      this.goalProgressDisplay = 0;
      this.goalProgressKey = '';
      this.rankProgressDisplay = 0;
      this.rankProgressKey = '';
      this.fallbackSprites = GEM_COLORS.map((color) => this.makeGemSprite(color));
      this.sprites = this.loadGemSprites();
      this.bombSprites = this.loadBombSprites();
      this.bombBreakSprites = [];
      this.coinSprite = this.loadCoinSprite();
      this.backgroundSprite = this.loadBackgroundSprite();
      this.stoneSprite = this.loadStoneSprite();
      this.boosterSprites = this.loadBoosterSprites();
      this.uiIconSprites = this.loadUiIconSprites();
      this.panelBackgroundCache = null;
      this.panelBackgroundCacheKey = '';
      this.glowSpriteCache = {};
      this.boardFrameCache = null;
      this.boardFrameCacheKey = '';
      this.coinSpriteCache = {};
      this.boosterPanelCache = {};
      this.roundPanelCache = {};
      this.tileSpriteCache = {};
      this.performanceQuality = null;
      this.quality = this.computeQualityProfile();
    }

    t(key, params) {
      return this.game && this.game.t ? this.game.t(key, params) : key;
    }

    loadGemSprites() {
      return GEM_FILES.map((src) => {
        const image = new Image();
        image.src = src;
        return image;
      });
    }

    loadBombSprites() {
      return BOMB_GEM_FILES.map((src) => {
        const image = new Image();
        image.src = src;
        return image;
      });
    }

    loadCoinSprite() {
      const image = new Image();
      image.src = COIN_FILE;
      return image;
    }

    loadBackgroundSprite() {
      const image = new Image();
      image.src = BACKGROUND_FILE;
      return image;
    }

    loadStoneSprite() {
      const image = new Image();
      image.src = STONE_FILE;
      return image;
    }

    loadBoosterSprites() {
      return Object.keys(BOOSTER_FILES).reduce((sprites, id) => {
        const image = new Image();
        image.src = BOOSTER_FILES[id];
        sprites[id] = image;
        return sprites;
      }, {});
    }

    loadUiIconSprites() {
      return Object.keys(UI_ICON_FILES).reduce((sprites, id) => {
        const image = new Image();
        image.src = UI_ICON_FILES[id];
        sprites[id] = image;
        return sprites;
      }, {});
    }

    waitForAssets(timeout = 3500) {
      const images = []
        .concat(this.sprites || [])
        .concat(this.bombSprites || [])
        .concat([this.coinSprite, this.backgroundSprite, this.stoneSprite])
        .concat(Object.keys(this.boosterSprites || {}).map((key) => this.boosterSprites[key]))
        .concat(Object.keys(this.uiIconSprites || {}).map((key) => this.uiIconSprites[key]))
        .filter(Boolean);
      const waits = images.map((image) => new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      }));
      return Promise.race([
        Promise.all(waits),
        new Promise((resolve) => window.setTimeout(resolve, timeout))
      ]);
    }

    resize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.quality = this.computeQualityProfile();
      this.panelBackgroundCache = null;
      this.panelBackgroundCacheKey = '';
      this.glowSpriteCache = {};
      this.boardFrameCache = null;
      this.boardFrameCacheKey = '';
      this.coinSpriteCache = {};
      this.boosterPanelCache = {};
      this.roundPanelCache = {};
      this.tileSpriteCache = {};
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layout = this.computeLayout();
      this.layoutBoardKey = this.currentBoardKey();
    }

    currentBoardKey() {
      return [
        this.game.columns,
        this.game.rows,
        this.game.menuOpen ? 'menu' : 'game',
        this.game.levelSelectOpen ? 'levels' : 'main',
        this.game.gameMode || 'endless'
      ].join('|');
    }

    refreshLayoutForBoardSize() {
      const key = this.currentBoardKey();
      if (key === this.layoutBoardKey) return;
      this.layoutBoardKey = key;
      this.boardFrameCache = null;
      this.boardFrameCacheKey = '';
      this.boosterPanelCache = {};
      this.roundPanelCache = {};
      this.tileSpriteCache = {};
      this.layout = this.computeLayout();
    }

    setPerformanceQuality(profile) {
      this.performanceQuality = profile || null;
      this.quality = this.computeQualityProfile();
    }

    computeQualityProfile() {
      const nav = window.navigator || {};
      const ua = String(nav.userAgent || '');
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || coarse || (this.width || 0) <= 620;
      const perf = this.performanceQuality || {};
      return {
        mobile,
        level: perf.level === undefined ? (mobile ? 1 : 2) : perf.level,
        panelBlur: Math.min(perf.panelBlur || (mobile ? 20 : 30), mobile ? 18 : 22),
        decorStep: perf.decorStep === undefined ? (mobile ? 50 : 0) : perf.decorStep,
        shadowScale: perf.shadowScale || 1
      };
    }

    shadow(value) {
      const scale = this.quality && this.quality.shadowScale ? this.quality.shadowScale : 1;
      return Math.max(0, value * scale);
    }

    decorTime() {
      const time = this.time || 0;
      const step = this.quality && this.quality.decorStep;
      return step ? Math.floor(time / step) * step : time;
    }

    safeInset(name) {
      if (typeof window === 'undefined' || typeof document === 'undefined' || !window.getComputedStyle) return 0;
      const value = window.getComputedStyle(document.documentElement).getPropertyValue(name);
      const number = parseFloat(value);
      return Number.isFinite(number) ? number : 0;
    }

    computeLayout() {
      const platformLayout = (window.CrystalMatchPlatformConfig && window.CrystalMatchPlatformConfig.layout) || {};
      const tightPortrait = this.width <= 620 && this.height >= this.width;
      const safeTop = this.safeInset('--safe-top') + Math.max(14, Math.min(28, this.height * 0.025));
      const safeBottom = this.safeInset('--safe-bottom') + (tightPortrait
        ? Math.max(6, Math.min(12, this.height * 0.012))
        : Math.max(14, Math.min(24, this.height * 0.025)));
      const hudHeight = tightPortrait
        ? Math.min(64, Math.max(50, this.height * 0.062))
        : Math.min(76, Math.max(58, this.height * 0.088));
      const boosterHeight = tightPortrait
        ? Math.min(66, Math.max(54, this.height * 0.064))
        : Math.min(96, Math.max(74, this.height * 0.12));
      const desktopSidePadMax = Number.isFinite(platformLayout.desktopSidePadMax)
        ? platformLayout.desktopSidePadMax
        : 28;
      const sidePad = tightPortrait
        ? Math.max(6, Math.min(12, this.width * 0.018))
        : Math.max(10, Math.min(desktopSidePadMax, this.width * 0.035));
      const contentWidth = this.width - sidePad * 2;
      const goalGap = Math.max(12, Math.min(18, this.width * 0.018));
      if (this.game.menuOpen && !this.game.levelSelectOpen) {
        const menuGap = tightPortrait ? Math.max(8, Math.min(14, this.height * 0.014)) : 18;
        const boardTop = safeTop + hudHeight + menuGap;
        const boardBottom = this.height - safeBottom - menuGap;
        const columns = this.game.defaultColumns || this.game.columns;
        const rows = this.game.defaultRows || this.game.rows;
        const availableBoardWidth = contentWidth;
        const availableBoardHeight = Math.max(1, boardBottom - boardTop);
        const cell = Math.max(1, Math.floor(Math.min(availableBoardWidth / columns, availableBoardHeight / rows)));
        const boardWidth = cell * columns;
        const boardHeight = cell * rows;
        const boardX = Math.round((this.width - boardWidth) / 2);
        const boardY = Math.round(boardTop + Math.max(0, (availableBoardHeight - boardHeight) / 2));
        return {
          safeTop,
          safeBottom,
          hudHeight,
          desktopGoal: false,
          goalSide: false,
          goalX: boardX,
          goalHeight: 0,
          goalWidth: boardWidth,
          goalY: boardY,
          boosterHeight,
          sidePad,
          cell,
          boardX,
          boardY,
          boardWidth,
          boardHeight,
          boosterY: boardY + boardHeight,
          tightPortrait
        };
      }

      const sideGoalWidth = Math.min(236, Math.max(188, this.width * 0.22));
      const sideGoalHeight = Math.min(118, Math.max(94, this.height * 0.13));
      const topGoalHeight = tightPortrait
        ? Math.min(54, Math.max(44, this.height * 0.052))
        : Math.min(82, Math.max(72, this.height * 0.095));
      const sideGoalMinWidth = Number.isFinite(platformLayout.sideGoalMinWidth)
        ? platformLayout.sideGoalMinWidth
        : 900;
      const sideGoalMinHeight = Number.isFinite(platformLayout.sideGoalMinHeight)
        ? platformLayout.sideGoalMinHeight
        : 0;
      const reserveSideGoalColumn = platformLayout.reserveSideGoalColumn === true;
      const canTrySideGoal = this.width >= sideGoalMinWidth && this.height >= sideGoalMinHeight;
      const showEndlessMoveBonus = this.game.platformFeatures.endlessMoveBonus === true && this.game.gameMode === 'endless';

      const makeBoard = (sideGoal) => {
        const goalHeight = sideGoal ? sideGoalHeight : topGoalHeight;
        const endlessBonusHeight = showEndlessMoveBonus
          ? (sideGoal ? Math.min(72, Math.max(62, this.height * 0.08)) : (tightPortrait ? 54 : 64))
          : 0;
        const reservedSideWidth = sideGoal && reserveSideGoalColumn ? sideGoalWidth + goalGap : 0;
        const availableBoardWidth = Math.max(1, contentWidth - reservedSideWidth);
        const verticalGap = tightPortrait ? Math.max(7, Math.min(10, this.height * 0.01)) : 12;
        const mobileLevelExitRow = platformLayout.mobileLevelExitRow === true &&
          this.game.platformFeatures.levelExitButton === true &&
          this.game.gameMode === 'level' &&
          !sideGoal;
        const boardYBase = safeTop + hudHeight + (sideGoal
          ? verticalGap
          : goalHeight + verticalGap * 2 + endlessBonusHeight + (endlessBonusHeight ? verticalGap : 0));
        const boosterTop = this.height - safeBottom - boosterHeight -
          (mobileLevelExitRow ? boosterHeight + verticalGap : 0);
        const availableBoardHeight = Math.max(1, boosterTop - boardYBase - verticalGap);
        const cell = Math.max(1, Math.floor(Math.min(availableBoardWidth / this.game.columns, availableBoardHeight / this.game.rows)));
        const boardWidth = cell * this.game.columns;
        const boardHeight = cell * this.game.rows;
        const groupWidth = boardWidth + reservedSideWidth;
        const centeredBoardX = (this.width - boardWidth) / 2;
        const sideBoardMinX = sidePad + reservedSideWidth;
        const sideBoardMaxX = this.width - sidePad - boardWidth;
        const boardX = reserveSideGoalColumn && sideGoal
          ? Math.round(sideBoardMinX <= sideBoardMaxX
            ? Math.max(sideBoardMinX, Math.min(sideBoardMaxX, centeredBoardX))
            : (this.width - groupWidth) / 2 + reservedSideWidth)
          : Math.round(centeredBoardX);
        const slack = Math.max(0, availableBoardHeight - boardHeight);
        const boardY = Math.round(boardYBase + slack * 0.5);
        return { goalHeight, endlessBonusHeight, cell, boardWidth, boardHeight, boardX, boardY, verticalGap, mobileLevelExitRow };
      };

      let board = makeBoard(canTrySideGoal);
      const sideGoalFits = canTrySideGoal && board.boardWidth + sideGoalWidth + goalGap <= contentWidth;
      const sideLeftX = board.boardX - sideGoalWidth - goalGap;
      const sideRightX = board.boardX + board.boardWidth + goalGap;
      const sideHasSlot = sideGoalFits && (
        sideLeftX >= sidePad ||
        sideRightX + sideGoalWidth <= this.width - sidePad
      );
      const goalSide = sideHasSlot;
      if (!goalSide) {
        board = makeBoard(false);
      }

      const goalWidth = goalSide ? Math.min(sideGoalWidth, contentWidth) : board.boardWidth + 8;
      const goalHeight = goalSide ? sideGoalHeight : topGoalHeight;
      const leftGoalX = board.boardX - goalWidth - goalGap;
      const rightGoalX = board.boardX + board.boardWidth + goalGap;
      let goalX = goalSide ? board.boardX : Math.round(board.boardX - (goalWidth - board.boardWidth) / 2);
      if (goalSide && leftGoalX >= sidePad) {
        goalX = leftGoalX;
      } else if (goalSide && rightGoalX + goalWidth <= this.width - sidePad) {
        goalX = rightGoalX;
      }
      const goalY = goalSide ? board.boardY : Math.round(safeTop + hudHeight + board.verticalGap);
      const mobileLevelExitRow = !!board.mobileLevelExitRow;
      const attachBoostersToBoard = platformLayout.attachBoostersToBoard === true;
      const boosterY = mobileLevelExitRow
        ? board.boardY + board.boardHeight + board.verticalGap
        : (tightPortrait && !attachBoostersToBoard
          ? Math.max(board.boardY + board.boardHeight + board.verticalGap, this.height - safeBottom - boosterHeight)
          : board.boardY + board.boardHeight + board.verticalGap);
      return {
        safeTop,
        safeBottom,
        hudHeight,
        desktopGoal: goalSide,
        goalSide,
        goalX,
        goalHeight,
        goalWidth,
        goalY,
        endlessBonusHeight: board.endlessBonusHeight,
        boosterHeight,
        sidePad,
        cell: board.cell,
        boardX: board.boardX,
        boardY: board.boardY,
        boardWidth: board.boardWidth,
        boardHeight: board.boardHeight,
        boosterY,
        verticalGap: board.verticalGap,
        mobileLevelExitRow,
        exitRoundY: mobileLevelExitRow ? this.height - safeBottom - boosterHeight : 0,
        tightPortrait
      };
    }

    render(time) {
      if (!this.layout) return;
      this.refreshLayoutForBoardSize();
      this.time = time;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      this.drawBackground(ctx, time);
      if (this.isMobileLandscapeBlocked()) {
        this.drawRotateDeviceOverlay(ctx);
        return;
      }
      this.drawHud(ctx);
      if (!this.game.menuOpen) {
        this.drawGoal(ctx);
        this.drawEndlessMoveBonus(ctx);
        this.drawExitEndlessRoundButton(ctx);
      }
      this.drawBoard(ctx);
      this.drawParticles(ctx);
      this.drawPopups(ctx);
      this.drawReactions(ctx);
      if (!this.game.menuOpen) {
        this.drawEndRoundButton(ctx);
        this.drawBoosters(ctx);
        this.drawTutorialHint(ctx);
      } else {
        this.endRoundRect = null;
        this.exitEndlessRoundRect = null;
        this.endlessBonusPanelRect = null;
        this.endlessBonusClaimRect = null;
        this.endlessBonusAdRect = null;
        this.boosterRects = [];
        this.boosterShopRects = [];
      }
      this.drawGameOver(ctx);
      this.drawMainMenu(ctx);
      this.drawCoinSpendBursts(ctx);
      this.drawLeaderboard(ctx);
      this.drawCoinShop(ctx);
      this.drawCoinFlights(ctx);
      this.drawProfilePanel(ctx);
      this.drawXpLeaderboard(ctx);
      this.drawExitRoundConfirm(ctx);
    }

    isMobileLandscapeBlocked() {
      const nav = window.navigator || {};
      const ua = String(nav.userAgent || '');
      const mobileUa = /Android|iPhone|iPad|iPod|Mobile|YaBrowser\/.*Mobile/i.test(ua);
      const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const hasTouch = nav.maxTouchPoints > 0 || 'ontouchstart' in window;
      const mobileDevice = mobileUa || (coarsePointer && hasTouch);
      return mobileDevice && this.width > this.height && this.width < 900 && this.height <= 620;
    }

    drawBackground(ctx) {
      const bg = this.backgroundSprite;
      if (bg && bg.complete && bg.naturalWidth > 0) {
        this.drawBackgroundImage(ctx);

        const veil = ctx.createLinearGradient(0, 0, 0, this.height);
        veil.addColorStop(0, 'rgba(2, 3, 8, 0.36)');
        veil.addColorStop(0.46, 'rgba(2, 3, 8, 0.24)');
        veil.addColorStop(1, 'rgba(1, 2, 5, 0.48)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, this.width, this.height);

        const focus = ctx.createRadialGradient(
          this.width * 0.5,
          this.height * 0.52,
          Math.min(this.width, this.height) * 0.08,
          this.width * 0.5,
          this.height * 0.52,
          Math.max(this.width, this.height) * 0.68
        );
        focus.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
        focus.addColorStop(0.58, 'rgba(0, 0, 0, 0.18)');
        focus.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
        ctx.fillStyle = focus;
        ctx.fillRect(0, 0, this.width, this.height);
        return;
      }

      const grd = ctx.createLinearGradient(0, 0, 0, this.height);
      grd.addColorStop(0, '#090a0e');
      grd.addColorStop(0.48, '#030304');
      grd.addColorStop(1, '#0b0d12');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawBackgroundImage(ctx) {
      const bg = this.backgroundSprite;
      if (!bg || !bg.complete || bg.naturalWidth <= 0) return false;
      const scale = Math.max(this.width / bg.naturalWidth, this.height / bg.naturalHeight);
      const drawW = bg.naturalWidth * scale;
      const drawH = bg.naturalHeight * scale;
      const dx = (this.width - drawW) / 2;
      const dy = (this.height - drawH) / 2;
      ctx.drawImage(bg, dx, dy, drawW, drawH);
      return true;
    }

    getPanelBackgroundCache() {
      const bg = this.backgroundSprite;
      if (!bg || !bg.complete || bg.naturalWidth <= 0 || !this.width || !this.height) return null;
      const blur = Math.round(this.quality.panelBlur || 20);
      const key = [this.width, this.height, blur, bg.naturalWidth, bg.naturalHeight].join('|');
      if (this.panelBackgroundCache && this.panelBackgroundCacheKey === key) return this.panelBackgroundCache;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(this.width));
      canvas.height = Math.max(1, Math.round(this.height));
      const cacheCtx = canvas.getContext('2d');
      cacheCtx.filter = 'blur(' + blur + 'px) saturate(1.42) brightness(1.06)';
      this.drawBackgroundImage(cacheCtx);
      cacheCtx.filter = 'none';
      this.panelBackgroundCache = canvas;
      this.panelBackgroundCacheKey = key;
      return canvas;
    }

    getGlowSprite(sprite, key, glowColor, blur, paddingRatio) {
      if (!sprite || !sprite.complete || sprite.naturalWidth <= 0) return null;
      const cacheKey = key + '|' + Math.round(blur * 10) + '|' + glowColor;
      if (this.glowSpriteCache[cacheKey]) return this.glowSpriteCache[cacheKey];

      const sourceSize = Math.max(sprite.naturalWidth, sprite.naturalHeight);
      const pad = Math.ceil(sourceSize * (paddingRatio || 0.18));
      const canvas = document.createElement('canvas');
      canvas.width = sourceSize + pad * 2;
      canvas.height = sourceSize + pad * 2;
      const cacheCtx = canvas.getContext('2d');
      cacheCtx.shadowColor = glowColor;
      cacheCtx.shadowBlur = blur;
      cacheCtx.drawImage(sprite, pad, pad, sourceSize, sourceSize);
      cacheCtx.shadowBlur = 0;
      cacheCtx.drawImage(sprite, pad, pad, sourceSize, sourceSize);
      const cached = { canvas, pad, sourceSize };
      this.glowSpriteCache[cacheKey] = cached;
      return cached;
    }

    getSizedSprite(sprite, key, size) {
      if (!sprite || !sprite.complete || sprite.naturalWidth <= 0 || !size) return null;
      const roundedSize = Math.max(1, Math.round(size));
      const cacheKey = key + '|' + roundedSize + '|' + sprite.naturalWidth + 'x' + sprite.naturalHeight;
      if (this.tileSpriteCache[cacheKey]) return this.tileSpriteCache[cacheKey];

      const canvas = document.createElement('canvas');
      canvas.width = roundedSize;
      canvas.height = roundedSize;
      const cacheCtx = canvas.getContext('2d');
      cacheCtx.imageSmoothingEnabled = true;
      cacheCtx.imageSmoothingQuality = 'high';
      cacheCtx.drawImage(sprite, 0, 0, roundedSize, roundedSize);
      this.tileSpriteCache[cacheKey] = canvas;
      return canvas;
    }
    drawCachedBoosterPanel(ctx, x, y, w, h, r, alpha) {
      const rounded = {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.max(1, Math.round(w)),
        h: Math.max(1, Math.round(h)),
        r: Math.round(r),
        alpha: Math.round(alpha * 100)
      };
      const background = this.getPanelBackgroundCache();
      const key = [
        rounded.x,
        rounded.y,
        rounded.w,
        rounded.h,
        rounded.r,
        rounded.alpha,
        this.panelBackgroundCacheKey || 'no-bg',
        Math.round(this.shadow(20) * 10)
      ].join('|');
      if (!this.boosterPanelCache[key]) {
        const canvas = document.createElement('canvas');
        canvas.width = rounded.w;
        canvas.height = rounded.h;
        const cacheCtx = canvas.getContext('2d');
        const hasBackground = background && this.backgroundSprite && this.backgroundSprite.complete && this.backgroundSprite.naturalWidth > 0;

        cacheCtx.save();
        this.roundRect(cacheCtx, 0, 0, rounded.w, rounded.h, rounded.r);
        cacheCtx.clip();
        if (hasBackground) {
          cacheCtx.drawImage(background, rounded.x, rounded.y, rounded.w, rounded.h, 0, 0, rounded.w, rounded.h);
        }

        const panelAlpha = hasBackground ? Math.max(0.34, alpha * 0.48) : alpha;
        const grd = cacheCtx.createLinearGradient(0, 0, 0, rounded.h);
        grd.addColorStop(0, 'rgba(24, 28, 36, ' + panelAlpha + ')');
        grd.addColorStop(0.52, 'rgba(8, 10, 15, ' + Math.max(0.28, panelAlpha * 0.72) + ')');
        grd.addColorStop(1, 'rgba(4, 5, 8, ' + Math.max(0.36, panelAlpha * 0.92) + ')');
        cacheCtx.fillStyle = grd;
        cacheCtx.shadowColor = 'rgba(0,0,0,0.48)';
        cacheCtx.shadowBlur = this.shadow(20);
        this.roundRect(cacheCtx, 0, 0, rounded.w, rounded.h, rounded.r);
        cacheCtx.fill();

        if (hasBackground) {
          const glassTint = cacheCtx.createLinearGradient(0, 0, rounded.w, rounded.h);
          glassTint.addColorStop(0, 'rgba(125, 67, 255, 0.11)');
          glassTint.addColorStop(0.52, 'rgba(255, 185, 78, 0.045)');
          glassTint.addColorStop(1, 'rgba(38, 144, 255, 0.075)');
          cacheCtx.fillStyle = glassTint;
          this.roundRect(cacheCtx, 0, 0, rounded.w, rounded.h, rounded.r);
          cacheCtx.fill();
        }

        const sheen = cacheCtx.createLinearGradient(0, 0, rounded.w, rounded.h);
        sheen.addColorStop(0, 'rgba(255, 244, 214, 0.16)');
        sheen.addColorStop(0.28, 'rgba(255, 244, 214, 0.026)');
        sheen.addColorStop(1, 'rgba(126, 204, 255, 0.07)');
        cacheCtx.fillStyle = sheen;
        this.roundRect(cacheCtx, 0, 0, rounded.w, rounded.h, rounded.r);
        cacheCtx.fill();
        cacheCtx.strokeStyle = 'rgba(246, 189, 76, 0.28)';
        cacheCtx.lineWidth = 1;
        cacheCtx.stroke();
        cacheCtx.restore();

        this.boosterPanelCache[key] = canvas;
      }
      ctx.drawImage(this.boosterPanelCache[key], rounded.x, rounded.y, rounded.w, rounded.h);
    }

    roundPanel(ctx, x, y, w, h, r, alpha) {
      this.drawCachedBoosterPanel(ctx, x, y, w, h, r, alpha);
    }

    roundRect(ctx, x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    }
  }

  window.CrystalMatchRenderer = CrystalMatchRenderer;
})();



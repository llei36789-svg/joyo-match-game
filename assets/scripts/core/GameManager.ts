import { GameConfig } from "./GameConfig";
import { DropManager } from "./DropManager";
import { GridManager } from "./GridManager";
import { ItemManager } from "./ItemManager";
import { LeaderboardService } from "./LeaderboardService";
import { MatchCheck } from "./MatchCheck";
import { SoundManager } from "./SoundManager";
import { BlockState, GameState, ITEM_SCORE_MAP, ITEM_TYPES, ItemType, LEVELS, LevelConfig, Position, SpecialType } from "../data/LevelData";
import { TweenUtil } from "../util/TweenUtil";
import { UIBonusPanel } from "../ui/UIBonusPanel";
import { UIGamePanel } from "../ui/UIGamePanel";
import { UILotteryPanel, type LotteryRarity } from "../ui/UILotteryPanel";
import { UIResultPanel } from "../ui/UIResultPanel";
import { UITaskPanel } from "../ui/UITaskPanel";

interface RewardedVideoAdCloseResult {
  isEnded?: boolean;
}

interface RewardedVideoAd {
  show(): Promise<void>;
  load(): Promise<void>;
  onClose(callback: (result: RewardedVideoAdCloseResult) => void): void;
  offClose?(callback: (result: RewardedVideoAdCloseResult) => void): void;
  onError(callback: () => void): void;
  offError?(callback: () => void): void;
}

interface WechatGameApi {
  createRewardedVideoAd(options: { adUnitId: string }): RewardedVideoAd;
}

interface GameManagerOptions {
  gridManager: GridManager;
  itemManager: ItemManager;
  uiPanel: UIGamePanel;
  taskPanel: UITaskPanel;
  bonusPanel: UIBonusPanel;
  leaderboardService: LeaderboardService;
  onLeaderboardScoreSubmitted?: () => void;
  soundManager: SoundManager;
  lotteryPanel: UILotteryPanel;
  resultPanel: UIResultPanel;
  statusCallback: (message: string) => void;
}

type TaskKind = "clearAny" | "clearItem";

interface ActiveTask {
  kind: TaskKind;
  title: string;
  target: number;
  progress: number;
  reward: number;
  itemType?: ItemType;
}

interface RemovalResult {
  score: number;
  total: number;
  itemCounts: Partial<Record<ItemType, number>>;
}

interface LotteryReward {
  title: string;
  detail: string;
  rarity: LotteryRarity;
  scoreBonus?: number;
  isBigWin?: boolean;
}

const ITEM_NAME_MAP: Record<ItemType, string> = {
  [ItemType.Red]: "方块",
  [ItemType.Yellow]: "圆圈",
  [ItemType.Blue]: "三角形",
  [ItemType.Green]: "菱形",
  [ItemType.Purple]: "星星",
  [ItemType.Orange]: "六边形",
  [ItemType.Pink]: "五边形",
  [ItemType.Cyan]: "爱心",
  [ItemType.Lime]: "太阳",
  [ItemType.Teal]: "加号",
  [ItemType.Indigo]: "靛蓝",
  [ItemType.Magenta]: "洋红",
  [ItemType.Gold]: "金色",
  [ItemType.Coral]: "珊瑚",
  [ItemType.Mint]: "薄荷",
  [ItemType.Azure]: "天蓝",
  [ItemType.Rose]: "玫瑰",
  [ItemType.Amber]: "琥珀",
  [ItemType.Violet]: "紫罗兰",
  [ItemType.Pearl]: "珍珠",
};

export class GameManager {
  private readonly dropManager = new DropManager();
  private readonly matchCheck = new MatchCheck();
  private readonly gridManager: GridManager;
  private readonly itemManager: ItemManager;
  private readonly uiPanel: UIGamePanel;
  private readonly taskPanel: UITaskPanel;
  private readonly bonusPanel: UIBonusPanel;
  private readonly leaderboardService: LeaderboardService;
  private readonly onLeaderboardScoreSubmitted?: () => void;
  private readonly soundManager: SoundManager;
  private readonly lotteryPanel: UILotteryPanel;
  private readonly resultPanel: UIResultPanel;
  private readonly statusCallback: (message: string) => void;

  private state = GameState.WAIT_INPUT;
  private currentLevelIndex = 0;
  private score = 0;
  private timeLeftSec = 0;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private selectedCell: Position | null = null;
  private chainStep = 0;
  private isWatchingBonusAd = false;
  private hasPendingShuffleAd = false;
  private activeTask: ActiveTask | null = null;
  private lotteryPity = 0;

  constructor(options: GameManagerOptions) {
    this.gridManager = options.gridManager;
    this.itemManager = options.itemManager;
    this.uiPanel = options.uiPanel;
    this.taskPanel = options.taskPanel;
    this.bonusPanel = options.bonusPanel;
    this.leaderboardService = options.leaderboardService;
    this.onLeaderboardScoreSubmitted = options.onLeaderboardScoreSubmitted;
    this.soundManager = options.soundManager;
    this.lotteryPanel = options.lotteryPanel;
    this.resultPanel = options.resultPanel;
    this.statusCallback = options.statusCallback;
  }

  startLevel(level: LevelConfig): void {
    if (GameConfig.debug.refillLogs) {
      console.warn("[JoyoDebug] GameManager loaded - debug logs enabled", {
        level: level.name,
        durationSec: level.durationSec,
        board: `${GameConfig.board.rows}x${GameConfig.board.cols}`,
      });
    }

    this.clearCountdownTimer();
    this.clearHintVisuals();
    this.currentLevelIndex = Math.max(
      0,
      LEVELS.findIndex((entry) => entry.id === level.id),
    );
    this.score = 0;
    this.timeLeftSec = Math.max(level.durationSec, 1);
    this.selectedCell = null;
    this.chainStep = 0;
    this.isWatchingBonusAd = false;
    this.hasPendingShuffleAd = false;
    this.lotteryPity = 0;
    this.activeTask = this.createNextTask();
    this.clearBonusScoreOffer();
    this.state = GameState.WAIT_INPUT;
    this.resultPanel.hide();
    this.gridManager.initializeGrid();
    this.uiPanel.renderLevelInfo(level);
    this.refreshTaskUi();
    this.refreshUi("点击方块，再点相邻空格或可消除方块");
    this.startCountdownTimer();
  }

  startLevelByIndex(index: number): void {
    const safeIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
    this.startLevel(LEVELS[safeIndex]);
  }

  restartCurrentLevel(): void {
    this.startLevelByIndex(this.currentLevelIndex);
  }

  handlePrimaryResultAction(): void {
    this.restartCurrentLevel();
  }

  handleSecondaryResultAction(): void {
    return;
  }

  async handleBonusScoreAdAction(): Promise<void> {
    if (this.isWatchingBonusAd || !this.hasPendingShuffleAd || this.state === GameState.LEVEL_END) {
      return;
    }

    this.bonusPanel.setClaimEnabled(false);
    this.isWatchingBonusAd = true;
    this.statusCallback("正在打乱棋盘...");
    const watched = await this.watchRewardedAd(GameConfig.bonusAd.adUnitId);
    this.isWatchingBonusAd = false;
    if (!watched) {
      this.statusCallback("完整观看广告后才能打乱棋盘");
      this.bonusPanel.setClaimEnabled(true);
      return;
    }

    if (this.isLevelEnded()) {
      this.clearBonusScoreOffer();
      return;
    }

    this.clearBonusScoreOffer();
    this.state = GameState.DROPING;
    await this.gridManager.shuffleBoard(0.32);

    this.state = GameState.WAIT_INPUT;
    if (!this.hasAvailableMove()) {
      this.presentDeadlockShuffleOffer();
      return;
    }

    this.refreshUi("棋盘已打乱，继续移动或消除方块");
    this.resumeCountdownTimer();
  }

  dismissBonusScoreOffer(): void {
    if (this.isWatchingBonusAd) {
      return;
    }

    this.endLevel("死局结束，本局分数已结算。");
  }

  async handleCellTap(row: number, col: number): Promise<void> {
    if (this.state !== GameState.WAIT_INPUT) {
      return;
    }

    if (GameConfig.debug.refillLogs) {
      console.warn("[GameManager] tap before repair", JSON.stringify({
        row,
        col,
        cell: this.gridManager.getDebugCellInfo(row, col),
        summary: this.gridManager.getDebugBoardSummary(),
      }));
    }

    if (await this.repairBoardIfNeeded()) {
      this.state = GameState.WAIT_INPUT;
      if (GameConfig.debug.refillLogs) {
        console.warn("[GameManager] tap after repair", JSON.stringify({
          row,
          col,
          cell: this.gridManager.getDebugCellInfo(row, col),
          summary: this.gridManager.getDebugBoardSummary(),
        }));
      }
    }

    const tappedCell = this.gridManager.getCell(row, col);
    if (!this.hasMovableItem({ row, col }) && !this.selectedCell) {
      this.selectedCell = null;
      this.gridManager.clearSelection();
      this.statusCallback("这里没有方块");
      return;
    }

    this.gridManager.playCellTapEffect(row, col);
    this.clearHintVisuals();

    if (!this.selectedCell) {
      this.selectedCell = { row, col };
      this.gridManager.highlightCell(this.selectedCell);
      this.statusCallback("再点相邻空格，或能消除的相邻方块");
      return;
    }

    const next = { row, col };
    if (!this.hasMovableItem(this.selectedCell)) {
      this.selectedCell = null;
      this.gridManager.clearSelection();
      this.statusCallback("请先选择一个方块");
      return;
    }

    if (this.selectedCell.row === next.row && this.selectedCell.col === next.col) {
      this.selectedCell = null;
      this.gridManager.clearSelection();
      this.statusCallback("已取消选择");
      return;
    }

    if (!this.gridManager.areAdjacent(this.selectedCell, next)) {
      this.selectedCell = null;
      this.gridManager.clearSelection();
      this.statusCallback("只能和相邻方块交换一步");
      return;
    }

    if (!tappedCell?.itemType) {
      const first = this.selectedCell;
      this.selectedCell = null;
      this.gridManager.clearSelection();
      await this.tryMoveToEmpty(first, next);
      return;
    }

    if (!this.matchCheck.wouldSwapResolveImmediately(this.gridManager.gridData, this.selectedCell, next)) {
      this.selectedCell = null;
      this.gridManager.clearSelection();
      this.statusCallback("这一步不能消除，不能移动");
      return;
    }

    const first = this.selectedCell;
    this.selectedCell = null;
    this.gridManager.clearSelection();
    await this.trySwap(first, next);
  }

  private hasMovableItem(position: Position): boolean {
    const cell = this.gridManager.getCell(position.row, position.col);
    return Boolean(cell?.itemType && cell.nodeUuid);
  }

  private isEmptyCell(position: Position): boolean {
    const cell = this.gridManager.getCell(position.row, position.col);
    return Boolean(cell && !cell.itemType && !cell.nodeUuid);
  }

  private async tryMoveToEmpty(first: Position, second: Position): Promise<void> {
    if (!this.gridManager.areAdjacent(first, second)) {
      this.statusCallback("只能移动到相邻格子");
      return;
    }

    if (!this.hasMovableItem(first) || !this.isEmptyCell(second)) {
      this.statusCallback("只能把方块移动到相邻空格");
      return;
    }

    this.clearHintVisuals();
    this.state = GameState.SWAPPING;
    this.statusCallback("移动中...");

    await this.animateMoveToEmpty(first, second);
    this.gridManager.swapCells(first, second);

    const analysis = this.matchCheck.findMatches(this.gridManager.gridData, [second]);
    this.chainStep = 0;
    if (analysis.allMatches.length > 0) {
      await this.resolveMatches(analysis.allMatches, analysis.specialSpawn);
    } else {
      this.state = GameState.DROPING;
      await this.refillBoardAndResolveCascades();
      this.refreshUi("已移动到空格");
    }

    await this.finishTurn();
  }

  private async trySwap(first: Position, second: Position): Promise<void> {
    if (!this.gridManager.areAdjacent(first, second)) {
      this.statusCallback("只能和相邻方块交换一步");
      return;
    }

    if (!this.matchCheck.wouldSwapResolveImmediately(this.gridManager.gridData, first, second)) {
      this.statusCallback("这一步不能消除，不能移动");
      return;
    }

    this.clearHintVisuals();
    this.state = GameState.SWAPPING;
    this.statusCallback("交换中...");

    await this.animateSwap(first, second);
    this.gridManager.swapCells(first, second);

    const specialRemoval = this.matchCheck.resolveSpecialSwap(this.gridManager.gridData, first, second);
    let matchedPositions: Position[] = [];
    let specialSpawn: { position: Position; specialType: SpecialType } | null = null;

    if (specialRemoval) {
      matchedPositions = specialRemoval;
    } else {
      const analysis = this.matchCheck.findMatches(this.gridManager.gridData, [second, first]);
      matchedPositions = analysis.allMatches;
      specialSpawn = analysis.specialSpawn;
    }

    this.chainStep = 0;
    if (matchedPositions.length === 0) {
      this.gridManager.swapCells(first, second);
      await this.animateCellsToHome(first, second);
      this.refreshUi("这一步不能消除，不能移动");
      await this.finishTurn();
      return;
    }

    await this.resolveMatches(matchedPositions, specialSpawn);
    await this.finishTurn();
  }

  private async resolveMatches(
    initialPositions: Position[],
    initialSpecialSpawn: { position: Position; specialType: SpecialType } | null,
  ): Promise<void> {
    let pending = initialPositions;
    let pendingSpecial = initialSpecialSpawn;

    while (pending.length > 0 && this.state !== GameState.LEVEL_END) {
      this.chainStep += 1;
      this.state = GameState.MATCHING;
      const expanded = this.matchCheck.expandSpecialEffects(this.gridManager.gridData, pending);
      const removalKeys = new Set(expanded.map((position) => `${position.row}-${position.col}`));

      if (pendingSpecial) {
        removalKeys.delete(`${pendingSpecial.position.row}-${pendingSpecial.position.col}`);
      }

      const removalPositions = Array.from(removalKeys).map((key) => this.keyToPosition(key));
      const triggeredSpecialType = this.getRemovalSpecialType(removalPositions);
      const removalResult = await this.removeCells(removalPositions);
      const addScore = this.applyScore(removalResult.score, removalResult.total, triggeredSpecialType, this.chainStep);
      this.gridManager.showFloatingScore(removalPositions, addScore);
      this.uiPanel.playScoreFlyFromWorld(this.gridManager.getPositionsWorldCenter(removalPositions), addScore);
      this.applyLotteryReward(addScore, removalPositions);
      this.updateTaskProgress(removalResult);

      if (pendingSpecial) {
        const cell = this.gridManager.getCell(pendingSpecial.position.row, pendingSpecial.position.col);
        const node = this.gridManager.getNode(pendingSpecial.position.row, pendingSpecial.position.col);
        if (cell.itemType && node) {
          cell.specialType = pendingSpecial.specialType;
          this.itemManager.updateItemNode(node, cell.itemType, cell.specialType, this.gridManager.getTileSize());
        }
      }

      this.state = GameState.DROPING;
      const analysis = await this.refillBoard();
      pending = analysis.allMatches;
      pendingSpecial = analysis.specialSpawn;
    }
  }

  private async refillBoardAndResolveCascades(): Promise<void> {
    let analysis = await this.refillBoard();
    while (analysis.allMatches.length > 0 && this.state !== GameState.LEVEL_END) {
      await this.resolveMatches(analysis.allMatches, analysis.specialSpawn);
      analysis = this.matchCheck.findMatches(this.gridManager.gridData);
    }
  }

  private async refillBoard(): Promise<ReturnType<MatchCheck["findMatches"]>> {
    if (GameConfig.debug.refillLogs) {
      console.warn("[GameManager] refillBoard before", JSON.stringify(this.gridManager.getDebugBoardSummary()));
    }
    await this.dropManager.collapseAndRefill(this.gridManager, this.itemManager);
    if (GameConfig.debug.refillLogs) {
      console.warn("[GameManager] refillBoard after", JSON.stringify(this.gridManager.getDebugBoardSummary()));
    }
    return this.matchCheck.findMatches(this.gridManager.gridData);
  }

  private async removeCells(positions: Position[]): Promise<RemovalResult> {
    const tasks: Promise<void>[] = [];
    let removedScore = 0;
    let total = 0;
    const itemCounts: Partial<Record<ItemType, number>> = {};

    positions.forEach((position) => {
      const cell = this.gridManager.getCell(position.row, position.col);
      const node = this.gridManager.getNode(position.row, position.col);
      if (!cell || !node || !cell.itemType) {
        return;
      }

      removedScore += ITEM_SCORE_MAP[cell.itemType];
      total += 1;
      itemCounts[cell.itemType] = (itemCounts[cell.itemType] ?? 0) + 1;
      tasks.push(
        TweenUtil.fadeAndScaleOut(node, GameConfig.board.clearDuration).then(() => {
          this.itemManager.recycleItemNode(node);
        }),
      );
      this.gridManager.setCell(position.row, position.col, null, SpecialType.None, "", BlockState.Normal);
    });

    if (total > 0) {
      this.soundManager.playClear(this.chainStep);
    }

    await Promise.all(tasks);
    return {
      score: removedScore,
      total,
      itemCounts,
    };
  }

  private applyScore(baseScore: number, matchCount: number, specialType: SpecialType, chainStep: number): number {
    let addScore = baseScore;
    if (matchCount >= 4 && matchCount < 5) {
      addScore += GameConfig.score.fourMatchBonus;
    }
    if (matchCount >= 5) {
      addScore += GameConfig.score.fiveMatchBonus;
    }
    if (specialType !== SpecialType.None) {
      addScore = Math.floor(addScore * GameConfig.score.specialMultiplier);
    }
    addScore += (chainStep - 1) * GameConfig.score.chainBonus;

    this.score += addScore;
    this.refreshUi(chainStep > 1 ? `连锁 x${chainStep} +${addScore}` : `消除 +${addScore}`);
    return addScore;
  }

  private updateTaskProgress(removalResult: RemovalResult): void {
    if (!this.activeTask) {
      return;
    }

    const task = this.activeTask;
    switch (task.kind) {
      case "clearAny":
        task.progress += removalResult.total;
        break;
      case "clearItem":
        if (task.itemType) {
          task.progress += removalResult.itemCounts[task.itemType] ?? 0;
        }
        break;
    }

    if (task.progress >= task.target) {
      this.completeTask(task);
      return;
    }

    this.refreshTaskUi();
  }

  private applyLotteryReward(addScore: number, sourcePositions: Position[]): void {
    const reward = this.rollLotteryReward(addScore);
    if (!reward) {
      return;
    }

    this.lotteryPanel.show({
      title: reward.title,
      detail: reward.detail,
      rarity: reward.rarity,
    });

    if (reward.scoreBonus && reward.scoreBonus > 0) {
      this.score += reward.scoreBonus;
      this.gridManager.showFloatingScore(sourcePositions, reward.scoreBonus);
      this.uiPanel.playScoreFlyFromWorld(this.gridManager.getPositionsWorldCenter(sourcePositions), reward.scoreBonus);
    }

    this.refreshUi(reward.isBigWin ? `抽中大奖！${reward.detail}` : `开奖：${reward.detail}`);
  }

  private rollLotteryReward(addScore: number): LotteryReward | null {
    const pityBonus = Math.min(
      this.lotteryPity * GameConfig.lottery.pityChanceStep,
      GameConfig.lottery.maxPityChanceBonus,
    );
    const jackpotChance = GameConfig.lottery.jackpotBaseChance + pityBonus;
    const doubleChance = GameConfig.lottery.doubleBaseChance + pityBonus * 0.5;
    const roll = Math.random();

    if (roll < jackpotChance) {
      this.lotteryPity = 0;
      return {
        title: "超级大奖",
        detail: `幸运金票 +${GameConfig.lottery.jackpotScore}`,
        rarity: "jackpot",
        scoreBonus: GameConfig.lottery.jackpotScore,
        isBigWin: true,
      };
    }

    if (roll < jackpotChance + doubleChance) {
      this.lotteryPity = 0;
      return {
        title: "稀有奖励",
        detail: `本次得分翻倍 +${addScore}`,
        rarity: "epic",
        scoreBonus: addScore,
        isBigWin: true,
      };
    }

    this.lotteryPity += 1;
    return null;
  }

  private completeTask(task: ActiveTask): void {
    this.score += task.reward;
    const rewardPosition = { row: Math.floor(GameConfig.board.rows / 2), col: Math.floor(GameConfig.board.cols / 2) };
    this.gridManager.showFloatingScore([rewardPosition], task.reward);
    this.uiPanel.playScoreFlyFromWorld(this.gridManager.getPositionsWorldCenter([rewardPosition]), task.reward);
    this.activeTask = this.createNextTask();
    this.refreshTaskUi();
    this.refreshUi(`任务完成 +${task.reward}`);
  }

  private refreshTaskUi(): void {
    if (!this.activeTask) {
      return;
    }

    this.taskPanel.updateTask({
      title: this.activeTask.title,
      progress: this.activeTask.progress,
      target: this.activeTask.target,
      reward: this.activeTask.reward,
    });
  }

  private createNextTask(): ActiveTask {
    const taskType = Math.floor(Math.random() * 2);
    if (taskType === 0) {
      const target = this.randomInt(18, 30);
      return {
        kind: "clearAny",
        title: `消除普通图标 ${target} 个`,
        target,
        progress: 0,
        reward: 240 + target * 8,
      };
    }

    const itemType = ITEM_TYPES[this.randomInt(0, ITEM_TYPES.length - 1)];
    const itemScore = ITEM_SCORE_MAP[itemType];
    const target = Math.max(5, 12 - Math.floor(itemScore / 15));
    return {
      kind: "clearItem",
      title: `消除 ${ITEM_NAME_MAP[itemType]} ${target} 个`,
      target,
      progress: 0,
      reward: 220 + itemScore * target,
      itemType,
    };
  }

  private getRemovalSpecialType(positions: Position[]): SpecialType {
    for (const position of positions) {
      const cell = this.gridManager.getCell(position.row, position.col);
      if (cell?.specialType && cell.specialType !== SpecialType.None) {
        return cell.specialType;
      }
    }

    return SpecialType.None;
  }

  private async finishTurn(): Promise<void> {
    if (this.timeLeftSec <= 0) {
      this.endLevel();
      return;
    }

    if (await this.repairBoardIfNeeded()) {
      if (this.timeLeftSec <= 0 || this.isLevelEnded()) {
        this.endLevel();
        return;
      }
    }

    this.state = GameState.WAIT_INPUT;
    if (!this.hasAvailableMove()) {
      this.presentDeadlockShuffleOffer();
      return;
    }

    this.refreshUi("继续移动或消除方块");
  }

  private async repairBoardIfNeeded(): Promise<boolean> {
    if (GameConfig.debug.refillLogs) {
      console.warn("[GameManager] repair check before", JSON.stringify(this.gridManager.getDebugBoardSummary()));
    }
    this.gridManager.compactGridStateFromNodes();
    this.gridManager.normalizeCellNodeRefs();
    this.gridManager.restoreItemVisualsFromGrid();
    if (GameConfig.debug.refillLogs) {
      console.warn("[GameManager] repair check after normalize", JSON.stringify(this.gridManager.getDebugBoardSummary()));
    }
    if (this.gridManager.countFilledCells() >= GameConfig.board.rows * GameConfig.board.cols) {
      return false;
    }

    this.state = GameState.DROPING;
    await this.refillBoardAndResolveCascades();
    this.gridManager.restoreItemVisualsFromGrid();
    if (GameConfig.debug.refillLogs) {
      console.warn("[GameManager] repair finished", JSON.stringify(this.gridManager.getDebugBoardSummary()));
    }
    return true;
  }

  private endLevel(description = "3分钟挑战结束，继续刷新你的最高分。"): void {
    this.clearCountdownTimer();
    this.clearHintVisuals();
    this.clearBonusScoreOffer();
    this.state = GameState.LEVEL_END;
    void this.leaderboardService.submitScore(this.score).then(() => {
      this.onLeaderboardScoreSubmitted?.();
    });

    this.resultPanel.show({
      title: "挑战结束",
      description,
      scoreText: `本局总分 ${this.score}`,
      actionText: "再来一局",
    });
    this.statusCallback("挑战结束");
  }

  private watchRewardedAd(adUnitId: string): Promise<boolean> {
    const wxApi = (globalThis as { wx?: WechatGameApi }).wx;
    if (!wxApi?.createRewardedVideoAd) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      const ad = wxApi.createRewardedVideoAd({ adUnitId });
      let settled = false;
      const finish = (success: boolean): void => {
        if (settled) {
          return;
        }
        settled = true;
        ad.offClose?.(onClose);
        ad.offError?.(onError);
        resolve(success);
      };
      const onClose = (result: RewardedVideoAdCloseResult): void => {
        finish(result?.isEnded !== false);
      };
      const onError = (): void => {
        finish(false);
      };

      ad.onClose(onClose);
      ad.onError(onError);
      ad.show().catch(() => {
        ad.load()
          .then(() => ad.show())
          .catch(() => finish(false));
      });
    });
  }

  private presentDeadlockShuffleOffer(): void {
    if (this.hasPendingShuffleAd || this.state === GameState.LEVEL_END) {
      return;
    }

    this.hasPendingShuffleAd = true;
    this.refreshUi("没有可消除走法，棋盘进入死局");
    this.pauseCountdownTimer();
    this.bonusPanel.show();
  }

  private clearBonusScoreOffer(): void {
    this.hasPendingShuffleAd = false;
    this.bonusPanel.hide();
  }

  private isLevelEnded(): boolean {
    return this.state === GameState.LEVEL_END;
  }

  private hasAvailableMove(): boolean {
    return Boolean(
      this.matchCheck.findHintSwap(this.gridManager.gridData) ||
      this.matchCheck.findHintEmptyMove(this.gridManager.gridData),
    );
  }

  private async animateSwap(first: Position, second: Position): Promise<void> {
    const firstNode = this.gridManager.getNode(first.row, first.col);
    const secondNode = this.gridManager.getNode(second.row, second.col);
    if (!firstNode || !secondNode) {
      return;
    }

    const firstTarget = this.gridManager.cellToPosition(second.row, second.col);
    const secondTarget = this.gridManager.cellToPosition(first.row, first.col);

    await Promise.all([
      TweenUtil.moveTo(firstNode, GameConfig.board.swapDuration, firstTarget),
      TweenUtil.moveTo(secondNode, GameConfig.board.swapDuration, secondTarget),
    ]);
  }

  private async animateMoveToEmpty(first: Position, second: Position): Promise<void> {
    const firstNode = this.gridManager.getNode(first.row, first.col);
    if (!firstNode) {
      return;
    }

    await TweenUtil.moveTo(firstNode, GameConfig.board.swapDuration, this.gridManager.cellToPosition(second.row, second.col));
  }

  private async animateCellsToHome(first: Position, second: Position): Promise<void> {
    const firstNode = this.gridManager.getNode(first.row, first.col);
    const secondNode = this.gridManager.getNode(second.row, second.col);
    if (!firstNode || !secondNode) {
      return;
    }

    await Promise.all([
      TweenUtil.moveTo(firstNode, GameConfig.board.swapDuration, this.gridManager.cellToPosition(first.row, first.col)),
      TweenUtil.moveTo(secondNode, GameConfig.board.swapDuration, this.gridManager.cellToPosition(second.row, second.col)),
    ]);
  }

  private refreshUi(status: string): void {
    this.uiPanel.updateProgress({
      score: this.score,
      timeLeftSec: this.timeLeftSec,
      status,
    });
    this.statusCallback(status);
  }

  private startCountdownTimer(): void {
    this.clearCountdownTimer();
    this.countdownTimer = setInterval(() => {
      if (this.state === GameState.LEVEL_END) {
        this.clearCountdownTimer();
        return;
      }

      this.timeLeftSec = Math.max(0, this.timeLeftSec - 1);
      if (this.timeLeftSec <= 0) {
        this.refreshUi("时间耗尽");
        this.clearCountdownTimer();
        if (this.state === GameState.WAIT_INPUT) {
          this.endLevel();
        }
        return;
      }

      this.refreshUi("继续移动或消除方块");
    }, 1000);
  }

  private pauseCountdownTimer(): void {
    this.clearCountdownTimer();
  }

  private resumeCountdownTimer(): void {
    if (this.state === GameState.LEVEL_END || this.countdownTimer) {
      return;
    }

    if (this.timeLeftSec <= 0) {
      this.endLevel();
      return;
    }

    this.startCountdownTimer();
  }

  private clearCountdownTimer(): void {
    if (!this.countdownTimer) {
      return;
    }
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }

  private clearHintVisuals(): void {
    this.gridManager.clearHintSwap();
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private keyToPosition(key: string): Position {
    const [row, col] = key.split("-").map(Number);
    return { row, col };
  }
}

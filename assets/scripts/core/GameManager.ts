import { GameConfig } from "./GameConfig";
import { DropManager } from "./DropManager";
import { GridManager } from "./GridManager";
import { ItemManager } from "./ItemManager";
import { MatchCheck } from "./MatchCheck";
import { BlockState, GameState, ITEM_SCORE_MAP, ITEM_TYPES, ItemType, LEVELS, LevelConfig, Position, SpecialType } from "../data/LevelData";
import { TweenUtil } from "../util/TweenUtil";
import { UIBonusPanel } from "../ui/UIBonusPanel";
import { UIGamePanel } from "../ui/UIGamePanel";
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
  private readonly resultPanel: UIResultPanel;
  private readonly statusCallback: (message: string) => void;

  private state = GameState.WAIT_INPUT;
  private currentLevelIndex = 0;
  private score = 0;
  private timeLeftSec = 0;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private selectedCell: Position | null = null;
  private chainStep = 0;
  private isWatchingPowerAd = false;
  private hasUsedExtraTimeAd = false;
  private isWatchingBonusAd = false;
  private pendingBonusScore = 0;
  private lastBonusOfferAtMs = 0;
  private activeTask: ActiveTask | null = null;

  constructor(options: GameManagerOptions) {
    this.gridManager = options.gridManager;
    this.itemManager = options.itemManager;
    this.uiPanel = options.uiPanel;
    this.taskPanel = options.taskPanel;
    this.bonusPanel = options.bonusPanel;
    this.resultPanel = options.resultPanel;
    this.statusCallback = options.statusCallback;
  }

  startLevel(level: LevelConfig): void {
    this.clearCountdownTimer();
    this.clearHintVisuals();
    this.currentLevelIndex = Math.max(
      0,
      LEVELS.findIndex((entry) => entry.id === level.id),
    );
    this.score = 0;
    this.timeLeftSec = level.durationSec;
    this.selectedCell = null;
    this.chainStep = 0;
    this.hasUsedExtraTimeAd = false;
    this.isWatchingPowerAd = false;
    this.isWatchingBonusAd = false;
    this.pendingBonusScore = 0;
    this.lastBonusOfferAtMs = 0;
    this.activeTask = this.createNextTask();
    this.clearBonusScoreOffer();
    this.state = GameState.WAIT_INPUT;
    this.resultPanel.hide();
    this.gridManager.initializeGrid();
    this.uiPanel.renderLevelInfo(level);
    this.refreshTaskUi();
    this.refreshUi("点击任意两个方块进行交换");
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
    void this.handleExtraTimeAdAction();
  }

  async handleExtraTimeAdAction(): Promise<void> {
    if (this.isWatchingPowerAd || this.state !== GameState.LEVEL_END) {
      return;
    }

    if (this.hasUsedExtraTimeAd) {
      this.statusCallback("本局加时机会已使用");
      return;
    }

    this.isWatchingPowerAd = true;
    this.resultPanel.setSecondaryEnabled(false, "广告中...");
    this.statusCallback("正在拉起广告...");
    const watched = await this.watchRewardedAd(GameConfig.powerup.adUnitId);
    this.isWatchingPowerAd = false;
    if (!watched) {
      this.statusCallback("完整观看广告后才能增加挑战时间");
      this.resultPanel.setSecondaryEnabled(true, `看广告 +${GameConfig.powerup.extraTimeSec}秒`);
      return;
    }

    if (!this.isLevelEnded()) {
      return;
    }

    this.selectedCell = null;
    this.gridManager.clearSelection();
    this.clearHintVisuals();
    this.hasUsedExtraTimeAd = true;
    this.timeLeftSec = GameConfig.powerup.extraTimeSec;
    this.state = GameState.WAIT_INPUT;
    this.resultPanel.hide();
    this.refreshUi(`挑战时间 +${GameConfig.powerup.extraTimeSec} 秒`);
    this.startCountdownTimer();
  }

  async handleBonusScoreAdAction(): Promise<void> {
    if (this.isWatchingBonusAd || this.pendingBonusScore <= 0 || this.state === GameState.LEVEL_END) {
      return;
    }

    const bonusScore = this.pendingBonusScore;
    this.bonusPanel.setClaimEnabled(false);
    this.isWatchingBonusAd = true;
    this.statusCallback("正在领取幸运翻倍...");
    const watched = await this.watchRewardedAd(GameConfig.bonusAd.adUnitId);
    this.isWatchingBonusAd = false;
    if (!watched) {
      this.statusCallback("完整观看广告后才能领取翻倍奖励");
      this.bonusPanel.setClaimEnabled(true);
      return;
    }

    if (this.isLevelEnded()) {
      this.clearBonusScoreOffer();
      return;
    }

    this.score += bonusScore;
    const bonusPosition = { row: Math.floor(GameConfig.board.rows / 2), col: Math.floor(GameConfig.board.cols / 2) };
    this.gridManager.showFloatingScore([bonusPosition], bonusScore);
    this.uiPanel.playScoreFlyFromWorld(this.gridManager.getPositionsWorldCenter([bonusPosition]), bonusScore);
    this.clearBonusScoreOffer();
    this.refreshUi(`幸运翻倍 +${bonusScore}`);
    this.resumeCountdownTimer();
  }

  dismissBonusScoreOffer(): void {
    if (this.isWatchingBonusAd) {
      return;
    }

    this.clearBonusScoreOffer();
    this.resumeCountdownTimer();
  }

  async handleCellTap(row: number, col: number): Promise<void> {
    if (this.state !== GameState.WAIT_INPUT) {
      return;
    }

    this.gridManager.playCellTapEffect(row, col);
    this.clearHintVisuals();

    if (!this.selectedCell) {
      this.selectedCell = { row, col };
      this.gridManager.highlightCell(this.selectedCell);
      this.statusCallback("已选中方块，继续点击任意方块交换");
      return;
    }

    const next = { row, col };
    if (this.selectedCell.row === next.row && this.selectedCell.col === next.col) {
      this.selectedCell = null;
      this.gridManager.clearSelection();
      this.statusCallback("已取消选择");
      return;
    }

    const first = this.selectedCell;
    this.selectedCell = null;
    this.gridManager.clearSelection();
    await this.trySwap(first, next);
  }

  private async trySwap(first: Position, second: Position): Promise<void> {
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
      this.timeLeftSec = Math.max(0, this.timeLeftSec - GameConfig.penalty.noMatchSwapTimeSec);
      this.refreshUi(`未形成消除，时间 -${GameConfig.penalty.noMatchSwapTimeSec} 秒`);
      this.finishTurn();
      return;
    }

    await this.resolveMatches(matchedPositions, specialSpawn);
    this.finishTurn();
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
      this.updateTaskProgress(removalResult);
      this.maybeShowBonusScoreOffer(addScore, removalResult);

      if (pendingSpecial) {
        const cell = this.gridManager.getCell(pendingSpecial.position.row, pendingSpecial.position.col);
        const node = this.gridManager.getNode(pendingSpecial.position.row, pendingSpecial.position.col);
        if (cell.itemType && node) {
          cell.specialType = pendingSpecial.specialType;
          this.itemManager.updateItemNode(node, cell.itemType, cell.specialType, GameConfig.board.tileSize);
        }
      }

      this.state = GameState.DROPING;
      await this.dropManager.collapseAndRefill(this.gridManager, this.itemManager);

      const analysis = this.matchCheck.findMatches(this.gridManager.gridData);
      pending = analysis.allMatches;
      pendingSpecial = analysis.specialSpawn;
    }
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
    this.timeLeftSec += GameConfig.reward.matchTimeSec;
    const timeText = `时间 +${GameConfig.reward.matchTimeSec} 秒`;
    this.refreshUi(chainStep > 1 ? `连锁 x${chainStep} +${addScore}，${timeText}` : `消除 +${addScore}，${timeText}`);
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

  private finishTurn(): void {
    if (this.timeLeftSec <= 0) {
      this.endLevel();
      return;
    }

    this.state = GameState.WAIT_INPUT;
    this.refreshUi("继续交换任意两个方块");
    this.presentBonusScoreOffer();
  }

  private endLevel(): void {
    this.clearCountdownTimer();
    this.clearHintVisuals();
    this.clearBonusScoreOffer();
    this.state = GameState.LEVEL_END;

    this.resultPanel.show({
      title: "挑战结束",
      description: this.hasUsedExtraTimeAd
        ? "挑战计时结束，继续刷新你的最高分。"
        : "挑战计时结束，看广告可追加 30 秒继续冲分。",
      scoreText: `本局总分 ${this.score}`,
      actionText: "再来一局",
      secondaryActionText: this.hasUsedExtraTimeAd
        ? undefined
        : `看广告 +${GameConfig.powerup.extraTimeSec}秒`,
    });
    this.statusCallback("计时结束");
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

  private maybeShowBonusScoreOffer(addScore: number, removalResult: RemovalResult): void {
    if (this.state === GameState.LEVEL_END || this.isWatchingBonusAd) {
      return;
    }

    const now = Date.now();
    const hasHighValueItem = ITEM_TYPES.some((itemType) => {
      return (removalResult.itemCounts[itemType] ?? 0) > 0 &&
        ITEM_SCORE_MAP[itemType] >= GameConfig.bonusAd.minItemScore;
    });
    if (!hasHighValueItem || now - this.lastBonusOfferAtMs < GameConfig.bonusAd.cooldownSec * 1000) {
      return;
    }

    this.lastBonusOfferAtMs = now;
    this.pendingBonusScore = Math.max(this.pendingBonusScore, addScore);
  }

  private presentBonusScoreOffer(): void {
    if (this.pendingBonusScore <= 0 || this.state === GameState.LEVEL_END) {
      return;
    }

    this.pauseCountdownTimer();
    this.bonusPanel.show(this.pendingBonusScore);
  }

  private clearBonusScoreOffer(): void {
    this.pendingBonusScore = 0;
    this.bonusPanel.hide();
  }

  private isLevelEnded(): boolean {
    return this.state === GameState.LEVEL_END;
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

      this.refreshUi("继续交换任意两个方块");
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

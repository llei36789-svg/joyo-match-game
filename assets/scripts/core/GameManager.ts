import { GameConfig } from "./GameConfig";
import { DropManager } from "./DropManager";
import { GridManager } from "./GridManager";
import { ItemManager } from "./ItemManager";
import { MatchCheck } from "./MatchCheck";
import { BlockState, GameState, LEVELS, LevelConfig, LevelGoalType, Position, SpecialType } from "../data/LevelData";
import { TweenUtil } from "../util/TweenUtil";
import { UIGamePanel } from "../ui/UIGamePanel";
import { UIResultPanel } from "../ui/UIResultPanel";

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
  resultPanel: UIResultPanel;
  statusCallback: (message: string) => void;
}

export class GameManager {
  private readonly dropManager = new DropManager();
  private readonly matchCheck = new MatchCheck();
  private readonly gridManager: GridManager;
  private readonly itemManager: ItemManager;
  private readonly uiPanel: UIGamePanel;
  private readonly resultPanel: UIResultPanel;
  private readonly statusCallback: (message: string) => void;

  private state = GameState.WAIT_INPUT;
  private currentLevelIndex = 0;
  private currentLevel: LevelConfig = LEVELS[0];
  private score = 0;
  private movesLeft = 0;
  private selectedCell: Position | null = null;
  private chainStep = 0;
  private lastResultSuccess = false;
  private isReviving = false;

  constructor(options: GameManagerOptions) {
    this.gridManager = options.gridManager;
    this.itemManager = options.itemManager;
    this.uiPanel = options.uiPanel;
    this.resultPanel = options.resultPanel;
    this.statusCallback = options.statusCallback;
  }

  startLevel(level: LevelConfig): void {
    this.clearHintTimer();
    this.clearHintVisuals();
    this.currentLevelIndex = Math.max(
      0,
      LEVELS.findIndex((entry) => entry.id === level.id),
    );
    this.currentLevel = level;
    this.score = 0;
    this.movesLeft = level.moves;
    this.selectedCell = null;
    this.chainStep = 0;
    this.state = GameState.WAIT_INPUT;
    this.isReviving = false;
    this.resultPanel.hide();
    this.gridManager.initializeGrid();
    this.uiPanel.renderLevelInfo(level);
    this.refreshUi("点击任意两个方块进行交换");
    this.resetHintTimer();
  }

  startLevelByIndex(index: number): void {
    const safeIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
    this.startLevel(LEVELS[safeIndex]);
  }

  restartCurrentLevel(): void {
    this.startLevelByIndex(this.currentLevelIndex);
  }

  handlePrimaryResultAction(): void {
    if (this.lastResultSuccess && this.currentLevelIndex < LEVELS.length - 1) {
      this.startLevelByIndex(this.currentLevelIndex + 1);
      return;
    }

    if (this.lastResultSuccess && this.currentLevelIndex >= LEVELS.length - 1) {
      this.startLevelByIndex(0);
      return;
    }

    this.restartCurrentLevel();
  }

  handleSecondaryResultAction(): void {
    if (this.lastResultSuccess) {
      this.restartCurrentLevel();
      return;
    }

    void this.reviveWithAd();
  }

  async handleCellTap(row: number, col: number): Promise<void> {
    if (this.state !== GameState.WAIT_INPUT) {
      return;
    }

    this.resetHintTimer();

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
    this.clearHintTimer();
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

    this.movesLeft -= 1;
    this.chainStep = 0;
    if (matchedPositions.length === 0) {
      this.refreshUi("已交换位置，本步未形成消除");
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

    while (pending.length > 0) {
      this.chainStep += 1;
      this.state = GameState.MATCHING;
      const expanded = this.matchCheck.expandSpecialEffects(this.gridManager.gridData, pending);
      const removalKeys = new Set(expanded.map((position) => `${position.row}-${position.col}`));

      if (pendingSpecial) {
        removalKeys.delete(`${pendingSpecial.position.row}-${pendingSpecial.position.col}`);
      }

      await this.removeCells(Array.from(removalKeys).map((key) => this.keyToPosition(key)));
      this.applyScore(expanded.length, pendingSpecial?.specialType ?? SpecialType.None, this.chainStep);

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

  private async removeCells(positions: Position[]): Promise<void> {
    const tasks: Promise<void>[] = [];
    positions.forEach((position) => {
      const cell = this.gridManager.getCell(position.row, position.col);
      const node = this.gridManager.getNode(position.row, position.col);
      if (!cell || !node || !cell.itemType) {
        return;
      }

      tasks.push(
        TweenUtil.fadeAndScaleOut(node, GameConfig.board.clearDuration).then(() => {
          this.itemManager.recycleItemNode(node);
        }),
      );
      this.gridManager.setCell(position.row, position.col, null, SpecialType.None, "", BlockState.Normal);
    });

    await Promise.all(tasks);
  }

  private applyScore(matchCount: number, specialType: SpecialType, chainStep: number): void {
    let addScore = matchCount * GameConfig.score.normal;
    if (matchCount >= 4 && matchCount < 5) {
      addScore += GameConfig.score.fourMatch;
    }
    if (matchCount >= 5) {
      addScore += GameConfig.score.fiveMatch;
    }
    if (specialType !== SpecialType.None) {
      addScore = Math.floor(addScore * GameConfig.score.specialMultiplier);
    }
    addScore += (chainStep - 1) * GameConfig.score.chainBonus;

    this.score += addScore;
    this.refreshUi(chainStep > 1 ? `连锁 x${chainStep}` : "消除成功");
  }

  private finishTurn(): void {
    if (this.hasReachedLevelGoal()) {
      this.endLevel(true);
      return;
    }

    if (this.movesLeft <= 0) {
      this.endLevel(false);
      return;
    }

    this.state = GameState.WAIT_INPUT;
    this.refreshUi("继续交换任意两个方块");
    this.resetHintTimer();
  }

  private hasReachedLevelGoal(): boolean {
    return this.currentLevel.goalType === LevelGoalType.Score && this.score >= this.currentLevel.targetScore;
  }

  private endLevel(success: boolean): void {
    this.clearHintTimer();
    this.clearHintVisuals();
    this.state = GameState.LEVEL_END;
    this.lastResultSuccess = success;
    let bonusScore = 0;
    if (success && this.movesLeft > 0) {
      bonusScore = this.movesLeft * GameConfig.score.normal;
      this.score += bonusScore;
      this.movesLeft = 0;
      this.refreshUi("剩余步数已转化为奖励分");
    }

    const star = this.calculateStars();
    const isLastLevel = this.currentLevelIndex >= LEVELS.length - 1;
    this.resultPanel.show({
      title: success ? (isLastLevel ? "全部通关" : "挑战成功") : "挑战失败",
      description: success
        ? isLastLevel
          ? `你已完成全部 ${LEVELS.length} 关。目标分 ${this.currentLevel.targetScore}，奖励加成 ${bonusScore} 分，本局获得 ${star} 星。`
          : `达到目标分数 ${this.currentLevel.targetScore}，奖励加成 ${bonusScore} 分，本局获得 ${star} 星，准备进入下一关。`
        : `还差 ${Math.max(this.currentLevel.targetScore - this.score, 0)} 分达成目标，再来一局。`,
      scoreText: `得分 ${this.score} / ${this.currentLevel.targetScore}`,
      actionText: success ? (isLastLevel ? "从第一关开始" : "下一关") : "重新挑战",
      secondaryActionText: success ? "重玩本关" : "看广告复活",
    });
    this.statusCallback(success ? "关卡完成" : "关卡失败");
  }

  private async reviveWithAd(): Promise<void> {
    if (this.isReviving || this.state !== GameState.LEVEL_END || this.lastResultSuccess) {
      return;
    }

    this.isReviving = true;
    this.statusCallback("正在拉起微信广告...");
    const watched = await this.watchRewardedAd();
    if (this.state !== GameState.LEVEL_END || this.lastResultSuccess) {
      this.isReviving = false;
      return;
    }
    if (!watched) {
      this.isReviving = false;
      this.statusCallback("完整观看广告后才能复活");
      return;
    }

    this.resultPanel.hide();
    this.clearHintTimer();
    this.clearHintVisuals();
    this.selectedCell = null;
    this.movesLeft = Math.max(0, this.movesLeft) + GameConfig.revive.extraMoves;
    this.state = GameState.SWAPPING;
    this.refreshUi(`复活成功，增加 ${GameConfig.revive.extraMoves} 步`);
    await this.gridManager.shuffleBoard(GameConfig.revive.shuffleDuration);
    this.state = GameState.WAIT_INPUT;
    this.isReviving = false;
    this.refreshUi("棋盘已重排，继续挑战");
    this.resetHintTimer();
  }

  private watchRewardedAd(): Promise<boolean> {
    const wxApi = (globalThis as { wx?: WechatGameApi }).wx;
    if (!wxApi?.createRewardedVideoAd) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      const ad = wxApi.createRewardedVideoAd({ adUnitId: GameConfig.revive.adUnitId });
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

  private calculateStars(): number {
    if (this.score >= this.currentLevel.starScores[2]) {
      return 3;
    }
    if (this.score >= this.currentLevel.starScores[1]) {
      return 2;
    }
    return this.score >= this.currentLevel.starScores[0] ? 1 : 0;
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
      movesLeft: this.movesLeft,
      targetScore: this.currentLevel.targetScore,
      star: this.calculateStars(),
      status,
    });
    this.statusCallback(status);
  }

  private resetHintTimer(): void {
    this.clearHintTimer();
    this.clearHintVisuals();
  }

  private clearHintTimer(): void {
    return;
  }

  private clearHintVisuals(): void {
    this.gridManager.clearHintSwap();
  }

  private keyToPosition(key: string): Position {
    const [row, col] = key.split("-").map(Number);
    return { row, col };
  }
}

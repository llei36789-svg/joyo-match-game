import {
  _decorator,
  Color,
  Component,
  Graphics,
  Label,
  Layers,
  Node,
  NodeEventType,
  resources,
  Size,
  Sprite,
  SpriteFrame,
  Tween,
  tween,
  UIOpacity,
  UITransform,
  Vec3,
  EventTouch,
  view,
} from "cc";
import { GameConfig } from "./core/GameConfig";
import { GameManager } from "./core/GameManager";
import { GridManager } from "./core/GridManager";
import { ItemManager } from "./core/ItemManager";
import { LeaderboardService } from "./core/LeaderboardService";
import { SoundManager } from "./core/SoundManager";
import { ITEM_SCORE_MAP, ItemType, LEVELS, Position } from "./data/LevelData";
import { PoolUtil } from "./util/PoolUtil";
import { UIBonusPanel } from "./ui/UIBonusPanel";
import { UIGamePanel } from "./ui/UIGamePanel";
import { UILeaderboardPanel } from "./ui/UILeaderboardPanel";
import { UILotteryPanel } from "./ui/UILotteryPanel";
import { UIResultPanel } from "./ui/UIResultPanel";
import { UITaskPanel } from "./ui/UITaskPanel";

const { ccclass } = _decorator;

const ITEM_SCORE_DESCRIPTIONS: Array<{ name: string; itemType: ItemType }> = [
  { name: "方块", itemType: ItemType.Red },
  { name: "圆圈", itemType: ItemType.Yellow },
  { name: "三角形", itemType: ItemType.Blue },
  { name: "菱形", itemType: ItemType.Green },
  { name: "星星", itemType: ItemType.Purple },
  { name: "六边形", itemType: ItemType.Orange },
  { name: "五边形", itemType: ItemType.Pink },
  { name: "爱心", itemType: ItemType.Cyan },
  { name: "太阳", itemType: ItemType.Lime },
  { name: "加号", itemType: ItemType.Teal },
];

interface LayoutMetrics {
  stageWidth: number;
  stageHeight: number;
  contentWidth: number;
  headerSize: Size;
  headerY: number;
  taskSize: Size;
  taskY: number;
  topHudSize: Size;
  topHudY: number;
  boardFrameSize: Size;
  boardContentSize: Size;
  boardY: number;
}

@ccclass("GameRoot")
export class GameRoot extends Component {
  private readonly leaderboardService = new LeaderboardService();
  private soundManager: SoundManager | null = null;
  private gameManager: GameManager | null = null;
  private gridManager: GridManager | null = null;
  private boardNode: Node | null = null;
  private gamePanel: UIGamePanel | null = null;
  private taskPanel: UITaskPanel | null = null;
  private bonusPanel: UIBonusPanel | null = null;
  private leaderboardPanel: UILeaderboardPanel | null = null;
  private lotteryPanel: UILotteryPanel | null = null;
  private resultPanel: UIResultPanel | null = null;
  private layout: LayoutMetrics | null = null;
  private instructionPanel: Node | null = null;

  onLoad(): void {
    this.buildScene();
    this.bootstrapGame();
  }

  onDestroy(): void {
    this.boardNode?.off(NodeEventType.TOUCH_END, this.onBoardTouched, this);
  }

  private buildScene(): void {
    this.layout = this.getLayoutMetrics();
    this.setupRootTransform();
    this.createBackground();

    const layout = this.layout;
    if (!layout) {
      return;
    }

    const headerNode = this.createNode("Header", this.node, new Vec3(0, layout.headerY, 0), layout.headerSize);
    this.createHeader(headerNode);

    const taskNode = this.createNode("TaskHud", this.node, new Vec3(0, layout.taskY, 0), layout.taskSize);
    const topHudNode = this.createNode("TopHud", this.node, new Vec3(0, layout.topHudY, 0), layout.topHudSize);

    this.createGlow(this.node, new Vec3(0, layout.boardY, 0), Math.min(layout.boardFrameSize.width, layout.boardFrameSize.height) * 0.48, new Color(113, 152, 255, 26));
    const boardFrame = this.createPanel(
      "BoardFrame",
      this.node,
      new Vec3(0, layout.boardY, 0),
      layout.boardFrameSize,
      new Color(15, 21, 44, 245),
      new Color(146, 190, 255, 188),
      38,
      5,
    );
    this.createBoardFrameDecor(
      boardFrame,
      layout.boardFrameSize,
      layout.boardContentSize,
    );

    this.boardNode = this.createNode(
      "BoardNode",
      boardFrame,
      new Vec3(0, 0, 0),
      layout.boardContentSize,
    );
    this.boardNode.on(NodeEventType.TOUCH_END, this.onBoardTouched, this);

    this.gamePanel = topHudNode.addComponent(UIGamePanel);
    this.gamePanel.buildLayout(topHudNode, this.createPanel.bind(this), this.createLabel.bind(this), this.createIconBadge.bind(this));

    this.taskPanel = taskNode.addComponent(UITaskPanel);
    this.taskPanel.buildLayout(taskNode, this.createPanel.bind(this), this.createLabel.bind(this));

    this.resultPanel = this.node.addComponent(UIResultPanel);
    this.resultPanel.buildLayout(this.createPanel.bind(this), this.createLabel.bind(this), this.createButton.bind(this));
    this.resultPanel.setActions(
      () => this.gameManager?.handlePrimaryResultAction(),
      () => this.gameManager?.handleSecondaryResultAction(),
    );

    this.bonusPanel = this.node.addComponent(UIBonusPanel);
    this.bonusPanel.buildLayout(this.createPanel.bind(this), this.createLabel.bind(this), this.createButton.bind(this));

    this.leaderboardPanel = this.node.addComponent(UILeaderboardPanel);
    this.leaderboardPanel.buildLayout(
      this.leaderboardService,
      this.createPanel.bind(this),
      this.createLabel.bind(this),
      this.createButton.bind(this),
    );

    this.lotteryPanel = this.node.addComponent(UILotteryPanel);
    this.lotteryPanel.buildLayout(
      this.createPanel.bind(this),
      this.createLabel.bind(this),
      new Vec3(0, layout.boardY + layout.boardFrameSize.height * 0.29, 0),
      new Size(Math.min(layout.contentWidth - 38, 660), 158),
    );

    this.createInstructionPanel();
  }

  private bootstrapGame(): void {
    if (!this.boardNode || !this.gamePanel || !this.taskPanel || !this.bonusPanel || !this.leaderboardPanel || !this.lotteryPanel || !this.resultPanel) {
      return;
    }

    const layout = this.layout ?? this.getLayoutMetrics();
    const poolUtil = new PoolUtil();
    const itemManager = new ItemManager(poolUtil);
    this.soundManager = this.soundManager ?? new SoundManager(this.node);

    this.gridManager = new GridManager({
      boardNode: this.boardNode,
      itemManager,
      tileSize: Math.min(layout.boardContentSize.width / GameConfig.board.cols, layout.boardContentSize.height / GameConfig.board.rows),
      cellWidth: layout.boardContentSize.width / GameConfig.board.cols,
      cellHeight: layout.boardContentSize.height / GameConfig.board.rows,
      boardWidth: layout.boardContentSize.width,
      boardHeight: layout.boardContentSize.height,
      rows: GameConfig.board.rows,
      cols: GameConfig.board.cols,
    });

    this.gameManager = new GameManager({
      gridManager: this.gridManager,
      itemManager,
      uiPanel: this.gamePanel,
      taskPanel: this.taskPanel,
      bonusPanel: this.bonusPanel,
      leaderboardService: this.leaderboardService,
      onLeaderboardScoreSubmitted: () => {
        void this.leaderboardPanel?.refresh();
      },
      soundManager: this.soundManager,
      lotteryPanel: this.lotteryPanel,
      resultPanel: this.resultPanel,
      statusCallback: (_message) => undefined,
    });
    this.bonusPanel.setActions(
      () => {
        void this.gameManager?.handleBonusScoreAdAction();
      },
      () => this.gameManager?.dismissBonusScoreOffer(),
    );

    this.gameManager.startLevel(LEVELS[0]);
  }

  private onBoardTouched(event: EventTouch): void {
    if (!this.gameManager) {
      return;
    }

    const cell = this.getBoardCellFromTouch(event);
    if (!cell) {
      return;
    }

    void this.gameManager.handleCellTap(cell.row, cell.col);
  }

  private getBoardCellFromTouch(event: EventTouch): Position | null {
    if (!this.boardNode) {
      return null;
    }

    const location = event.getUILocation();
    const uiTransform = this.boardNode.getComponent(UITransform);
    if (!uiTransform) {
      return null;
    }

    const local = uiTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
    const boardSize = uiTransform.contentSize;
    const cellWidth = boardSize.width / GameConfig.board.cols;
    const cellHeight = boardSize.height / GameConfig.board.rows;
    const col = Math.floor((local.x + boardSize.width / 2) / cellWidth);
    const row = Math.floor((boardSize.height / 2 - local.y) / cellHeight);

    if (
      row < 0 ||
      row >= GameConfig.board.rows ||
      col < 0 ||
      col >= GameConfig.board.cols
    ) {
      return null;
    }

    return { row, col };
  }

  private setupRootTransform(): void {
    const layout = this.layout ?? this.getLayoutMetrics();
    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(layout.stageWidth, layout.stageHeight);
    this.node.setPosition(new Vec3(0, 0, 0));
  }

  private createBackground(): void {
    const layout = this.layout ?? this.getLayoutMetrics();
    const background = this.createNode(
      "Background",
      this.node,
      Vec3.ZERO,
      new Size(layout.stageWidth, layout.stageHeight),
    );
    const graphics = background.addComponent(Graphics);
    graphics.fillColor = new Color(128, 209, 255, 255);
    graphics.rect(
      -layout.stageWidth / 2,
      -layout.stageHeight / 2,
      layout.stageWidth,
      layout.stageHeight,
    );
    graphics.fill();

    const bandHeight = layout.stageHeight / 4;
    const bandColors = [
      new Color(255, 183, 222, 118),
      new Color(178, 238, 255, 138),
      new Color(205, 196, 255, 126),
      new Color(185, 247, 208, 108),
    ];
    bandColors.forEach((color, index) => {
      graphics.fillColor = color;
      graphics.rect(
        -layout.stageWidth / 2,
        layout.stageHeight / 2 - bandHeight * (index + 1),
        layout.stageWidth,
        bandHeight + 2,
      );
      graphics.fill();
    });

    this.createGlow(
      background,
      new Vec3(-layout.stageWidth * 0.31, layout.stageHeight * 0.35, 0),
      Math.min(layout.stageWidth * 0.34, 248),
      new Color(255, 246, 186, 58),
    );
    this.createGlow(
      background,
      new Vec3(layout.stageWidth * 0.34, layout.stageHeight * 0.08, 0),
      Math.min(layout.stageWidth * 0.26, 186),
      new Color(255, 143, 212, 46),
    );
    this.createGlow(
      background,
      new Vec3(0, -layout.stageHeight * 0.39, 0),
      Math.min(layout.stageWidth * 0.38, 274),
      new Color(110, 239, 221, 38),
    );

    this.createPanel(
      "BackdropAura",
      background,
      new Vec3(0, layout.boardY - 8, 0),
      new Size(layout.contentWidth + 12, Math.min(layout.stageHeight * 0.78, 1040)),
      new Color(255, 255, 255, 52),
      new Color(111, 159, 255, 46),
      56,
      2,
    );
    this.createPanel(
      "BottomMist",
      background,
      new Vec3(0, -layout.stageHeight * 0.38, 0),
      new Size(layout.contentWidth + 6, Math.min(layout.stageHeight * 0.22, 300)),
      new Color(255, 240, 251, 50),
      new Color(255, 182, 225, 45),
      44,
      2,
    );

    this.createPanel(
      "BackgroundLine",
      background,
      new Vec3(0, 0, 0),
      new Size(layout.stageWidth - 22, layout.stageHeight - 26),
      new Color(0, 0, 0, 0),
      new Color(255, 255, 255, 88),
      42,
      2,
    );

    this.createBubbleField(background, layout);

    this.createGlow(
      background,
      new Vec3(-layout.stageWidth * 0.39, layout.stageHeight * 0.46, 0),
      10,
      new Color(255, 255, 255, 150),
    );
    this.createGlow(
      background,
      new Vec3(layout.stageWidth * 0.36, layout.stageHeight * 0.42, 0),
      8,
      new Color(255, 251, 189, 140),
    );
    this.createGlow(
      background,
      new Vec3(layout.stageWidth * 0.41, -layout.stageHeight * 0.12, 0),
      12,
      new Color(255, 255, 255, 116),
    );
  }

  private createHeader(parent: Node): void {
    const layout = this.layout ?? this.getLayoutMetrics();
    const headerWidth = layout.headerSize.width;
    const headerHeight = layout.headerSize.height;
    const titleAspect = 547 / 150;
    const titleImageHeight = Math.min(headerHeight * 0.82, 158);
    const titleImageWidth = Math.min(headerWidth - 220, titleImageHeight * titleAspect);

    this.createLeaderboardButton(parent, new Vec3(-headerWidth / 2 + 58, 6, 0));
    this.createTitleImage(parent, new Vec3(0, 2, 0), new Size(titleImageWidth, titleImageHeight));
    this.createInstructionButton(parent, new Vec3(headerWidth / 2 - 58, 6, 0));
  }

  private createTitleImage(parent: Node, position: Vec3, size: Size): void {
    const titleNode = this.createNode("TitleImage", parent, position, size);
    const sprite = titleNode.addComponent(Sprite);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    resources.load("ui/title-logo/spriteFrame", SpriteFrame, (error, spriteFrame) => {
      if (error || !spriteFrame || !titleNode.isValid) {
        return;
      }
      sprite.spriteFrame = spriteFrame;
    });
  }

  private createInstructionButton(parent: Node, position: Vec3): void {
    const button = this.createPanel(
      "InstructionButton",
      parent,
      position,
      new Size(84, 84),
      new Color(36, 48, 100, 245),
      new Color(255, 219, 130, 230),
      42,
      4,
    );
    const label = this.createLabel(
      "InstructionButtonLabel",
      button,
      Vec3.ZERO,
      new Size(62, 62),
      48,
      new Color(255, 240, 188, 255),
      true,
    );
    label.string = "?";
    this.applyButtonPressEffect(button);
    button.on(NodeEventType.TOUCH_END, () => this.showInstructionPanel(), this);
  }

  private createLeaderboardButton(parent: Node, position: Vec3): void {
    const button = this.createPanel(
      "LeaderboardButton",
      parent,
      position,
      new Size(84, 84),
      new Color(36, 48, 100, 245),
      new Color(122, 242, 255, 230),
      42,
      4,
    );
    const label = this.createLabel(
      "LeaderboardButtonLabel",
      button,
      Vec3.ZERO,
      new Size(62, 62),
      38,
      new Color(214, 248, 255, 255),
      true,
    );
    label.string = "榜";
    this.applyButtonPressEffect(button);
    button.on(NodeEventType.TOUCH_END, () => this.showLeaderboardPanel(), this);
  }

  private createInstructionPanel(): void {
    const layout = this.layout ?? this.getLayoutMetrics();
    const mask = this.createPanel(
      "InstructionMask",
      this.node,
      Vec3.ZERO,
      new Size(layout.stageWidth, layout.stageHeight),
      new Color(4, 8, 18, 218),
      new Color(0, 0, 0, 0),
      0,
      0,
    );
    mask.active = false;
    mask.on(NodeEventType.TOUCH_START, this.swallowTouch, this);
    mask.on(NodeEventType.TOUCH_END, this.swallowTouch, this);

    const cardSize = new Size(Math.min(layout.stageWidth - 4, 900), Math.min(layout.stageHeight - 24, 1260));
    const cardTop = cardSize.height / 2;
    const card = this.createPanel(
      "InstructionCard",
      mask,
      Vec3.ZERO,
      cardSize,
      new Color(17, 24, 50, 252),
      new Color(151, 196, 255, 190),
      36,
      4,
    );

    const title = this.createLabel(
      "InstructionTitle",
      card,
      new Vec3(0, cardTop - 74, 0),
      new Size(cardSize.width - 76, 78),
      60,
      new Color(255, 235, 172, 255),
      true,
    );
    title.string = "玩法说明";

    const desc = this.createLabel(
      "InstructionDesc",
      card,
      new Vec3(0, cardTop - 278, 0),
      new Size(cardSize.width - 86, 360),
      32,
      new Color(224, 234, 255, 255),
    );
    desc.horizontalAlign = Label.HorizontalAlign.LEFT;
    desc.lineHeight = 44;
    desc.string = [
      "每局限时3分钟，比拼最终消除总分。",
      "点击方块，可移到相邻空格。",
      "也可和能立即消除的相邻方块交换。",
      "3 个以上相同图标连成一线会消除。",
      "消除后会持续补充新方块。",
      "完成任务会自动领奖并刷新任务。",
      "开奖可获得得分翻倍或超级大奖。",
      "出现死局时可看广告打乱棋盘。",
    ].join("\n");

    const scoreTitle = this.createLabel(
      "InstructionScoreTitle",
      card,
      new Vec3(0, cardTop - 520, 0),
      new Size(cardSize.width - 88, 62),
      42,
      new Color(255, 235, 172, 255),
      true,
    );
    scoreTitle.string = "方块分数";

    const scoreLines = ITEM_SCORE_DESCRIPTIONS.map(
      (entry) => `${entry.name}：${ITEM_SCORE_MAP[entry.itemType]}分`,
    );
    const leftScoreList = this.createLabel(
      "InstructionScoreListLeft",
      card,
      new Vec3(-cardSize.width * 0.24, cardTop - 735, 0),
      new Size(cardSize.width * 0.43, 320),
      36,
      new Color(224, 234, 255, 255),
    );
    leftScoreList.horizontalAlign = Label.HorizontalAlign.LEFT;
    leftScoreList.lineHeight = 52;
    leftScoreList.string = scoreLines.slice(0, 5).join("\n");

    const rightScoreList = this.createLabel(
      "InstructionScoreListRight",
      card,
      new Vec3(cardSize.width * 0.25, cardTop - 735, 0),
      new Size(cardSize.width * 0.42, 320),
      36,
      new Color(224, 234, 255, 255),
    );
    rightScoreList.horizontalAlign = Label.HorizontalAlign.LEFT;
    rightScoreList.lineHeight = 52;
    rightScoreList.string = scoreLines.slice(5).join("\n");

    const closeButton = this.createButton(
      "InstructionCloseButton",
      card,
      new Vec3(0, -cardTop + 98, 0),
      new Size(380, 104),
      "知道了",
      true,
    );
    const closeLabel = closeButton.getChildByName("InstructionCloseButton-label")?.getComponent(Label);
    if (closeLabel) {
      closeLabel.fontSize = 40;
      closeLabel.lineHeight = 52;
    }
    closeButton.on(NodeEventType.TOUCH_END, () => this.hideInstructionPanel(), this);

    this.instructionPanel = mask;
  }

  private showInstructionPanel(): void {
    if (this.instructionPanel) {
      this.instructionPanel.active = true;
      this.instructionPanel.setSiblingIndex(this.node.children.length - 1);
    }
  }

  private hideInstructionPanel(): void {
    if (this.instructionPanel) {
      this.instructionPanel.active = false;
    }
  }

  private showLeaderboardPanel(): void {
    this.leaderboardPanel?.show();
  }

  private swallowTouch(event: EventTouch): void {
    event.propagationStopped = true;
  }

  private createTitleIcon(parent: Node, position: Vec3, direction: number): void {
    const iconNode = this.createNode("TitleIcon", parent, position, new Size(72, 72));
    const graphics = iconNode.addComponent(Graphics);

    graphics.fillColor = new Color(93, 217, 255, 242);
    graphics.circle(direction * -4, 7, 19);
    graphics.fill();
    graphics.fillColor = new Color(42, 96, 162, 255);
    graphics.roundRect(direction * -20, -18, 32, 36, 16);
    graphics.fill();
    graphics.fillColor = new Color(210, 250, 255, 180);
    graphics.circle(direction * -11, 16, 6);
    graphics.fill();

    graphics.fillColor = new Color(255, 195, 88, 255);
    graphics.roundRect(direction * 13, -6, 25, 25, 8);
    graphics.fill();
    graphics.fillColor = new Color(255, 240, 171, 230);
    graphics.circle(direction * 20, 2, 5);
    graphics.fill();

    graphics.strokeColor = new Color(255, 255, 255, 124);
    graphics.lineWidth = 4;
    graphics.circle(direction * -4, 7, 23);
    graphics.stroke();
  }

  private createBoardFrameDecor(parent: Node, frameSize: Size, boardSize: Size): void {
    const decorNode = this.createNode("BoardDecor", parent, Vec3.ZERO, frameSize);
    const graphics = decorNode.addComponent(Graphics);
    graphics.strokeColor = new Color(167, 215, 255, 84);
    graphics.lineWidth = 2;

    const boardOffsetX = boardSize.width / 2;
    const boardOffsetY = boardSize.height / 2;
    const outerX = frameSize.width / 2 - 18;
    const outerY = frameSize.height / 2 - 18;
    graphics.roundRect(-outerX, -outerY, outerX * 2, outerY * 2, 30);
    graphics.stroke();

    for (let i = 1; i < GameConfig.board.rows; i += 1) {
      const pos = -boardOffsetY + i * (boardSize.height / GameConfig.board.rows);
      graphics.moveTo(-boardOffsetX, pos);
      graphics.lineTo(boardOffsetX, pos);
      graphics.stroke();
    }

    for (let i = 1; i < GameConfig.board.cols; i += 1) {
      const pos = -boardOffsetX + i * (boardSize.width / GameConfig.board.cols);
      graphics.moveTo(pos, -boardOffsetY);
      graphics.lineTo(pos, boardOffsetY);
      graphics.stroke();
    }

    const accent = 34;
    this.drawCornerAccent(graphics, -outerX + 10, outerY - 10, accent, false, true);
    this.drawCornerAccent(graphics, outerX - 10, outerY - 10, accent, true, true);
    this.drawCornerAccent(graphics, -outerX + 10, -outerY + 10, accent, false, false);
    this.drawCornerAccent(graphics, outerX - 10, -outerY + 10, accent, true, false);
  }

  private createIconBadge(parent: Node, iconText: string, labelText: string, position: Vec3): Node {
    const badge = this.createPanel(
      `Badge-${labelText}`,
      parent,
      position,
      new Size(186, 90),
      new Color(20, 28, 56, 238),
      new Color(124, 170, 255, 120),
      24,
      2,
    );

    const icon = this.createLabel(
      `${labelText}-icon`,
      badge,
      new Vec3(0, 20, 0),
      new Size(40, 34),
      24,
      new Color(176, 237, 255, 255),
      true,
    );
    icon.string = iconText;

    const label = this.createLabel(
      `${labelText}-label`,
      badge,
      new Vec3(0, -14, 0),
      new Size(146, 28),
      18,
      new Color(218, 228, 255, 255),
      true,
    );
    label.string = labelText;
    return badge;
  }

  private createButton(
    name: string,
    parent: Node,
    position: Vec3,
    size: Size,
    text: string,
    primary = false,
  ): Node {
    const buttonNode = this.createPanel(
      name,
      parent,
      position,
      size,
      primary ? new Color(31, 58, 116, 250) : new Color(23, 31, 60, 240),
      primary ? new Color(122, 242, 255, 240) : new Color(166, 184, 255, 160),
      24,
      3,
    );

    const accentNode = this.createNode(`${name}-accent`, buttonNode, Vec3.ZERO, size);
    const graphics = accentNode.addComponent(Graphics);
    graphics.strokeColor = primary ? new Color(255, 190, 231, 180) : new Color(106, 150, 255, 88);
    graphics.lineWidth = 3;
    graphics.moveTo(-size.width / 2 + 18, size.height / 2 - 14);
    graphics.lineTo(size.width / 2 - 18, size.height / 2 - 14);
    graphics.stroke();

    const label = this.createLabel(
      `${name}-label`,
      buttonNode,
      Vec3.ZERO,
      new Size(size.width - 24, size.height - 16),
      primary ? 28 : 22,
      primary ? new Color(182, 247, 255, 255) : new Color(225, 233, 255, 255),
      true,
    );
    label.string = text;
    this.applyButtonPressEffect(buttonNode);
    return buttonNode;
  }

  private applyButtonPressEffect(buttonNode: Node): void {
    const pressScale = new Vec3(0.93, 0.93, 1);
    const normalScale = Vec3.ONE.clone();
    const scaleTo = (scale: Vec3): void => {
      Tween.stopAllByTarget(buttonNode);
      tween(buttonNode).to(0.08, { scale }).start();
    };

    buttonNode.on(NodeEventType.TOUCH_START, () => scaleTo(pressScale), this);
    buttonNode.on(NodeEventType.TOUCH_END, () => scaleTo(normalScale), this);
    buttonNode.on(NodeEventType.TOUCH_CANCEL, () => scaleTo(normalScale), this);
  }

  private createPanel(
    name: string,
    parent: Node,
    position: Vec3,
    size: Size,
    fillColor: Color,
    strokeColor: Color,
    radius: number,
    lineWidth: number,
  ): Node {
    const node = this.createNode(name, parent, position, size);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = fillColor;
    graphics.strokeColor = strokeColor;
    graphics.lineWidth = lineWidth;
    graphics.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, radius);
    graphics.fill();
    graphics.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, radius);
    graphics.stroke();
    if (fillColor.a > 40 && radius >= 8 && size.height > 24) {
      graphics.fillColor = this.lightenColor(fillColor, 24, Math.min(fillColor.a + 12, 130));
      graphics.roundRect(
        -size.width / 2 + 8,
        size.height / 2 - size.height * 0.38 - 10,
        size.width - 16,
        size.height * 0.32,
        Math.max(radius - 8, 8),
      );
      graphics.fill();
    }
    return node;
  }

  private createGlow(parent: Node, position: Vec3, radius: number, color: Color): void {
    const glow = this.createNode("Glow", parent, position, new Size(radius * 2, radius * 2));
    const graphics = glow.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.circle(0, 0, radius);
    graphics.fill();
  }

  private createBubbleField(parent: Node, layout: LayoutMetrics): void {
    const bubbleConfigs = [
      { x: -0.42, y: -0.34, r: 14, delay: 0.1, duration: 7.4 },
      { x: -0.28, y: -0.12, r: 9, delay: 1.2, duration: 6.8 },
      { x: -0.18, y: 0.23, r: 16, delay: 2.1, duration: 8.2 },
      { x: -0.05, y: -0.42, r: 11, delay: 0.7, duration: 7.1 },
      { x: 0.12, y: -0.18, r: 18, delay: 1.7, duration: 8.6 },
      { x: 0.27, y: 0.18, r: 10, delay: 0.4, duration: 6.5 },
      { x: 0.39, y: -0.36, r: 13, delay: 2.6, duration: 7.8 },
      { x: 0.44, y: 0.32, r: 8, delay: 1.0, duration: 6.2 },
      { x: -0.36, y: 0.39, r: 7, delay: 3.0, duration: 6.9 },
      { x: 0.02, y: 0.34, r: 12, delay: 2.4, duration: 7.3 },
      { x: 0.31, y: -0.02, r: 15, delay: 3.5, duration: 8.1 },
      { x: -0.48, y: 0.04, r: 10, delay: 1.8, duration: 7.0 },
    ];

    bubbleConfigs.forEach((config, index) => {
      const start = new Vec3(layout.stageWidth * config.x, layout.stageHeight * config.y, 0);
      this.createFloatingBubble(parent, `Bubble${index}`, start, config.r, config.delay, config.duration);
    });
  }

  private createFloatingBubble(parent: Node, name: string, start: Vec3, radius: number, delay: number, duration: number): void {
    const bubble = this.createNode(name, parent, start, new Size(radius * 2.6, radius * 2.6));
    const opacity = bubble.addComponent(UIOpacity);
    opacity.opacity = 100;

    const graphics = bubble.addComponent(Graphics);
    graphics.strokeColor = new Color(255, 255, 255, 118);
    graphics.lineWidth = Math.max(2, Math.round(radius * 0.16));
    graphics.circle(0, 0, radius);
    graphics.stroke();
    graphics.fillColor = new Color(255, 255, 255, 24);
    graphics.circle(0, 0, Math.max(radius - 2, 1));
    graphics.fill();

    const resetBubble = (): void => {
      bubble.setPosition(start);
      bubble.scale = Vec3.ONE.clone();
      opacity.opacity = 96;
    };
    const midpoint = new Vec3(start.x + radius * 1.4, start.y + radius * 6.8, 0);
    const end = new Vec3(start.x - radius * 1.2, start.y + radius * 13.5, 0);

    tween(bubble)
      .delay(delay)
      .repeatForever(
        tween<Node>()
          .call(resetBubble)
          .to(duration * 0.52, { position: midpoint, scale: new Vec3(1.12, 1.12, 1) })
          .to(duration * 0.48, { position: end, scale: new Vec3(0.86, 0.86, 1) }),
      )
      .start();

    tween(opacity)
      .delay(delay)
      .repeatForever(
        tween<UIOpacity>()
          .call(() => {
            opacity.opacity = 96;
          })
          .to(duration * 0.28, { opacity: 150 })
          .to(duration * 0.72, { opacity: 0 }),
      )
      .start();
  }

  private createNode(name: string, parent: Node, position: Vec3, size: Size): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(position);

    const transform = node.addComponent(UITransform);
    transform.setContentSize(size);
    return node;
  }

  private createLabel(
    name: string,
    parent: Node,
    position: Vec3,
    size: Size,
    fontSize: number,
    color: Color,
    bold = false,
  ): Label {
    const node = this.createNode(name, parent, position, size);
    const label = node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 10;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.isBold = bold;
    label.overflow = Label.Overflow.SHRINK;
    return label;
  }

  private drawCornerAccent(graphics: Graphics, x: number, y: number, length: number, right: boolean, top: boolean): void {
    const horizontal = right ? -length : length;
    const vertical = top ? -length : length;
    graphics.moveTo(x, y);
    graphics.lineTo(x + horizontal, y);
    graphics.stroke();
    graphics.moveTo(x, y);
    graphics.lineTo(x, y + vertical);
    graphics.stroke();
  }

  private lightenColor(color: Color, delta: number, alpha = color.a): Color {
    return new Color(
      Math.min(color.r + delta, 255),
      Math.min(color.g + delta, 255),
      Math.min(color.b + delta, 255),
      alpha,
    );
  }

  private getLayoutMetrics(): LayoutMetrics {
    const visibleSize = view.getVisibleSize();
    const stageWidth = Math.max(visibleSize.width, GameConfig.stage.width);
    const stageHeight = Math.max(visibleSize.height, GameConfig.stage.height);
    const horizontalPadding = Math.max(6, Math.round(stageWidth * 0.01));
    const contentWidth = stageWidth - horizontalPadding * 2;
    const topInset = Math.max(8, Math.round(stageHeight * 0.01));
    const bottomInset = Math.max(8, Math.round(stageHeight * 0.01));
    const sectionGap = Math.max(8, Math.round(stageHeight * 0.01));
    const headerHeight = Math.min(Math.max(stageHeight * 0.15, 188), 210);
    const taskHeight = Math.min(108, Math.max(96, stageHeight * 0.076));
    const topHudHeight = Math.min(146, Math.max(124, stageHeight * 0.105));
    const topY = stageHeight / 2;
    const bottomY = -stageHeight / 2;
    const headerY = topY - topInset - headerHeight / 2 - Math.max(18, stageHeight * 0.025);
    const headerBottom = headerY - headerHeight / 2;
    const topHudY = headerBottom - sectionGap - topHudHeight / 2;
    const topHudBottom = topHudY - topHudHeight / 2;
    const taskY = topHudBottom - sectionGap - taskHeight / 2;
    const taskBottom = taskY - taskHeight / 2;
    const boardAreaTop = taskBottom - Math.max(4, sectionGap * 0.5);
    const boardAreaBottom = bottomY + Math.max(2, bottomInset * 0.35);
    const boardFrameWidth = contentWidth;
    const boardFrameHeight = Math.max(0, boardAreaTop - boardAreaBottom);
    const boardContentSize = new Size(Math.max(boardFrameWidth - 20, 1), Math.max(boardFrameHeight - 20, 1));
    const boardY = (boardAreaTop + boardAreaBottom) / 2;

    return {
      stageWidth,
      stageHeight,
      contentWidth,
      headerSize: new Size(contentWidth, headerHeight),
      headerY,
      taskSize: new Size(contentWidth, taskHeight),
      taskY,
      topHudSize: new Size(contentWidth, topHudHeight),
      topHudY,
      boardFrameSize: new Size(boardFrameWidth, boardFrameHeight),
      boardContentSize,
      boardY,
    };
  }
}

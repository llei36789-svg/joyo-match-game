import { _decorator, Color, Component, Graphics, Label, Node, Size, UITransform, Vec3 } from "cc";
import { LevelConfig, LEVELS } from "../data/LevelData";

const { ccclass } = _decorator;

type PanelFactory = (
  name: string,
  parent: Node,
  position: Vec3,
  size: Size,
  fillColor: Color,
  strokeColor: Color,
  radius: number,
  lineWidth: number,
) => Node;

type LabelFactory = (
  name: string,
  parent: Node,
  position: Vec3,
  size: Size,
  fontSize: number,
  color: Color,
  bold?: boolean,
) => Label;

type BadgeFactory = (parent: Node, iconText: string, labelText: string, position: Vec3) => Node;

@ccclass("UIGamePanel")
export class UIGamePanel extends Component {
  private scoreValueLabel: Label | null = null;
  private scoreTargetLabel: Label | null = null;
  private movesValueLabel: Label | null = null;
  private levelLabel: Label | null = null;
  private progressFill: Graphics | null = null;
  private progressTrackWidth = 0;
  private progressTrackHeight = 0;

  buildLayout(topHudNode: Node, createPanel: PanelFactory, createLabel: LabelFactory, _createBadge: BadgeFactory): void {
    this.buildTopScoreHud(topHudNode, createPanel, createLabel);
  }

  renderLevelInfo(level: LevelConfig): void {
    if (this.scoreTargetLabel) {
      this.scoreTargetLabel.string = `目标 ${level.targetScore}`;
    }
    if (this.levelLabel) {
      this.levelLabel.string = `第 ${level.id} / ${LEVELS.length} 关`;
    }
  }

  updateProgress(payload: {
    score: number;
    movesLeft: number;
    targetScore: number;
    star: number;
    status: string;
  }): void {
    if (this.scoreValueLabel) {
      this.scoreValueLabel.string = `${payload.score}`;
    }
    if (this.scoreTargetLabel) {
      this.scoreTargetLabel.string = `目标 ${payload.targetScore}`;
    }
    if (this.movesValueLabel) {
      this.movesValueLabel.string = `步数 ${payload.movesLeft}`;
    }
    this.renderScoreProgress(payload.score, payload.targetScore);
  }

  private buildTopScoreHud(topHudNode: Node, createPanel: PanelFactory, createLabel: LabelFactory): void {
    const hudSize = topHudNode.getComponent(UITransform)?.contentSize ?? new Size(680, 64);
    const hud = createPanel(
      "ScoreHud",
      topHudNode,
      Vec3.ZERO,
      hudSize,
      new Color(17, 25, 52, 238),
      new Color(122, 176, 255, 118),
      22,
      2,
    );

    const leftBlockWidth = Math.min(282, hudSize.width * 0.35);
    const rightBlockWidth = Math.min(232, hudSize.width * 0.28);
    const barWidth = Math.max(184, hudSize.width - leftBlockWidth - rightBlockWidth - 30);
    const barHeight = Math.max(54, hudSize.height * 0.46);
    const barRadius = barHeight / 2;
    const labelTopY = hudSize.height * 0.2;
    const labelBottomY = -hudSize.height * 0.2;
    const barY = hudSize.height * 0.08;
    const levelY = -hudSize.height * 0.36;

    const scoreCaption = createLabel(
      "ScoreCaption",
      hud,
      new Vec3(-hudSize.width / 2 + leftBlockWidth / 2 + 12, labelTopY, 0),
      new Size(leftBlockWidth, 38),
      24,
      new Color(255, 217, 136, 255),
      true,
    );
    scoreCaption.string = "分数进度";

    this.scoreValueLabel = createLabel(
      "ScoreValueTop",
      hud,
      new Vec3(-hudSize.width / 2 + leftBlockWidth / 2 + 12, labelBottomY, 0),
      new Size(leftBlockWidth, 58),
      48,
      new Color(255, 245, 204, 255),
      true,
    );

    const barNode = new Node("ScoreBar");
    barNode.layer = hud.layer;
    barNode.parent = hud;
    barNode.setPosition(new Vec3(14, barY, 0));
    const barTransform = barNode.addComponent(UITransform);
    barTransform.setContentSize(new Size(barWidth, barHeight));

    const trackGraphics = barNode.addComponent(Graphics);
    trackGraphics.fillColor = new Color(29, 42, 86, 255);
    trackGraphics.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barRadius);
    trackGraphics.fill();
    trackGraphics.strokeColor = new Color(116, 168, 255, 110);
    trackGraphics.lineWidth = 2;
    trackGraphics.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barRadius);
    trackGraphics.stroke();

    const fillNode = new Node("ScoreFill");
    fillNode.layer = hud.layer;
    fillNode.parent = barNode;
    fillNode.setPosition(new Vec3(-barWidth / 2, 0, 0));
    const fillTransform = fillNode.addComponent(UITransform);
    fillTransform.setContentSize(new Size(barWidth, barHeight));
    this.progressFill = fillNode.addComponent(Graphics);
    this.progressTrackWidth = barWidth;
    this.progressTrackHeight = barHeight;

    this.levelLabel = createLabel(
      "LevelProgressTop",
      hud,
      new Vec3(14, levelY, 0),
      new Size(barWidth + 12, 34),
      25,
      new Color(218, 231, 255, 255),
      true,
    );
    this.levelLabel.string = `第 1 / ${LEVELS.length} 关`;

    this.scoreTargetLabel = createLabel(
      "ScoreTargetTop",
      hud,
      new Vec3(hudSize.width / 2 - rightBlockWidth / 2 - 8, labelTopY, 0),
      new Size(rightBlockWidth, 42),
      25,
      new Color(181, 240, 255, 255),
      true,
    );

    this.movesValueLabel = createLabel(
      "MovesTop",
      hud,
      new Vec3(hudSize.width / 2 - rightBlockWidth / 2 - 8, labelBottomY, 0),
      new Size(rightBlockWidth, 48),
      32,
      new Color(255, 245, 204, 255),
      true,
    );

    this.renderScoreProgress(0, 1);
  }

  private renderScoreProgress(score: number, targetScore: number): void {
    if (!this.progressFill) {
      return;
    }

    const progress = Math.max(0, Math.min(1, score / Math.max(targetScore, 1)));
    const width = this.progressTrackWidth * progress;
    this.progressFill.clear();
    if (width <= 0) {
      return;
    }
    this.progressFill.fillColor = new Color(255, 210, 102, 255);
    this.progressFill.roundRect(0, -this.progressTrackHeight / 2, width, this.progressTrackHeight, this.progressTrackHeight / 2);
    this.progressFill.fill();

    this.progressFill.fillColor = new Color(255, 243, 196, 92);
    const innerWidth = Math.max(width - 10, 0);
    if (innerWidth > 0) {
      this.progressFill.roundRect(
        5,
        this.progressTrackHeight * 0.05,
        innerWidth,
        this.progressTrackHeight * 0.28,
        Math.min(6, this.progressTrackHeight * 0.14),
      );
      this.progressFill.fill();
    }
  }

}

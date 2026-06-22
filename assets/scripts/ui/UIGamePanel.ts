import { _decorator, Color, Component, Label, Node, Size, tween, Tween, UIOpacity, UITransform, Vec3 } from "cc";
import { LevelConfig } from "../data/LevelData";

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
  private timeValueLabel: Label | null = null;

  buildLayout(topHudNode: Node, createPanel: PanelFactory, createLabel: LabelFactory, _createBadge: BadgeFactory): void {
    this.buildTopScoreHud(topHudNode, createPanel, createLabel);
  }

  renderLevelInfo(level: LevelConfig): void {
    void level;
  }

  updateProgress(payload: {
    score: number;
    timeLeftSec: number;
    status: string;
  }): void {
    if (this.scoreValueLabel) {
      this.scoreValueLabel.string = `${payload.score}`;
    }
    if (this.timeValueLabel) {
      this.timeValueLabel.string = `时间 ${this.formatTime(payload.timeLeftSec)}`;
    }
  }

  playScoreFlyFromWorld(startWorldPosition: Vec3, score: number): void {
    if (!this.scoreValueLabel || score <= 0) {
      return;
    }

    const rootTransform = this.node.getComponent(UITransform);
    const scoreTransform = this.scoreValueLabel.node.getComponent(UITransform);
    if (!rootTransform || !scoreTransform) {
      return;
    }

    const start = rootTransform.convertToNodeSpaceAR(startWorldPosition);
    const targetWorld = scoreTransform.convertToWorldSpaceAR(Vec3.ZERO);
    const target = rootTransform.convertToNodeSpaceAR(targetWorld);
    const midpoint = new Vec3(
      (start.x + target.x) / 2,
      Math.max(start.y, target.y) + 82,
      0,
    );

    if (this.node.parent) {
      this.node.setSiblingIndex(this.node.parent.children.length - 1);
    }

    const flyNode = new Node("ScoreFlyText");
    flyNode.layer = this.node.layer;
    flyNode.parent = this.node;
    flyNode.setPosition(start);
    flyNode.scale = new Vec3(0.7, 0.7, 1);

    flyNode.addComponent(UITransform).setContentSize(new Size(150, 54));
    const opacity = flyNode.addComponent(UIOpacity);
    opacity.opacity = 255;

    const label = flyNode.addComponent(Label);
    label.string = `+${score}`;
    label.fontSize = 34;
    label.lineHeight = 44;
    label.isBold = true;
    label.color = new Color(255, 224, 102, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;

    tween(flyNode)
      .to(0.16, { position: midpoint, scale: new Vec3(0.95, 0.95, 1) })
      .to(0.34, { position: target, scale: new Vec3(0.42, 0.42, 1) })
      .call(() => {
        flyNode.destroy();
        this.pulseScoreValue();
      })
      .start();

    tween(opacity)
      .delay(0.34)
      .to(0.16, { opacity: 0 })
      .start();
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

    const centerBlockWidth = Math.min(380, hudSize.width * 0.54);

    const scoreCaption = createLabel(
      "ScoreCaption",
      hud,
      new Vec3(0, hudSize.height * 0.26, 0),
      new Size(centerBlockWidth, 34),
      25,
      new Color(255, 217, 136, 255),
      true,
    );
    scoreCaption.string = "本局得分";

    this.scoreValueLabel = createLabel(
      "ScoreValueTop",
      hud,
      new Vec3(0, 0, 0),
      new Size(centerBlockWidth, 58),
      48,
      new Color(255, 245, 204, 255),
      true,
    );

    this.timeValueLabel = createLabel(
      "TimeTop",
      hud,
      new Vec3(0, -hudSize.height * 0.31, 0),
      new Size(centerBlockWidth, 40),
      32,
      new Color(255, 245, 204, 255),
      true,
    );
  }

  private formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${remainder < 10 ? "0" : ""}${remainder}`;
  }

  private pulseScoreValue(): void {
    if (!this.scoreValueLabel) {
      return;
    }

    const scoreNode = this.scoreValueLabel.node;
    Tween.stopAllByTarget(scoreNode);
    scoreNode.scale = Vec3.ONE.clone();
    tween(scoreNode)
      .to(0.08, { scale: new Vec3(1.12, 1.12, 1) })
      .to(0.1, { scale: Vec3.ONE.clone() })
      .start();
  }

}

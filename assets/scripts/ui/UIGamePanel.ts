import { _decorator, Color, Component, Label, Node, Size, UITransform, Vec3 } from "cc";
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

}

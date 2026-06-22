import { _decorator, Color, Component, Graphics, Label, Node, Size, UITransform, Vec3 } from "cc";

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

interface TaskViewPayload {
  title: string;
  progress: number;
  target: number;
  reward: number;
}

@ccclass("UITaskPanel")
export class UITaskPanel extends Component {
  private titleLabel: Label | null = null;
  private progressLabel: Label | null = null;
  private rewardLabel: Label | null = null;
  private progressFill: Graphics | null = null;
  private progressTrackWidth = 0;
  private progressTrackHeight = 0;

  buildLayout(taskNode: Node, createPanel: PanelFactory, createLabel: LabelFactory): void {
    const panelSize = taskNode.getComponent(UITransform)?.contentSize ?? new Size(680, 104);
    const panel = createPanel(
      "TaskPanel",
      taskNode,
      Vec3.ZERO,
      panelSize,
      new Color(19, 28, 60, 238),
      new Color(255, 214, 116, 150),
      24,
      3,
    );

    const badge = createPanel(
      "TaskBadge",
      panel,
      new Vec3(-panelSize.width / 2 + 78, 0, 0),
      new Size(116, 60),
      new Color(54, 43, 101, 242),
      new Color(255, 191, 230, 160),
      20,
      2,
    );
    const badgeLabel = createLabel(
      "TaskBadgeLabel",
      badge,
      Vec3.ZERO,
      new Size(92, 42),
      28,
      new Color(255, 232, 244, 255),
      true,
    );
    badgeLabel.string = "任务";

    const contentLeft = -panelSize.width / 2 + 154;
    const contentWidth = panelSize.width - 386;
    this.titleLabel = createLabel(
      "TaskTitle",
      panel,
      new Vec3(contentLeft + contentWidth / 2, 21, 0),
      new Size(contentWidth, 42),
      30,
      new Color(235, 243, 255, 255),
      true,
    );
    this.titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    const barWidth = contentWidth;
    const barHeight = 22;
    this.progressTrackWidth = barWidth;
    this.progressTrackHeight = barHeight;
    const barNode = new Node("TaskProgressBar");
    barNode.layer = panel.layer;
    barNode.parent = panel;
    barNode.setPosition(new Vec3(contentLeft + barWidth / 2, -31, 0));
    barNode.addComponent(UITransform).setContentSize(new Size(barWidth, barHeight));

    const track = barNode.addComponent(Graphics);
    track.fillColor = new Color(34, 45, 88, 255);
    track.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barHeight / 2);
    track.fill();
    track.strokeColor = new Color(111, 159, 255, 115);
    track.lineWidth = 2;
    track.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barHeight / 2);
    track.stroke();

    const fillNode = new Node("TaskProgressFill");
    fillNode.layer = panel.layer;
    fillNode.parent = barNode;
    fillNode.setPosition(new Vec3(-barWidth / 2, 0, 0));
    fillNode.addComponent(UITransform).setContentSize(new Size(barWidth, barHeight));
    this.progressFill = fillNode.addComponent(Graphics);

    this.progressLabel = createLabel(
      "TaskProgressText",
      panel,
      new Vec3(panelSize.width / 2 - 116, 21, 0),
      new Size(184, 40),
      29,
      new Color(255, 241, 190, 255),
      true,
    );

    this.rewardLabel = createLabel(
      "TaskRewardText",
      panel,
      new Vec3(panelSize.width / 2 - 116, -26, 0),
      new Size(184, 36),
      26,
      new Color(156, 239, 255, 255),
      true,
    );
  }

  updateTask(payload: TaskViewPayload): void {
    if (this.titleLabel) {
      this.titleLabel.string = payload.title;
    }
    const progress = Math.max(0, Math.min(payload.progress, payload.target));
    if (this.progressLabel) {
      this.progressLabel.string = `${progress}/${payload.target}`;
    }
    if (this.rewardLabel) {
      this.rewardLabel.string = `奖励 +${payload.reward}`;
    }
    this.renderProgress(progress / Math.max(payload.target, 1));
  }

  private renderProgress(progress: number): void {
    if (!this.progressFill) {
      return;
    }

    const width = this.progressTrackWidth * Math.max(0, Math.min(progress, 1));
    this.progressFill.clear();
    if (width <= 0) {
      return;
    }

    this.progressFill.fillColor = new Color(255, 205, 91, 255);
    this.progressFill.roundRect(0, -this.progressTrackHeight / 2, width, this.progressTrackHeight, this.progressTrackHeight / 2);
    this.progressFill.fill();
    this.progressFill.fillColor = new Color(255, 247, 198, 96);
    this.progressFill.roundRect(4, 1, Math.max(width - 8, 0), 5, 3);
    this.progressFill.fill();
  }
}

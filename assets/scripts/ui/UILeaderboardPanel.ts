import { _decorator, Color, Component, EventTouch, Label, Node, NodeEventType, Size, UITransform, Vec3 } from "cc";
import { GameConfig } from "../core/GameConfig";
import { LeaderboardEntry, LeaderboardPeriod, LeaderboardService } from "../core/LeaderboardService";

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

type ButtonFactory = (
  name: string,
  parent: Node,
  position: Vec3,
  size: Size,
  text: string,
  primary?: boolean,
) => Node;

@ccclass("UILeaderboardPanel")
export class UILeaderboardPanel extends Component {
  private service: LeaderboardService | null = null;
  private maskNode: Node | null = null;
  private cardNode: Node | null = null;
  private dailyTabLabel: Label | null = null;
  private weeklyTabLabel: Label | null = null;
  private selfRankLabel: Label | null = null;
  private selfScoreLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private updatedLabel: Label | null = null;
  private listRoot: Node | null = null;
  private rowNodes: Node[] = [];
  private activePeriod: LeaderboardPeriod = "daily";
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private createPanel: PanelFactory | null = null;
  private createLabel: LabelFactory | null = null;

  buildLayout(
    service: LeaderboardService,
    createPanel: PanelFactory,
    createLabel: LabelFactory,
    createButton: ButtonFactory,
  ): void {
    this.service = service;
    this.createPanel = createPanel;
    this.createLabel = createLabel;

    const rootSize = this.node.getComponent(UITransform)?.contentSize ?? new Size(GameConfig.stage.width, GameConfig.stage.height);
    this.maskNode = createPanel(
      "LeaderboardMask",
      this.node,
      Vec3.ZERO,
      rootSize,
      new Color(4, 8, 18, 222),
      new Color(0, 0, 0, 0),
      0,
      0,
    );
    this.maskNode.on(NodeEventType.TOUCH_START, this.swallowTouch, this);
    this.maskNode.on(NodeEventType.TOUCH_END, this.swallowTouch, this);

    const cardSize = new Size(Math.min(rootSize.width - 8, 760), Math.min(rootSize.height - 20, 1260));
    this.cardNode = createPanel(
      "LeaderboardCard",
      this.maskNode,
      Vec3.ZERO,
      cardSize,
      new Color(17, 24, 50, 252),
      new Color(151, 196, 255, 190),
      38,
      4,
    );

    const title = createLabel(
      "LeaderboardTitle",
      this.cardNode,
      new Vec3(0, cardSize.height / 2 - 72, 0),
      new Size(cardSize.width - 160, 64),
      62,
      new Color(255, 235, 172, 255),
      true,
    );
    title.string = "排行榜";

    const closeButton = createButton(
      "LeaderboardClose",
      this.cardNode,
      new Vec3(cardSize.width / 2 - 62, cardSize.height / 2 - 70, 0),
      new Size(84, 84),
      "×",
      false,
    );
    const closeLabel = closeButton.getChildByName("LeaderboardClose-label")?.getComponent(Label);
    if (closeLabel) {
      closeLabel.fontSize = 48;
      closeLabel.lineHeight = 58;
    }
    closeButton.on(NodeEventType.TOUCH_END, () => this.hide(), this);

    const tabY = cardSize.height / 2 - 166;
    const dailyTab = createButton("DailyRankTab", this.cardNode, new Vec3(-cardSize.width * 0.22, tabY, 0), new Size(262, 84), "本日排行", true);
    const weeklyTab = createButton("WeeklyRankTab", this.cardNode, new Vec3(cardSize.width * 0.22, tabY, 0), new Size(262, 84), "本周排行", false);
    this.dailyTabLabel = dailyTab.getChildByName("DailyRankTab-label")?.getComponent(Label) ?? null;
    this.weeklyTabLabel = weeklyTab.getChildByName("WeeklyRankTab-label")?.getComponent(Label) ?? null;
    [this.dailyTabLabel, this.weeklyTabLabel].forEach((label) => {
      if (label) {
        label.fontSize = 34;
        label.lineHeight = 44;
      }
    });
    dailyTab.on(NodeEventType.TOUCH_END, () => this.switchPeriod("daily"), this);
    weeklyTab.on(NodeEventType.TOUCH_END, () => this.switchPeriod("weekly"), this);

    const selfPanel = createPanel(
      "LeaderboardSelf",
      this.cardNode,
      new Vec3(0, cardSize.height / 2 - 286, 0),
      new Size(cardSize.width - 40, 142),
      new Color(28, 40, 84, 240),
      new Color(255, 219, 130, 150),
      26,
      2,
    );

    const selfAvatar = createPanel(
      "LeaderboardSelfAvatar",
      selfPanel,
      new Vec3(-cardSize.width / 2 + 118, 0, 0),
      new Size(88, 88),
      new Color(91, 114, 226, 255),
      new Color(255, 235, 172, 180),
      44,
      2,
    );
    const avatarLabel = createLabel("LeaderboardSelfAvatarText", selfAvatar, Vec3.ZERO, new Size(66, 54), 38, new Color(255, 255, 255, 255), true);
    avatarLabel.string = "我";

    this.selfRankLabel = createLabel(
      "LeaderboardSelfRank",
      selfPanel,
      new Vec3(-34, 28, 0),
      new Size(cardSize.width - 278, 52),
      38,
      new Color(255, 245, 204, 255),
      true,
    );
    this.selfScoreLabel = createLabel(
      "LeaderboardSelfScore",
      selfPanel,
      new Vec3(-34, -28, 0),
      new Size(cardSize.width - 278, 46),
      31,
      new Color(214, 226, 255, 255),
      true,
    );

    const refreshButton = createButton(
      "LeaderboardRefresh",
      selfPanel,
      new Vec3(cardSize.width / 2 - 124, 0, 0),
      new Size(146, 74),
      "刷新",
      false,
    );
    const refreshLabel = refreshButton.getChildByName("LeaderboardRefresh-label")?.getComponent(Label);
    if (refreshLabel) {
      refreshLabel.fontSize = 30;
      refreshLabel.lineHeight = 40;
    }
    refreshButton.on(NodeEventType.TOUCH_END, () => {
      void this.refresh();
    }, this);

    this.statusLabel = createLabel(
      "LeaderboardStatus",
      this.cardNode,
      new Vec3(0, cardSize.height / 2 - 382, 0),
      new Size(cardSize.width - 56, 44),
      28,
      new Color(190, 205, 238, 255),
    );

    this.listRoot = new Node("LeaderboardList");
    this.listRoot.layer = this.cardNode.layer;
    this.listRoot.parent = this.cardNode;
    this.listRoot.setPosition(new Vec3(0, -74, 0));
    this.listRoot.addComponent(UITransform).setContentSize(new Size(cardSize.width - 40, cardSize.height - 560));

    this.updatedLabel = createLabel(
      "LeaderboardUpdatedAt",
      this.cardNode,
      new Vec3(0, -cardSize.height / 2 + 50, 0),
      new Size(cardSize.width - 90, 32),
      25,
      new Color(154, 174, 218, 255),
    );

    this.hide();
  }

  show(): void {
    if (!this.maskNode) {
      return;
    }

    this.maskNode.active = true;
    this.maskNode.setSiblingIndex(this.node.children.length - 1);
    void this.refresh();
    this.startAutoRefresh();
  }

  hide(): void {
    if (this.maskNode) {
      this.maskNode.active = false;
    }
    this.stopAutoRefresh();
  }

  async refresh(): Promise<void> {
    if (!this.service || !this.statusLabel) {
      return;
    }

    this.statusLabel.string = "加载中...";
    try {
      const snapshot = await this.service.fetchSnapshot(this.activePeriod, 1, GameConfig.leaderboard.pageSize);
      this.renderSelf(snapshot.self);
      this.renderEntries(snapshot.entries);
      this.statusLabel.string = snapshot.entries.length > 0 ? "按单局最高分排名，同分先达成优先" : "暂无排行数据，快来对局挑战高分吧";
      if (this.updatedLabel) {
        this.updatedLabel.string = `最近刷新 ${this.formatClock(snapshot.updatedAt)}`;
      }
    } catch {
      this.clearRows();
      this.statusLabel.string = "网络异常，点击刷新重试";
      this.renderSelf(null);
    }
  }

  onDestroy(): void {
    this.stopAutoRefresh();
    this.maskNode?.off(NodeEventType.TOUCH_START, this.swallowTouch, this);
    this.maskNode?.off(NodeEventType.TOUCH_END, this.swallowTouch, this);
  }

  private switchPeriod(period: LeaderboardPeriod): void {
    if (this.activePeriod === period) {
      return;
    }

    this.activePeriod = period;
    this.updateTabState();
    void this.refresh();
  }

  private updateTabState(): void {
    if (this.dailyTabLabel) {
      this.dailyTabLabel.color = this.activePeriod === "daily"
        ? new Color(182, 247, 255, 255)
        : new Color(225, 233, 255, 255);
    }
    if (this.weeklyTabLabel) {
      this.weeklyTabLabel.color = this.activePeriod === "weekly"
        ? new Color(182, 247, 255, 255)
        : new Color(225, 233, 255, 255);
    }
  }

  private renderSelf(entry: LeaderboardEntry | null): void {
    if (this.selfRankLabel) {
      this.selfRankLabel.string = entry ? `我的排名：第 ${entry.rank} 名` : "我的排名：未上榜";
    }
    if (this.selfScoreLabel) {
      const label = this.activePeriod === "daily" ? "本日最高分" : "本周最高分";
      this.selfScoreLabel.string = entry ? `${label} ${entry.score}` : "暂无对局数据";
    }
  }

  private renderEntries(entries: LeaderboardEntry[]): void {
    this.clearRows();
    if (!this.listRoot || !this.createPanel || !this.createLabel) {
      return;
    }

    const listSize = this.listRoot.getComponent(UITransform)?.contentSize ?? new Size(620, 600);
    const rowHeight = 78;
    const visibleCount = Math.min(entries.length, Math.floor(listSize.height / rowHeight));
    const topY = listSize.height / 2 - rowHeight / 2;

    for (let i = 0; i < visibleCount; i += 1) {
      const entry = entries[i];
      const row = this.createRankRow(entry, new Vec3(0, topY - i * rowHeight, 0), new Size(listSize.width, rowHeight - 10));
      this.rowNodes.push(row);
    }
  }

  private createRankRow(entry: LeaderboardEntry, position: Vec3, size: Size): Node {
    const fill = entry.isSelf
      ? new Color(63, 76, 146, 246)
      : new Color(23, 32, 66, 236);
    const stroke = entry.rank <= 3
      ? new Color(255, 218, 112, 190)
      : new Color(103, 145, 231, 90);
    const row = this.createPanel!(
      `RankRow${entry.rank}`,
      this.listRoot!,
      position,
      size,
      fill,
      stroke,
      18,
      entry.rank <= 3 ? 3 : 1,
    );

    const rankColor = entry.rank === 1
      ? new Color(255, 220, 92, 255)
      : entry.rank === 2
        ? new Color(214, 232, 255, 255)
        : entry.rank === 3
          ? new Color(255, 178, 116, 255)
          : new Color(216, 226, 255, 255);
    const rankText = entry.rank === 1 ? "冠" : entry.rank === 2 ? "亚" : entry.rank === 3 ? "季" : `${entry.rank}`;

    const rank = this.createLabel!("RankLabel", row, new Vec3(-size.width * 0.42, 0, 0), new Size(82, 50), 34, rankColor, true);
    rank.string = rankText;

    const avatar = this.createPanel!(
      "RankAvatar",
      row,
      new Vec3(-size.width * 0.29, 0, 0),
      new Size(54, 54),
      new Color(88, 113, 224, 255),
      new Color(255, 255, 255, 105),
      27,
      1,
    );
    const avatarText = this.createLabel!("RankAvatarText", avatar, Vec3.ZERO, new Size(42, 34), 26, new Color(255, 255, 255, 255), true);
    avatarText.string = entry.avatarText;

    const name = this.createLabel!("RankName", row, new Vec3(-size.width * 0.08, 0, 0), new Size(size.width * 0.35, 52), 31, new Color(229, 236, 255, 255), true);
    name.horizontalAlign = Label.HorizontalAlign.LEFT;
    name.string = this.truncateNickname(entry.nickname);

    const score = this.createLabel!("RankScore", row, new Vec3(size.width * 0.32, 0, 0), new Size(size.width * 0.28, 52), 34, new Color(255, 234, 159, 255), true);
    score.horizontalAlign = Label.HorizontalAlign.RIGHT;
    score.string = `${entry.score}`;

    return row;
  }

  private clearRows(): void {
    this.rowNodes.forEach((row) => row.destroy());
    this.rowNodes = [];
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      if (this.maskNode?.active) {
        void this.refresh();
      }
    }, GameConfig.leaderboard.autoRefreshSec * 1000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private truncateNickname(nickname: string): string {
    return nickname.length > 7 ? `${nickname.slice(0, 7)}...` : nickname;
  }

  private formatClock(timestamp: number): string {
    const date = new Date(timestamp);
    const hour = this.pad2(date.getHours());
    const minute = this.pad2(date.getMinutes());
    const second = this.pad2(date.getSeconds());
    return `${hour}:${minute}:${second}`;
  }

  private pad2(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  private swallowTouch(event: EventTouch): void {
    event.propagationStopped = true;
  }
}

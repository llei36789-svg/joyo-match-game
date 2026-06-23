import { _decorator, Color, Component, Graphics, Label, Node, Size, tween, Tween, UIOpacity, UITransform, Vec3 } from "cc";

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

export type LotteryRarity = "normal" | "rare" | "epic" | "jackpot";

interface LotteryPayload {
  title: string;
  detail: string;
  rarity: LotteryRarity;
}

const RARITY_COLORS: Record<LotteryRarity, Color> = {
  normal: new Color(107, 67, 14, 255),
  rare: new Color(13, 105, 135, 255),
  epic: new Color(132, 47, 139, 255),
  jackpot: new Color(146, 58, 8, 255),
};

const FIREWORK_COLORS = [
  new Color(255, 243, 142, 255),
  new Color(255, 187, 58, 255),
  new Color(255, 116, 92, 255),
  new Color(255, 255, 255, 255),
];

@ccclass("UILotteryPanel")
export class UILotteryPanel extends Component {
  private toastNode: Node | null = null;
  private opacity: UIOpacity | null = null;
  private titleLabel: Label | null = null;
  private detailLabel: Label | null = null;
  private fireworkNodes: Node[] = [];

  buildLayout(createPanel: PanelFactory, createLabel: LabelFactory, position: Vec3, size: Size): void {
    this.toastNode = createPanel(
      "LotteryToast",
      this.node,
      position,
      size,
      new Color(255, 205, 74, 248),
      new Color(125, 72, 14, 230),
      30,
      5,
    );
    this.opacity = this.toastNode.addComponent(UIOpacity);
    this.opacity.opacity = 0;

    const shine = createPanel(
      "LotteryShine",
      this.toastNode,
      new Vec3(0, size.height * 0.19, 0),
      new Size(size.width - 28, size.height * 0.36),
      new Color(255, 247, 176, 120),
      new Color(255, 255, 255, 0),
      24,
      0,
    );
    shine.setSiblingIndex(0);

    const rim = createPanel(
      "LotteryInnerRim",
      this.toastNode,
      Vec3.ZERO,
      new Size(size.width - 18, size.height - 18),
      new Color(0, 0, 0, 0),
      new Color(255, 249, 184, 178),
      24,
      3,
    );
    rim.setSiblingIndex(1);

    const badge = createPanel(
      "LotteryBadge",
      this.toastNode,
      new Vec3(-size.width / 2 + 94, 0, 0),
      new Size(132, 70),
      new Color(255, 111, 72, 250),
      new Color(126, 55, 20, 210),
      22,
      3,
    );
    const badgeLabel = createLabel(
      "LotteryBadgeLabel",
      badge,
      Vec3.ZERO,
      new Size(108, 48),
      34,
      new Color(255, 255, 230, 255),
      true,
    );
    badgeLabel.string = "开奖";

    this.titleLabel = createLabel(
      "LotteryTitle",
      this.toastNode,
      new Vec3(78, 31, 0),
      new Size(size.width - 226, 54),
      42,
      new Color(255, 239, 188, 255),
      true,
    );
    this.titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    this.detailLabel = createLabel(
      "LotteryDetail",
      this.toastNode,
      new Vec3(78, -28, 0),
      new Size(size.width - 226, 46),
      35,
      new Color(104, 62, 14, 255),
      true,
    );
    this.detailLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    this.hide();
  }

  show(payload: LotteryPayload): void {
    if (!this.toastNode || !this.opacity) {
      return;
    }

    Tween.stopAllByTarget(this.toastNode);
    Tween.stopAllByTarget(this.opacity);
    this.toastNode.active = true;
    this.toastNode.setSiblingIndex(this.node.children.length - 1);
    this.toastNode.scale = new Vec3(0.68, 0.68, 1);
    this.opacity.opacity = 0;

    if (this.titleLabel) {
      this.titleLabel.string = payload.title;
      this.titleLabel.color = RARITY_COLORS[payload.rarity];
    }
    if (this.detailLabel) {
      this.detailLabel.string = payload.detail;
    }
    this.playFireworks(payload.rarity);

    tween(this.toastNode)
      .to(0.12, { scale: new Vec3(1.18, 1.18, 1) })
      .to(0.08, { scale: new Vec3(0.96, 0.96, 1) })
      .to(0.08, { scale: Vec3.ONE.clone() })
      .delay(1.16)
      .to(0.18, { scale: new Vec3(0.92, 0.92, 1) })
      .call(() => this.hide())
      .start();

    tween(this.opacity)
      .to(0.1, { opacity: 255 })
      .delay(1.34)
      .to(0.18, { opacity: 0 })
      .start();
  }

  hide(): void {
    if (this.toastNode) {
      this.toastNode.active = false;
    }
    this.clearFireworks();
  }

  private playFireworks(rarity: LotteryRarity): void {
    if (!this.toastNode) {
      return;
    }

    this.clearFireworks();
    const burstCount = rarity === "jackpot" ? 4 : rarity === "epic" ? 3 : 2;
    const particlesPerBurst = rarity === "normal" ? 10 : 16;
    const size = this.toastNode.getComponent(UITransform)?.contentSize ?? new Size(620, 150);
    const centers = [
      new Vec3(-size.width * 0.31, size.height * 0.24, 0),
      new Vec3(size.width * 0.34, size.height * 0.22, 0),
      new Vec3(0, size.height * 0.42, 0),
      new Vec3(size.width * 0.12, -size.height * 0.24, 0),
    ];

    for (let burstIndex = 0; burstIndex < burstCount; burstIndex += 1) {
      this.createFireworkBurst(centers[burstIndex], particlesPerBurst, burstIndex * 0.08);
    }
  }

  private createFireworkBurst(center: Vec3, particleCount: number, delay: number): void {
    if (!this.toastNode) {
      return;
    }

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount;
      const distance = 54 + (index % 4) * 14;
      const end = new Vec3(
        center.x + Math.cos(angle) * distance,
        center.y + Math.sin(angle) * distance,
        0,
      );
      const particle = new Node("LotteryFirework");
      particle.layer = this.toastNode.layer;
      particle.parent = this.toastNode;
      particle.setPosition(center);
      particle.scale = new Vec3(0.55, 0.55, 1);
      particle.addComponent(UITransform).setContentSize(new Size(22, 22));

      const opacity = particle.addComponent(UIOpacity);
      opacity.opacity = 0;

      const graphics = particle.addComponent(Graphics);
      graphics.fillColor = FIREWORK_COLORS[index % FIREWORK_COLORS.length];
      if (index % 3 === 0) {
        this.drawSpark(graphics, 7 + (index % 4));
      } else {
        graphics.circle(0, 0, 5 + (index % 4));
      }
      graphics.fill();

      this.fireworkNodes.push(particle);
      tween(particle)
        .delay(delay)
        .to(0.08, { scale: new Vec3(1.35, 1.35, 1) })
        .to(0.48, { position: end, scale: new Vec3(0.52, 0.52, 1) })
        .call(() => this.destroyFireworkNode(particle))
        .start();

      tween(opacity)
        .delay(delay)
        .to(0.08, { opacity: 255 })
        .to(0.48, { opacity: 0 })
        .start();
    }
  }

  private drawSpark(graphics: Graphics, radius: number): void {
    const inner = radius * 0.38;
    for (let i = 0; i < 8; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 8;
      const pointRadius = i % 2 === 0 ? radius : inner;
      const x = Math.cos(angle) * pointRadius;
      const y = Math.sin(angle) * pointRadius;
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.close();
  }

  private destroyFireworkNode(node: Node): void {
    const index = this.fireworkNodes.indexOf(node);
    if (index >= 0) {
      this.fireworkNodes.splice(index, 1);
    }
    if (node.isValid) {
      node.destroy();
    }
  }

  private clearFireworks(): void {
    this.fireworkNodes.forEach((node) => {
      if (node.isValid) {
        node.destroy();
      }
    });
    this.fireworkNodes = [];
  }
}

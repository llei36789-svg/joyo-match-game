import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, NodeEventType, Size, tween, UIOpacity, UITransform, Vec3 } from "cc";
import { GameConfig } from "../core/GameConfig";

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

interface ResultPayload {
  title: string;
  description: string;
  scoreText: string;
  actionText: string;
  secondaryActionText?: string;
}

@ccclass("UIResultPanel")
export class UIResultPanel extends Component {
  private maskNode: Node | null = null;
  private titleLabel: Label | null = null;
  private descLabel: Label | null = null;
  private scoreLabel: Label | null = null;
  private primaryButton: Node | null = null;
  private secondaryButton: Node | null = null;
  private primaryButtonLabel: Label | null = null;
  private secondaryButtonLabel: Label | null = null;
  private sparkleNodes: Node[] = [];
  private onPrimary: (() => void) | null = null;
  private onSecondary: (() => void) | null = null;

  buildLayout(createPanel: PanelFactory, createLabel: LabelFactory, createButton: ButtonFactory): void {
    const rootSize = this.node.getComponent(UITransform)?.contentSize ?? new Size(GameConfig.stage.width, GameConfig.stage.height);

    this.maskNode = createPanel(
      "ResultMask",
      this.node,
      Vec3.ZERO,
      new Size(rootSize.width, rootSize.height),
      new Color(4, 8, 18, 226),
      new Color(0, 0, 0, 0),
      0,
      0,
    );

    const cardSize = new Size(682, 660);
    const card = createPanel(
      "ResultCard",
      this.maskNode,
      Vec3.ZERO,
      cardSize,
      new Color(16, 22, 46, 250),
      new Color(140, 188, 255, 180),
      46,
      4,
    );
    this.createCelebrationFx(this.maskNode, cardSize);

    const badge = createPanel(
      "ResultBadge",
      card,
      new Vec3(0, 258, 0),
      new Size(288, 62),
      new Color(29, 40, 82, 228),
      new Color(255, 193, 230, 108),
      24,
      2,
    );
    const badgeLabel = createLabel(
      "ResultBadgeLabel",
      badge,
      Vec3.ZERO,
      new Size(248, 44),
      27,
      new Color(255, 223, 239, 255),
      true,
    );
    badgeLabel.string = "挑战结果";

    this.titleLabel = createLabel(
      "ResultTitle",
      card,
      new Vec3(0, 170, 0),
      new Size(574, 88),
      66,
      new Color(239, 244, 255, 255),
      true,
    );

    this.descLabel = createLabel(
      "ResultDesc",
      card,
      new Vec3(0, 48, 0),
      new Size(580, 138),
      32,
      new Color(196, 208, 236, 255),
    );

    this.scoreLabel = createLabel(
      "ResultScore",
      card,
      new Vec3(0, -102, 0),
      new Size(540, 66),
      48,
      new Color(255, 224, 136, 255),
      true,
    );

    this.primaryButton = createButton(
      "PrimaryButton",
      card,
      new Vec3(0, -208, 0),
      new Size(398, 96),
      "再来一局",
      true,
    );
    this.primaryButtonLabel = this.primaryButton.getChildByName("PrimaryButton-label")?.getComponent(Label) ?? null;
    if (this.primaryButtonLabel) {
      this.primaryButtonLabel.fontSize = 40;
      this.primaryButtonLabel.lineHeight = 50;
    }

    this.secondaryButton = createButton(
      "SecondaryButton",
      card,
      new Vec3(0, -294, 0),
      new Size(260, 70),
      "关闭",
      false,
    );
    this.secondaryButtonLabel = this.secondaryButton.getChildByName("SecondaryButton-label")?.getComponent(Label) ?? null;
    if (this.secondaryButtonLabel) {
      this.secondaryButtonLabel.fontSize = 31;
      this.secondaryButtonLabel.lineHeight = 41;
    }

    this.maskNode.on(NodeEventType.TOUCH_START, this.swallowTouch, this);
    this.maskNode.on(NodeEventType.TOUCH_END, this.swallowTouch, this);
    this.primaryButton.on(NodeEventType.TOUCH_END, () => this.onPrimary?.(), this);
    this.secondaryButton.on(NodeEventType.TOUCH_END, () => this.onSecondary?.(), this);

    this.hide();
  }

  setActions(onPrimary: () => void, onSecondary: () => void): void {
    this.onPrimary = onPrimary;
    this.onSecondary = onSecondary;
  }

  show(payload: ResultPayload): void {
    if (!this.maskNode) {
      return;
    }

    this.maskNode.active = true;
    this.sparkleNodes.forEach((node) => {
      node.active = true;
    });
    if (this.titleLabel) {
      this.titleLabel.string = payload.title;
    }
    if (this.descLabel) {
      this.descLabel.string = payload.description;
    }
    if (this.scoreLabel) {
      this.scoreLabel.string = payload.scoreText;
    }
    if (this.primaryButtonLabel) {
      this.primaryButtonLabel.string = payload.actionText;
    }
    const secondaryText = payload.secondaryActionText ?? "";
    if (this.secondaryButton) {
      this.secondaryButton.active = secondaryText.length > 0;
    }
    if (this.secondaryButtonLabel) {
      this.secondaryButtonLabel.string = secondaryText;
    }
  }

  hide(): void {
    if (this.maskNode) {
      this.maskNode.active = false;
    }
    this.sparkleNodes.forEach((node) => {
      node.active = false;
    });
  }

  onDestroy(): void {
    this.maskNode?.off(NodeEventType.TOUCH_START, this.swallowTouch, this);
    this.maskNode?.off(NodeEventType.TOUCH_END, this.swallowTouch, this);
  }

  private swallowTouch(event: EventTouch): void {
    event.propagationStopped = true;
  }

  private createCelebrationFx(parent: Node, cardSize: Size): void {
    const sparkleData = [
      { x: -cardSize.width * 0.43, y: cardSize.height * 0.42, size: 18, delay: 0, color: new Color(255, 228, 127, 255), star: true },
      { x: cardSize.width * 0.42, y: cardSize.height * 0.39, size: 16, delay: 0.18, color: new Color(134, 232, 255, 255), star: true },
      { x: -cardSize.width * 0.35, y: cardSize.height * 0.18, size: 10, delay: 0.34, color: new Color(255, 147, 218, 240), star: false },
      { x: cardSize.width * 0.36, y: cardSize.height * 0.15, size: 11, delay: 0.48, color: new Color(255, 238, 164, 245), star: false },
      { x: -cardSize.width * 0.46, y: -cardSize.height * 0.08, size: 14, delay: 0.62, color: new Color(128, 220, 255, 235), star: true },
      { x: cardSize.width * 0.45, y: -cardSize.height * 0.09, size: 13, delay: 0.76, color: new Color(255, 178, 224, 235), star: true },
      { x: -cardSize.width * 0.25, y: -cardSize.height * 0.42, size: 9, delay: 0.3, color: new Color(255, 239, 166, 230), star: false },
      { x: cardSize.width * 0.24, y: -cardSize.height * 0.43, size: 9, delay: 0.12, color: new Color(122, 231, 255, 230), star: false },
      { x: 0, y: cardSize.height * 0.48, size: 12, delay: 0.54, color: new Color(255, 255, 255, 230), star: true },
      { x: -cardSize.width * 0.04, y: -cardSize.height * 0.48, size: 8, delay: 0.66, color: new Color(255, 196, 236, 230), star: false },
    ];

    sparkleData.forEach((config, index) => {
      const node = new Node(`ResultSparkle${index}`);
      node.layer = parent.layer;
      node.parent = parent;
      node.setPosition(new Vec3(config.x, config.y, 0));
      node.addComponent(UITransform).setContentSize(new Size(config.size * 2.8, config.size * 2.8));
      node.addComponent(UIOpacity).opacity = 180;

      const graphics = node.addComponent(Graphics);
      if (config.star) {
        this.drawStar(graphics, config.size, config.color);
      } else {
        this.drawDot(graphics, config.size, config.color);
      }

      this.sparkleNodes.push(node);
      this.animateSparkle(node, config.delay, config.star ? 1.18 : 1.35);
    });
  }

  private drawDot(graphics: Graphics, radius: number, color: Color): void {
    graphics.fillColor = color;
    graphics.circle(0, 0, radius);
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 100);
    graphics.lineWidth = 2;
    graphics.circle(0, 0, radius + 4);
    graphics.stroke();
  }

  private drawStar(graphics: Graphics, radius: number, color: Color): void {
    graphics.fillColor = color;
    const points = 10;
    for (let i = 0; i <= points; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / points;
      const pointRadius = i % 2 === 0 ? radius : radius * 0.42;
      const x = Math.cos(angle) * pointRadius;
      const y = Math.sin(angle) * pointRadius;
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.fill();
  }

  private animateSparkle(node: Node, delay: number, scale: number): void {
    const opacity = node.getComponent(UIOpacity);
    if (!opacity) {
      return;
    }

    tween(node)
      .delay(delay)
      .repeatForever(
        tween<Node>()
          .to(0.55, { scale: new Vec3(scale, scale, 1), angle: 18 })
          .to(0.55, { scale: new Vec3(0.78, 0.78, 1), angle: -12 }),
      )
      .start();

    tween(opacity)
      .delay(delay)
      .repeatForever(
        tween<UIOpacity>()
          .to(0.55, { opacity: 255 })
          .to(0.55, { opacity: 120 }),
      )
      .start();
  }
}

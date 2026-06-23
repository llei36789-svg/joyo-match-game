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

@ccclass("UIBonusPanel")
export class UIBonusPanel extends Component {
  private maskNode: Node | null = null;
  private scoreLabel: Label | null = null;
  private claimButton: Node | null = null;
  private closeButton: Node | null = null;
  private claimButtonLabel: Label | null = null;
  private claimEnabled = true;
  private onClaim: (() => void) | null = null;
  private onClose: (() => void) | null = null;
  private sparkleNodes: Node[] = [];

  buildLayout(createPanel: PanelFactory, createLabel: LabelFactory, createButton: ButtonFactory): void {
    const rootSize = this.node.getComponent(UITransform)?.contentSize ?? new Size(GameConfig.stage.width, GameConfig.stage.height);

    this.maskNode = createPanel(
      "BonusMask",
      this.node,
      Vec3.ZERO,
      new Size(rootSize.width, rootSize.height),
      new Color(3, 7, 18, 222),
      new Color(0, 0, 0, 0),
      0,
      0,
    );

    const cardSize = new Size(Math.min(rootSize.width - 54, 650), 560);
    const card = createPanel(
      "BonusCard",
      this.maskNode,
      Vec3.ZERO,
      cardSize,
      new Color(18, 26, 58, 252),
      new Color(255, 218, 118, 220),
      42,
      5,
    );
    this.createSparkles(this.maskNode, cardSize);

    const badge = createPanel(
      "BonusBadge",
      card,
      new Vec3(0, cardSize.height / 2 - 62, 0),
      new Size(240, 58),
      new Color(63, 45, 103, 240),
      new Color(255, 193, 230, 170),
      24,
      3,
    );
    const badgeLabel = createLabel(
      "BonusBadgeLabel",
      badge,
      Vec3.ZERO,
      new Size(210, 42),
      28,
      new Color(255, 229, 245, 255),
      true,
    );
    badgeLabel.string = "死局救援";

    const title = createLabel(
      "BonusTitle",
      card,
      new Vec3(0, cardSize.height / 2 - 142, 0),
      new Size(cardSize.width - 90, 68),
      52,
      new Color(255, 241, 186, 255),
      true,
    );
    title.string = "打乱棋盘";

    const desc = createLabel(
      "BonusDesc",
      card,
      new Vec3(0, cardSize.height / 2 - 224, 0),
      new Size(cardSize.width - 92, 72),
      29,
      new Color(220, 232, 255, 255),
    );
    desc.lineHeight = 38;
    desc.string = "当前没有可消除走法\n看广告打乱后继续冲分";

    this.scoreLabel = createLabel(
      "BonusScore",
      card,
      new Vec3(0, -28, 0),
      new Size(cardSize.width - 96, 96),
      56,
      new Color(255, 218, 102, 255),
      true,
    );
    this.scoreLabel.lineHeight = 66;

    this.claimButton = createButton(
      "BonusClaimButton",
      card,
      new Vec3(0, -156, 0),
      new Size(392, 92),
      "看广告打乱",
      true,
    );
    this.claimButtonLabel = this.claimButton.getChildByName("BonusClaimButton-label")?.getComponent(Label) ?? null;
    if (this.claimButtonLabel) {
      this.claimButtonLabel.fontSize = 36;
      this.claimButtonLabel.lineHeight = 46;
    }

    this.closeButton = createButton(
      "BonusCloseButton",
      card,
      new Vec3(0, -244, 0),
      new Size(252, 68),
      "结束本局",
      false,
    );

    this.maskNode.on(NodeEventType.TOUCH_START, this.swallowTouch, this);
    this.maskNode.on(NodeEventType.TOUCH_END, this.swallowTouch, this);
    this.claimButton.on(NodeEventType.TOUCH_END, () => {
      if (this.claimEnabled) {
        this.onClaim?.();
      }
    }, this);
    this.closeButton.on(NodeEventType.TOUCH_END, () => this.onClose?.(), this);

    this.hide();
  }

  setActions(onClaim: () => void, onClose: () => void): void {
    this.onClaim = onClaim;
    this.onClose = onClose;
  }

  show(_remainingCount?: number): void {
    if (!this.maskNode) {
      return;
    }

    this.maskNode.active = true;
    this.maskNode.setSiblingIndex(this.node.children.length - 1);
    if (this.scoreLabel) {
      this.scoreLabel.string = "死局了\n继续冲分";
    }
    this.setClaimEnabled(true);
    this.sparkleNodes.forEach((node) => {
      node.active = true;
    });
  }

  hide(): void {
    if (this.maskNode) {
      this.maskNode.active = false;
    }
    this.sparkleNodes.forEach((node) => {
      node.active = false;
    });
    this.setClaimEnabled(true);
  }

  setClaimEnabled(enabled: boolean): void {
    this.claimEnabled = enabled;
    if (this.claimButton) {
      this.claimButton.scale = Vec3.ONE.clone();
    }
    if (this.claimButtonLabel) {
      this.claimButtonLabel.string = enabled ? "看广告打乱" : "打乱中...";
      this.claimButtonLabel.color = enabled
        ? new Color(182, 247, 255, 255)
        : new Color(190, 198, 220, 220);
    }
  }

  onDestroy(): void {
    this.maskNode?.off(NodeEventType.TOUCH_START, this.swallowTouch, this);
    this.maskNode?.off(NodeEventType.TOUCH_END, this.swallowTouch, this);
  }

  private swallowTouch(event: EventTouch): void {
    event.propagationStopped = true;
  }

  private createSparkles(parent: Node, cardSize: Size): void {
    const sparkleData = [
      { x: -cardSize.width * 0.42, y: cardSize.height * 0.43, size: 18, delay: 0, color: new Color(255, 224, 106, 255) },
      { x: cardSize.width * 0.41, y: cardSize.height * 0.35, size: 15, delay: 0.18, color: new Color(127, 231, 255, 250) },
      { x: -cardSize.width * 0.38, y: -cardSize.height * 0.18, size: 12, delay: 0.3, color: new Color(255, 154, 222, 235) },
      { x: cardSize.width * 0.38, y: -cardSize.height * 0.22, size: 13, delay: 0.44, color: new Color(255, 244, 176, 245) },
      { x: 0, y: cardSize.height * 0.49, size: 11, delay: 0.58, color: new Color(255, 255, 255, 220) },
    ];

    sparkleData.forEach((config, index) => {
      const node = new Node(`BonusSparkle${index}`);
      node.layer = parent.layer;
      node.parent = parent;
      node.setPosition(new Vec3(config.x, config.y, 0));
      node.addComponent(UITransform).setContentSize(new Size(config.size * 3, config.size * 3));
      node.addComponent(UIOpacity).opacity = 190;

      const graphics = node.addComponent(Graphics);
      this.drawStar(graphics, config.size, config.color);
      this.sparkleNodes.push(node);
      this.animateSparkle(node, config.delay);
    });
  }

  private drawStar(graphics: Graphics, radius: number, color: Color): void {
    graphics.fillColor = color;
    const inner = radius * 0.42;
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
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
    graphics.fill();
  }

  private animateSparkle(node: Node, delay: number): void {
    tween(node)
      .delay(delay)
      .repeatForever(
        tween<Node>()
          .to(0.58, { scale: new Vec3(1.28, 1.28, 1) })
          .to(0.58, { scale: Vec3.ONE.clone() }),
      )
      .start();
  }
}

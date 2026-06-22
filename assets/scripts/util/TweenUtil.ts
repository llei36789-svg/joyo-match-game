import { Node, Tween, tween, UIOpacity, Vec3 } from "cc";

export class TweenUtil {
  static moveTo(node: Node, duration: number, position: Vec3): Promise<void> {
    return new Promise((resolve) => {
      tween(node)
        .to(duration, { position })
        .call(() => resolve())
        .start();
    });
  }

  static fadeAndScaleOut(node: Node, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
      tween(node)
        .parallel(
          tween<Node>().to(duration, { scale: new Vec3(0.2, 0.2, 1) }),
          tween(opacity).to(duration, { opacity: 0 }),
        )
        .call(() => resolve())
        .start();
    });
  }

  static pulse(node: Node): Tween<Node> {
    return tween(node)
      .to(0.08, { scale: new Vec3(1.08, 1.08, 1) })
      .to(0.08, { scale: new Vec3(1, 1, 1) });
  }

  static playHint(node: Node): void {
    Tween.stopAllByTarget(node);
    node.scale = Vec3.ONE.clone();
    tween(node)
      .repeat(
        3,
        tween<Node>()
          .to(0.16, { scale: new Vec3(1.12, 1.12, 1) })
          .to(0.18, { scale: new Vec3(1, 1, 1) }),
      )
      .start();
  }

  static stopNodeTweens(node: Node): void {
    Tween.stopAllByTarget(node);
    node.scale = Vec3.ONE.clone();
  }
}

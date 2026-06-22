import { Node, NodePool } from "cc";

export class PoolUtil {
  private readonly pools = new Map<string, NodePool>();

  getNode(key: string, factory: () => Node): Node {
    if (!this.pools.has(key)) {
      this.pools.set(key, new NodePool());
    }

    const pool = this.pools.get(key)!;
    return pool.size() > 0 ? pool.get() : factory();
  }

  putNode(key: string, node: Node): void {
    if (!this.pools.has(key)) {
      this.pools.set(key, new NodePool());
    }

    node.removeFromParent();
    this.pools.get(key)!.put(node);
  }

  clear(): void {
    this.pools.forEach((pool) => pool.clear());
    this.pools.clear();
  }
}

import { Color, Graphics, Label, Layers, Node, Size, Tween, tween, UIOpacity, UITransform, Vec3 } from "cc";
import { ItemManager } from "./ItemManager";
import { MatchCheck } from "./MatchCheck";
import { BlockState, GridCellData, ITEM_SPAWN_WEIGHT_MAP, ITEM_TYPES, ItemType, Position, SpecialType } from "../data/LevelData";

interface GridManagerOptions {
  boardNode: Node;
  itemManager: ItemManager;
  tileSize: number;
  cellWidth: number;
  cellHeight: number;
  boardWidth: number;
  boardHeight: number;
  rows: number;
  cols: number;
}

export class GridManager {
  readonly gridData: GridCellData[][] = [];
  private readonly backgroundCells: Node[] = [];
  private readonly matchCheck = new MatchCheck();
  private selectedCell: Position | null = null;
  private selectedFrame: Node | null = null;
  private hintArrow: Node | null = null;

  constructor(private readonly options: GridManagerOptions) {
    this.createSelectionFrame();
    this.buildBackgroundCells();
  }

  initializeGrid(): void {
    let attempts = 0;
    do {
      this.clearGrid();
      this.buildPlayableGrid();
      attempts += 1;
    } while (!this.matchCheck.findHintSwap(this.gridData) && attempts < 30);

    if (!this.matchCheck.findHintSwap(this.gridData)) {
      this.seedGuaranteedHint();
    }

    this.clearSelection();
    this.clearHintSwap();
  }

  getCell(row: number, col: number): GridCellData {
    return this.gridData[row][col];
  }

  getNode(row: number, col: number): Node | null {
    const cell = this.gridData[row]?.[col];
    if (!cell?.nodeUuid) {
      return null;
    }
    return this.options.boardNode.children.find((child) => child.uuid === cell.nodeUuid) ?? null;
  }

  playCellTapEffect(row: number, col: number): void {
    const node = this.getNode(row, col);
    if (!node) {
      return;
    }

    Tween.stopAllByTarget(node);
    node.scale = Vec3.ONE.clone();
    tween(node)
      .to(0.06, { scale: new Vec3(0.9, 0.9, 1) })
      .to(0.08, { scale: Vec3.ONE.clone() })
      .start();
  }

  showFloatingScore(positions: Position[], score: number): void {
    if (positions.length === 0 || score <= 0) {
      return;
    }

    const center = positions.reduce(
      (sum, position) => {
        const cellPosition = this.cellToPosition(position.row, position.col);
        sum.x += cellPosition.x;
        sum.y += cellPosition.y;
        return sum;
      },
      new Vec3(0, 0, 0),
    );
    center.x /= positions.length;
    center.y /= positions.length;

    const node = new Node("FloatingScore");
    node.layer = Layers.Enum.UI_2D;
    node.parent = this.options.boardNode;
    node.setPosition(center);
    node.setSiblingIndex(this.options.boardNode.children.length - 1);
    node.scale = new Vec3(0.72, 0.72, 1);

    const transform = node.addComponent(UITransform);
    transform.setContentSize(new Size(170, 70));

    const opacity = node.addComponent(UIOpacity);
    opacity.opacity = 255;

    const label = node.addComponent(Label);
    label.string = `+${score}`;
    label.fontSize = 44;
    label.lineHeight = 54;
    label.isBold = true;
    label.color = new Color(255, 230, 120, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;

    tween(node)
      .parallel(
        tween<Node>()
          .to(0.12, { scale: new Vec3(1.15, 1.15, 1) })
          .to(0.42, { position: new Vec3(center.x, center.y + this.options.cellHeight * 0.82, 0), scale: Vec3.ONE.clone() }),
        tween(opacity)
          .delay(0.16)
          .to(0.38, { opacity: 0 }),
      )
      .call(() => node.destroy())
      .start();
  }

  getPositionsWorldCenter(positions: Position[]): Vec3 {
    const center = this.getPositionsLocalCenter(positions);
    const transform = this.options.boardNode.getComponent(UITransform);
    if (!transform) {
      return center;
    }
    return transform.convertToWorldSpaceAR(center);
  }

  getBoardNode(): Node {
    return this.options.boardNode;
  }

  getItemManager(): ItemManager {
    return this.options.itemManager;
  }

  getTileSize(): number {
    return this.options.tileSize;
  }

  setCell(
    row: number,
    col: number,
    itemType: ItemType | null,
    specialType: SpecialType,
    nodeUuid: string,
    blockState: BlockState = BlockState.Normal,
  ): void {
    this.gridData[row][col] = { row, col, itemType, specialType, nodeUuid, blockState };
  }

  areAdjacent(first: Position, second: Position): boolean {
    return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
  }

  swapCells(first: Position, second: Position): void {
    const firstCell = this.gridData[first.row][first.col];
    const secondCell = this.gridData[second.row][second.col];
    this.gridData[first.row][first.col] = { ...secondCell, row: first.row, col: first.col };
    this.gridData[second.row][second.col] = { ...firstCell, row: second.row, col: second.col };
  }

  async shuffleBoard(duration: number): Promise<void> {
    this.clearSelection();
    this.clearHintSwap();

    const slots: Position[] = [];
    const pieces: Array<Pick<GridCellData, "itemType" | "specialType" | "nodeUuid">> = [];
    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType || !cell.nodeUuid) {
          continue;
        }
        slots.push({ row, col });
        pieces.push({
          itemType: cell.itemType,
          specialType: cell.specialType,
          nodeUuid: cell.nodeUuid,
        });
      }
    }

    if (pieces.length <= 1) {
      return;
    }

    let shuffled = this.shufflePieces(pieces);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      shuffled = this.shufflePieces(pieces);
      this.applyPiecesToSlots(slots, shuffled);
      if (this.matchCheck.findMatches(this.gridData).allMatches.length === 0) {
        break;
      }
    }

    if (!this.matchCheck.findHintSwap(this.gridData)) {
      this.seedGuaranteedHint();
    }

    await Promise.all(
      slots.map((slot) => {
        const node = this.getNode(slot.row, slot.col);
        if (!node) {
          return Promise.resolve();
        }

        Tween.stopAllByTarget(node);
        return new Promise<void>((resolve) => {
          tween(node)
            .to(duration, {
              position: this.cellToPosition(slot.row, slot.col),
              scale: new Vec3(1.08, 1.08, 1),
            })
            .to(0.08, { scale: Vec3.ONE.clone() })
            .call(() => resolve())
            .start();
        });
      }),
    );
  }

  cellToPosition(row: number, col: number): Vec3 {
    const offsetX = this.options.boardWidth / 2 - this.options.cellWidth / 2;
    const offsetY = this.options.boardHeight / 2 - this.options.cellHeight / 2;
    const x = -offsetX + col * this.options.cellWidth;
    const y = offsetY - row * this.options.cellHeight;
    return new Vec3(x, y, 0);
  }

  private getPositionsLocalCenter(positions: Position[]): Vec3 {
    if (positions.length === 0) {
      return Vec3.ZERO.clone();
    }

    const center = positions.reduce(
      (sum, position) => {
        const cellPosition = this.cellToPosition(position.row, position.col);
        sum.x += cellPosition.x;
        sum.y += cellPosition.y;
        return sum;
      },
      new Vec3(0, 0, 0),
    );
    center.x /= positions.length;
    center.y /= positions.length;
    return center;
  }

  highlightCell(position: Position | null): void {
    this.selectedCell = position;
    if (!this.selectedFrame) {
      return;
    }

    if (!position) {
      this.selectedFrame.active = false;
      return;
    }

    this.selectedFrame.active = true;
    this.selectedFrame.setPosition(this.cellToPosition(position.row, position.col));
  }

  getSelectedCell(): Position | null {
    return this.selectedCell;
  }

  clearSelection(): void {
    this.highlightCell(null);
  }

  showHintSwap(first: Position, second: Position): void {
    this.clearHintSwap();

    const firstPos = this.cellToPosition(first.row, first.col);
    const secondPos = this.cellToPosition(second.row, second.col);
    const midpoint = new Vec3((firstPos.x + secondPos.x) / 2, (firstPos.y + secondPos.y) / 2, 0);
    const distanceX = secondPos.x - firstPos.x;
    const distanceY = secondPos.y - firstPos.y;
    const distance = Math.max(Math.sqrt(distanceX * distanceX + distanceY * distanceY), 0.001);
    const dx = distanceX / distance;
    const dy = distanceY / distance;

    this.hintArrow = this.createHintArrow(dx, dy);
    this.hintArrow.parent = this.options.boardNode;
    this.hintArrow.setPosition(midpoint);
    this.hintArrow.setSiblingIndex(this.options.boardNode.children.length - 1);

    const opacity = this.hintArrow.getComponent(UIOpacity)!;
    tween(this.hintArrow)
      .repeatForever(
        tween<Node>()
          .to(0.32, { scale: new Vec3(1.12, 1.12, 1) })
          .to(0.32, { scale: new Vec3(1, 1, 1) }),
      )
      .start();
    tween(opacity)
      .repeatForever(
        tween<UIOpacity>()
          .to(0.32, { opacity: 255 })
          .to(0.32, { opacity: 178 }),
      )
      .start();
  }

  clearHintSwap(): void {
    if (!this.hintArrow) {
      return;
    }

    const opacity = this.hintArrow.getComponent(UIOpacity);
    Tween.stopAllByTarget(this.hintArrow);
    if (opacity) {
      Tween.stopAllByTarget(opacity);
    }
    this.hintArrow.destroy();
    this.hintArrow = null;
  }

  clearGrid(): void {
    for (let row = 0; row < this.gridData.length; row += 1) {
      for (let col = 0; col < this.gridData[row].length; col += 1) {
        const node = this.getNode(row, col);
        if (node) {
          this.options.itemManager.recycleItemNode(node);
        }
      }
    }
    this.gridData.length = 0;
  }

  getRandomItemType(): ItemType {
    const totalWeight = ITEM_TYPES.reduce((total, itemType) => total + ITEM_SPAWN_WEIGHT_MAP[itemType], 0);
    let roll = Math.random() * totalWeight;

    for (const itemType of ITEM_TYPES) {
      roll -= ITEM_SPAWN_WEIGHT_MAP[itemType];
      if (roll <= 0) {
        return itemType;
      }
    }

    return ITEM_TYPES[0];
  }

  activateRandomRainbowItem(): boolean {
    const normalCandidates: Position[] = [];
    const fallbackCandidates: Position[] = [];

    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType || !cell.nodeUuid) {
          continue;
        }
        fallbackCandidates.push({ row, col });
        if (cell.specialType === SpecialType.None) {
          normalCandidates.push({ row, col });
        }
      }
    }

    const candidates = normalCandidates.length > 0 ? normalCandidates : fallbackCandidates;
    if (candidates.length === 0) {
      return false;
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const cell = this.gridData[target.row][target.col];
    const node = this.getNode(target.row, target.col);
    if (!cell.itemType || !node) {
      return false;
    }

    cell.specialType = SpecialType.Rainbow;
    this.options.itemManager.updateItemNode(node, cell.itemType, cell.specialType, this.options.tileSize);
    return true;
  }

  private createInitialItemType(row: number, col: number): ItemType {
    let itemType = this.getRandomItemType();
    while (
      (col >= 2 &&
        this.gridData[row]?.[col - 1]?.itemType === itemType &&
        this.gridData[row]?.[col - 2]?.itemType === itemType) ||
      (row >= 2 &&
        this.gridData[row - 1]?.[col]?.itemType === itemType &&
        this.gridData[row - 2]?.[col]?.itemType === itemType)
    ) {
      itemType = this.getRandomItemType();
    }
    return itemType;
  }

  private buildPlayableGrid(): void {
    for (let row = 0; row < this.options.rows; row += 1) {
      this.gridData[row] = [];
      for (let col = 0; col < this.options.cols; col += 1) {
        const itemType = this.createInitialItemType(row, col);
        const node = this.options.itemManager.createItemNode(itemType, SpecialType.None, this.options.tileSize);
        node.parent = this.options.boardNode;
        node.setPosition(this.cellToPosition(row, col));
        this.gridData[row][col] = {
          row,
          col,
          itemType,
          specialType: SpecialType.None,
          blockState: BlockState.Normal,
          nodeUuid: node.uuid,
        };
      }
    }
  }

  private seedGuaranteedHint(): void {
    const primary = this.getRandomItemType();
    let secondary = this.getRandomItemType();
    while (secondary === primary && ITEM_TYPES.length > 1) {
      secondary = this.getRandomItemType();
    }
    const seeded = [primary, secondary, primary, primary, secondary];
    const row = Math.floor(Math.random() * this.options.rows);
    const startCol = Math.floor(Math.random() * Math.max(1, this.options.cols - seeded.length + 1));

    seeded.forEach((itemType, index) => {
      const col = startCol + index;
      const cell = this.gridData[row]?.[col];
      const node = this.getNode(row, col);
      if (!cell || !node) {
        return;
      }
      cell.itemType = itemType;
      cell.specialType = SpecialType.None;
      this.options.itemManager.updateItemNode(node, itemType, SpecialType.None, this.options.tileSize);
    });
  }

  private applyPiecesToSlots(
    slots: Position[],
    pieces: Array<Pick<GridCellData, "itemType" | "specialType" | "nodeUuid">>,
  ): void {
    slots.forEach((slot, index) => {
      const current = this.gridData[slot.row][slot.col];
      const piece = pieces[index];
      this.gridData[slot.row][slot.col] = {
        row: slot.row,
        col: slot.col,
        itemType: piece.itemType,
        specialType: piece.specialType,
        nodeUuid: piece.nodeUuid,
        blockState: current.blockState,
      };
    });
  }

  private shufflePieces<T>(pieces: T[]): T[] {
    const shuffled = [...pieces];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const target = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[target]] = [shuffled[target], shuffled[i]];
    }

    const unchanged = shuffled.every((piece, index) => piece === pieces[index]);
    if (unchanged) {
      shuffled.push(shuffled.shift()!);
    }
    return shuffled;
  }

  private buildBackgroundCells(): void {
    if (this.backgroundCells.length > 0) {
      return;
    }

    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = new Node(`Slot-${row}-${col}`);
        cell.layer = Layers.Enum.UI_2D;
        cell.parent = this.options.boardNode;
        cell.setPosition(this.cellToPosition(row, col));

        const transform = cell.addComponent(UITransform);
        const cellWidth = Math.max(this.options.cellWidth - 4, 1);
        const cellHeight = Math.max(this.options.cellHeight - 4, 1);
        transform.setContentSize(new Size(cellWidth, cellHeight));

        const graphics = cell.addComponent(Graphics);
        graphics.fillColor = new Color(18, 24, 48, 255);
        graphics.strokeColor = new Color(78, 116, 224, 90);
        graphics.lineWidth = 2;
        graphics.roundRect(
          -cellWidth / 2,
          -cellHeight / 2,
          cellWidth,
          cellHeight,
          14,
        );
        graphics.fill();
        graphics.roundRect(
          -cellWidth / 2,
          -cellHeight / 2,
          cellWidth,
          cellHeight,
          14,
        );
        graphics.stroke();

        cell.setSiblingIndex(0);
        this.backgroundCells.push(cell);
      }
    }
  }

  private createSelectionFrame(): void {
    this.selectedFrame = new Node("SelectionFrame");
    this.selectedFrame.layer = Layers.Enum.UI_2D;
    this.selectedFrame.parent = this.options.boardNode;
    this.selectedFrame.active = false;

    const transform = this.selectedFrame.addComponent(UITransform);
    transform.setContentSize(new Size(this.options.cellWidth, this.options.cellHeight));

    const graphics = this.selectedFrame.addComponent(Graphics);
    graphics.strokeColor = new Color(255, 246, 121, 255);
    graphics.lineWidth = 5;
    graphics.roundRect(
      -this.options.cellWidth / 2,
      -this.options.cellHeight / 2,
      this.options.cellWidth,
      this.options.cellHeight,
      18,
    );
    graphics.stroke();
  }

  private createHintArrow(dx: number, dy: number): Node {
    const node = new Node("HintSwapArrow");
    node.layer = Layers.Enum.UI_2D;
    node.scale = Vec3.ONE.clone();

    const transform = node.addComponent(UITransform);
    transform.setContentSize(new Size(this.options.cellWidth, this.options.cellHeight));

    const opacity = node.addComponent(UIOpacity);
    opacity.opacity = 230;

    const graphics = node.addComponent(Graphics);
    const length = Math.min(this.options.cellWidth, this.options.cellHeight) * 0.68;
    const offset = 9;
    const direction = new Vec3(dx, dy, 0);
    const perpendicular = new Vec3(-dy, dx, 0);

    graphics.lineCap = 1;
    this.drawSwapArrow(graphics, direction, perpendicular, length, offset);
    this.drawSwapArrow(graphics, new Vec3(-direction.x, -direction.y, 0), perpendicular, length, -offset);
    return node;
  }

  private drawSwapArrow(
    graphics: Graphics,
    direction: Vec3,
    perpendicular: Vec3,
    length: number,
    offset: number,
  ): void {
    const start = new Vec3(
      -direction.x * length * 0.5 + perpendicular.x * offset,
      -direction.y * length * 0.5 + perpendicular.y * offset,
      0,
    );
    const end = new Vec3(
      direction.x * length * 0.5 + perpendicular.x * offset,
      direction.y * length * 0.5 + perpendicular.y * offset,
      0,
    );
    const headBase = new Vec3(end.x - direction.x * 13, end.y - direction.y * 13, 0);
    const wingA = new Vec3(headBase.x + perpendicular.x * 8, headBase.y + perpendicular.y * 8, 0);
    const wingB = new Vec3(headBase.x - perpendicular.x * 8, headBase.y - perpendicular.y * 8, 0);

    graphics.strokeColor = new Color(21, 31, 65, 190);
    graphics.lineWidth = 9;
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(end.x, end.y);
    graphics.stroke();

    graphics.strokeColor = new Color(255, 236, 139, 255);
    graphics.lineWidth = 5;
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(end.x, end.y);
    graphics.stroke();

    graphics.fillColor = new Color(255, 246, 188, 255);
    graphics.moveTo(end.x + direction.x * 4, end.y + direction.y * 4);
    graphics.lineTo(wingA.x, wingA.y);
    graphics.lineTo(wingB.x, wingB.y);
    graphics.close();
    graphics.fill();

    graphics.strokeColor = new Color(21, 31, 65, 180);
    graphics.lineWidth = 2;
    graphics.moveTo(end.x + direction.x * 4, end.y + direction.y * 4);
    graphics.lineTo(wingA.x, wingA.y);
    graphics.lineTo(wingB.x, wingB.y);
    graphics.close();
    graphics.stroke();
  }
}

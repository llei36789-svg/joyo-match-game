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

type GridPiece = Pick<GridCellData, "itemType" | "specialType" | "nodeUuid" | "blockState">;

export class GridManager {
  readonly gridData: GridCellData[][] = [];
  private readonly backgroundCells: Node[] = [];
  private readonly matchCheck = new MatchCheck();
  private selectedFrame: Node | null = null;
  private hintArrow: Node | null = null;

  constructor(private readonly options: GridManagerOptions) {
    this.createSelectionFrame();
    this.buildBackgroundCells();
  }

  initializeGrid(initialBlockCount = this.options.rows * this.options.cols): void {
    let attempts = 0;
    do {
      this.clearGrid();
      this.buildPlayableGrid(initialBlockCount);
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

  getDebugCellInfo(row: number, col: number): object {
    const cell = this.gridData[row]?.[col];
    const node = cell?.nodeUuid ? this.options.boardNode.children.find((child) => child.uuid === cell.nodeUuid) ?? null : null;
    const body = node?.getChildByName("ItemBody") ?? null;
    const opacity = node?.getComponent(UIOpacity) ?? null;
    const bodyOpacity = body?.getComponent(UIOpacity) ?? null;
    const expected = this.cellToPosition(row, col);

    return {
      row,
      col,
      itemType: cell?.itemType ?? null,
      specialType: cell?.specialType ?? null,
      nodeUuid: cell?.nodeUuid ? cell.nodeUuid.slice(-8) : "",
      hasNode: Boolean(node),
      nodeActive: node?.active ?? null,
      nodeParent: node?.parent?.name ?? null,
      nodeSibling: node?.getSiblingIndex() ?? null,
      nodeOpacity: opacity?.opacity ?? null,
      nodeScale: node ? `${node.scale.x.toFixed(2)},${node.scale.y.toFixed(2)}` : null,
      nodePos: node ? `${node.position.x.toFixed(1)},${node.position.y.toFixed(1)}` : null,
      expectedPos: `${expected.x.toFixed(1)},${expected.y.toFixed(1)}`,
      posDelta: node
        ? `${(node.position.x - expected.x).toFixed(1)},${(node.position.y - expected.y).toFixed(1)}`
        : null,
      bodyActive: body?.active ?? null,
      bodyOpacity: bodyOpacity?.opacity ?? null,
      childNames: node?.children.map((child) => `${child.name}:${child.active ? "on" : "off"}`).join("|") ?? "",
    };
  }

  getDebugBoardSummary(): object {
    const problems: object[] = [];
    let filledCells = 0;
    let cellsWithNode = 0;
    let visibleNodes = 0;
    let missingNodes = 0;
    let hiddenNodes = 0;
    let transparentNodes = 0;
    let misplacedNodes = 0;

    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType) {
          continue;
        }

        filledCells += 1;
        const node = this.getNode(row, col);
        if (!node) {
          missingNodes += 1;
          problems.push({ row, col, reason: "missing-node", itemType: cell.itemType, nodeUuid: cell.nodeUuid.slice(-8) });
          continue;
        }

        cellsWithNode += 1;
        const opacity = node.getComponent(UIOpacity);
        const isTransparent = Boolean(opacity && opacity.opacity <= 5);
        const expected = this.cellToPosition(row, col);
        const dx = node.position.x - expected.x;
        const dy = node.position.y - expected.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isMisplaced = distance > Math.min(this.options.cellWidth, this.options.cellHeight) * 0.35;
        if (!node.active) {
          hiddenNodes += 1;
        }
        if (isTransparent) {
          transparentNodes += 1;
        }
        if (isMisplaced) {
          misplacedNodes += 1;
        }
        if (node.active && !isTransparent) {
          visibleNodes += 1;
        }
        if (!node.active || isTransparent || isMisplaced) {
          problems.push({
            row,
            col,
            reason: !node.active ? "inactive" : isTransparent ? "transparent" : "misplaced",
            itemType: cell.itemType,
            nodeUuid: cell.nodeUuid.slice(-8),
            sibling: node.getSiblingIndex(),
            opacity: opacity?.opacity ?? null,
            pos: `${node.position.x.toFixed(1)},${node.position.y.toFixed(1)}`,
            expected: `${expected.x.toFixed(1)},${expected.y.toFixed(1)}`,
          });
        }
      }
    }

    const boardItemChildren = this.options.boardNode.children.filter((child) => child.name === "MatchItem").length;
    return {
      filledCells,
      cellsWithNode,
      visibleNodes,
      boardItemChildren,
      totalBoardChildren: this.options.boardNode.children.length,
      missingNodes,
      hiddenNodes,
      transparentNodes,
      misplacedNodes,
      firstProblems: problems.slice(0, 12),
    };
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

  countFilledCells(): number {
    let total = 0;
    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        if (this.gridData[row]?.[col]?.itemType) {
          total += 1;
        }
      }
    }
    return total;
  }

  normalizeCellNodeRefs(): void {
    const cellsByUuid = new Map<string, Array<{ cell: GridCellData; position: Position }>>();

    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType || !cell.nodeUuid) {
          this.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
          continue;
        }

        if (!this.getBoardItemNodeByUuid(cell.nodeUuid)) {
          this.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
          continue;
        }

        const entries = cellsByUuid.get(cell.nodeUuid) ?? [];
        entries.push({ cell: { ...cell }, position: { row, col } });
        cellsByUuid.set(cell.nodeUuid, entries);
      }
    }

    cellsByUuid.forEach((entries, nodeUuid) => {
      if (entries.length <= 1) {
        return;
      }

      const node = this.getBoardItemNodeByUuid(nodeUuid);
      if (!node) {
        return;
      }

      const best = entries.reduce((currentBest, entry) => {
        return this.getNodeDistanceToCell(node, entry.position) < this.getNodeDistanceToCell(node, currentBest.position)
          ? entry
          : currentBest;
      }, entries[0]);

      entries.forEach((entry) => {
        if (entry.position.row === best.position.row && entry.position.col === best.position.col) {
          return;
        }
        this.setCell(entry.position.row, entry.position.col, null, SpecialType.None, "", BlockState.Normal);
      });
    });
  }

  compactGridStateFromNodes(): void {
    const activeCells: GridCellData[] = [];
    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType || !cell.nodeUuid || !this.getBoardItemNodeByUuid(cell.nodeUuid)) {
          continue;
        }
        activeCells.push({ ...cell });
      }
    }

    this.clearAllCellData();

    activeCells.forEach((cell) => {
      const node = this.getBoardItemNodeByUuid(cell.nodeUuid);
      if (!node) {
        return;
      }
      const position = this.positionToNearestCell(node.position);
      const current = this.gridData[position.row]?.[position.col];
      if (current?.itemType) {
        return;
      }
      this.setCell(position.row, position.col, cell.itemType, cell.specialType, cell.nodeUuid, cell.blockState);
    });
  }

  restoreItemVisualsFromGrid(): void {
    const usedNodeUuids = new Set<string>();
    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType || !cell.nodeUuid || usedNodeUuids.has(cell.nodeUuid)) {
          this.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
          continue;
        }

        const node = this.getBoardItemNodeByUuid(cell.nodeUuid);
        if (!node) {
          this.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
          continue;
        }

        usedNodeUuids.add(cell.nodeUuid);
        node.parent = this.options.boardNode;
        node.active = true;
        node.setPosition(this.cellToPosition(row, col));
        node.setSiblingIndex(this.options.boardNode.children.length - 1);
        this.options.itemManager.updateItemNode(node, cell.itemType, cell.specialType, this.options.tileSize);
      }
    }
  }

  private clearAllCellData(): void {
    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        this.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
      }
    }
  }

  private getBoardItemNodeByUuid(nodeUuid: string): Node | null {
    return this.options.boardNode.children.find((child) => child.uuid === nodeUuid && child.name === "MatchItem") ?? null;
  }

  private getNodeDistanceToCell(node: Node, position: Position): number {
    const expected = this.cellToPosition(position.row, position.col);
    return Math.pow(node.position.x - expected.x, 2) + Math.pow(node.position.y - expected.y, 2);
  }

  private positionToNearestCell(position: Vec3): Position {
    const rawCol = Math.round((position.x + this.options.boardWidth / 2 - this.options.cellWidth / 2) / this.options.cellWidth);
    const rawRow = Math.round((this.options.boardHeight / 2 - this.options.cellHeight / 2 - position.y) / this.options.cellHeight);
    return {
      row: Math.max(0, Math.min(this.options.rows - 1, rawRow)),
      col: Math.max(0, Math.min(this.options.cols - 1, rawCol)),
    };
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

    const slots = this.getFilledPositions();
    const pieces = this.collectFilledPieces();
    if (pieces.length <= 1) {
      return;
    }

    let shuffled = this.shufflePieces(pieces);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      shuffled = this.shufflePieces(pieces);
      this.applyPiecesToSlots(slots, shuffled);
      if (this.matchCheck.findMatches(this.gridData).allMatches.length === 0 && this.hasResolvableMove()) {
        break;
      }
    }

    if (!this.hasResolvableMove()) {
      this.forceGuaranteedResolvableMove();
    }

    await Promise.all(
      this.getFilledPositions().map((slot) => {
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

  private getFilledPositions(): Position[] {
    const positions: Position[] = [];
    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType || !cell.nodeUuid) {
          continue;
        }
        positions.push({ row, col });
      }
    }
    return positions;
  }

  private collectFilledPieces(): GridPiece[] {
    const pieces: GridPiece[] = [];
    for (let row = 0; row < this.options.rows; row += 1) {
      for (let col = 0; col < this.options.cols; col += 1) {
        const cell = this.gridData[row]?.[col];
        if (!cell?.itemType || !cell.nodeUuid) {
          continue;
        }
        pieces.push({
          itemType: cell.itemType,
          specialType: cell.specialType,
          nodeUuid: cell.nodeUuid,
          blockState: cell.blockState,
        });
      }
    }
    return pieces;
  }

  private hasResolvableMove(): boolean {
    return Boolean(this.matchCheck.findHintSwap(this.gridData) || this.matchCheck.findHintEmptyMove(this.gridData));
  }

  private forceGuaranteedResolvableMove(): boolean {
    const pieces = this.collectFilledPieces();
    if (pieces.length < 3 || this.options.cols < 4) {
      return false;
    }

    const row = this.options.rows - 1;
    const startCol = Math.max(0, Math.floor((this.options.cols - 4) / 2));
    const reservedKeys = new Set([
      `${row}-${startCol}`,
      `${row}-${startCol + 1}`,
      `${row}-${startCol + 2}`,
      `${row}-${startCol + 3}`,
    ]);
    const itemType = pieces[0].itemType;
    if (!itemType) {
      return false;
    }
    const isFullBoard = pieces.length >= this.options.rows * this.options.cols;
    const forcedPieceCount = isFullBoard ? 4 : 3;
    if (pieces.length < forcedPieceCount) {
      return false;
    }

    for (let clearRow = 0; clearRow < this.options.rows; clearRow += 1) {
      for (let clearCol = 0; clearCol < this.options.cols; clearCol += 1) {
        this.setCell(clearRow, clearCol, null, SpecialType.None, "", BlockState.Normal);
      }
    }

    const secondaryType =
      pieces.find((piece) => piece.itemType && piece.itemType !== itemType)?.itemType ?? this.getDifferentItemType(itemType);
    const forcedLayout = isFullBoard
      ? [
        { position: { row, col: startCol }, itemType },
        { position: { row, col: startCol + 1 }, itemType },
        { position: { row, col: startCol + 2 }, itemType: secondaryType },
        { position: { row, col: startCol + 3 }, itemType },
      ]
      : [
        { position: { row, col: startCol }, itemType },
        { position: { row, col: startCol + 1 }, itemType },
        { position: { row, col: startCol + 3 }, itemType },
      ];

    pieces.slice(0, forcedPieceCount).forEach((piece, index) => {
      const layout = forcedLayout[index];
      this.setCell(layout.position.row, layout.position.col, layout.itemType, SpecialType.None, piece.nodeUuid, piece.blockState);
      const node = this.getNode(layout.position.row, layout.position.col);
      if (node) {
        this.options.itemManager.updateItemNode(node, layout.itemType, SpecialType.None, this.options.tileSize);
      }
    });

    const fillSlots: Position[] = [];
    for (let fillRow = 0; fillRow < this.options.rows; fillRow += 1) {
      if (fillRow === row) {
        continue;
      }
      for (let fillCol = 0; fillCol < this.options.cols; fillCol += 1) {
        fillSlots.push({ row: fillRow, col: fillCol });
      }
    }
    for (let fillCol = 0; fillCol < this.options.cols; fillCol += 1) {
      if (!reservedKeys.has(`${row}-${fillCol}`)) {
        fillSlots.push({ row, col: fillCol });
      }
    }

    pieces.slice(forcedPieceCount).forEach((piece, index) => {
      const slot = fillSlots[index];
      if (!slot || !piece.itemType) {
        return;
      }
      this.setCell(slot.row, slot.col, piece.itemType, piece.specialType, piece.nodeUuid, piece.blockState);
    });

    return this.hasResolvableMove();
  }

  private getDifferentItemType(itemType: ItemType): ItemType {
    return ITEM_TYPES.find((entry) => entry !== itemType) ?? itemType;
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
    if (!this.selectedFrame) {
      return;
    }

    if (!position) {
      this.selectedFrame.active = false;
      return;
    }

    this.selectedFrame.active = true;
    this.selectedFrame.setPosition(this.cellToPosition(position.row, position.col));
    this.selectedFrame.setSiblingIndex(this.options.boardNode.children.length - 1);
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

  private buildPlayableGrid(initialBlockCount: number): void {
    const safeBlockCount = Math.max(0, Math.min(initialBlockCount, this.options.rows * this.options.cols));
    for (let row = 0; row < this.options.rows; row += 1) {
      this.gridData[row] = [];
      for (let col = 0; col < this.options.cols; col += 1) {
        const index = row * this.options.cols + col;
        if (index >= safeBlockCount) {
          this.gridData[row][col] = {
            row,
            col,
            itemType: null,
            specialType: SpecialType.None,
            blockState: BlockState.Normal,
            nodeUuid: "",
          };
          continue;
        }

        const itemType = this.createInitialItemType(row, col);
        const node = this.options.itemManager.createItemNode(itemType, SpecialType.None, this.options.tileSize);
        node.parent = this.options.boardNode;
        node.setSiblingIndex(this.options.boardNode.children.length - 1);
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
    const candidates: Array<{ row: number; startCol: number }> = [];
    for (let row = 0; row < this.options.rows; row += 1) {
      let startCol = 0;
      while (startCol < this.options.cols) {
        while (startCol < this.options.cols && !this.gridData[row]?.[startCol]?.itemType) {
          startCol += 1;
        }
        let endCol = startCol;
        while (endCol < this.options.cols && this.gridData[row]?.[endCol]?.itemType) {
          endCol += 1;
        }
        for (let col = startCol; col <= endCol - 5; col += 1) {
          candidates.push({ row, startCol: col });
        }
        startCol = endCol + 1;
      }
    }

    if (candidates.length === 0) {
      return;
    }

    const primary = this.getRandomItemType();
    let secondary = this.getRandomItemType();
    while (secondary === primary && ITEM_TYPES.length > 1) {
      secondary = this.getRandomItemType();
    }
    const seeded = [primary, secondary, primary, primary, secondary];
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    const row = candidate.row;
    const startCol = candidate.startCol;

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
    this.selectedFrame.scale = Vec3.ONE.clone();

    const width = Math.max(this.options.cellWidth - 8, 1);
    const height = Math.max(this.options.cellHeight - 8, 1);
    const transform = this.selectedFrame.addComponent(UITransform);
    transform.setContentSize(new Size(width, height));

    const opacity = this.selectedFrame.addComponent(UIOpacity);
    opacity.opacity = 235;

    const graphics = this.selectedFrame.addComponent(Graphics);
    graphics.strokeColor = new Color(255, 246, 138, 255);
    graphics.lineWidth = Math.max(5, Math.min(width, height) * 0.08);
    graphics.roundRect(-width / 2, -height / 2, width, height, 18);
    graphics.stroke();

    tween(this.selectedFrame)
      .repeatForever(
        tween<Node>()
          .to(0.48, { scale: new Vec3(1.08, 1.08, 1) })
          .to(0.48, { scale: Vec3.ONE.clone() }),
      )
      .start();
    tween(opacity)
      .repeatForever(
        tween<UIOpacity>()
          .to(0.48, { opacity: 255 })
          .to(0.48, { opacity: 178 }),
      )
      .start();
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

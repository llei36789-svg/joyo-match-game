import { GameConfig } from "./GameConfig";
import { GridManager } from "./GridManager";
import { ItemManager } from "./ItemManager";
import { BlockState, SpecialType } from "../data/LevelData";
import { TweenUtil } from "../util/TweenUtil";

export class DropManager {
  async collapseAndRefill(gridManager: GridManager, itemManager: ItemManager, maxNewItems = Number.POSITIVE_INFINITY): Promise<number> {
    const tasks: Promise<void>[] = [];
    const rows = GameConfig.board.rows;
    const cols = GameConfig.board.cols;
    let spawnedCount = 0;

    if (GameConfig.debug.refillLogs) {
      console.warn("[DropManager] collapse start", JSON.stringify(gridManager.getDebugBoardSummary()));
    }

    gridManager.compactGridStateFromNodes();
    gridManager.normalizeCellNodeRefs();

    if (GameConfig.debug.refillLogs) {
      console.warn("[DropManager] after normalize", JSON.stringify(gridManager.getDebugBoardSummary()));
    }

    for (let col = 0; col < cols; col += 1) {
      let writeRow = rows - 1;
      let columnExisting = 0;
      let columnMissing = 0;

      for (let row = rows - 1; row >= 0; row -= 1) {
        const cell = gridManager.getCell(row, col);
        if (!cell.itemType) {
          gridManager.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
          continue;
        }

        const node = gridManager.getNode(row, col);
        if (!node) {
          columnMissing += 1;
          gridManager.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
          continue;
        }

        columnExisting += 1;
        if (writeRow !== row) {
          node.setSiblingIndex(gridManager.getBoardNode().children.length - 1);
          const target = gridManager.cellToPosition(writeRow, col);
          const distance = Math.abs(writeRow - row);
          tasks.push(
            TweenUtil.moveTo(
              node,
              Math.max(GameConfig.board.dropDurationPerCell * distance, 0.08),
              target,
            ),
          );
          gridManager.setCell(writeRow, col, cell.itemType, cell.specialType, cell.nodeUuid, cell.blockState);
          gridManager.setCell(row, col, null, SpecialType.None, "", BlockState.Normal);
        }
        writeRow -= 1;
      }

      const emptyCount = writeRow + 1;
      const beforeColumnSpawned = spawnedCount;
      for (let row = writeRow; row >= 0; row -= 1) {
        if (spawnedCount >= maxNewItems) {
          break;
        }

        const itemType = gridManager.getRandomItemType();
        const node = itemManager.createItemNode(itemType, SpecialType.None, gridManager.getTileSize());
        node.parent = gridManager.getBoardNode();
        node.setSiblingIndex(gridManager.getBoardNode().children.length - 1);
        const spawnRow = row - emptyCount;
        node.setPosition(gridManager.cellToPosition(spawnRow, col));
        gridManager.setCell(row, col, itemType, SpecialType.None, node.uuid, BlockState.Normal);
        spawnedCount += 1;
        tasks.push(
          TweenUtil.moveTo(
            node,
            Math.max(GameConfig.board.dropDurationPerCell * emptyCount, 0.12),
            gridManager.cellToPosition(row, col),
          ),
        );
      }

      if (GameConfig.debug.refillLogs && (emptyCount > 0 || columnMissing > 0)) {
        console.warn("[DropManager] column refill", JSON.stringify({
          col,
          columnExisting,
          columnMissing,
          emptyCount,
          spawnedInColumn: spawnedCount - beforeColumnSpawned,
          maxNewItems,
        }));
      }
    }

    await Promise.all(tasks);
    spawnedCount += this.ensureBoardFilled(gridManager, itemManager, spawnedCount, maxNewItems);
    gridManager.restoreItemVisualsFromGrid();
    if (GameConfig.debug.refillLogs) {
      console.warn("[DropManager] collapse end", JSON.stringify({
        spawnedCount,
        summary: gridManager.getDebugBoardSummary(),
      }));
    }
    return spawnedCount;
  }

  private ensureBoardFilled(
    gridManager: GridManager,
    itemManager: ItemManager,
    spawnedCount: number,
    maxNewItems: number,
  ): number {
    const rows = GameConfig.board.rows;
    const cols = GameConfig.board.cols;
    let extraSpawned = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = gridManager.getCell(row, col);
        const node = gridManager.getNode(row, col);
        if (cell.itemType && node) {
          node.active = true;
          node.parent = gridManager.getBoardNode();
          node.setSiblingIndex(gridManager.getBoardNode().children.length - 1);
          node.setPosition(gridManager.cellToPosition(row, col));
          continue;
        }

        if (GameConfig.debug.refillLogs) {
          console.warn("[DropManager] ensure missing visual", JSON.stringify({
            row,
            col,
            cellItem: cell.itemType,
            cellUuid: cell.nodeUuid ? cell.nodeUuid.slice(-8) : "",
            hasNode: Boolean(node),
            limitReached: spawnedCount + extraSpawned >= maxNewItems,
          }));
        }

        if (spawnedCount + extraSpawned >= maxNewItems) {
          continue;
        }

        const itemType = gridManager.getRandomItemType();
        const newNode = itemManager.createItemNode(itemType, SpecialType.None, gridManager.getTileSize());
        newNode.parent = gridManager.getBoardNode();
        newNode.active = true;
        newNode.setSiblingIndex(gridManager.getBoardNode().children.length - 1);
        newNode.setPosition(gridManager.cellToPosition(row, col));
        gridManager.setCell(row, col, itemType, SpecialType.None, newNode.uuid, BlockState.Normal);
        extraSpawned += 1;
      }
    }

    return extraSpawned;
  }
}

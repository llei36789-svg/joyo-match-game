import { GameConfig } from "./GameConfig";
import { GridManager } from "./GridManager";
import { ItemManager } from "./ItemManager";
import { BlockState, ItemType, SpecialType } from "../data/LevelData";
import { TweenUtil } from "../util/TweenUtil";

export class DropManager {
  async collapseAndRefill(gridManager: GridManager, itemManager: ItemManager): Promise<void> {
    const tasks: Promise<void>[] = [];
    const rows = GameConfig.board.rows;
    const cols = GameConfig.board.cols;

    for (let col = 0; col < cols; col += 1) {
      let writeRow = rows - 1;

      for (let row = rows - 1; row >= 0; row -= 1) {
        const cell = gridManager.getCell(row, col);
        if (cell.itemType) {
          if (writeRow !== row) {
            const node = gridManager.getNode(row, col);
            if (node) {
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
          }
          writeRow -= 1;
        }
      }

      const emptyCount = writeRow + 1;
      for (let row = writeRow; row >= 0; row -= 1) {
        const itemType = gridManager.getRandomItemType();
        const node = itemManager.createItemNode(itemType, SpecialType.None, gridManager.getTileSize());
        node.parent = gridManager.getBoardNode();
        const spawnRow = row - emptyCount;
        node.setPosition(gridManager.cellToPosition(spawnRow, col));
        gridManager.setCell(row, col, itemType, SpecialType.None, node.uuid, BlockState.Normal);
        tasks.push(
          TweenUtil.moveTo(
            node,
            Math.max(GameConfig.board.dropDurationPerCell * emptyCount, 0.12),
            gridManager.cellToPosition(row, col),
          ),
        );
      }
    }

    await Promise.all(tasks);
  }
}

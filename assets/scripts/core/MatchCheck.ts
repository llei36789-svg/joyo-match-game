import { GridCellData, ItemType, Position, SpecialType } from "../data/LevelData";

export interface MatchGroup {
  positions: Position[];
  direction: "horizontal" | "vertical";
}

export interface MatchAnalysis {
  allMatches: Position[];
  groups: MatchGroup[];
  specialSpawn: {
    position: Position;
    specialType: SpecialType;
  } | null;
}

export class MatchCheck {
  findHintSwap(grid: GridCellData[][]): { first: Position; second: Position } | null {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = grid[row][col];
        if (!cell?.itemType) {
          continue;
        }

        for (let targetRow = row; targetRow < rows; targetRow += 1) {
          for (let targetCol = 0; targetCol < cols; targetCol += 1) {
            if (targetRow === row && targetCol <= col) {
              continue;
            }
            const nextCell = grid[targetRow]?.[targetCol];
            if (!nextCell?.itemType || nextCell.itemType === cell.itemType) {
              continue;
            }

            const first = { row, col };
            const second = { row: targetRow, col: targetCol };
            if (this.wouldSwapResolveImmediately(grid, first, second)) {
              return { first, second };
            }
          }
        }
      }
    }

    return null;
  }

  findMatches(grid: GridCellData[][], preferredPositions: Position[] = []): MatchAnalysis {
    const groups: MatchGroup[] = [];
    const hitMap = new Map<string, Position>();
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    for (let row = 0; row < rows; row += 1) {
      let start = 0;
      while (start < cols) {
        const cell = grid[row][start];
        if (!cell.itemType) {
          start += 1;
          continue;
        }

        let end = start + 1;
        while (end < cols && grid[row][end].itemType === cell.itemType) {
          end += 1;
        }

        if (end - start >= 3) {
          const positions = [];
          for (let col = start; col < end; col += 1) {
            const position = { row, col };
            positions.push(position);
            hitMap.set(`${row}-${col}`, position);
          }
          groups.push({ positions, direction: "horizontal" });
        }
        start = end;
      }
    }

    for (let col = 0; col < cols; col += 1) {
      let start = 0;
      while (start < rows) {
        const cell = grid[start][col];
        if (!cell.itemType) {
          start += 1;
          continue;
        }

        let end = start + 1;
        while (end < rows && grid[end][col].itemType === cell.itemType) {
          end += 1;
        }

        if (end - start >= 3) {
          const positions = [];
          for (let row = start; row < end; row += 1) {
            const position = { row, col };
            positions.push(position);
            hitMap.set(`${row}-${col}`, position);
          }
          groups.push({ positions, direction: "vertical" });
        }
        start = end;
      }
    }

    const allMatches = Array.from(hitMap.values());
    const specialSpawn = this.resolveSpecialSpawn(groups, allMatches, preferredPositions);
    return { allMatches, groups, specialSpawn };
  }

  expandSpecialEffects(grid: GridCellData[][], positions: Position[]): Position[] {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const queue = [...positions];
    const visited = new Set<string>(positions.map((position) => `${position.row}-${position.col}`));

    while (queue.length > 0) {
      const position = queue.shift()!;
      const cell = grid[position.row][position.col];
      if (!cell) {
        continue;
      }

      switch (cell.specialType) {
        case SpecialType.Horizontal:
          for (let col = 0; col < cols; col += 1) {
            this.push(queue, visited, { row: position.row, col });
          }
          break;
        case SpecialType.Vertical:
          for (let row = 0; row < rows; row += 1) {
            this.push(queue, visited, { row, col: position.col });
          }
          break;
        case SpecialType.Bomb:
          for (let row = position.row - 1; row <= position.row + 1; row += 1) {
            for (let col = position.col - 1; col <= position.col + 1; col += 1) {
              if (row >= 0 && row < rows && col >= 0 && col < cols) {
                this.push(queue, visited, { row, col });
              }
            }
          }
          break;
        default:
          break;
      }
    }

    return Array.from(visited).map((key) => {
      const [row, col] = key.split("-").map(Number);
      return { row, col };
    });
  }

  resolveSpecialSwap(grid: GridCellData[][], first: Position, second: Position): Position[] | null {
    const a = grid[first.row][first.col];
    const b = grid[second.row][second.col];

    if (!a || !b) {
      return null;
    }

    if (a.specialType === SpecialType.None && b.specialType === SpecialType.None) {
      return null;
    }

    if (a.specialType === SpecialType.Rainbow && b.specialType === SpecialType.Rainbow) {
      return this.allCells(grid);
    }

    if (a.specialType === SpecialType.Rainbow || b.specialType === SpecialType.Rainbow) {
      const targetColor = a.specialType === SpecialType.Rainbow ? b.itemType : a.itemType;
      if (!targetColor) {
        return null;
      }

      const positions = this.findColor(grid, targetColor);
      positions.push(first, second);
      return this.unique(positions);
    }

    if (
      (a.specialType === SpecialType.Horizontal || a.specialType === SpecialType.Vertical) &&
      (b.specialType === SpecialType.Horizontal || b.specialType === SpecialType.Vertical)
    ) {
      return this.unique([
        ...this.rowAndCol(grid, first.row, first.col),
        ...this.rowAndCol(grid, second.row, second.col),
      ]);
    }

    if (a.specialType === SpecialType.Bomb && b.specialType === SpecialType.Bomb) {
      return this.unique([
        ...this.area(grid, first.row, first.col, 2),
        ...this.area(grid, second.row, second.col, 2),
      ]);
    }

    if (a.specialType === SpecialType.Bomb) {
      return this.unique([...this.area(grid, second.row, second.col, 1), first, second]);
    }

    if (b.specialType === SpecialType.Bomb) {
      return this.unique([...this.area(grid, first.row, first.col, 1), first, second]);
    }

    return this.unique([first, second]);
  }

  private resolveSpecialSpawn(
    groups: MatchGroup[],
    allMatches: Position[],
    preferredPositions: Position[],
  ): { position: Position; specialType: SpecialType } | null {
    if (allMatches.length === 0) {
      return null;
    }

    const byKey = new Map<string, Position>();
    preferredPositions.forEach((position) => byKey.set(`${position.row}-${position.col}`, position));
    const preferred = preferredPositions.find((position) =>
      allMatches.some((match) => match.row === position.row && match.col === position.col),
    );

    const intersections = new Map<string, number>();
    groups.forEach((group) => {
      group.positions.forEach((position) => {
        const key = `${position.row}-${position.col}`;
        intersections.set(key, (intersections.get(key) ?? 0) + 1);
      });
    });

    const bombCandidate = Array.from(intersections.entries()).find(([, count]) => count >= 2);
    if (bombCandidate) {
      const position = this.positionFromKey(bombCandidate[0], preferred ?? allMatches[0]);
      return { position, specialType: SpecialType.Bomb };
    }

    const rainbowGroup = groups.find((group) => group.positions.length >= 5);
    if (rainbowGroup) {
      return {
        position: preferred ?? rainbowGroup.positions[Math.floor(rainbowGroup.positions.length / 2)],
        specialType: SpecialType.Rainbow,
      };
    }

    const fourGroup = groups.find((group) => group.positions.length === 4);
    if (fourGroup) {
      return {
        position: preferred ?? fourGroup.positions[1],
        specialType:
          fourGroup.direction === "horizontal" ? SpecialType.Horizontal : SpecialType.Vertical,
      };
    }

    return null;
  }

  private rowAndCol(grid: GridCellData[][], row: number, col: number): Position[] {
    const positions: Position[] = [];
    for (let c = 0; c < grid[0].length; c += 1) {
      positions.push({ row, col: c });
    }
    for (let r = 0; r < grid.length; r += 1) {
      positions.push({ row: r, col });
    }
    return positions;
  }

  private area(grid: GridCellData[][], row: number, col: number, radius: number): Position[] {
    const positions: Position[] = [];
    for (let r = row - radius; r <= row + radius; r += 1) {
      for (let c = col - radius; c <= col + radius; c += 1) {
        if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
          positions.push({ row: r, col: c });
        }
      }
    }
    return positions;
  }

  private allCells(grid: GridCellData[][]): Position[] {
    const positions: Position[] = [];
    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[0].length; col += 1) {
        positions.push({ row, col });
      }
    }
    return positions;
  }

  private findColor(grid: GridCellData[][], itemType: ItemType): Position[] {
    const positions: Position[] = [];
    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[0].length; col += 1) {
        if (grid[row][col].itemType === itemType) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }

  private unique(positions: Position[]): Position[] {
    const map = new Map<string, Position>();
    positions.forEach((position) => map.set(`${position.row}-${position.col}`, position));
    return Array.from(map.values());
  }

  private positionFromKey(key: string, fallback: Position): Position {
    const [row, col] = key.split("-").map(Number);
    if (Number.isNaN(row) || Number.isNaN(col)) {
      return fallback;
    }
    return { row, col };
  }

  private push(queue: Position[], visited: Set<string>, position: Position): void {
    const key = `${position.row}-${position.col}`;
    if (!visited.has(key)) {
      visited.add(key);
      queue.push(position);
    }
  }

  private swapTemp(grid: GridCellData[][], first: Position, second: Position): void {
    const firstCell = grid[first.row][first.col];
    grid[first.row][first.col] = grid[second.row][second.col];
    grid[second.row][second.col] = firstCell;
  }

  private wouldSwapResolveImmediately(grid: GridCellData[][], first: Position, second: Position): boolean {
    const firstCell = grid[first.row][first.col];
    const secondCell = grid[second.row][second.col];
    if (!firstCell?.itemType || !secondCell?.itemType) {
      return false;
    }

    if (firstCell.specialType !== SpecialType.None || secondCell.specialType !== SpecialType.None) {
      return this.resolveSpecialSwap(grid, first, second)?.length > 0;
    }

    this.swapTemp(grid, first, second);
    const analysis = this.findMatches(grid, [first, second]);
    this.swapTemp(grid, first, second);

    if (analysis.allMatches.length === 0) {
      return false;
    }

    return analysis.allMatches.some(
      (position) =>
        (position.row === first.row && position.col === first.col) ||
        (position.row === second.row && position.col === second.col),
    );
  }
}

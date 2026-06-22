import { Color } from "cc";

export enum ItemType {
  Red = "red",
  Yellow = "yellow",
  Blue = "blue",
  Green = "green",
  Purple = "purple",
  Orange = "orange",
  Pink = "pink",
  Cyan = "cyan",
  Lime = "lime",
  Teal = "teal",
  Indigo = "indigo",
  Magenta = "magenta",
  Gold = "gold",
  Coral = "coral",
  Mint = "mint",
  Azure = "azure",
  Rose = "rose",
  Amber = "amber",
  Violet = "violet",
  Pearl = "pearl",
}

export enum SpecialType {
  None = "none",
  Horizontal = "horizontal",
  Vertical = "vertical",
  Bomb = "bomb",
  Rainbow = "rainbow",
}

export enum BlockState {
  Normal = "normal",
  Ice = "ice",
  Crate = "crate",
  Locked = "locked",
}

export enum LevelGoalType {
  Score = "score",
  Collect = "collect",
  BreakObstacle = "breakObstacle",
}

export enum GameState {
  WAIT_INPUT = "WAIT_INPUT",
  SWAPPING = "SWAPPING",
  MATCHING = "MATCHING",
  DROPING = "DROPING",
  LEVEL_END = "LEVEL_END",
}

export interface Position {
  row: number;
  col: number;
}

export interface GridCellData {
  row: number;
  col: number;
  itemType: ItemType | null;
  specialType: SpecialType;
  blockState: BlockState;
  nodeUuid: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  moves: number;
  goalType: LevelGoalType;
  targetScore: number;
  starScores: [number, number, number];
  difficultyFactor: number;
  expectedDurationSec: number;
  targetPassRate: number;
}

export const ITEM_COLOR_MAP: Record<ItemType, Color> = {
  [ItemType.Red]: new Color(255, 103, 119, 255),
  [ItemType.Yellow]: new Color(255, 216, 90, 255),
  [ItemType.Blue]: new Color(88, 186, 255, 255),
  [ItemType.Green]: new Color(99, 221, 137, 255),
  [ItemType.Purple]: new Color(189, 118, 255, 255),
  [ItemType.Orange]: new Color(255, 153, 79, 255),
  [ItemType.Pink]: new Color(255, 135, 210, 255),
  [ItemType.Cyan]: new Color(86, 232, 240, 255),
  [ItemType.Lime]: new Color(180, 232, 85, 255),
  [ItemType.Teal]: new Color(63, 203, 184, 255),
  [ItemType.Indigo]: new Color(112, 137, 255, 255),
  [ItemType.Magenta]: new Color(225, 99, 255, 255),
  [ItemType.Gold]: new Color(255, 195, 54, 255),
  [ItemType.Coral]: new Color(255, 126, 98, 255),
  [ItemType.Mint]: new Color(123, 238, 188, 255),
  [ItemType.Azure]: new Color(68, 161, 255, 255),
  [ItemType.Rose]: new Color(255, 111, 157, 255),
  [ItemType.Amber]: new Color(255, 173, 66, 255),
  [ItemType.Violet]: new Color(153, 102, 255, 255),
  [ItemType.Pearl]: new Color(232, 226, 255, 255),
};

export const ITEM_TYPES: ItemType[] = [
  ItemType.Red,
  ItemType.Yellow,
  ItemType.Blue,
  ItemType.Green,
  ItemType.Purple,
  ItemType.Orange,
  ItemType.Pink,
  ItemType.Cyan,
  ItemType.Lime,
  ItemType.Teal,
  ItemType.Indigo,
  ItemType.Magenta,
  ItemType.Gold,
  ItemType.Coral,
  ItemType.Mint,
  ItemType.Azure,
  ItemType.Rose,
  ItemType.Amber,
  ItemType.Violet,
  ItemType.Pearl,
];

const LEVEL_NAMES = [
  "Score Rush",
  "Chain Spark",
  "Prism Route",
  "Meteor Drop",
  "Mirror Pulse",
  "Aurora Burst",
  "Crystal Reactor",
  "Nova Ladder",
  "Starlight Vault",
  "Crown Finale",
];

const LEVEL_MOVE_LIMITS = [22, 21, 20, 19, 18, 17, 16, 15, 14, 13];
const TARGET_PASS_RATE = 0.2;
const ESTIMATED_SECONDS_PER_MOVE = 5;
const BASE_TARGET_SCORE = 9000;

function roundScore(value: number): number {
  return Math.round(value / 100) * 100;
}

export const LEVELS: LevelConfig[] = LEVEL_NAMES.map((name, index) => {
  const difficultyFactor = Number(Math.pow(1.1, index).toFixed(2));
  const targetScore = roundScore(BASE_TARGET_SCORE * difficultyFactor);
  const moves = LEVEL_MOVE_LIMITS[index] ?? LEVEL_MOVE_LIMITS[LEVEL_MOVE_LIMITS.length - 1];
  const expectedDurationSec = moves * ESTIMATED_SECONDS_PER_MOVE;

  return {
    id: index + 1,
    name: `Chapter ${index + 1} - ${name}`,
    moves,
    goalType: LevelGoalType.Score,
    targetScore,
    starScores: [
      targetScore,
      roundScore(targetScore * 1.2),
      roundScore(targetScore * 1.4),
    ],
    difficultyFactor,
    expectedDurationSec,
    targetPassRate: TARGET_PASS_RATE,
  };
});

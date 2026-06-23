export const GameConfig = {
  stage: {
    width: 720,
    height: 1280,
  },
  board: {
    rows: 10,
    cols: 8,
    tileSize: 82,
    pixelSize: 656,
    pixelWidth: 656,
    pixelHeight: 820,
    swapDuration: 0.15,
    clearDuration: 0.16,
    dropDurationPerCell: 0.06,
  },
  score: {
    fourMatchBonus: 40,
    fiveMatchBonus: 80,
    chainBonus: 30,
    specialMultiplier: 1.4,
  },
  objective: {
    durationSec: 180,
  },
  lottery: {
    doubleBaseChance: 0.04,
    jackpotBaseChance: 0.01,
    pityChanceStep: 0.006,
    maxPityChanceBonus: 0.08,
    jackpotScore: 888,
  },
  bonusAd: {
    adUnitId: "adunit-score-bonus-placeholder",
  },
  leaderboard: {
    serverBaseUrl: "",
    playerId: "local-player",
    nickname: "我",
    pageSize: 20,
    autoRefreshSec: 30,
  },
  debug: {
    refillLogs: true,
  },
};

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
  penalty: {
    noMatchSwapTimeSec: 2,
  },
  reward: {
    matchTimeSec: 1,
  },
  lottery: {
    timeMinSec: 1,
    timeMaxSec: 3,
    doubleBaseChance: 0.04,
    jackpotBaseChance: 0.01,
    timeChance: 0.15,
    pityChanceStep: 0.006,
    maxPityChanceBonus: 0.08,
    jackpotScore: 888,
  },
  powerup: {
    extraTimeSec: 30,
    adUnitId: "adunit-extra-time-placeholder",
  },
  bonusAd: {
    minItemScore: 50,
    cooldownSec: 18,
    maxPerGame: 2,
    adUnitId: "adunit-score-bonus-placeholder",
  },
};

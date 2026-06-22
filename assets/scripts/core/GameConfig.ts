export const GameConfig = {
  stage: {
    width: 720,
    height: 1280,
  },
  board: {
    rows: 8,
    cols: 8,
    tileSize: 82,
    pixelSize: 656,
    swapDuration: 0.15,
    clearDuration: 0.16,
    dropDurationPerCell: 0.06,
  },
  score: {
    normal: 100,
    fourMatch: 200,
    fiveMatch: 300,
    chainBonus: 50,
    specialMultiplier: 1.6,
  },
  revive: {
    extraMoves: 10,
    shuffleDuration: 0.24,
    adUnitId: "adunit-revive-placeholder",
  },
};

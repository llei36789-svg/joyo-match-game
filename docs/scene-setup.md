# 场景接线说明

下面是一套最小可跑通的场景结构，适合先验证代码骨架。

## 推荐节点结构

```text
Canvas
└── GameRoot
    ├── HomeView
    │   ├── TitleLabel
    │   ├── DescLabel
    │   └── StartButton
    ├── GameView
    │   ├── LevelTitle
    │   ├── LevelBrief
    │   ├── HintLabel
    │   ├── ProgressLabel
    │   ├── OptionButton1
    │   ├── OptionButton2
    │   ├── OptionButton3
    │   └── OptionButton4
    └── ResultView
        ├── ResultTitle
        ├── ResultDesc
        ├── ScoreLabel
        ├── NextButton
        └── RestartButton
```

## 挂载方式

### 1. `GameRoot` 节点

挂载组件：

- `GameRoot`

在 Inspector 里拖入：

- `homeView` -> `HomeView` 节点上的 `HomeView` 组件
- `gameView` -> `GameView` 节点上的 `GameView` 组件
- `resultView` -> `ResultView` 节点上的 `ResultView` 组件

### 2. `HomeView` 节点

挂载组件：

- `HomeView`

在 Inspector 里拖入：

- `titleLabel`
- `descLabel`
- `startButton`

### 3. `GameView` 节点

挂载组件：

- `GameView`

在 Inspector 里拖入：

- `titleLabel`
- `briefLabel`
- `hintLabel`
- `progressLabel`
- `optionButtons`（4 个按钮）
- `optionTitleLabels`（4 个标题文本）
- `optionDescLabels`（4 个说明文本，可选）

### 4. `ResultView` 节点

挂载组件：

- `ResultView`

在 Inspector 里拖入：

- `titleLabel`
- `descLabel`
- `scoreLabel`
- `nextButton`
- `restartButton`

## 当前流程

1. 进入场景后加载 `assets/resources/config/levels.json`
2. 展示首页
3. 点击开始后进入第一关
4. 点击选项后进入结算页
5. 结算页可以下一关或重新开始

## 适合你后续继续补的内容

- 关卡截图节点
- 日志滚动区
- 玩家反馈气泡
- 倒计时条
- 评分星级
- AI 点评面板

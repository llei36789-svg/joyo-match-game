# AI Bug Hunter

一个基于 Cocos Creator + TypeScript 的小游戏项目骨架，主题是“找 BUG”。

当前仓库先搭好代码结构和基础流程，方便你直接在 Cocos Creator 里创建场景、挂载组件、继续填玩法和资源。

## 当前骨架包含

- `assets/scripts/core`：事件总线、常量、基础配置
- `assets/scripts/data`：关卡配置加载
- `assets/scripts/game`：游戏状态和流程控制
- `assets/scripts/models`：数据类型定义
- `assets/scripts/ui`：首页、关卡页、结算页基础组件
- `assets/scripts`：场景入口协调器
- `assets/resources/config`：示例关卡配置
- `docs`：场景接线说明

## 建议使用方式

1. 用 Cocos Creator 新建一个 `TypeScript` 项目。
2. 将当前仓库内容放入新项目根目录，或把 `assets`、`docs`、`README.md` 合并进去。
3. 在编辑器中创建一个主场景，例如 `Main.scene`。
4. 参考 [docs/scene-setup.md](/Users/jianyou1218/Documents/lilei-project/docs/scene-setup.md) 挂载组件和 UI 节点。
5. 运行后先打通“开始游戏 -> 选择答案 -> 结算 -> 下一关/重开”的最小闭环。

## 目录结构

```text
assets
├── resources
│   └── config
│       └── levels.json
└── scripts
    ├── core
    ├── data
    ├── game
    ├── models
    └── ui
docs
└── scene-setup.md
```

## 下一步建议

- 补一个真正的 `Main.scene`
- 给每关加截图、日志、玩家反馈等线索
- 把当前 `Button + Label` 骨架替换成更完整的卡片式 UI
- 增加倒计时、评分、连击和 AI 点评

# game

当前状态：pre-alpha。这里已经有独立 npm package、可启动的最小 React 工程入口，以及 typecheck、test 和 build 工具链；模拟、玩法、application/projection、存档和正式 UI 尚未实现。

`game/` 是浏览器游戏实现目录，也是独立 npm package，初期不启用 npm workspaces。当前页面只用于验证 Vite、React 和 TypeScript 工具链，不声明已经存在可玩功能。

## 职责

`game/` 负责承载首个可玩竖切的客户端、模拟核心、场景数据、投影层、存档与测试。首个竖切目标是 2020-2022 的浏览器教程，时长约 15-30 分钟，让玩家跑通早期 AI 公司在资金、算力、数据、研发、评估和发布窗口之间求生的基本循环。

## 可信源边界

`content/` 是游戏设计、设定、叙事和机制含义的可信源。它定义游戏要表达什么，以及系统为何存在。

`game/docs/` 是技术实现规格的可信源。它把已确认的设定翻译成工程边界、数据形状、UI 规则和验收标准。

如果实现需要改变设定、世界观、机制含义或叙事结论，必须先请求人类确认并更新 `content/`，不能由实现反向覆盖 `content/`。

## 文档入口

- [首个可玩竖切规格](docs/vertical-slice-spec.md)
- [技术架构](docs/architecture.md)
- [UI 视觉规则](docs/ui-style-guide.md)

## 命令

从仓库根目录运行：

- 安装依赖：`npm --prefix game install`
- 启动开发服务器：`npm --prefix game run dev`
- 类型检查：`npm --prefix game run typecheck`
- 运行测试：`npm --prefix game run test`
- 构建游戏：`npm --prefix game run build`
- 预览构建结果：`npm --prefix game run preview`

根目录现有 `npm run build` 仍只表示 Quartz build，不代表游戏构建。游戏部署尚未接入现有 GitHub Pages workflow。

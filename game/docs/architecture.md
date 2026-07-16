# 技术架构

## 范围

本文记录 `game/` 的首阶段实现边界。它是技术实现规格，不替代 `content/` 中的设定节点，也不写入可复制的完整源码。

## 基础技术决定

- 客户端使用 Vite + React + TypeScript。
- TypeScript 开启 strict mode。
- `game/` 是独立 npm package，初期不采用 npm workspaces。
- 根目录现有 npm 命令继续服务 Quartz；根目录 `npm run build` 仍只表示 Quartz build。
- 未来如需根目录代理游戏命令，使用 `npm --prefix game`，例如代理到 `game` 包内的 dev、build 或 test 命令。
- 游戏部署暂不接入现有 GitHub Pages workflow，本阶段不处理部署。

## 分层

建议 `game/` 采用以下层级：

| 层级 | 职责 |
| --- | --- |
| `sim/` | 纯 TypeScript 模拟核心，保存内部状态、命令处理、事件队列、RNG 和规则计算。 |
| `scenario/` | 首个竖切的初始状态、事件脚本、可选行动定义和教程阶段数据。 |
| `application/` | UI 与 sim 之间的用例层，接收玩家命令，调用 sim，产生 projection 和持久化请求。 |
| `projections/` | 把内部状态转成 UI 可消费的只读视图，包括状态栏、任务列表、评估报告和风险列表。 |
| `persistence/` | 存档读写、版本识别、迁移和校验。 |
| `ui/` | React 组件、页面布局、交互状态和输入事件。 |
| `tests/` | Vitest 测试，覆盖 sim 规则、projection、迁移和关键教程流程。 |

依赖方向应保持单向：UI 调 application，application 调 sim 和 projections；sim 不依赖 React、DOM、Canvas、localStorage、Date.now 或浏览器 API。

## 模拟核心

模拟核心使用无框架的纯 TypeScript。它只处理游戏规则和状态变更，不读取浏览器环境，不直接格式化 UI，也不持有 React 状态。

核心状态使用整数游戏日。不要在 sim 中使用 JS `Date`。如果 UI 需要显示“2020 年春季”或具体日历标签，应由 projection 根据 scenario epoch 和整数 game day 格式化。

模拟推进使用事件队列，不做逐帧模拟。一次推进可以移动到下一个 scheduled event、玩家设置的提醒、季度结算点或自动暂停点。

## Command Action 与 Scheduled Event

command action 是玩家或 application 主动提交的意图，例如：

- 开始训练。
- 准备数据。
- 分配算力。
- 运行评估。
- 发布或延迟发布 checkpoint。

scheduled event 是已经进入事件队列、会在指定整数游戏日触发的系统事件，例如：

- 训练任务完成。
- 评估报告出炉。
- 季度结算。
- 发布窗口变化。
- 外部信号或教程剧情推进。

command action 可以创建 scheduled event。scheduled event 触发后可以改变状态、创建警报、要求自动暂停，或解锁下一组选项。

scheduled event 使用稳定排序键，依次比较：

1. `dueDay`。
2. `priority`，其高低关系由对应规则版本明确。
3. `sequenceId`。

`sequenceId` 是 sim 在事件创建时分配的单调递增整数。多个事件在同一天、同一优先级时，按 `sequenceId` 从小到大执行；sequence counter 必须进入存档。事件创建和执行不得依赖对象遍历顺序、数组偶然插入顺序或系统时间，并且在相同 seed、相同命令序列和相同 `rulesVersion` 下必须可复现。

## 时间规则

- `time` 是核心约束，但不是可消费数字资源。
- 不设计 `timePoints`。
- 所有任务持续时间用整数游戏日表达。
- 发布窗口、季度结算、runway 和自动暂停都基于整数 game day。
- UI 可以提供暂停、倍速和自动暂停表现；底层只按事件队列推进。

## 随机性

所有随机都必须来自可序列化的 seeded RNG。RNG state 是存档的一部分。

模拟核心禁止使用 `Math.random()`。测试应覆盖关键随机路径，确保相同初始 seed、相同命令序列和相同 `rulesVersion` 能得到可解释的结果。

如果后续需要与 UI 动效随机分离，UI 随机不能反向影响 sim 状态。

## 模型能力与评估数据形状

模型真实能力不实现为单一绝对分数。内部状态应支持隐藏能力向量，并允许 projection 用不同方式观察它。

首版可以只启用少量维度，但数据形状要允许增加新维度。概念上至少区分：

- hidden capability vector：模拟核心内部使用，玩家不可直接读取。
- public benchmark projection：公开榜单和融资叙事看到的投影。
- internal eval projection：团队内部评估看到的投影。
- user task feedback projection：真实用户任务反馈看到的投影。

每个 projection 都应能携带噪声、可信度和盲区信息。UI 展示 projection，不能直接读取 hidden vector。

## Projection 与 UI 边界

UI 只消费 projection，不直接读取和任意修改内部状态。React 组件不应持有可被当作权威游戏状态的 sim 对象副本。

玩家操作从 UI 发出后，经过 application 转成 command action；command action 由 sim 验证和执行。执行结果再通过 projection 变成可显示的状态栏、面板、报告和警报。

这条边界用于保证：

- 存档可以复现内部状态。
- UI 重构不改变规则。
- 测试可以不启动浏览器。
- 后续同一 sim 可以服务不同 UI。

## 存档与迁移

存档必须同时包含 `schemaVersion` 和 `rulesVersion`。`schemaVersion` 表示存档数据结构版本，`rulesVersion` 表示模拟规则版本；scenario 仍保留自己的标识和版本。

首版迁移方向是从旧 schema 向当前 schema 迁移；不要求当前版本向旧版本导出。读取存档时必须能识别 `rulesVersion` 不匹配，不得静默套用当前规则。本阶段不要求实现跨 `rulesVersion` 的完整重放兼容，也不要求存档保存全部玩家聊天或 UI 操作。

迁移代码应尽量小步、可测试、可审阅。迁移只修正数据结构，不借迁移改变已经确认的设定含义。

存档至少需要保存：

- schemaVersion。
- rulesVersion。
- scenario 标识与版本。
- 当前整数 game day。
- sim 内部状态。
- event queue。
- event sequence counter。
- seeded RNG state。
- 已触发或已完成的教程节点。

## 测试策略

第一阶段使用 Vitest。优先测试纯 sim、projection、存档迁移和教程关键路径。

Playwright 在形成可操作 UI 后再加入。首批 Playwright 用例应验证主要操作路径、布局可用性和自动暂停，不在还没有 UI 时提前引入。

## 暂不引入的库

首版不引入 Redux、Zustand、图表库、3D 库或 UI component suite。

状态管理先使用 React 自身能力和 application 层边界。图表先用低复杂度 CSS 或 SVG 表达，优先满足对齐能力条、benchmark 表、小型趋势线、任务时间线和风险列表。

## 根目录与部署

根目录 Quartz 命令保持不变：

- `npm run validate` 检查 Markdown、wikilink 和关系。
- `npm run check:graphs` 检查图谱。
- `npm run preview` 和 `npm run build` 仍服务 Quartz。

未来如果需要根目录游戏命令，只添加显式代理到 `npm --prefix game` 的脚本，不改变现有 Quartz 命令语义。

游戏部署暂不处理，也不修改现有 GitHub Pages workflow。

## 文档与实现冲突处理

`content/` 是游戏设计与设定可信源，`game/docs/` 是技术实现规格可信源。

如果实现发现必须改变游戏设定、叙事、机制含义或内容节点，应先请求人类确认，并由人类确认后再更新 `content/`。实现不能反向覆盖 `content/`。

如果实现与 `game/docs/` 冲突，应先判断是实现偏离规格，还是规格已经不能支撑已确认设计。前者修实现，后者先更新文档再改实现。

如果 `content/` 与 `game/docs/` 表述不一致，默认暂停相关实现并请求确认，不把未确认的问题伪装成已定案。

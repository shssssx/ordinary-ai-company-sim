# Agent 工作区

这个目录用于存放 Agent 按任务角色读取的工作提示词。

这里不是游戏设定正文，也不是 Quartz 公开内容入口。正式设定、机制、结局、世界观接口仍然写入 `content/`。

## 使用方式

- 先根据 `AGENTS.md` 判断任务角色。
- 读取对应的一个角色文件。
- 只有任务跨角色时，才继续读取第二个角色文件。

## 当前角色文件

- `chat-record-organizer.md` - 整理聊天、issue、零散想法。
- `content-editor.md` - 修改或扩写游戏设定。
- `de-ai-writing-editor.md` - 去除 AI 味、压缩文案、保持原意改写。
- `consistency-maintainer.md` - 维护结构、来源、链接和结局一致性。
- `site-maintainer.md` - 处理 Quartz、构建、部署和预览。
- `agent-rule-maintainer.md` - 维护 `agent/` 和 Agent 规则。
- `reviewer.md` - 做审阅而非直接修改。
- `game-designer.md` - 规划教程流程、玩家选择、scenario 边界和临时平衡方案。
- `simulation-engineer.md` - 实现纯模拟、事件队列、RNG、projection、存档和相关测试。
- `ui-engineer.md` - 实现 React UI、application 接线、交互和可用性。
- `game-reviewer.md` - 独立审阅游戏规格、实现、测试、可玩性和架构边界。

## 参考文件

- `de-ai-writing-examples.md` - 去 AI 味和信息压缩的例子记录，不是独立角色。

## 原则

- 一个角色文件只服务一类任务。
- 角色文件可以包含具体流程；`AGENTS.md` 只保留路由和全局约束。
- 维护 `AGENTS.md` 或任何 `agent/*.md` 前，必须先读 `agent-rule-maintainer.md`。
- 不存一次性聊天记录。
- 会影响游戏设定或读者理解的规则，应同步写入 `content/` 的对应节点。
- 只约束 Agent 工作方式的规则，留在 `agent/` 或 `AGENTS.md`。

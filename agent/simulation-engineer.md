# 模拟工程师

## 适用任务

用于实现或修改：

- `game/` 的纯 TypeScript sim。
- command action。
- scheduled event。
- scenario 数据和规则。
- seeded RNG。
- projection。
- persistence。
- schema、rules migration。
- Vitest 测试。

## 必读文件

- `game/docs/architecture.md`
- `game/docs/vertical-slice-spec.md`
- 与当前任务相关的 `content/` 节点
- 被修改的 sim、scenario、projection、persistence 和测试文件

## 行为规范

- sim 不依赖 React、DOM、Canvas、localStorage、`Date.now` 或浏览器 API。
- sim 禁止使用 `Math.random()`。
- sim 使用事件队列推进，不做真实逐帧 tick；时间使用整数 game day。
- scheduled event 稳定按 `dueDay` → `priority` → `sequenceId` 排序。
- `sequenceId` 是单调递增整数。
- event sequence counter 和 seeded RNG state 必须进入存档。
- 存档必须区分并保存 `schemaVersion`、`rulesVersion`、scenario id 和 scenario version。
- 模型真实能力使用 hidden capability vector，不能退化为单一公开真实能力分数。
- public benchmark、internal eval 和 user feedback 等 projection 可以携带噪声、可信度和盲区。
- UI 只能消费 projection，不能读取 hidden capability vector 或权威 sim 内部状态。
- command/action 由 sim 验证和执行；UI 不得绕过 application/command 边界直接修改 sim。
- 不把游戏规则写进 React 组件。
- 不实现规格或 `content/` 未确认的机制。
- `content/`、`game/docs/` 和实现出现冲突时，必须停止并请求人类确认。
- 新增依赖前必须请求人类确认。
- 每项规则修改都要有确定性测试，或说明暂时不能测试的理由。
- 优先做小改动，不借任务重构无关模块。
- 同 seed、同命令序列、同 `rulesVersion` 必须可复现。

## 交付检查

- 修改了哪些规则和文件。
- 确定性是否保持。
- 成功、失败和边界路径是否覆盖。
- 是否运行测试。
- 是否存在未验证路径。
- 是否发现 `game/docs/` 与实现冲突。

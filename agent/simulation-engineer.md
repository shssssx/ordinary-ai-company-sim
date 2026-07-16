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
- 时间使用整数 game day。
- 事件按 `dueDay`、`priority`、`sequenceId` 稳定排序。
- sequence counter 和 RNG state 必须可序列化。
- 存档区分 `schemaVersion`、`rulesVersion` 和 scenario version。
- UI 只能读取 projection，不能访问 hidden capability vector。
- 不把游戏规则写进 React 组件。
- 不实现规格或 `content/` 未确认的机制。
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

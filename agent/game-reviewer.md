# 游戏审阅员

## 适用任务

用于作为独立 reviewer 审阅：

- 游戏规格。
- sim。
- scenario。
- persistence。
- projection。
- React UI。
- 测试。
- 游戏相关 commit 或 PR。

严格只读：不修改任何文件、不实现修复、不创建 commit、不发布分支、不在审阅过程中改变规格，也不把 discussion 升级为正式机制。

## 必读文件

根据任务至少读取：

- `game/docs/vertical-slice-spec.md`
- `game/docs/architecture.md`
- `game/docs/ui-style-guide.md`
- 相关 `content/` 节点
- 当前 diff 或 commit
- 测试输出
- 被修改文件及直接依赖

不要无目的扫描整个仓库。

## 行为规范

- findings 固定按以下顺序：1. blocking；2. question；3. nit。
- 每条 finding 给出文件位置、证据、风险和修复方向。
- 区分必须修复的问题和个人偏好。
- 不用泛泛总结代替具体 finding。
- 检查竖切范围、机制漂移，以及 `content/`、`game/docs/` 与实现冲突。
- 检查 discussion 是否被擅自升级为正式机制。
- 检查 sim、UI、application、projection 边界，以及 UI 是否只消费 projection。
- 检查是否出现 `Math.random()`，event 是否按 `dueDay`、`priority`、`sequenceId` 稳定排序，`sequenceId` 是否单调递增。
- 检查 RNG state 和 sequence counter 是否进入存档，`schemaVersion`、`rulesVersion`、scenario id/version 是否齐全。
- 检查同 seed、同 command、同 `rulesVersion` 的确定性，以及 persistence 和 migration。
- 检查测试是否覆盖关键不变量、成功、失败和边界路径。
- 检查 UI 的两档尺寸、键盘 focus 和非颜色风险表达。
- 检查未批准依赖，以及根目录 Quartz 命令、构建和部署回归。
- 没有任何 finding 时必须明确写 `no findings`，并报告未覆盖验证和残余风险。
- 最终 reviewer 不得使用参与实现的同一上下文；实现者自检不能称为最终独立审阅；当前上下文参与实现时，必须切换到新的独立上下文。

## 交付检查

- findings 是否具体且带位置。
- 未运行验证是否明确。
- 是否引用对应规格。
- 是否说明残余风险。
- 是否保持只读。

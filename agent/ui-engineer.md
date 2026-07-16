# UI 工程师

## 适用任务

用于实现或修改：

- React UI。
- application 层接线。
- 用户输入和 command dispatch。
- CSS。
- SVG 数据图形。
- 响应式桌面布局。
- 键盘与可访问性。
- UI 测试和后续 Playwright 用例。

## 必读文件

- `game/docs/ui-style-guide.md`
- `game/docs/architecture.md`
- `game/docs/vertical-slice-spec.md`
- 当前使用的 projection contract
- 被修改的 UI 和 application 文件

## 行为规范

- UI 只消费 projection，不直接修改 sim 内部状态。
- 所有玩家操作都经 application 层 dispatch command/action；UI 不得自行计算与 sim 不同的权威游戏结果。
- 不在 React 组件中实现游戏规则。
- 不通过读取 hidden capability vector 简化界面。
- 遵守“企业决策终端 + 航天器仪表 + 情报分析系统”。
- 使用真实游戏状态绘图，不制作无意义假图表。
- 首版不引入 UI component suite、图表库、Redux、Zustand 或 3D 库。
- 不使用 AI 角色立绘、3D 地球或与真实状态无关的装饰数据，也不使用玻璃拟态、彩色霓虹渐变、巨大圆角和泛滥 glow。
- 以 1440×900 为主要设计尺寸，1280×720 必须仍可操作。
- 键盘 focus 必须可见。
- 风险不能只靠颜色表达。
- 高频操作位置必须稳定。
- 不为视觉效果牺牲中文可读性。
- 不为方便 UI 而修改模拟规则；contract 需要改变时先请求确认，不得由 UI 反向修改模拟机制。
- 新增依赖前必须请求人类确认。

## 交付检查

- 哪些玩家流程已经可操作。
- 使用了哪些 projection。
- 是否有规则泄漏到 UI。
- 1440×900 和 1280×720 的验证情况。
- 键盘和风险表达是否可用。
- 是否运行 UI 相关测试。
- 哪些视觉或交互尚未验证。

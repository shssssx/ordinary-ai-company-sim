# AGENTS.md

## 项目简介

这是《一个很普通的 AI 公司模拟经营游戏》的中文设计知识库。
仓库的 canonical source 是 `content/` 下的 Markdown；Quartz、GitHub Pages 和 Obsidian 都只是阅读与创作视图。

修改文字要当作产品修改：优先保证设定清晰、结构稳定、来源可追踪、读者信任。不要把它写成 AI 大亨爽游，也不要把技术封建主义、黑箱 ASI 逃逸或私有化后稀缺写成奖励。

## 代码结构

- `content/index.md` - 站点首页和主要入口。
- `content/00-project-overview.md` - 项目总览，改核心定位时先看这里。
- `content/01-collaboration-guide.md` - 协作规范、来源标记、节点状态和 ID 规则。
- `content/99-issue-resolution-map.md` - 已合并 issue 与设定调整说明。
- `content/systems/` - 游戏机制节点，例如研发、数据、基础设施、经济、电力、产品发布。
  - `content/systems/ai-training-sim/` - AI 训练模拟器、科技树、模型规模、数据和评估。
  - `content/systems/macro-econ-politics/` - 经济政治建模、产业链、监管和社会反馈。
  - `content/systems/company-operations/` - 公司经营、发布、产品化和商业动作。
- `content/narrative/` - 剧情、事件呈现、结局系统和世界设定背景。
  - `content/narrative/endings/` - 结局线与结局系统，新增或改动重大机制时要检查这里的影响。
  - `content/narrative/setting/` - 世界设定背景，不作为首页一级入口。
- `content/discussions/` - issue、聊天记录和未提炼材料的暂存入口。
- `content/graphs/` - 可复用交互关系图的数据文件，用于机制、剧情和结局页面的可视化辅助。
- `content/templates/node-template.md` - 新增节点时优先复制这个模板。
- `agent/` - Agent 按任务角色读取的工作提示词，不是游戏设定正文。
- `game/` - 浏览器游戏实现和技术规格目录。
- `game/docs/` - 技术实现规格可信源。
- 游戏设定、机制含义和叙事仍以 `content/` 为可信源。
- `content/`、`game/docs/` 和实现出现冲突时，暂停并请求人类确认。
- `quartz.config.yaml` - Quartz 站点配置、插件、主题、导航与部署 baseUrl。
- `scripts/preview-quartz.mjs` - 本地预览/构建脚本，会克隆 Quartz v5 到 `.quartz-preview/`。
- `.github/workflows/deploy.yml` - GitHub Pages 部署流程。
- `.quartz-preview/`、`.quartz-build/`、`public/` - 生成物或临时目录，不是源内容。

## Agent 渐进式披露

每次任务开始时，先判断任务性质，再读取 `agent/` 下对应的一个角色文件。`AGENTS.md` 只做全局约束和路由，不放具体角色工作流。

- 整理聊天、issue、零散想法：读 `agent/chat-record-organizer.md`。
- 修改或扩写游戏设定：读 `agent/content-editor.md`。
- 去除 AI 味、压缩文案、保持原意改写：读 `agent/de-ai-writing-editor.md`。
- 维护结构、来源、链接、结局一致性：读 `agent/consistency-maintainer.md`。
- 处理 Quartz、构建、部署、预览：读 `agent/site-maintainer.md`。
- 维护 `agent/` 和 Agent 规则：读 `agent/agent-rule-maintainer.md`。
- 做一般文档和仓库审阅而非直接修改：读 `agent/reviewer.md`。
- 规划教程流程、玩家选择、scenario 边界和临时平衡：读 `agent/game-designer.md`。
- 实现纯模拟、事件队列、RNG、projection、存档和测试：读 `agent/simulation-engineer.md`。
- 实现 React UI、application 接线、CSS/SVG、交互和可用性：读 `agent/ui-engineer.md`。
- 独立审阅游戏规格、代码、测试、可玩性和架构边界：读 `agent/game-reviewer.md`。

如果任务同时涉及多个角色，先读主角色文件；只有在实际需要时再读第二个角色文件。新增角色时，新增 `agent/<role>.md`，并只在本节补一行路由。

维护 `AGENTS.md`、`agent/README.md` 或任意 `agent/*.md` 时，必须先读 `agent/agent-rule-maintainer.md`。不要把角色工作流、详细检查清单或后续新增角色的行为规范写回 `AGENTS.md`。

固定工作流的角色任务，尽量交给 `gpt-5.5`、`xhigh` 子代理完成。主 Agent 不要重复消耗上下文做全库扫描；应负责加载必要路由、派发子代理、整合结论和向人类确认下一步。

## 编写规范

- 修改代码前先检查库里是否已有相似功能、组件、脚本或插件；优先复用和扩展现有实现，尽量避免重复造一套平行机制。
- 新增重要节点必须包含 YAML frontmatter，并尽量沿用 `content/templates/node-template.md`。
- `source` 必须说明来源：`U` 人类贡献者的原始想法，`L` LLM 整理，`M` 共同形成，`W` 既有世界观，`R` 现实参考，`TBD` 待确认。
- `contributors`、`created`、`updated`、`tags`、`depends_on`、`conflicts_with`、`related_endings` 能填就填，不要让关系只存在于正文里。
- 新增或改写机制时，说明它影响哪些变量、玩家选择、系统反馈和结局。
- 未提炼的聊天、issue 和零散想法先进入 `content/discussions/`；没有人类明确确认时，不要把它们补写成正式机制。
- 使用 Obsidian wikilink，例如 `[[narrative/endings/index|结局系统]]`，不要随意换成裸 URL。
- 保持作者语气：冷静、锋利、结构化，可以有文学性，但不要营销化、鸡汤化或玩梗化。
- 所有文案修改都要保持高信息密度；不要用空洞过渡、套话、同义句堆叠或过度结构化来填充篇幅。
- 不要为了去掉抽象词而改成大量名词并列；如果一两个准确的上位词能保留信息密度，就保留或改用上位词。
- 做去 AI 味或全量文风修改时，不能用关键词检索代替阅读；必须逐篇阅读全文后判断上下文，再决定是否修改。
- 不得加入用户提示词之外的 LLM 推测、背景补充、合理化解释、方案设计、技术细节、价值判断或自动补全内容。即使某个方向看起来自然，也必须等用户提示词明确提出。
- 当用户提示词存在矛盾、缺口、指代不清、提出者不明、目标冲突或格式要求冲突，且会影响输出可靠性时，先向用户反问确认，不要自行补全成看似完整的结果。
- 优先做小而可 review 的修改。除非任务明确要求，不要大段重写或改 tone。
- Mermaid 和图谱只承载高层关系；复杂逻辑要回到 Markdown 正文、frontmatter 和 wikilink。
- 交互关系图只复述已确认节点关系，不把图里的标签当作新增设定；新增图谱数据时优先放在 `content/graphs/`，页面用占位块引用。图谱布局应优先依赖通用自动布局和自动避让，不要为单个节点或单条边维护手写坐标、偏移或页面专用脚本；改图后运行 `npm run check:graphs` 检查节点和标签遮挡。

## 常用命令

- 本地预览：`npm run preview`
- 只构建站点：`npm run build`
- 检查 Markdown 结构、frontmatter、wikilink 和关系 ID：`npm run validate`
- 检查交互图布局：`npm run check:graphs`
- 运行环境：Node `>=22`，npm `>=10.9.2`

`npm run preview` 首次运行需要网络、Git、Node 和 npm；脚本会克隆 Quartz v5、安装 Quartz 插件、复制 `content/` 与 `quartz.config.yaml`，然后启动本地服务。

## 禁止事项

- 不要把 `.quartz-preview/`、`.quartz-build/`、`public/` 当作源文件修改；源内容只改仓库根目录和 `content/`。
- 不要删除或覆盖已有节点来“解决冲突”；应在 frontmatter 写 `conflicts_with`，必要时新增冲突节点或把旧节点标记为 `deprecated`。
- 不要重新引入已移除的“无机冯诺依曼机远未来生态”模块。
- 不要把后稀缺写成单纯“机仆养人”，忽略产权、形态自由、公共算力和政治参与。
- 不要让玩家过早明确知道 ASI 逃逸，除非正在修改明确相关的结局或叙事节点。
- 不要新增没有来源、贡献者或关系指针的重要设定。
- 不要只更新 Markdown 而完全不检查 Quartz 页面；如果没有构建或预览，要在交付时说明原因。
- 不要在 `AGENTS.md` 中维护具体角色工作流；角色细则必须放在 `agent/<role>.md`。
- 不要把最近改动、阶段性迁移或任务记录塞进 `README.md`；README 只放长期入口、稳定目录和运行方式。阶段性记录放 `content/99-issue-resolution-map.md` 或 `content/discussions/`。
- 任何文档修改前都要有人类明确指令或确认；不能只因审阅建议、扫描结果或 Agent 自己判断就直接改文档。

## 容易踩的坑

- Markdown 是唯一可信源；Quartz 页面、Obsidian 图谱和生成的 HTML 都不能反向覆盖 `content/`。
- `quartz.config.yaml` 的 `ignorePatterns` 会忽略 `templates`，模板页不是公开内容入口。
- Quartz 日期插件优先读 frontmatter 和 git；新文件未被 git 跟踪时，本地预览可能提示日期不准确。
- 改机制节点时要同步检查 `content/narrative/endings/index.md` 和相关结局页，避免机制通向不存在或矛盾的结局。
- 改首页入口、目录页或文件名时，要检查 wikilink、Quartz 导航、搜索和 GitHub Pages 构建。
- 这个文件只放协作约定和高频注意事项；详细架构、业务设定长文和具体剧情规格应放到 `content/` 的相应节点里。

# React 化迁移方案

| | |
| --- | --- |
| 版本 | v0.1（草案） |
| 日期 | 2026-09-15 |
| 背景 | 应用开发 / 技能开发 / 智能体开发三个卡片网格的重复标记问题，见本文 §1 试点 |
| 现状代码量 | `index.html` ~2200 行，`src/scripts/main.js` ~6500 行（单个 IIFE，`var`/`$`/`$$`），写这份文档时的快照，见 §0 了解最新 |

---

## 0. 现状速览（交接用，2026-09-15）

**这一节是给接手的人看的，其余章节是决策记录，写的时候是什么决定就保留什么，不因为后续进展去改——想知道"现在到底做到哪了"看这一节，想知道"为什么这么设计"看后面。**

**分支**：所有迁移工作在 `feat/react-migration-v2`，`main` 完全没动过（还是纯 vanilla）。旧的 `feat/react-migration` 分支已经通过 `git merge` 并入 `feat/react-migration-v2`，内容都在了，可以当废弃分支处理，不用再看。

**已经合并、能跑、经浏览器实测过的**（照下面顺序，一路都是 `npm run lint` + `npm run build` + `npx wrangler dev` 实测通过才合并的）：

- **Phase 0 脚手架**：React 18 + `@vitejs/plugin-react` + `antd` 5（`ConfigProvider` 主题，[src/theme/antd-theme.js](../src/theme/antd-theme.js)）+ `react-router-dom`（**`BrowserRouter`，不是本文档 §3.1 写决策时说的 `HashRouter`**——中途因为部署形态定下来又调整过一次，见 §10 踩过的坑）+ `lucide-react`（[src/components/icons/Icon.jsx](../src/components/icons/Icon.jsx)）+ `usePersistedState` hook（[src/hooks/usePersistedState.js](../src/hooks/usePersistedState.js)）+ ESLint（[eslint.config.js](../eslint.config.js)，刻意不管 `src/scripts/main.js`）。
- **Phase 1 卡片页**：应用开发 / 技能开发 / 智能体开发三个页面，[src/views/AppsView.jsx](../src/views/AppsView.jsx)、[SkillsView.jsx](../src/views/SkillsView.jsx)、[AgentsView.jsx](../src/views/AgentsView.jsx) + [src/components/feature/AppCard.jsx](../src/components/feature/AppCard.jsx)。挂载在 `index.html` 的 `#react-view-root`，和另外几个 vanilla `.view` 共用 `main.js` 的 `showView()` 显隐机制——**没有**迁"专家管理"（挂在协作开发内部页签下、跟其它 5 个页签共享状态，拆不开）和"协作项目"（下面 Phase 2 顺手做的项目管理，和这几个卡片页不是一回事）。
- **Phase 2（部分）弹窗系统**：只迁完了协作开发的 7 个任务类弹窗——同步任务、执行、转交、扭转、发起评审、添加人员、新建项目，见 [src/components/collab/CollabModals.jsx](../src/components/collab/CollabModals.jsx) + [src/hooks/useCollabBridge.js](../src/hooks/useCollabBridge.js)。**还有大约 10 个弹窗没迁**（见下面"没做完的"）。

**没做完、有残留、需要接手人先看一眼再决定的**：

- 有一个**未合并、未提交**的半成品在 `.claude/worktrees/agent-a3f58e59997b79abb`（分支名 `worktree-agent-a3f58e59997b79abb`），是继续迁剩余弹窗时被手动中断的，工作目录里能看到 `src/components/chatapp/`、`src/components/shortcut/`、`src/hooks/useLingeeBridge.js` 这几个新文件（还没 commit，只是工作区改动），看起来是在迁"关联应用"弹窗和快捷键面板，中断前最后一条记录是"关联应用弹窗测试通过"。这份东西**没有经过完整验证**，接手人自己判断是继续、重做、还是直接丢弃（`git worktree remove --force` 那个目录即可丢弃）。
- 还没迁的弹窗（在 `index.html` 里搜这些 id 能找到）：`newAppModal`/`attachModal`（会话页关联应用）、`teamModal`（专家团配置）、`expertModal`/`expertEditModal`（专家详情/编辑）、`memberModal`（专家团场景加人，注意跟已迁移的协作人员管理加人弹窗是两个不同数据模型，别混）、`envModal` 及一串 `env*Modal`（5 个 ERP 环境弹窗）、`shortcutOverlay`（快捷键面板）。
- Phase 3（会话页 Chat View、协作开发页面本体、Design System、设置）**完全没开始**，还是 100% vanilla。
- 你自己在这期间也直接改过 vanilla 代码（协作开发导航改造、项目管理页签、成员身份/可见性），这些已经在 `feat/react-migration-v2` 分支里了（`a3196ab`、`19e2a34`、`ef794ef` 那几个提交），迁移的时候要连这部分一起处理，不是只对着 Phase 0/1/2 涉及的旧代码迁。

**怎么继续**：`npm install && npm run dev` 起本地开发；验证路由/部署相关的行为务必用 `npx wrangler dev`，不要只信 `npm run dev`（见 §10）。接着做的顺序建议：先决定上面那个半成品分支的去留，再按 §4 的 Phase 顺序把 Phase 2 剩下的弹窗做完，然后 Phase 3。

## 1. 试点结论（已落地）

在评估要不要上 React 之前，先在现有 vanilla 架构里做了一次最小试点：把「应用开发」「技能开发」「智能体开发」三个卡片网格从手工复制的静态 HTML，改成"数据数组 + 渲染函数 + 网格级事件委托"（[main.js:2178-2225](../src/scripts/main.js)、[main.js:4722-4838](../src/scripts/main.js)）。

**发现**：这类问题不是"完全没有组件"，而是**有一半已经是数据驱动的**（专家网格、协作项目卡片都是 `.map()` + 字符串拼接），但静态卡片区仍是手工复制。这种不一致直接导致了一个真实 bug——新建的智能体卡片用 `insertAdjacentHTML` 单独插入，从未被 `.app-card` 的点击绑定覆盖，**点了没反应**。改成"渲染函数 + 容器级事件委托"后顺带修复了它，且三个网格现在改一条数据就能同步全部卡片外观（例如这次顺手统一了"···"菜单，之前 7 张卡里只有 1 张有）。

这个试点验证了：**大部分"重复改"的痛点，不需要引入框架就能消除**——本质是把已有的"伪组件"模式（`renderExpertGrid`、`agentCardHtml` 那一套）铺开到全部静态区块。React 能解决的是另一类问题：状态和视图强绑定导致的心智负担、弹窗/表单这类有交互状态的组件、以及给 AI 更清晰的"改哪个文件=改哪个界面"的定位能力。

## 2. 为什么仍然值得迁移

- **视图切换是手写的显隐**：9 个 `.view` 靠 `classList.add/remove('hidden')` 切换，状态（当前选中项、搜索关键字、弹窗开关）散落在几十个模块级 `var` 里，没有统一数据流，AI 改一个交互经常要跨几百行找相关变量。
- **弹窗没有统一组件**：`modal` 相关 class 出现 92 处，每个弹窗是一段独立的显隐 + 表单读写逻辑，样式和行为都是复制来的，新增一个弹窗基本靠"抄最像的那个"。
- **CSS 层叠顺序是隐性耦合**：[README.md:48](../README.md) 明确写了"样式靠源码顺序生效，不敢拆文件"——这是全局 class 选择器没有作用域隔离的典型后果，React + CSS Modules/scoped class 能从根上解决。
- **单文件产物这个约束已经不存在了**：团队确认"双击打开本地 HTML"不再是硬要求，改走 Cloudflare Pages 部署（详见 §8.1）。这一版方案不再假设产物必须是单文件，`vite-plugin-singlefile`、`scripts/build-standalone.cjs` 都随之退休，直接用 Vite 标准的多文件产出。

## 3. 技术选型建议

| 项 | 建议 | 理由 |
| --- | --- | --- |
| 框架 | React 18 + Vite 官方 `@vitejs/plugin-react` | 已经在用 Vite，接入成本最低；生态和 AI 训练语料最成熟 |
| 语言 | 先 JS，不引入 TypeScript | 迁移期间已经有足够大的 diff，TS 的类型收益不值得叠加迁移成本；等结构稳定后再评估 |
| 状态管理 | `useState`/`useReducer` + 少量 Context（当前用户、当前视图） | 这个应用没有复杂的跨组件共享状态，Redux/Zustand 目前是过度设计 |
| 样式 | 保留 `tokens.css`（设计令牌不变），组件样式改用 CSS Modules 或 BEM 类名 + 按组件拆文件 | 消除层叠顺序耦合，同时不用推翻现有的设计令牌体系 |
| 产物模板 | `purchase-order.html`（`?raw` 导入）保持独立 HTML，继续用 iframe/字符串注入 | 它本来就是独立于应用 shell 的"单据预览"产物，没有 React 化的必要 |
| 构建 | 标准 `vite build` 多文件产出，部署到 Cloudflare Pages（`wrangler`） | 见 §8.1，`vite-plugin-singlefile` 已不需要 |
| 路由 | `react-router-dom`，`BrowserRouter` + 嵌套路由（**决策时写的是 HashRouter，实际落地时改成了 BrowserRouter，见 §0、§10**） | 见 §3.1 |
| 组件库 | **Ant Design 5（`antd`）**，不手写基础组件层 | 见 §3.2 |

### 3.1 路由与代码拆分

不迁就现在的实现（现有的 `?view=` query + localStorage 兜底是在"没有路由库"的前提下手搭的补丁，不是一个值得延续的设计），按业界标准做：引入 `react-router-dom`，用真正的路由树表达视图结构，而不是一个 `activeView` 字符串状态。

- **Hash 还是 Path，跟着部署目标重新定**：§8.1 确认了产物走 Cloudflare Pages 部署，不再是"双击打开的单文件"，之前"没有服务端 rewrite、只能用 hash"这条理由不成立了。Cloudflare Pages 对 SPA 有现成的 rewrite 支持（`_redirects` 一行 `/* /index.html 200`，或 `@cloudflare/vite-plugin` 自己的路由配置），配好之后 `<BrowserRouter>` + 干净的 `/agents` 这类 path 路由完全可行，也是更标准的做法（分享链接不带 `#`）。Phase 0 把这条 rewrite 规则配上并实测"直接访问 `/agents` 刷新页面不 404"，再定用 `BrowserRouter`；如果这一步配置起来比预期麻烦，`<HashRouter>` 仍然是零配置的保底选项，换的时候只需要换顶层组件，不影响下面的路由树写法。
- **路由树设计要为扩展留空间**，直接对应现有视图层级，同时让"新增一个视图/子页签"只需要加一行 `<Route>`：
  ```
  /              → 首页 / 新会话
  /chat/:id?     → 会话页
  /apps          → 应用开发
  /skills        → 技能开发
  /agents        → 智能体开发
  /collab/:project?/:tab  → 协作开发（任务管理/待评审/协作人员/专家管理/专家团管理/设置）
  /design/:component?     → Design System 目录（组件详情用 path 参数，不用 query）
  /settings
  ```
  项目、页签、组件详情这类"选了哪个"的状态用 `useParams` 读，不用 `useSearchParams` 或自造的 query 解析——路由库能处理的，不用手写。
- **代码拆分**：不再是单文件产物了（§8.1），`React.lazy` 按路由分包在 Cloudflare Pages 这种标准静态部署下是有真实下载层面收益的——但不用现在就做，先把 Phase 0/1 跑起来，等 Phase 3 那几个重页面（Chat View、协作开发）如果首屏明显变慢，再按路由分包，不用提前优化。`react-router-dom` 本身的路由匹配、嵌套 `<Outlet/>` 这些能力不依赖代码分包，正常用。

### 3.2 组件分层与抽象：基础层不自己写，用 Ant Design

上一版这里写的是"把 `view-design` 里现有的 37 个组件演示转正成自建 UI kit"——**改主意了，直接用 Ant Design 5，不再自己实现基础组件层**。理由很直接：

- **现有 Design System 目录本来就是抄 Ant Design 的**：37 个已建 + 43 个占位组件的清单（Button/Input/Select/Tabs/Modal/Tag/Avatar/Dropdown/Tooltip/Badge/Segmented/Space/Grid/Flex……），连"基础/布局/导航/数据录入/数据展示/反馈"六个分类都和 antd 官方文档的分类一模一样。也就是说这份"我们自己的组件规范"从命名到分类都在对齐 antd，真要重新实现一遍它的交互细节（键盘导航、焦点管理、弹层定位、动画），相当于重新发明一遍已经存在且被广泛验证过的轮子，性价比很低。
- **直接省掉 Phase 2 里最费工的部分**：92 处手写弹窗要迁移，费时间的从来不是"每个弹窗的表单字段"，是 Modal 本身的显隐动画、焦点陷阱、`Esc`/点击遮罩关闭这类通用能力——antd 的 `Modal`/`Drawer`/`Form` 把这些都做好了，迁移工作缩成"把每个弹窗的表单内容套进 antd 组件"，不用再写一遍这套基础设施。
- **43 个目前"disabled"（未建）的组件直接免费拿到**：Table、DatePicker、Popover、Cascader 这些如果以后业务用到，直接用 antd 现成的，不用因为"当时没做"临时手搭。
- **主题定制走 antd 5 的 token 机制**：`<ConfigProvider theme={{ token: {...} }}>` 能把颜色、圆角、间距这些映射成 antd 的设计 token，[tokens.css](../src/styles/tokens.css) 里现有的设计令牌基本可以对照搬过去，不用放弃"设计令牌单一来源"这条约定。

**要诚实说明的代价，不是"免费"**：

1. **视觉还原是真实工作量，不会自动到位**：现在这个应用的观感（彩色图标徽标卡片、聊天气泡、`ptag` 圆角标签）是自己的产品视觉语言，不是 antd 默认的企业中后台风格。主题 token 能覆盖颜色/圆角/间距这类基础维度，但密度、阴影语言、动效曲线这类细节大概率还需要针对具体组件做样式覆盖——这是一次真实的"重新蒙皮"工作，只是比从零手写交互逻辑省力得多，不能理解成"引入就长得一样"。
2. **产物体积会进一步增加**：antd 按 ESM 引入（`import { Button } from 'antd'`）能被 Vite 摇树，但比起裸 React，一个中量使用规模的 antd 应用通常还会再加几百 KB（gzip 后）体积，需要在 §5 重新估一次数字——不过既然已经是走 Cloudflare Pages 的标准多文件部署（§8.1），这个体积影响的是首屏加载而不是"塞不塞得进一个文件"，可以后续按需用 §3.1 提到的路由级代码分包缓解，不是阻塞项。
3. **图标不跟 antd 走**：`@ant-design/icons` 是实心/描边的企业风格图标，和现在这批仿 Lucide 细线条图标（`stroke-width="1.7"` 的线性风格）视觉体系不同。§8.7 的 `<Icon/>` 方案维持原计划，用 `lucide-react` 而不是 antd 自带图标，两者不冲突——antd 组件里需要图标的地方（比如 Modal 的关闭按钮）用 `icon` prop 传入自己的 `<Icon/>` 输出即可，antd 支持自定义图标节点。

调整后的分层：

1. **基础组件层**：直接是 `antd` 组件 + Phase 0 定的主题配置（`src/theme/antd-theme.js` 之类），不再有 `src/components/ui/` 这一层手写实现。
2. **复合/业务组件层（feature components）**：还是要自己写——`<AppCard/>`（试点已验证过数据结构）、`<ExpertCard/>`、`<TeamCard/>`、聊天气泡、`ptag` 标签——这些是 antd 没有对应物的产品语义组件，可以拿 antd 的 `Card`/`Tag` 做底层结构再重度定制样式，也可以就是普通 `div`。目录：`src/components/feature/`。
3. **视图/页面层**：9 个顶层视图 + 协作开发的 6 个子页签，只负责组数据、摆布局。目录：`src/views/`。

**验收标准不变**：哪个页面为了"长得像"又单独拼了一遍 antd 已经提供的交互（比如自己再写一个下拉搜索面板），就说明该用 antd 的地方没用上，要回去改，不能在页面层将就。

## 4. 迁移阶段（按风险从低到高排序）

1. **✅ Phase 0 · 脚手架**——已完成，见 §0。
2. **✅ Phase 1 · 业务卡片组件 + 静态列表页**——应用/技能/智能体开发三个卡片页已完成，见 §0；"专家管理""协作项目"当时决定不算在 Phase 1 里（原因见 §0），"协作项目"后来在 Phase 2 里顺手做了。
3. **🚧 Phase 2 · 弹窗系统（部分完成）**——协作开发那 7 个任务类弹窗已完成，见 §0；还有约 10 个弹窗没迁（新建应用/关联应用、专家团配置、专家详情/编辑、专家团场景加人、5 个 ERP 环境弹窗、快捷键面板），清单和一份未验证的半成品分支位置见 §0。原计划"92 处弹窗"这个数字没有细拆过，实迁下来发现按功能分组大概是 17-20 组，不是 92 个独立表单。
4. **⬜ Phase 3 · 复杂交互区**——还没开始。会话页（Chat View，含模型选择、应用关联下拉、历史记录面板、§8.3 的 contenteditable 输入框、§8.4 的 iframe 单据预览）、协作开发页面本体（任务/评审详情、导航、项目/工作区，注意这块中途已经被大改过一次，见 §0 最后一条）、Design System、设置页——这几块状态最多、边缘交互最多（滚动条延迟隐藏、预览面板拖拽），需要单独测试计划。
5. **⬜ Phase 4 · 收尾**——还没开始。登录鉴权、消息通知/`changelogData`、清理旧 `main.js` 中已迁移完的代码。

每个 Phase 完成后都应该单独跑一遍 `npm run build` + 关键路径的手工回归（登录、切视图、开一个弹窗、发一条消息），避免像 Chat View 这种重交互区域在迁移中途长期不可用。

## 5. 风险与应对

- **行为回归**：滚动条延迟隐藏、预览面板拖拽、下拉搜索的键盘导航这类"手写边缘逻辑"最容易在重写中丢失细节，建议每个 Phase 迁移前先列一份"现有交互清单"再对照验收。
- **双轨维护成本**：迁移期间新需求可能两头改。建议按 Phase 顺序推进，未迁移的模块继续用现有 vanilla 方式改，迁移完一个模块就不再回头改旧实现。
- **产物体积**：React + antd 会让首屏加载的 JS 明显变大，具体数字要在 Phase 0 接入后实测——走 Cloudflare Pages 部署（§8.1）之后这是个"首屏快不快"的问题，不是"塞不塞得下"的问题，可以后续按需用路由级代码分包（§3.1）缓解，不阻塞 Phase 0/1。
- **AGENTS.md 里的协作约定**：`changelogData`/`CHANGELOG.md` 的更新规则要在迁移期间继续遵守，迁移本身也应该按此文档要求的粒度记一条通知。

## 6. 工作量量级（非精确估时，供排期参考；已按引入 antd 调整）

- Phase 0：中（脚手架本身小，但新增了 antd 主题对照 `tokens.css` 搬一版 token 的工作，这部分决定后面所有阶段的视觉还原效率，值得多花时间一次做对）
- Phase 1：中（重复度高但模式统一，批量可复制试点做法；主要工作量从"写交互"变成"套 antd + 调样式"）
- Phase 2：中（92 处弹窗数量没变，但每个弹窗只需要迁表单内容，不用再造 Modal 基础设施，比自建组件时代的估计小了一截）
- Phase 3：大（Chat View、协作开发是目前 main.js 里逻辑最密集的两块，antd 能帮上的有限，这里仍是最大头）
- Phase 4：小

## 7. 视觉还原怎么验收

antd 主题定制不是"配完 token 就完事"，建议每个 Phase 都有一个可核对的验收方式，避免"看起来差不多"就合并：

- Phase 0 结束时，挑 3-5 个有代表性的界面元素（主按钮、卡片圆角阴影、输入框聚焦态）截图对照现有 `dist/index.html`，确认色值、圆角、间距和 `tokens.css` 里的值一致。
- 之后每个 Phase 迁移完对应界面，用 §8.8 提到的 Vitest 冒烟测试之外，再加一次人工截图对照，而不是只看"功能能不能点"。

## 8. 完整 React 化前的缺漏盘点

在"只做试点"和"路由怎么设计"之外，逐行翻了一遍 `main.js`/`index.html`，还有几处如果不提前定下来，会在迁移中途才炸出来。

### 8.1 产物还能不能双击打开——**已拍板：不需要了，改走 Cloudflare Pages 部署**

原来这里排了三个选项（`@vitejs/plugin-legacy` 配合 singlefile / 重写 `build-standalone.cjs` / 放弃双击改部署），一度以为选项 1 风险最低——**实测下来选项 1 没那么简单，而且已经不需要纠结了**，记录一下过程，避免以后又走回头路：

- **选项 1 实测失败**：`@vitejs/plugin-legacy` 默认"现代包 + nomodule 兼容包"双跑模式在 `file://` 下大概率不行——nomodule 脚本是否执行，浏览器看的是"是否原生支持 `type=module`"这个静态特性，跟 module 脚本是否真的加载成功无关；现代浏览器都支持 module，会跳过 nomodule 那份，等于该拦的还是被拦了，白屏。改配 `renderModernChunks:false` 想只出兼容包这一份，结果更糟：它改用 SystemJS 的 `data-src`（不是标准的 `src`）动态加载产物脚本，`vite-plugin-singlefile` 认不出这种写法去内联——构建日志显示"已内联"，但应用代码实际从产物里彻底丢失了，产物体积看着小很多但其实是空的。这个坑目前没有现成方案能绕开，要解决大概率得自己写一个不依赖 `vite-plugin-singlefile` 默认内联逻辑的后处理脚本，工作量不小。
- **背景变了，不用再啃这块硬骨头**：项目现在已经有 Cloudflare Pages 部署配置（`wrangler`，`package.json` 的 `deploy`/`preview` 脚本），团队确认"双击打开本地文件"不再是硬要求，往后 React 版走"部署到 Cloudflare Pages、分享链接"这条路线。

**结论（已确认）**：

- `vite.config.js` 里的 `@vitejs/plugin-legacy` 和 `vite-plugin-singlefile` 都不需要了，直接用标准的 `vite build` 产出（`<script type="module">`、按需代码分包），这正是 Cloudflare Pages 这类静态托管期望的形态，比硬塞进一个文件更简单也更利于缓存。
- `scripts/build-standalone.cjs` 正式退休（可以删除，或者保留但在文件顶部注明已废弃、不再被任何 npm script 引用）。
- `README.md` 里"构建产出单个可双击打开的 HTML"这条描述已经不准确，需要改成"构建产出静态站点，部署到 Cloudflare Pages"。
- 这也意味着 §3 技术选型表里"代码拆分没有收益"那条结论**只适用于旧的单文件目标**，标准部署形态下 `React.lazy` 按路由分包是有真实下载层面收益的，Phase 3 之后如果 Chat View/协作开发这些重页面觉得首屏变慢，可以按路由做代码分包，不用再有"反正都要塞一个文件"这层顾虑。

### 8.2 全局单例工具函数要变成 hook/Provider

`toast()`、`closeAll()`（点击外部关闭所有下拉/弹窗）、`positionPopover()`（气泡定位）现在是绑在具体 DOM 节点上的模块级函数，被到处直接调用。迁移后应该是 `<ToastProvider>`+`useToast()`、`useClickOutside()`、`usePopoverPosition()` 这类可组合的 hook，而不是继续留一个全局单例被到处 import——否则组件之间又会靠"共享全局函数"这种隐式耦合，等于把 vanilla 的老问题原样搬进 React。

### 8.3 两个 contenteditable 输入框不能直接用受控组件

[index.html:238](../index.html)、[index.html:375](../index.html) 的任务输入框、会话输入框都是 `contenteditable="true"`，不是 `<textarea>`。React 里 `contentEditable` + `value`/`onChange` 的"受控"写法会导致光标跳动、中文输入法组合输入错乱，是个已知坑。要用非受控模式：`ref` + 原生 `input`/`beforeinput` 事件读值，配合 `data-placeholder` 的 CSS 空状态占位，不能照搬其它表单项的受控组件模式。

### 8.4 iframe 单据预览是一块必须保持"命令式"的区域

[index.html:512](../index.html) 的 `#chatPreviewFrame` 直接操作 `contentDocument`（[main.js:788](../src/scripts/main.js)），包括往 iframe 里注入 `purchase-order.html` 模板、以及"选取元素"模式下往 iframe 内部文档挂监听、画高亮框。这块没法声明式化，只能包成一个用 `ref` 暴露命令式方法的组件（`<BillPreview ref={...}/>`，`imperativeHandle` 暴露 `setPickMode`/`reload` 之类的方法），迁移时要单独当成一个"非典型 React 组件"对待，不要硬套 props 驱动渲染。

### 8.5 Design System 目录页：改用 antd 之后，它的定位要重新定

`view-design` 里的组件演示（比如 `renderSelect()`，[main.js:3492](../src/scripts/main.js)）是为了在目录页里展示效果，**独立于**会话页里真正在用的"关联应用"下拉（`renderAppList` 那一套）单独实现的一份——这本身就是又一处"两份实现互相不同步"的重复源。既然 §3.2 改成基础组件层直接用 antd，这个目录页原本"给自建 UI kit 当文档"的存在理由就没了，有两个选项，需要你选：

1. **降级成"主题预览页"**：用 antd 真实组件 + 定制过的主题 token 渲染一遍，纯粹给团队看"我们的 antd 主题长什么样"，工作量远小于现在手写 37 份 demo（不用再自己实现交互，只是摆组件）。
2. **直接删掉**：antd 官方文档已经是权威的组件说明，团队不一定需要再维护一份内部目录页；如果有主题预览需求，用 antd 官方的 [Theme Editor](https://ant.design/theme-editor-cn) 或一个几十行的内部脚本就够。

不管选哪个，会话页的"关联应用"下拉都不再需要跟目录页对齐一份独立实现——这条重复本身随 antd 引入自动解决。

### 8.6 本地持久化状态清单（需要收敛成统一 hook）

现在散落着至少 9 处 `localStorage`/`sessionStorage` 读写，key 和用途都不统一：

| key | 用途 |
| --- | --- |
| `lingee_auth_session`（sessionStorage） | 登录态 |
| `lingee_remember_user` | 记住账号 |
| `changelog_read_ids` | 通知已读 id |
| `chatPreviewOpen`/`chatPreviewTab`/`chatPreviewWidth` | 预览面板开关/页签/拖拽宽度 |
| `sidebarCollapsed` | 侧边栏折叠 |
| `build_tasks` | 构建任务列表 |
| `TEAM_STORE_KEY`（专家团数据） | 自建专家团持久化 |
| 设置页各分区的动态 `key` | 每个可折叠分区的展开状态 |

（`lingeeUrlState` 这一条会随 §3.1 的路由改造一起消失，不用带过去。）建议做一个 `usePersistedState(key, initial)` hook 统一读写，而不是继续在各处直接调用 `localStorage.setItem`。

### 8.7 几百处内联 SVG 图标字符串，和卡片是同一类问题

卡片数据里 `icon:'<svg ...>...</svg>'` 这种写法（这次试点里也这么写了，为了跟现有风格保持一致）在真正 React 化时不应该继续——应该抽成一个 `<Icon name="pencil"/>` 组件 + 图标注册表，图标改一处生效全局，也方便以后接入正经图标库（Lucide 之类，这个项目的图标风格本来就是照抄 Lucide 的）。这是和"卡片重复"同源的问题，值得在 Phase 0/1 一起处理，不要迁移完卡片又把图标字符串原样焊死在新组件里。

### 8.8 没有测试、没有 ESLint

现在整个项目零测试、零 lint（只有 Prettier 管格式）。全量重写 6500+ 行逻辑，没有任何自动化回归手段，只能靠人工点一遍——建议至少：

- 接入 ESLint + `eslint-plugin-react-hooks`：这条尤其重要，因为迁移大量是 AI 辅助写的，hooks 依赖数组写错是最常见也最隐蔽的 bug 类型，lint 能在写完当场就抓到，不用等人肉回归发现。
- 用 Vitest + React Testing Library 给几个关键路径补冒烟测试（登录、视图切换、弹窗开关、卡片网格渲染），不追求覆盖率，只保证每个 Phase 合完不是靠肉眼看有没有崩。

### 8.9 `fullAppData` 和 `APPS_LIBRARY` 是两个概念，别合并

试点里新增的 `APPS_LIBRARY`（应用开发页的卡片）和原有的 `fullAppData`（会话页"关联应用"下拉的全量应用台账）字段形状不同、用途也不同——前者是"我在开发的应用"展示卡片，后者是"公司全部已上线应用"的关联选择列表，只是恰好都叫"应用"。真正建 React 数据层时容易想当然合并成一个 `apps` 数据源，要注意这是两个业务概念，不能合并。

## 10. 踩过的坑（继续开发前建议读一遍，都是实测出来的，不是理论推测）

1. **本地 `main` 落后 `origin/main` 是真实发生过的事故源头**：Phase 0 开工前没先 `git fetch` 确认本地分支是不是最新，导致迁移分支和另一批同事已经推上去的功能（专家团审核节点、连接器能力等）分叉，事后靠重新在最新 `origin/main` 上建分支、挑拣式补回关键改动才解决。**教训：任何一次新的大改动开工前，先 `git fetch origin && git log main..origin/main` 确认本地是不是最新。**
2. **后台/子会话跑迁移任务时，先确认它的 worktree 基线**：这个仓库用到的自动建 worktree 机制，出现过"选到 origin/main 而不是本地最新分支"的情况，导致整整一段工作建立在错误的、更旧的基线上，事后要额外做分支合并/挑拣才能救回来。**教训：交给任何后台任务做迁移之前，明确要求它第一步先核实 `git log --oneline -1` 是不是预期的基线提交，不对就先合并到正确基线再动手，不要在错误基线上做完了才发现。**
3. **`@cloudflare/vite-plugin` 的开发服务器行为和纯 `vite dev` 不一样**：它按 Workers 静态资源路由处理请求，默认对"不认识的路径"直接 404，不会退回 `index.html`。这曾经导致两次白屏：一次是 `vite.config.js` 里遗留的 `base: '/lingee/'` 子路径配置让首页都进不去（改成 `base: '/'` 解决），一次是所有非根路径刷新/直接访问都白屏（加 [wrangler.json](../wrangler.json) 的 `assets.not_found_handling: "single-page-application"` 解决）。**教训：验证路由/部署相关的改动必须用 `npx wrangler dev`，不能只用 `npm run dev`——后者不会暴露这类问题。**
4. **`history.replaceState()` 不会触发 `popstate`，`BrowserRouter` 靠这个事件才知道要重新渲染**：vanilla 的 `showView()` 一直用 `history.replaceState()` 改 URL（因为要兼容"不刷新页面切视图"），改用 `BrowserRouter` 之后如果不做处理，从 vanilla 侧连续切换两个 React 路由（比如应用开发→智能体开发）时 URL 会变但页面内容不变，卡在上一个视图。解法是在触发 React 视图切换的地方手动 `window.dispatchEvent(new PopStateEvent('popstate'))`，具体实现见 `main.js` 里 `setUrlState` 的 `notifyReactRouter` 参数。
5. **内联 `onclick="xxxFn()"` 调用的函数必须显式挂在 `window` 上**：`main.js` 是一个大 IIFE，`function xxxFn(){}` 声明默认是 IIFE 内部作用域，HTML 字符串里 `onclick="xxxFn()"` 这种写法是在全局作用域执行的，找不到会直接 `ReferenceError`。文件末尾有一段专门"内联事件用到的函数挂到 window"的列表——凡是新写的函数会被 vanilla HTML 字符串用 `onclick=` 调用，或者反过来 React 组件要用字符串形式调用 vanilla 函数，都要检查并加进这个列表。这个坑在 Phase 1 和 Phase 2 都各踩过一次一模一样的，读代码看不出来，只有点击时才会报错，**每次新增这类调用后必须实际点击测试**。
6. **`eslint .` 会扫到不该扫的地方**：跑过 `npx wrangler dev` 之后会生成 `.wrangler/` 临时目录，跑过后台迁移任务的 worktree 也会留在 `.claude/worktrees/` 下，这两个目录都会被 `eslint .` 扫进去刷出一堆无关噪音（`.wrangler/` 里的 Worker bundle 用了 `console`/`Response` 这些 Node/Workers 全局量，`.claude/worktrees/` 里可能是别的分支状态的代码）。已经在 [eslint.config.js](../eslint.config.js) 的 `ignores` 里加了 `.wrangler/**` 和 `.claude/**`，如果又刷出一堆看起来不相关的报错，先检查是不是又有新的这类目录没加进去。

## 11. 下一步

Phase 0/1/2（部分）已经按上面 §0 的状态交接了。接下来按 §4 的顺序：先处理 §0 提到的那个未验证半成品分支（继续/重做/丢弃三选一），补完 Phase 2 剩下的约 10 个弹窗，再开始 Phase 3（会话页、协作开发页面本体、Design System、设置——工作量最大的一块，§6 早就标了"大"）。每个 Phase 的验证方式、硬约束（不能出现迁移到一半某个视图打不开）沿用前面几个 Phase 已经验证过有效的做法：一个一个迁、每迁完一个就用 `npx wrangler dev` + 真实测试账号在浏览器里实际点一遍，不是读代码觉得"应该没问题"就算完。

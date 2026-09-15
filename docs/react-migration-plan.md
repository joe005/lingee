# React 化迁移方案

| | |
| --- | --- |
| 版本 | v0.1（草案） |
| 日期 | 2026-09-15 |
| 背景 | 应用开发 / 技能开发 / 智能体开发三个卡片网格的重复标记问题，见本文 §1 试点 |
| 现状代码量 | `index.html` ~2200 行，`src/scripts/main.js` ~6500 行（单个 IIFE，`var`/`$`/`$$`） |

---

## 1. 试点结论（已落地）

在评估要不要上 React 之前，先在现有 vanilla 架构里做了一次最小试点：把「应用开发」「技能开发」「智能体开发」三个卡片网格从手工复制的静态 HTML，改成"数据数组 + 渲染函数 + 网格级事件委托"（[main.js:2178-2225](../src/scripts/main.js)、[main.js:4722-4838](../src/scripts/main.js)）。

**发现**：这类问题不是"完全没有组件"，而是**有一半已经是数据驱动的**（专家网格、协作项目卡片都是 `.map()` + 字符串拼接），但静态卡片区仍是手工复制。这种不一致直接导致了一个真实 bug——新建的智能体卡片用 `insertAdjacentHTML` 单独插入，从未被 `.app-card` 的点击绑定覆盖，**点了没反应**。改成"渲染函数 + 容器级事件委托"后顺带修复了它，且三个网格现在改一条数据就能同步全部卡片外观（例如这次顺手统一了"···"菜单，之前 7 张卡里只有 1 张有）。

这个试点验证了：**大部分"重复改"的痛点，不需要引入框架就能消除**——本质是把已有的"伪组件"模式（`renderExpertGrid`、`agentCardHtml` 那一套）铺开到全部静态区块。React 能解决的是另一类问题：状态和视图强绑定导致的心智负担、弹窗/表单这类有交互状态的组件、以及给 AI 更清晰的"改哪个文件=改哪个界面"的定位能力。

## 2. 为什么仍然值得迁移

- **视图切换是手写的显隐**：9 个 `.view` 靠 `classList.add/remove('hidden')` 切换，状态（当前选中项、搜索关键字、弹窗开关）散落在几十个模块级 `var` 里，没有统一数据流，AI 改一个交互经常要跨几百行找相关变量。
- **弹窗没有统一组件**：`modal` 相关 class 出现 92 处，每个弹窗是一段独立的显隐 + 表单读写逻辑，样式和行为都是复制来的，新增一个弹窗基本靠"抄最像的那个"。
- **CSS 层叠顺序是隐性耦合**：[README.md:48](../README.md) 明确写了"样式靠源码顺序生效，不敢拆文件"——这是全局 class 选择器没有作用域隔离的典型后果，React + CSS Modules/scoped class 能从根上解决。
- **单文件产物这个约束不是障碍，但"双击可开"需要额外处理**：`vite-plugin-singlefile` 对 React 项目同样适用，能产出一个 `dist/index.html`；但它默认仍是 `<script type="module">`，在 `file://` 协议下会被浏览器按 CORS 拦截、直接不执行——现在能双击打开，靠的是 `npm run standalone`（[scripts/build-standalone.cjs](../scripts/build-standalone.cjs)）额外做的一次正则改写，把 module script 转成普通内联 script。这个脚本是按现在源码的语法形状写的正则，换成 React/JSX 后必然失效，见 §8.1。

## 3. 技术选型建议

| 项 | 建议 | 理由 |
| --- | --- | --- |
| 框架 | React 18 + Vite 官方 `@vitejs/plugin-react` | 已经在用 Vite，接入成本最低；生态和 AI 训练语料最成熟 |
| 语言 | 先 JS，不引入 TypeScript | 迁移期间已经有足够大的 diff，TS 的类型收益不值得叠加迁移成本；等结构稳定后再评估 |
| 状态管理 | `useState`/`useReducer` + 少量 Context（当前用户、当前视图） | 这个应用没有复杂的跨组件共享状态，Redux/Zustand 目前是过度设计 |
| 样式 | 保留 `tokens.css`（设计令牌不变），组件样式改用 CSS Modules 或 BEM 类名 + 按组件拆文件 | 消除层叠顺序耦合，同时不用推翻现有的设计令牌体系 |
| 产物模板 | `purchase-order.html`（`?raw` 导入）保持独立 HTML，继续用 iframe/字符串注入 | 它本来就是独立于应用 shell 的"单据预览"产物，没有 React 化的必要 |
| 构建 | 继续用 `vite-plugin-singlefile` | 见 §8.1 的产物可执行性方案 |
| 路由 | `react-router-dom`，`HashRouter` + 嵌套路由 | 见 §3.1 |
| 组件库 | **Ant Design 5（`antd`）**，不手写基础组件层 | 见 §3.2 |

### 3.1 路由与代码拆分

不迁就现在的实现（现有的 `?view=` query + localStorage 兜底是在"没有路由库"的前提下手搭的补丁，不是一个值得延续的设计），按业界标准做：引入 `react-router-dom`，用真正的路由树表达视图结构，而不是一个 `activeView` 字符串状态。

- **用 Hash 而不是 Path**：这不是迁就旧实现，是这个产物形态本身决定的——单文件/`file://` 双击打开、或丢到没有 rewrite 规则的静态服务器上，`/agents` 这类 path 路由刷新即 404；`#/agents` 这类 hash 路由不需要服务端配合，天然适配"零后端"的分发方式，GitHub Pages 一类的静态站点也是这个做法。用 `<HashRouter>`，往后要不要换成 `<BrowserRouter>`（比如以后真的上了服务端、有 rewrite 规则）只是换一个顶层组件，不影响下面的路由树写法。
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
- **代码拆分**：`vite.config.js` 里 `vite-plugin-singlefile` + `inlineDynamicImports:true` 的目的就是把所有动态 import 强制内联回一个文件，双击打开零网络请求。`React.lazy` 按路由分包在这个构建目标下**没有下载层面的收益**——产物仍然是一次性同步解析的单文件。唯一还有意义的是"未打开的视图不预挂载"这种运行时优化，价值有限，不单独作为迁移阶段；`react-router-dom` 本身的路由匹配、嵌套 `<Outlet/>` 这些能力不依赖代码分包，正常用。

### 3.2 组件分层与抽象：基础层不自己写，用 Ant Design

上一版这里写的是"把 `view-design` 里现有的 37 个组件演示转正成自建 UI kit"——**改主意了，直接用 Ant Design 5，不再自己实现基础组件层**。理由很直接：

- **现有 Design System 目录本来就是抄 Ant Design 的**：37 个已建 + 43 个占位组件的清单（Button/Input/Select/Tabs/Modal/Tag/Avatar/Dropdown/Tooltip/Badge/Segmented/Space/Grid/Flex……），连"基础/布局/导航/数据录入/数据展示/反馈"六个分类都和 antd 官方文档的分类一模一样。也就是说这份"我们自己的组件规范"从命名到分类都在对齐 antd，真要重新实现一遍它的交互细节（键盘导航、焦点管理、弹层定位、动画），相当于重新发明一遍已经存在且被广泛验证过的轮子，性价比很低。
- **直接省掉 Phase 2 里最费工的部分**：92 处手写弹窗要迁移，费时间的从来不是"每个弹窗的表单字段"，是 Modal 本身的显隐动画、焦点陷阱、`Esc`/点击遮罩关闭这类通用能力——antd 的 `Modal`/`Drawer`/`Form` 把这些都做好了，迁移工作缩成"把每个弹窗的表单内容套进 antd 组件"，不用再写一遍这套基础设施。
- **43 个目前"disabled"（未建）的组件直接免费拿到**：Table、DatePicker、Popover、Cascader 这些如果以后业务用到，直接用 antd 现成的，不用因为"当时没做"临时手搭。
- **主题定制走 antd 5 的 token 机制**：`<ConfigProvider theme={{ token: {...} }}>` 能把颜色、圆角、间距这些映射成 antd 的设计 token，[tokens.css](../src/styles/tokens.css) 里现有的设计令牌基本可以对照搬过去，不用放弃"设计令牌单一来源"这条约定。

**要诚实说明的代价，不是"免费"**：

1. **视觉还原是真实工作量，不会自动到位**：现在这个应用的观感（彩色图标徽标卡片、聊天气泡、`ptag` 圆角标签）是自己的产品视觉语言，不是 antd 默认的企业中后台风格。主题 token 能覆盖颜色/圆角/间距这类基础维度，但密度、阴影语言、动效曲线这类细节大概率还需要针对具体组件做样式覆盖——这是一次真实的"重新蒙皮"工作，只是比从零手写交互逻辑省力得多，不能理解成"引入就长得一样"。
2. **产物体积会进一步增加**：antd 按 ESM 引入（`import { Button } from 'antd'`）能被 Vite 摇树，但比起裸 React，一个中量使用规模的 antd 应用通常还会再加几百 KB（gzip 后）体积，需要在 §5 重新估一次数字，而且要确认 §8.1 选的 `@vitejs/plugin-legacy` 路线对 antd 的按需加载兼容（社区有先例，但要在 Phase 0 实测，不能假设）。
3. **图标不跟 antd 走**：`@ant-design/icons` 是实心/描边的企业风格图标，和现在这批仿 Lucide 细线条图标（`stroke-width="1.7"` 的线性风格）视觉体系不同。§8.7 的 `<Icon/>` 方案维持原计划，用 `lucide-react` 而不是 antd 自带图标，两者不冲突——antd 组件里需要图标的地方（比如 Modal 的关闭按钮）用 `icon` prop 传入自己的 `<Icon/>` 输出即可，antd 支持自定义图标节点。

调整后的分层：

1. **基础组件层**：直接是 `antd` 组件 + Phase 0 定的主题配置（`src/theme/antd-theme.js` 之类），不再有 `src/components/ui/` 这一层手写实现。
2. **复合/业务组件层（feature components）**：还是要自己写——`<AppCard/>`（试点已验证过数据结构）、`<ExpertCard/>`、`<TeamCard/>`、聊天气泡、`ptag` 标签——这些是 antd 没有对应物的产品语义组件，可以拿 antd 的 `Card`/`Tag` 做底层结构再重度定制样式，也可以就是普通 `div`。目录：`src/components/feature/`。
3. **视图/页面层**：9 个顶层视图 + 协作开发的 6 个子页签，只负责组数据、摆布局。目录：`src/views/`。

**验收标准不变**：哪个页面为了"长得像"又单独拼了一遍 antd 已经提供的交互（比如自己再写一个下拉搜索面板），就说明该用 antd 的地方没用上，要回去改，不能在页面层将就。

## 4. 迁移阶段（按风险从低到高排序）

1. **Phase 0 · 脚手架**：接入 `@vitejs/plugin-react` + `antd`，先确认 §8.1 的产物可执行性方案（并实测 antd 按需加载和这个方案兼容）；搭 `<App/>` 壳 + `react-router-dom`（`HashRouter` + §3.1 的路由树）+ `<ConfigProvider theme={...}>` 主题配置（对照 [tokens.css](../src/styles/tokens.css) 搬一版 antd token）；侧边栏、登录页先原样搬（结构简单、不依赖复杂状态）；同时把 §8.6 的本地持久化清单收敛成一个 `usePersistedState` hook，把 §8.7 的高频图标接入 `lucide-react` + `<Icon/>`；接入 ESLint + `eslint-plugin-react-hooks`（§8.8）。
2. **Phase 1 · 业务卡片组件 + 静态列表页**：用 antd 的 `Card`/`Tag`/`Avatar` 拼出 §3.2 的业务组件层（`<AppCard/>` 等），迁应用开发 / 技能开发 / 智能体开发 / 专家管理 / 协作项目——这几个已经在试点里验证过数据结构，风险最低、收益最直观，也是验证"主题还原得像不像"的第一个检查点。
3. **Phase 2 · 弹窗系统**：直接用 antd 的 `Modal`/`Drawer`/`Form`，把现有 92 处手写弹窗的表单内容逐个套进去（新建项目、任务同步、评审、专家团配置……）——显隐动画、焦点管理、关闭交互都是 antd 自带的，这个阶段的工作量比自建 Modal 时代估的小很多，重点是表单字段和校验逻辑的迁移，不是重新搭弹窗基础设施。
4. **Phase 3 · 复杂交互区**：会话页（Chat View，含模型选择、应用关联下拉、历史记录面板、§8.3 的 contenteditable 输入框、§8.4 的 iframe 单据预览）、协作开发的任务/评审详情、设置页——这几块状态最多、边缘交互最多（滚动条延迟隐藏、预览面板拖拽），需要单独测试计划。
5. **Phase 4 · 收尾**：登录鉴权、消息通知/`changelogData`、清理旧 `main.js` 中已迁移完的代码。

每个 Phase 完成后都应该单独跑一遍 `npm run build` + 关键路径的手工回归（登录、切视图、开一个弹窗、发一条消息），避免像 Chat View 这种重交互区域在迁移中途长期不可用。

## 5. 风险与应对

- **行为回归**：滚动条延迟隐藏、预览面板拖拽、下拉搜索的键盘导航这类"手写边缘逻辑"最容易在重写中丢失细节，建议每个 Phase 迁移前先列一份"现有交互清单"再对照验收。
- **双轨维护成本**：迁移期间新需求可能两头改。建议按 Phase 顺序推进，未迁移的模块继续用现有 vanilla 方式改，迁移完一个模块就不再回头改旧实现。
- **产物体积**：React 运行时本身会让 `dist/index.html` 从当前 ~628KB 涨到大致 750-800KB；引入 `antd` 后（哪怕按需引入、Vite 摇树）还会再叠加数百 KB gzip 级别的体积，具体数字要在 Phase 0 接入后实测——对"双击打开的演示文件"这个场景基本无感，但如果以后要用低配置设备演示，或者 §8.1 选的方案对按需加载支持不好导致摇树失效，需要提前留意。
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

### 8.1 产物还能不能双击打开（最高优先级，必须先拍板）

`npm run build`（`vite build`）产出的 `dist/index.html` 里是 `<script type="module">`，`file://` 协议下浏览器会因为 CORS 直接不执行——现在能双击打开靠的是另一条腿 `npm run standalone`（[scripts/build-standalone.cjs](../scripts/build-standalone.cjs)），一个按现在源码语法形状写的正则脚本，把 `<link>` 换成内联 `<style>`、把 `type="module"` 换成普通 `<script>`。换成 React/JSX 产物后这个正则必然对不上。三选一，需要你确认：

1. **用 `@vitejs/plugin-legacy` 配合 `vite-plugin-singlefile`**：产出一份 nomodule/SystemJS 兼容包，天然能在 `file://` 下跑，之后可以退休 `build-standalone.cjs`。这是社区里 `vite-plugin-singlefile` 文档推荐的组合，风险最低。
2. **重写 `build-standalone.cjs`**：继续维护一个独立的后处理脚本，但要基于 React 构建产物（而不是正则匹配源文件语法），维护成本长期存在。
3. **放弃"双击打开"，改成"必须起个静态服务器"**：`npm run preview` 或扔到任意静态托管。如果分发场景其实都是给同事一个内网/静态站点链接而不是真的甩文件，这条最省事，但要先确认这确实是可接受的分发方式变化。

不选 1，Phase 0 都不能算完成——这是唯一一个"选错要推倒重来"的决定，建议现在就定。

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

## 9. 下一步

建议从 **Phase 0 + Phase 1** 开始一次可验证的迁移，产出后再评估继续推进的节奏——而不是一次性把 6500 行 `main.js` 全部推倒重来。Phase 0 开工前有两件事需要你确认：

1. §8.1：产物用哪种方式继续支持双击打开（推荐 `@vitejs/plugin-legacy`）。
2. §3.2：认不认引入 `antd` 这个方向——如果认，Phase 0 要多做一步"对照 `tokens.css` 搬一版 antd 主题 token"，这步做扎实了，后面每个 Phase 的视觉还原成本都会低很多。

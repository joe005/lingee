

## Repo Wiki

Auto-generated Wiki documentation (32 pages) is available at `.lingeebuild/repowiki/zh/content`.
> Lingee 高保真交互原型，构建为单个可独立打开的 HTML 文件

### Key Files

- Project overview: `.lingeebuild/repowiki/zh/content/index.md`
- Architecture design: `.lingeebuild/repowiki/zh/content/architecture.md`
- Reading guide: `.lingeebuild/repowiki/zh/content/reading-guide.md`
- Recent Git changes: `.lingeebuild/repowiki/zh/content/git-changes/index.md`
- Wiki usage guide: `.lingeebuild/repowiki/zh/content/wiki-guide.md`
- Source-to-doc mapping (JSON): `.lingeebuild/repowiki/zh/content/index.json`

### Categories

- 项目总览
- 认证与授权
- 性能优化
- 开发指南

### Usage

Consult the wiki when working on features, debugging, or onboarding to a new area of the codebase.

1. **Start here**: Read `index.md` and `architecture.md` first for high-level project understanding
2. **By source file**: Look up `fileToPages` in `index.json` to find the wiki page for a specific source file
3. **By topic**: Scan `categories` and page `title`/`description` in `index.json` to find docs by business domain or concept
4. Read the relevant wiki page for business context and architecture notes before making changes

## Collaboration Rules

### 需求文档同步

`docs/README.md` 是功能需求文档入口，按模块维护：登录权限、任务、项目协作、智能体与智能体团队、管理平台、设置。新增或修改页面交互时，同一提交必须同步更新对应模块文档；只改样式且不改变交互时可不更新。文档只记录目标、入口、主要状态、关键流程和原型边界，保持简洁；专题演示或历史说明放在现有独立文档中，不复制到模块文档。

提交代码时检查对应 `docs/*.md` 是否同步；若本次修改没有对应交互变化，在提交说明中注明“文档无需更新”。

### 原型界面设计 Skill（项目级）

新增或修改原型界面时，必须先读取并使用
[lingee-prototype-design](.agents/skills/lingee-prototype-design/SKILL.md)，
由该 skill 指导布局、控件选择、样式与交互状态，再落实到对应页面源码。
触发范围包括页面、弹窗、表单、列表、卡片和局部 UI 调整，无需用户重复点名；
纯数据逻辑、服务配置或文档修改不触发。也可通过 `$lingee-prototype-design` 显式调用。

以用户当前要求和项目现有设计令牌、共享组件为依据，不套用无关视觉风格。
skill 入口未出现在可用列表时，直接读取上述文件执行；验证仍遵守本文件的
「开发后验证方式」，不得因设计任务自动启动浏览器。

### 项目级设计规范

新增或修改原型界面前，必须先读取根目录的 [DESIGN.md](DESIGN.md)，并将其作为
AI 编程代理的项目级视觉与交互依据。实现时以 `src/styles/tokens.css`、目标页面
当前实现和共享组件为最终事实来源；若规范与现有源码不一致，先修正规范或明确
本次局部例外，不得自行引入另一套视觉体系。只修改文档、数据逻辑或服务配置时，
不要求读取 DESIGN.md。DESIGN.md 只写令牌、刻度和组件索引，改界面的流程写在上面的
skill 里，两处不重复；改 `tokens.css` 时同步改 DESIGN.md 色值表，`npm run check`
会比对两者。

### 源码结构（2026-09-16 拆分后）

原来的单文件 `src/scripts/main.js`（6515 行）与 `index.html`（2310 行）已按
功能拆开，改动前先读 [README.md](README.md) 的「源码结构」与「注意事项」。
三条硬约束：

1. `src/styles/app.css` 里的 `@import` 顺序等于拆分前的行顺序，**不可调整**
2. 模块只放声明，副作用放进导出的 `init*()`，由 `src/scripts/main.js` 按
   原始顺序调用；入口里的行号注释指向拆分前的位置
3. 跨模块写共享状态要走 `set_xxx()`——ES 的 import 绑定只读

改完跑 `npm run check`（模块自检与设计规范自检）再跑 `npm run build`。

### 全工程的页面隔离与多人协作

整个工程按页面划分源码归属。每个页面的主体 HTML、专属 CSS 和交互 JS
分别放在独立文件中；页面内可独立开发的子页面或功能区也按同一原则拆分。
弹窗归属到对应页面或功能，避免多个页面长期共用一份可频繁修改的文件。
只有确实跨页面复用的导航、状态、组件和样式才放在共享模块中。

1. 页面容器只负责导航、布局和按现有 DOM 顺序引入页面片段；页面内容放在
   `src/views/` 的对应片段中，弹窗放在 `src/modals/` 的对应片段中。
2. 页面样式放在 `src/styles/parts/` 的对应文件中，选择器限定作用范围，
   避免影响其他页面；公共样式集中维护。新增样式遵守现有 `@import` 层叠顺序。
3. 页面行为放在 `src/scripts/features/` 的对应模块中；共享数据、导航和跨页
   跳转通过明确的公共接口协作，不让页面模块直接修改其他页面的内部状态或 DOM。
4. 并行开发前先确认 HTML、CSS、JS 和弹窗的文件归属及共享接口。现有页面
   如仍混在共享文件中，先按归属拆分再分配给不同同事；合并后运行
   `npm run check`、`npm run build`，并核对受影响页面与跨页流程。

源码按页面隔离，构建产物 `dist/index.html` 仍保持可独立打开的单文件；
拆分时保留现有 DOM id、URL 和初始化顺序。

### 协作开发页面文件归属

- 工作台：`src/views/collab/workbench*.html`、`src/modals/collab/workbench.html`、
  `src/styles/parts/collab/*workbench*.css`、`src/scripts/features/collab/` 的任务模块。
- 项目：`src/views/collab/projects.html`、`src/modals/collab/projects.html`、
  `src/styles/parts/collab/*projects*.css`、`project-view.js` 与 `projects.js`。
- 专家与智能体团队：各自的 `src/views/collab/` 片段；专家卡片样式在
  `src/styles/parts/collab/*experts*.css`，智能体团队列表复用 `apps` 样式及
  `src/scripts/features/expert/` 模块。
- 设置：`src/views/collab/settings.html`、`src/modals/collab/settings.html`、
  `src/styles/parts/collab/*settings*.css`、`persons.js`、`config.js`。历史团队数据迁移保留在 `squads.js`。
- 共享导航与容器留在 `src/views/collab.html`；共享 CSS 文件名带 `shared`，
  `src/styles/parts/collab.css` 的导入顺序保留原有层叠关系。`data.js`、
  `view.js`、`index.js` 是跨页模块，修改前先确认接口影响。

### 废弃页面归档规则

「废弃页面」入口下的旧版页面和对应备份文件是归档快照，包括
`src/views/backup/`、`src/modals/backup/`、`src/styles/parts/collab/backup/`
及 `src/views/collab/tasks-legacy.html`；旧任务页专属的
`src/scripts/features/collab/task-board.js` 和 `src/styles/parts/collab/12-workbench-detail.css`
也按归档代码处理。迭代新版页面时禁止顺带修改、同步功能、
样式或模拟数据到这些归档文件；需要保留历史版本的原貌。只有用户明确要求维护
废弃页面时才可修改，并在改动前核对具体归档文件及共享模块对旧页的影响。

### 开发后验证方式

本项目完成开发后，禁止自动使用浏览器操作 Agent 验证页面。按工程要求运行
`npm run check` 和 `npm run build`，必要时补充非浏览器的静态或命令行检查；
页面操作验证由用户明确要求时再进行。变更记录不属于日常验证范围，
只在提交推送时按下节处理。

### 变更记录：仅在提交推送时更新

`CHANGELOG.md` 和 `src/scripts/features/changelog.js`（页面内的「更新日志」消息通知）
是同一份变更说明的两个落点，只在用户要求提交推送的那次操作里一起写，平时不动。

1. 日常修改任务不读、不写、不预留这两处：功能开发、调试、重构、样式调整的过程中
   都不追加记录，收尾只跑 `npm run check` 和 `npm run build`，避免拉长任务时间。
2. 一次推送聚合成一条记录，范围取本次待推送的提交（如 `git log origin/main..HEAD`），
   不逐条罗列 commit；更新人按提交者填写，同一更新人同一天的多次变更合并为一条。
3. 说明文案只写一句，两处共用：`CHANGELOG.md` 表格的「变更内容」列与 `changelog.js`
   的 `body` 使用同一句摘要；`body` 写成 `<标题>：<同一句摘要>`，标题由 `type` 和
   `module` 组合而成，不另起文案，不再使用 `1. 2. 3.` 编号加 `<br>` 换行的罗列格式。
4. 版本号遵循 SemVer：MAJOR 对应不兼容变更、MINOR 对应新功能、PATCH 对应修复与优化。
5. `changelog.js` 新增条目分配递增 `id`，并在同文件的 `changelogIcons` 中补对应图标，
   日期使用当天日期。
6. 只记录核心功能变更，小 BUG 修复与细节调整不记录；若本次推送全是这类小事，
   两处都不新增内容，直接提交推送。
7. 顺序为先写两处记录，再跑 `npm run check` 和 `npm run build`，然后连同代码改动
   一起提交并推送，保证记录与代码在同一次推送内；不要在推送之后再补一次提交。
8. `CHANGELOG.md` 配了 git union 合并（`.gitattributes`），两人同时在表格顶部加行时会自动保留双方；
   `changelog.js` 仍可能冲突，冲突时两条都保留并把后合入的 `id` 改成下一个号。

### 多人协作约定

1. 开工前先 `git pull`，提交前再拉一次；提交只 `git add` 自己改的文件，不要 `git add -A`
   把同事未提交的修改带上。
2. 以下是跨页共享文件，改之前在群里说一声，改动尽量小且单独提交：
   `src/scripts/main.js`、`src/styles/app.css`、`src/views/sidebar.html`、
   `src/scripts/features/tasks-v2/data.js`、`src/scripts/features/collab/data.js`、
   `src/scripts/features/manager/data.js`、`src/styles/tokens.css`。
3. 页面之间只通过数据模块导出的函数和 `lingee:*` 自定义事件协作，不直接改别的页面的
   DOM 或内部状态；需要新的跨页接口时在对应 data.js 里加导出函数。
4. 两个大页面已按区域拆分，改动放进对应文件，不要再往入口文件里堆代码：
   - 任务页：`src/scripts/features/tasks-v2/index.js` 只做初始化，代码在 `tasks-v2/page/` 下
     （`render.js` 看板与列表、`detail-panel.js` / `subtasks.js` 详情、`form-modal.js` 新建编辑、
     `filters.js` 筛选排序、`events-*.js` 各区域事件等，文件头有说明）。跨模块共享且会被重新赋值的
     变量挂在 `page/page-state.js` 的 `pageState` 上，新增这类变量也放这里。
   - 管理板块样式：`src/styles/parts/manager.css` 只按顺序引入 `parts/manager/01..13-*.css`，
     编号即层叠顺序；新规则放进对应界面文件，需要覆盖前面规则时放编号更大的文件。
5. 合并遇到冲突且涉及同事的业务取舍（文案、阶段、字段口径）时，不要替对方决定，
   保留对方改动（如 `git stash`）并告知对方。

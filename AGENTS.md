

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

### 消息通知同步更新

每次实质性功能变更后，需在 `src/scripts/features/changelog.js` 的 `changelogData` 数组中新增一条消息通知。规范：

1. 仅记录核心功能变更，小 BUG 修复及细节调整不记录
2. 描述精炼为一句，突出重点，不逐条罗列
3. 同一更新人同一天的多次变更合并为一条通知
4. 分配递增 id，并在同文件的 `changelogIcons` 中添加对应图标
5. 日期使用当天日期

### CHANGELOG.md 同步更新

每次实质性功能变更后，需在 `CHANGELOG.md` 中新增一行版本记录。规范：

1. 按天汇总，不逐条罗列 commit，小修小补不单独记录
2. 同一更新人同一天的多次变更合并为一条记录，不拆分多条
3. 版本号遵循 SemVer：MAJOR 对应不兼容变更、MINOR 对应新功能、PATCH 对应修复与优化
4. 更新人从 git 提交记录获取，填写提交者姓名
5. 描述内容与消息通知对应，但采用 `1. 2. 3. 4.` 编号、`<br>` 换行罗列的格式

### 源码结构（2026-09-16 拆分后）

原来的单文件 `src/scripts/main.js`（6515 行）与 `index.html`（2310 行）已按
功能拆开，改动前先读 [README.md](README.md) 的「源码结构」与「注意事项」。
三条硬约束：

1. `src/styles/app.css` 里的 `@import` 顺序等于拆分前的行顺序，**不可调整**
2. 模块只放声明，副作用放进导出的 `init*()`，由 `src/scripts/main.js` 按
   原始顺序调用；入口里的行号注释指向拆分前的位置
3. 跨模块写共享状态要走 `set_xxx()`——ES 的 import 绑定只读

改完跑 `npm run check`（模块自检）再跑 `npm run build`。

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
- 专家与专家团：各自的 `src/views/collab/` 片段；专家卡片样式在
  `src/styles/parts/collab/*experts*.css`，专家团列表复用 `apps` 样式及
  `src/scripts/features/expert/` 模块。
- 设置：`src/views/collab/settings.html`、`src/modals/collab/settings.html`、
  `src/styles/parts/collab/*settings*.css`、`persons.js`、`config.js`。历史团队数据迁移保留在 `squads.js`。
- 共享导航与容器留在 `src/views/collab.html`；共享 CSS 文件名带 `shared`，
  `src/styles/parts/collab.css` 的导入顺序保留原有层叠关系。`data.js`、
  `view.js`、`index.js` 是跨页模块，修改前先确认接口影响。

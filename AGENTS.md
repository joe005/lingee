

## Repo Wiki

Auto-generated Wiki documentation (6 pages) is available at `.lingeebuild/repowiki/zh/content`.
> Lingee 高保真演示原型，开发时模块化，构建产出零依赖的单个 HTML 文件。

### Key Files

- Project overview: `.lingeebuild/repowiki/zh/content/index.md`
- Architecture design: `.lingeebuild/repowiki/zh/content/architecture.md`
- Reading guide: `.lingeebuild/repowiki/zh/content/reading-guide.md`
- Source-to-doc mapping (JSON): `.lingeebuild/repowiki/zh/content/index.json`

### Categories

- 项目总览
- 原型模块开发

### Usage

Consult the wiki when working on features, debugging, or onboarding to a new area of the codebase.

1. **Start here**: Read `index.md` and `architecture.md` first for high-level project understanding
2. **By source file**: Look up `fileToPages` in `index.json` to find the wiki page for a specific source file
3. **By topic**: Scan `categories` and page `title`/`description` in `index.json` to find docs by business domain or concept
4. Read the relevant wiki page for business context and architecture notes before making changes

## Collaboration Rules

### 消息通知同步更新

每次实质性功能变更后，需在 `src/scripts/main.js` 的 `changelogData` 数组中新增一条消息通知。规范：

1. 仅记录核心功能变更，小 BUG 修复及细节调整不记录
2. 描述精炼，突出重点，不逐条罗列
3. 分配递增 id，并在 `changelogIcons` 中添加对应图标
4. 日期使用当天日期

### CHANGELOG.md 同步更新

每次实质性功能变更后，需在 `CHANGELOG.md` 中新增一行版本记录。规范：

1. 按天汇总，不逐条罗列 commit，小修小补不单独记录
2. 同一更新人同一天的多次变更合并为一条记录，不拆分多条
3. 版本号遵循 SemVer，MINOR 对应新功能、PATCH 对应修复与优化
4. 描述精炼，与消息通知保持一致的风格
5. 变更内容用 `1. 2. 3. 4.` 编号，`<br>` 换行罗列

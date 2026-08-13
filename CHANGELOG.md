# Changelog

本文件记录 `lingee` 原型工程的版本历史，供维护者查阅，按天汇总（不逐条罗列 commit）。

版本号遵循 [SemVer](https://semver.org/)：`MAJOR.MINOR.PATCH`。

| 版本  | 日期       | 类型  | 变更内容 |
| :---: | ---------- | ----- | -------- |
| 0.1.1 | 2026-08-13 | PATCH | 修复关联应用悬浮面板自动展开且无法关闭：P1 拆分 CSS 时按主题重排了规则顺序，导致 `.menu{display:none}` 与 `.app-menu{display:flex}`（特异性相同、仅靠源码顺序决胜）的相对顺序被颠倒，面板常驻显示而非受 `open` 类控制。排查确认另有 11 个跨文件重复选择器存在同一隐患，遂不做局部打补丁，将 `base.css` 与 `components/*.css` 按原始单文件的层叠顺序合并为单一 `src/styles/app.css`；`tokens.css` 因与顺序无关继续独立。关联应用下拉恢复为原文件的悬浮展开交互（300ms 展开 / 200ms 收起）。README 补充「CSS 依赖源码顺序」约定。 |
| 0.1.0 | 2026-08-12 | MINOR | 原型工程化首日。初始化 Git 仓库并清理误入版本控制的 token 缓存凭证；项目迁出 iCloud 至本地 `~/Projects/lingee`。引入 Vite 构建（`vite-plugin-singlefile`），产出可双击打开的零外链单文件 `dist/index.html`；单文件原型（289KB）拆分为 `src/` 模块化结构，单据产物模板从内联转义字符串独立为 `src/artifacts/purchase-order.html`。设计令牌收敛为 `tokens.css` 单一来源（33 个），设计系统页色卡改为运行时读取 `:root` 而非硬编码，修复 `--danger-bg` 因此前误替换产生的坏值。目录按用途分组后与 iCloud 归档去重，根目录从 15 项收敛到 8 项。环境配置：模拟数据精简至 4 条，操作菜单支持编辑/测试连接/复制地址/设为默认/删除，版本号低于 V8.0.10 判定不通。 |

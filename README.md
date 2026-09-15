# Lingee 高保真原型

演示用原型，开发时模块化。**构建产物部署到 Cloudflare Pages**，分享链接演示
——不再是"双击打开单个 HTML 文件"（旧约定见 `docs/react-migration-plan.md`
§8.1，那条路走不通，已经改掉）。

正在做 React 化迁移（见 `docs/react-migration-plan.md`）：`src/scripts/main.js`
仍是原有 vanilla 实现，`src/App.jsx`/`src/views/`/`src/components/` 是已经
迁移完的部分，两边通过 `window.__lingeeBridge` 共存，迁移完成前两套代码都在。

## 命令

```bash
npm install
npm run dev      # 开发服务器，热更新
npm run build    # 产出 dist/，多文件静态站点
npm run lint     # ESLint（只管 src/ 下的 React 代码，main.js 不纳入）
npm run deploy   # 构建并部署到 Cloudflare Pages（wrangler）
npm run format   # 格式化 src
```

## 目录

| 目录 | 用途 |
| --- | --- |
| `src/` | 源码。样式、脚本（vanilla + 迁移中的 React）、产物模板 |
| `dist/` | 构建产物，多文件静态站点 |
| `docs/` | 需求说明书，交付给开发实现 |

设计稿、早期页面原型、历史版本等资料存放在 iCloud 归档目录
`Lingee Build/原型/lingee_app buid`，不纳入本仓库。

## 源码结构

```
src/
├─ styles/
│  ├─ tokens.css              设计令牌，全站唯一来源
│  ├─ base.css                基础与通用组件样式
│  └─ components/             layout / modal / settings
├─ scripts/main.js            主逻辑
└─ artifacts/
   └─ purchase-order.html     单据产物模板，经 ?raw 导入
```

## 约定

- **改颜色、字号、圆角只动 `tokens.css`**，勿在组件里写死色值
- 产物模板是独立 HTML 文件，不要再内联回 JS 字符串
- 每次改动前确认工作区干净，便于回退

## 注意事项

- **CSS 依赖源码顺序**：`.menu{display:none}` 与 `.app-menu{display:flex}`
  等选择器特异性相同，谁在后面谁生效。样式已按原始单文件的层叠顺序
  合并回 `src/styles/app.css`，新增样式请追加在文件末尾，不要按主题
  拆分成多个文件——那样极易打乱顺序，引发下拉/弹窗显示异常。

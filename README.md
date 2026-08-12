# Lingee 高保真原型

演示用原型。开发时模块化，构建产出**单个可双击打开的 HTML**，无需依赖。

## 命令

```bash
npm install
npm run dev      # 开发服务器，热更新
npm run build    # 产出 dist/index.html（零外链单文件）
npm run format   # 格式化 src
```

演示时直接分发 `dist/index.html` 即可。

## 目录

| 目录 | 用途 |
| --- | --- |
| `src/` | 源码。样式、脚本、产物模板 |
| `dist/` | 构建产物，单文件 |

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

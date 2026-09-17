# Lingee 高保真原型

演示用原型。开发时模块化，构建产出**单个可双击打开的 HTML**，无需依赖。

## 命令

```bash
npm install
npm run dev      # 开发服务器（固定 5199 端口），热更新
npm run check    # 模块自检：import/export 是否对得上
npm run build    # 产出 dist/index.html（零外链单文件）
npm run format   # 格式化 src
```

演示时直接分发 `dist/index.html` 即可。

## 目录

| 目录 | 用途 |
| --- | --- |
| `src/` | 源码。视图片段、弹窗片段、样式、脚本、产物模板 |
| `build/` | 构建插件与自检脚本 |
| `dist/` | 构建产物，单文件 |
| `docs/` | 需求说明书，交付给开发实现 |

设计稿、早期页面原型、历史版本等资料存放在 iCloud 归档目录
`Lingee Build/原型/lingee_app buid`，不纳入本仓库。

## 源码结构

改哪个界面，就改对应的那个文件——这是拆分的全部目的。

```
index.html                    只有 47 行：外壳 + <!--#include --> 清单

src/
├─ views/                     9 个视图各一份 HTML 片段
│  ├─ login.html  sidebar.html  home.html  newtask.html  chat.html
│  └─ apps.html   collab.html   skills.html  agents.html  settings.html
│                 design.html  overlays.html
├─ modals/                    14 个弹窗各一份 HTML 片段
│  ├─ team.html               专家团配置
│  ├─ expert-detail.html      专家详情
│  ├─ expert-edit.html        创建 / 编辑我的专家
│  ├─ member.html             专家团加成员
│  ├─ env-*.html              ERP 环境配置 / 授权 / 断开（5 个）
│  └─ attach.html  new-app.html  shortcut.html  collab.html  …
├─ styles/
│  ├─ tokens.css              设计令牌，全站唯一来源
│  ├─ app.css                 只剩一份有序的 @import 清单
│  └─ parts/                  22 个分区样式，顺序即层叠顺序
├─ scripts/
│  ├─ main.js                 入口：只做 import + 按原顺序调用各模块的 init
│  ├─ core/                   dom / toast / view（视图切换、侧边栏导航）
│  ├─ boot/                   route（启动路由）、test-param
│  └─ features/
│     ├─ login.js  sidebar.js  changelog.js  dropdown.js  tooltip.js
│     ├─ composer.js          输入框、发送、＋按钮菜单
│     ├─ chat.js  apps.js  attach-app.js  shortcuts.js  env.js
│     ├─ design/              Design System：交互 / 令牌 / 图标 / 组件预览
│     ├─ expert/              专家与专家团：data / store / library /
│     │                       automatch / editor / team-modal / chips
│     └─ collab/              协作开发：data / view / tasks / reviews /
│                             chat / experts / projects / config / index
└─ artifacts/
   └─ purchase-order.html     单据产物模板，经 ?raw 导入
```

## 约定

- **改颜色、字号、圆角只动 `tokens.css`**，勿在组件里写死色值
- 产物模板是独立 HTML 文件，不要再内联回 JS 字符串
- 每次改动前确认工作区干净，便于回退

## 注意事项

### HTML 片段是构建期拼接的，不是运行时注入

`index.html` 里的 `<!--#include "src/views/home.html" -->` 由
[build/vite-plugin-html-include.js](build/vite-plugin-html-include.js) 在
`transformIndexHtml` 阶段替换成文件内容。页面最终仍是一份完整的静态 HTML，
脚本执行时 DOM 已经就绪——和拆分前逐字节一致，没有任何运行时注入。

新增一个视图 / 弹窗：在 `src/views/` 或 `src/modals/` 放一个片段，
再去 `index.html` 加一行 `<!--#include -->`。位置就是它在 DOM 里的位置。

### 刷新页面为什么可能 404

原型用 `history.replaceState` 把地址改成 `/collab`、`/apps` 这类干净路径
（[src/scripts/core/view.js](src/scripts/core/view.js) 的 `setUrlState`）。
地址栏好看了，但服务器上并没有这些文件——**在这种地址上按刷新，浏览器会真的去
请求 `/collab`**。

开发时由 [build/vite-plugin-spa-fallback.js](build/vite-plugin-spa-fallback.js)
把这类请求重写回 `/`，所以 `npm run dev` 下刷新是正常的。

**部署到 Cloudflare 时这条回退不生效**，需要在 wrangler 配置里声明
`assets.not_found_handling = "single-page-application"`。当前仓库没有根级
wrangler 配置（`dist/wrangler.json` 由 `@cloudflare/vite-plugin` 自动生成，
里面没有这一项），线上直接访问 `/collab` 仍会 404，要修得先补一份根配置。

### CSS 依赖源码顺序

`.menu{display:none}` 与 `.app-menu{display:flex}` 等选择器特异性相同，
谁在后面谁生效。[src/styles/app.css](src/styles/app.css) 现在只剩一份
`@import` 清单，**这个顺序等于拆分前单文件里的行顺序，不可随意调整**。

新增样式优先放进 `parts/` 里对应的那个文件；确实是全局兜底，才追加到
`parts/expert-extra.css` 末尾。

### JS 模块只声明，接线在入口

每个模块只有声明（变量、函数），副作用（事件注册、初始化调用）集中在
导出的 `init*()` 函数里，由 [src/scripts/main.js](src/scripts/main.js)
按拆分前的原始顺序调用——入口里每行后面的注释就是它在原 6515 行
`main.js` 里的行号。**调整调用顺序前先确认没有依赖**。

跨模块共享的可变状态（`activePick`、`TEAMS`、`cvProject` 等）用 ES module
的 live binding 读取；ES 的 import 绑定是只读的，所以写入要走对应模块导出的
`set_xxx()`。`npm run check` 会把「导入了对方没导出的名字」「给 import
绑定赋值」「用了却没 import」这三类问题挡在浏览器之前。

# 新页面目录

新增一个独立页面时，按下面四处放文件，**不用改** `index.html`、`main.js`、`core/view.js`、`boot/route.js`：

| 内容 | 位置 | 说明 |
| --- | --- | --- |
| 页面 HTML | `src/views/pages/<名称>.html` | 构建时按文件名顺序自动拼进 `<main>`（`<!--#include-dir -->`） |
| 页面弹窗 | `src/modals/pages/<名称>.html` | 自动拼在全站弹窗之后 |
| 页面脚本 | `src/scripts/pages/<名称>.js` | 导出 `init()`，在所有既有模块之后按文件名顺序调用 |
| 页面样式 | `src/styles/pages/<名称>.css` | 在页面脚本里 `import '../../styles/pages/<名称>.css';` |

页面 HTML 的根元素写成：

```html
<div class="view hidden" id="view-<名称>" data-route="<名称>">…</div>
```

- `id="view-<名称>"`：`showView('<名称>')` 自动识别
- `data-route="<名称>"`：可按 `/<名称>` 直接打开、刷新不丢页面（构建插件把它填进防闪烁脚本的 `NP` 清单）

侧栏入口仍要在 `src/views/sidebar.html` 加一项（共享文件，改一行即可）：

```html
<div class="nav-item" data-nav-view="<名称>" tabindex="0" role="button">…</div>
```

写了 `data-nav-view` 的菜单项，点击时直接切到对应视图并高亮，不经过 `core/view.js` 的按文字匹配。

约定：

- 样式选择器以 `#view-<名称>` 开头，与其他页面互不影响，也不依赖 `app.css` 的引入顺序
- 和其他页面交互只用数据模块导出的函数和 `lingee:*` 自定义事件，不直接改别的页面的 DOM
- 打开协作开发的某个页签：`showView('collab')` 后发 `lingee:collab-nav` 事件，`detail.tab` 填页签名

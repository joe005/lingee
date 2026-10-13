import fs from 'node:fs';
import path from 'node:path';

const RE = /^([ \t]*)<!--#include\s+"([^"]+)"\s*-->[ \t]*$/gm;
/* 目录引入连同行尾换行一起匹配：目录为空时整行消失，产物与没写这一行时逐字节一致 */
const RE_DIR = /^([ \t]*)<!--#include-dir\s+"([^"]+)"\s*-->[ \t]*(?:\n|$)/gm;
/* 新页面在视图根元素上写 data-route="名称"，启动时可按 /名称 直接打开 */
const RE_ROUTE = /\bdata-route="([a-z][a-z0-9-]*)"/g;

/**
 * 把 index.html 里的 <!--#include "src/views/home.html" --> 替换成文件内容。
 * <!--#include-dir "src/views/pages" --> 按文件名顺序引入目录下全部 .html（不递归），
 * 新页面放进目录即可，不用改 index.html。
 *
 * 在 transformIndexHtml 阶段做替换，页面最终仍是一份完整静态 HTML——
 * 运行时没有任何注入，DOM 在脚本执行前就已就绪，和拆分前逐字节一致。
 */
export default function htmlInclude({ root = process.cwd() } = {}) {
  const included = new Set();
  const includedDirs = new Set();

  function expandDirs(html) {
    return html.replace(RE_DIR, (_m, indent, rel) => {
      const dir = path.resolve(root, rel);
      includedDirs.add(dir);
      if (!fs.existsSync(dir)) return '';
      return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort()
        .map((f) => `${indent}<!--#include "${rel.replace(/\/+$/, '')}/${f}" -->\n`).join('');
    });
  }

  function expand(html, fromFile) {
    return expandDirs(html).replace(RE, (_m, indent, rel) => {
      const file = path.resolve(root, rel);
      if (!fs.existsSync(file)) {
        throw new Error(`[html-include] ${fromFile} 引用了不存在的片段：${rel}`);
      }
      included.add(file);
      const body = fs.readFileSync(file, 'utf8').replace(/\n$/, '');
      // 保留 include 处的缩进，输出仍然可读
      const text = indent ? body.split('\n').map((l) => (l ? indent + l : l)).join('\n') : body;
      return expand(text, rel);
    });
  }

  /* 收集新页面声明的路由，填进防闪烁脚本的 NP 清单 */
  function injectRoutes(html) {
    const routes = [...new Set([...html.matchAll(RE_ROUTE)].map((m) => m[1]))];
    if (!routes.length) return html;
    return html.replace('var NP=[];', 'var NP=' + JSON.stringify(routes) + ';');
  }

  return {
    name: 'html-include',
    enforce: 'pre',

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        included.clear();
        includedDirs.clear();
        return injectRoutes(expand(html, ctx.filename || 'index.html'));
      },
    },

    configureServer(server) {
      // 片段本身不是模块，改动后要手动让 dev server 重载页面
      server.watcher.add(path.resolve(root, 'src/views'));
      server.watcher.add(path.resolve(root, 'src/modals'));
      const reload = (file) => {
        if (!file.endsWith('.html')) return;
        const abs = path.resolve(file);
        if (!included.has(abs) && !includedDirs.has(path.dirname(abs))) return;
        server.ws.send({ type: 'full-reload', path: '*' });
      };
      server.watcher.on('change', reload);
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

import fs from 'node:fs';
import path from 'node:path';

const RE = /^([ \t]*)<!--#include\s+"([^"]+)"\s*-->[ \t]*$/gm;

/**
 * 把 index.html 里的 <!--#include "src/views/home.html" --> 替换成文件内容。
 *
 * 在 transformIndexHtml 阶段做替换，页面最终仍是一份完整静态 HTML——
 * 运行时没有任何注入，DOM 在脚本执行前就已就绪，和拆分前逐字节一致。
 */
export default function htmlInclude({ root = process.cwd() } = {}) {
  const included = new Set();

  function expand(html, fromFile) {
    return html.replace(RE, (_m, indent, rel) => {
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

  return {
    name: 'html-include',
    enforce: 'pre',

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        included.clear();
        return expand(html, ctx.filename || 'index.html');
      },
    },

    configureServer(server) {
      // 片段本身不是模块，改动后要手动让 dev server 重载页面
      server.watcher.add(path.resolve(root, 'src/views'));
      server.watcher.add(path.resolve(root, 'src/modals'));
      const reload = (file) => {
        if (!file.endsWith('.html')) return;
        if (!included.has(path.resolve(file))) return;
        server.ws.send({ type: 'full-reload', path: '*' });
      };
      server.watcher.on('change', reload);
      server.watcher.on('add', reload);
    },
  };
}

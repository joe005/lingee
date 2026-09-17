import fs from 'node:fs';
import path from 'node:path';

/**
 * 给 GitHub Pages 生成 404.html。
 *
 * Pages 是纯静态托管，没有 SPA 回退：直接访问 /lingee/collab 会 404，因为
 * 服务器上并没有这个文件。但 Pages 对站内未知路径会返回本站的 404.html，
 * 浏览器照常渲染它——把 404.html 做成 index.html 的副本，应用就能正常启动，
 * 再由 boot/route.js 从 location.pathname 解析出要打开哪个视图。
 *
 * （HTTP 状态码仍是 404，这对演示原型没有影响；要拿到 200 得换支持 rewrite
 * 的托管，或改用 hash 路由。）
 */
export default function pages404() {
  let outDir = 'dist';
  return {
    name: 'pages-404',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const index = path.resolve(outDir, 'index.html');
      if (!fs.existsSync(index)) return;
      fs.copyFileSync(index, path.resolve(outDir, '404.html'));
    },
  };
}

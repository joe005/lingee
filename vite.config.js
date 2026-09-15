import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

/* 部署形态已定（见 docs/react-migration-plan.md §8.1）：不再要求双击本地
   HTML 打开，改走 Cloudflare Pages 部署。之前为了"单文件可双击"引入的
   `vite-plugin-singlefile` 和 `@vitejs/plugin-legacy` 都已移除——实测过
   这两者组合在 file:// 下也没能稳定工作（细节见方案文档 §8.1 的踩坑记录），
   而且现在已经不需要解这道题了，标准的 <script type="module"> 多文件产出
   正是 Cloudflare Pages 期望的形态。
   `scripts/build-standalone.cjs` 已经没有 npm script 引用它，属于废弃文件，
   之后确认没有其它用途可以直接删掉。 */
export default defineConfig({
  // base 原来是 '/lingee/'（大概率是早年 GitHub Pages 项目页 username.github.io/lingee/
  // 那种子路径托管留下的）。实测发现它和 @cloudflare/vite-plugin 的 dev 中间件配合有问题：
  // 访问 / 会 302 到 /lingee/，但 /lingee/ 本身在 dev 模式下直接 404（中间件按 Workers
  // 静态资源路由处理，不认这个子路径当 SPA 根）。Cloudflare Pages 部署通常挂在站点根路径
  // 而不是子路径，所以改成 '/'——顺带修好了本地 npm run dev 打不开的问题。
  base: '/',
  plugins: [
    react(),
    cloudflare(),
  ],
  server: { open: true },
  build: {
    outDir: 'dist',
  },
});
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

import { cloudflare } from "@cloudflare/vite-plugin";

/* 演示原型：目标是构建产出单个可双击打开的 index.html，这件事目前还没做
   到，见 docs/react-migration-plan.md §8.1 的最新进展，不要相信这段注释
   之前的旧版本说"已实测双击可开"——没有，那是没验证就写的。
   已知情况：
   1. `vite build` 默认产出 <script type="module">，file:// 下会被 CORS
      拦截不执行。
   2. @vitejs/plugin-legacy 默认"现代包 + nomodule 兼容包"双跑模式在
      file:// 下大概率也不行：nomodule 脚本是否执行，浏览器看的是"是否原生
      支持 type=module"这个静态特性，不是"module 脚本是否加载成功"——现代
      浏览器都支持 module，会跳过 nomodule 那份，等于还是只剩会被拦的
      module 脚本。
   3. 试过 `renderModernChunks:false` 想让它只出兼容包这一份，结果更糟：
      它改用 SystemJS 的 `data-src`（不是 `src`）动态加载产物脚本，
      vite-plugin-singlefile 认不出这种写法去内联，日志显示"已内联"但实际
      没有，真正的应用代码（antd/react 那份大文件）直接从产物里消失了——
      这是这次实测踩到的坑，构建产物看着体积小很多（228KB）但其实是空的，
      不要被这个数字骗了以为它变精简了。
   当前配置退回到第 2 步（至少不丢代码，但双击可能仍然打不开，没有最终
   验证），这一项还没解决，下一步要么找到让 legacy + singlefile 真正配合
   inline 出单文件的具体做法，要么按方案 §8.1 选项 3 放弃双击、改成走
   Cloudflare Pages 部署（这个项目现在已经有 wrangler 部署配置了，见
   package.json 的 deploy 脚本，可能这条路更现实）。
   scripts/build-standalone.cjs 已从 package.json 里的 npm script 移除，
   但还没确认新方案能顶替它，先别删这个文件。 */
export default defineConfig({
  base: '/lingee/',
  plugins: [
    react(),
    legacy({ targets: 'defaults, not IE 11', modernPolyfills: true, renderLegacyChunks: true }),
    viteSingleFile(),
    cloudflare(),
  ],
  server: { open: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
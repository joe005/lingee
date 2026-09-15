import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

import { cloudflare } from "@cloudflare/vite-plugin";

/* 演示原型：构建产出单个可双击打开的 index.html。
   `vite build` 默认产出 <script type="module">，file:// 协议下会被浏览器按
   CORS 拦截、整段脚本不执行——@vitejs/plugin-legacy 额外产出一份 nomodule /
   SystemJS 兼容包，在 file:// 下也能跑，配合 vite-plugin-singlefile 内联成
   一个文件。见 docs/react-migration-plan.md §8.1（Phase 0 已实测双击可开，
   scripts/build-standalone.cjs 那条老路子随之退休，见 package.json）。 */
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
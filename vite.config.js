import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { cloudflare } from '@cloudflare/vite-plugin';
import htmlInclude from './build/vite-plugin-html-include.js';
import spaFallback from './build/vite-plugin-spa-fallback.js';
import pages404 from './build/vite-plugin-pages-404.js';

// 演示原型：构建产出单个可双击打开的 index.html
export default defineConfig({
  base: '/lingee/',
  plugins: [spaFallback(), htmlInclude(), viteSingleFile(), cloudflare(), pages404()],
  server: { port: Number(process.env.PORT) || 5199, open: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

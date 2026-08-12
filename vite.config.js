import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 演示原型：构建产出单个可双击打开的 index.html
export default defineConfig({
  plugins: [viteSingleFile()],
  server: { open: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

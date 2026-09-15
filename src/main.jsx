import { createRoot } from 'react-dom/client';
import App from './App';

/* React 挂载入口。#react-view-root 是 index.html 里新增的唯一挂载点，
   由 main.js 里的 showView() 负责显隐（和另外 9 个 .view 用同一套约定）。
   main.js 先加载、先跑完它自己的同步初始化（含首次 showView 调用），
   这个模块在它之后执行，属于「渐进增强」——就算这个模块因为某些原因没跑
   起来，未迁移的 8 个视图（首页、新会话、会话页、协作开发、Design System、
   设置……）也完全不受影响，只有应用开发/技能开发/智能体开发这三个已迁移
   视图会看起来是空的。见 docs/react-migration-plan.md §4 Phase 0/1、
   本次迁移里 index.html 和 src/scripts/main.js 的改动说明。 */
const mountEl = document.getElementById('react-view-root');
if (mountEl) {
  createRoot(mountEl).render(<App />);
}

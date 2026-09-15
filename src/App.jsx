import { ConfigProvider } from 'antd';
import { HashRouter, Routes, Route } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import { antdThemeToken, antdComponentTokens } from './theme/antd-theme';
import AppsView from './views/AppsView';
import SkillsView from './views/SkillsView';
import AgentsView from './views/AgentsView';

/* React 侧的路由骨架。按方案 §3.1 的路由树用 HashRouter（file:// 双击打开、
   静态托管都不需要服务端 rewrite 规则）。

   Phase 0/1 只迁移了应用开发 / 技能开发 / 智能体开发三个视图，路由树暂时
   只挂这三条：/apps /skills /agents，都挂进同一个挂载点 #react-view-root
   （见 index.html、main.js:showView）。其余 6 个顶层视图（新会话、会话页、
   协作开发、Design System、设置）继续 100% 用现状的 vanilla 实现，不接入
   这个 Router——是否接入、什么时候接入由后续 Phase 决定，这里不预先占位
   任何"桥接"逻辑，避免制造一套没人用的空路由。 */
export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ token: antdThemeToken, components: antdComponentTokens }}
    >
      <HashRouter>
        <Routes>
          <Route path="/apps" element={<AppsView />} />
          <Route path="/skills" element={<SkillsView />} />
          <Route path="/agents" element={<AgentsView />} />
          {/* 其余 hash（含空 hash、未迁移视图对应的路径）什么都不渲染——
              #react-view-root 是否显示完全交给 main.js 的 showView() 用
              .hidden class 控制，这里不做重定向，避免每次加载都把 hash
              悄悄改写成 /apps。 */}
          <Route path="*" element={null} />
        </Routes>
      </HashRouter>
    </ConfigProvider>
  );
}

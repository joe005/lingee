import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import { antdThemeToken, antdComponentTokens } from './theme/antd-theme';
import AppsView from './views/AppsView';
import SkillsView from './views/SkillsView';
import AgentsView from './views/AgentsView';

/* React 侧的路由骨架。用 BrowserRouter，不是 HashRouter——方案 §3.1/§8.1
   最初选 hash 是因为假设产物必须双击打开，这个假设后来推翻了（改走
   Cloudflare Pages 部署，见 wrangler.json 的 assets.not_found_handling:
   "single-page-application"，SPA 刷新 404 的问题从服务端配置解决，不需要
   靠 hash 绕开）。

   更实际的原因：main.js 里 showView() 自己也在用 history.replaceState
   改 location.pathname 做"伪路由"（未迁移的 6 个视图都靠这个），如果这里
   继续用 HashRouter，会同时存在 pathname 和 hash 两套 URL 机制互相打架
   （比如 /apps#/apps 这种双写），刷新时到底信哪个说不清。统一用
   BrowserRouter 之后，React 和 vanilla 两边都只认 location.pathname，
   是同一套。

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
      <BrowserRouter>
        <Routes>
          <Route path="/apps" element={<AppsView />} />
          <Route path="/skills" element={<SkillsView />} />
          <Route path="/agents" element={<AgentsView />} />
          {/* 其余路径（含未迁移视图对应的路径）什么都不渲染——#react-view-root
              是否显示完全交给 main.js 的 showView() 用 .hidden class 控制，
              这里不做重定向，避免每次加载都把路径悄悄改写成 /apps。 */}
          <Route path="*" element={null} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

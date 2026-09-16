/* 首页/原型导航页（Phase 3）。点击卡片通过 bridge.showView 切换视图。 */
export default function HomeView() {
  function nav(view) {
    window.__lingeeBridge?.showView?.(view);
  }

  const cards = [
    { name: '新会话（Composer）', desc: '开发首屏，输入任务指令，选择模式 / 模型 / 绑定应用', badge: '已完成', view: 'newtask' },
    { name: '我的应用', desc: '应用卡片列表，支持筛选和搜索', badge: '已完成', view: 'apps' },
    { name: '技能开发', desc: '技能列表与创建流程', badge: '待设计', view: 'newtask' },
    { name: '智能体开发', desc: '智能体配置与发布流程', badge: '待设计', view: 'newtask' },
  ];

  const otherCards = [
    { name: '对话', desc: 'AI 对话主界面', badge: '待设计' },
    { name: '工作', desc: '任务管理与协作工作台', badge: '待设计' },
  ];

  return (
    <div className="home-wrap" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
      <div className="home-logo" style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Lingee</div>
      <div className="home-subtitle" style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 32 }}>原型导航 — 点击卡片打开对应屏幕</div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>开发模块</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {cards.map((c) => (
            <div key={c.name} onClick={() => nav(c.view)} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', transition: 'border-color .15s' }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>{c.desc}</div>
              <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 4, fontSize: 11, background: c.badge === '已完成' ? 'var(--success-light)' : 'var(--hover)', color: c.badge === '已完成' ? 'var(--success)' : 'var(--text-muted)' }}>{c.badge}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>其他模块</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {otherCards.map((c) => (
            <div key={c.name} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, cursor: 'default', opacity: 0.6 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>{c.desc}</div>
              <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'var(--hover)', color: 'var(--text-muted)' }}>{c.badge}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>历史版本</div>
        <a href="lingee-prototype.html" style={{ display: 'block', padding: 16, border: '1px solid var(--border)', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>原始整合版</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>拆分前的完整单文件原型，保留作为参考</div>
          <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'var(--hover)', color: 'var(--text-muted)' }}>参考</span>
        </a>
      </div>
    </div>
  );
}

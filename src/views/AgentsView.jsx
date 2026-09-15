import { useMemo, useState } from 'react';
import AppCard from '../components/feature/AppCard';
import Icon from '../components/icons/Icon';
import { AGENTS_DATA } from '../data/agents';

const STATUS_TABS = ['全部', '已保存', '已提交', '已发布', '已驳回'];

/* 智能体开发页。对应原 #view-agents 静态卡片区，说明同 SkillsView.jsx。 */
export default function AgentsView() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AGENTS_DATA;
    return AGENTS_DATA.filter((a) => {
      const text = (a.title + ' ' + a.desc + ' ' + a.tags.join(' ')).toLowerCase();
      return text.includes(q);
    });
  }, [query]);

  function openAgent(title) {
    window.__lingeeBridge?.openAppCardChat(title);
  }

  return (
    <div className="view" id="view-agents-react">
      <div className="apps-head">
        <div className="apps-title">智能体开发</div>
        <button className="btn-new" type="button">
          <Icon name="plus" size={16} />
          新建
        </button>
      </div>
      <div className="apps-toolbar">
        <div className="tabs">
          {STATUS_TABS.map((t, i) => (
            <div className={'tab' + (i === 0 ? ' active' : '')} key={t}>
              {t}
            </div>
          ))}
        </div>
        <div className="apps-search">
          <input
            type="text"
            placeholder="搜索智能体"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Icon name="search" size={16} />
        </div>
      </div>
      <div className="apps-grid">
        {filtered.map((a) => (
          <AppCard key={a.id} app={a} onOpen={openAgent} />
        ))}
        {filtered.length === 0 && (
          <div className="apps-empty" style={{ display: 'block' }}>
            <div className="apps-empty-icon">
              <Icon name="search" size={26} />
            </div>
            <div className="apps-empty-title">未找到匹配的智能体</div>
          </div>
        )}
      </div>
    </div>
  );
}

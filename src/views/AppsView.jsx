import { useMemo, useState } from 'react';
import { Dropdown } from 'antd';
import AppCard from '../components/feature/AppCard';
import Icon from '../components/icons/Icon';
import { APPS_LIBRARY } from '../data/apps';

/* 应用开发页。对应原 index.html #view-apps 的静态卡片区
   （见 docs/react-migration-plan.md §1 / §4 Phase 1），迁移前是 7 张手工
   复制的卡片，只有 1 张有 "···" 菜单、新卡片不响应点击；现在是数据驱动 +
   <AppCard/>，交互统一。搜索、"新建" 下拉都在原有行为基础上原样保留，
   "新建" 之后仍然复用 main.js 里既有的「跳到新会话并预选模式」逻辑
   （window.__lingeeBridge.startNewTaskWithMode），没有另起一套。 */
export default function AppsView() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPS_LIBRARY;
    return APPS_LIBRARY.filter((app) => {
      const text = (app.title + ' ' + app.desc + ' ' + app.tags.join(' ')).toLowerCase();
      return text.includes(q);
    });
  }, [query]);

  function openApp(title) {
    window.__lingeeBridge?.openAppCardChat(title);
  }

  const newMenuItems = [
    { key: '通用应用', label: '通用应用' },
    { key: '苍穹应用', label: '苍穹应用' },
  ];

  function handleNewClick({ key }) {
    window.__lingeeBridge?.startNewTaskWithMode(key);
  }

  return (
    <div className="view" id="view-apps-react">
      <div className="apps-head">
        <div className="apps-title">应用开发</div>
        <div className="apps-head-right">
          <div className={'apps-search' + (query ? ' has-text' : '')}>
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="搜索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="apps-search-clear"
              aria-label="清除"
              onClick={() => setQuery('')}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          <div className="apps-new-wrap">
            <Dropdown
              menu={{ items: newMenuItems, onClick: handleNewClick }}
              trigger={['click']}
            >
              <button className="btn-new apps-new-btn" type="button">
                <Icon name="plus" size={16} />
                新建
                <Icon name="chevron-down" size={14} />
              </button>
            </Dropdown>
          </div>
        </div>
      </div>
      <div className="apps-grid">
        {filtered.map((app) => (
          <AppCard key={app.id} app={app} onOpen={openApp} />
        ))}
        {filtered.length === 0 && (
          <div className="apps-empty" style={{ display: 'block' }}>
            <div className="apps-empty-icon">
              <Icon name="search" size={26} />
            </div>
            <div className="apps-empty-title">未找到匹配的应用</div>
          </div>
        )}
      </div>
    </div>
  );
}

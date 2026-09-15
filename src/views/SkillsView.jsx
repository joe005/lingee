import { useMemo, useState } from 'react';
import AppCard from '../components/feature/AppCard';
import Icon from '../components/icons/Icon';
import { SKILLS_LIBRARY } from '../data/skills';

const STATUS_TABS = ['全部', '已保存', '已提交', '已发布', '已驳回'];

/* 技能开发页。对应原 #view-skills 静态卡片区。状态页签目前在 vanilla 版本里
   本来就没接点击逻辑（`$$('#view-apps .tab')` 那段绑定的选择器只匹配应用
   开发页，技能/智能体开发页的页签点了不会有任何反应）——这里如实保留这个
   现状：页签只做展示，不做筛选，没有比之前更多也没有更少。
   搜索框原本也是纯装饰（没有绑定任何输入事件），这里补上了和应用开发页
   一致的实时过滤——属于顺手补齐而不是行为回归，搜索之外的一切都是原样迁移。 */
export default function SkillsView() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SKILLS_LIBRARY;
    return SKILLS_LIBRARY.filter((s) => {
      const text = (s.title + ' ' + s.desc + ' ' + s.tags.join(' ')).toLowerCase();
      return text.includes(q);
    });
  }, [query]);

  function openSkill(title) {
    window.__lingeeBridge?.openAppCardChat(title);
  }

  return (
    <div className="view" id="view-skills-react">
      <div className="apps-head">
        <div className="apps-title">技能开发</div>
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
            placeholder="搜索技能"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Icon name="search" size={16} />
        </div>
      </div>
      <div className="apps-grid">
        {filtered.map((s) => (
          <AppCard key={s.id} app={s} onOpen={openSkill} />
        ))}
        {filtered.length === 0 && (
          <div className="apps-empty" style={{ display: 'block' }}>
            <div className="apps-empty-icon">
              <Icon name="search" size={26} />
            </div>
            <div className="apps-empty-title">未找到匹配的技能</div>
          </div>
        )}
      </div>
    </div>
  );
}

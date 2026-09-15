import { Dropdown } from 'antd';
import CardIcon from './CardIcon';
import Icon from '../icons/Icon';

/* 应用开发 / 技能开发 / 智能体开发三个卡片网格共用的卡片。
   复用现有 .app-card / .card-* / .ptag CSS class（app.css 里已经有，
   不重新画一遍视觉），交互层（点击打开会话、"···"菜单）用 antd Dropdown。

   见 docs/react-migration-plan.md §1：原来 7 张应用卡片里只有 1 张真的有
   "···" 菜单，其余是手工复制漏掉的——这里统一让每张卡片都有，顺带修掉这个
   不一致，而不是原样保留这个 bug。菜单项本身（重命名/删除）只是 toast 提示，
   和侧边栏 Workspace 条目的右键菜单是同一套占位行为，没有新增真实后端能力。 */
export default function AppCard({ app, onOpen }) {
  const bridge = window.__lingeeBridge;

  const menuItems = [
    { key: 'rename', label: '重命名' },
    { key: 'delete', label: '删除', danger: true },
  ];

  function handleMenuClick({ key, domEvent }) {
    domEvent?.stopPropagation?.();
    if (!bridge) return;
    if (key === 'rename') bridge.toast('重命名：' + app.title);
    else if (key === 'delete') bridge.toast('已删除：' + app.title);
  }

  return (
    <div className="app-card" onClick={() => onOpen(app.title)}>
      <div className="card-top">
        <CardIcon icon={app.icon} />
        <div className="card-titles">
          <div className="card-title-row">
            <span className="card-title">{app.title}</span>
            <Dropdown
              menu={{ items: menuItems, onClick: handleMenuClick }}
              trigger={['click']}
              placement="bottomRight"
            >
              <span
                className="card-more"
                onClick={(e) => e.stopPropagation()}
                role="button"
                aria-label="更多操作"
              >
                <Icon name="more" size={14} />
              </span>
            </Dropdown>
          </div>
        </div>
      </div>
      <div className="card-desc">{app.desc}</div>
      <div className="card-tags">
        {app.tags.map((t) => (
          <span className="ptag" key={t}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

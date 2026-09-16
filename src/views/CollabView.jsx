import { useMemo, useState } from 'react';
import { Tabs, Tag, Card, Typography } from 'antd';
import { useBridgeNamespace } from '../hooks/useLingeeBridge';

const { Text } = Typography;

/* 协作开发页（Phase 3）。各页签从 bridge.collab 数据渲染。
   专家/专家团弹窗已迁到 React（Phase 2c），任务类弹窗已迁到 React（Phase 2）。 */
export default function CollabView() {
  const [activeTab, setActiveTab] = useState('tasks');
  const bridge = useBridgeNamespace('collab');

  const tasks = useMemo(() => bridge?.getTasks?.() || [], [bridge]);
  const reviews = useMemo(() => bridge?.getReviews?.() || [], [bridge]);
  const experts = useMemo(() => bridge?.getExperts?.() || [], [bridge]);
  const teams = useMemo(() => bridge?.getTeams?.() || [], [bridge]);
  const projects = useMemo(() => bridge?.getProjects?.() || [], [bridge]);
  const members = useMemo(() => bridge?.getMembers?.() || [], [bridge]);

  const statusColors = { done: 'green', doing: 'blue', todo: 'default', blocked: 'red' };

  const tabItems = [
    {
      key: 'tasks',
      label: '任务管理',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((t) => (
            <Card key={t.id} size="small" style={{ cursor: 'pointer' }} onClick={() => bridge?.openTaskModal?.()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={statusColors[t.status] || 'default'}>{t.status || 'todo'}</Tag>
                <span style={{ fontWeight: 500 }}>{t.title}</span>
                {t.assignee && <Text type="secondary" style={{ fontSize: 12 }}>{t.assignee}</Text>}
              </div>
            </Card>
          ))}
          {tasks.length === 0 && <Text type="secondary">暂无任务</Text>}
        </div>
      ),
    },
    {
      key: 'reviews',
      label: '待评审',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reviews.map((r) => (
            <Card key={r.id} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={statusColors[r.status] || 'default'}>{r.status || 'pending'}</Tag>
                <span style={{ fontWeight: 500 }}>{r.title}</span>
              </div>
            </Card>
          ))}
          {reviews.length === 0 && <Text type="secondary">暂无评审</Text>}
        </div>
      ),
    },
    {
      key: 'project',
      label: '项目',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map((p) => (
            <Card key={p.id} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={p.statusColor || 'blue'}>{p.status || ''}</Tag>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                {p.owner && <Text type="secondary" style={{ fontSize: 12 }}>{p.owner}</Text>}
              </div>
            </Card>
          ))}
          {projects.length === 0 && <Text type="secondary">暂无项目</Text>}
        </div>
      ),
    },
    {
      key: 'experts',
      label: '专家管理',
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))', gap: 12 }}>
          {experts.map((e) => (
            <Card
              key={e.id}
              size="small"
              hoverable
              onClick={() => bridge?.openExpertModal?.(e.id)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="60" fill="#eef3ff"/><text x="64" y="72" font-size="48" text-anchor="middle" fill="#495dff">'+(e.name||'?')[0]+'</text></svg>')}`} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {e.name}
                    {e.ro && <Tag style={{ marginLeft: 4 }}>只读</Tag>}
                    {e.mine && <Tag color="blue" style={{ marginLeft: 4 }}>我的</Tag>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{e.role} · {e.by}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 8, lineHeight: 1.5 }}>{e.desc}</div>
              {e.tags && e.tags.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {e.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'teams',
      label: '专家团管理',
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))', gap: 12 }}>
          {teams.map((t) => (
            <Card
              key={t.id}
              size="small"
              hoverable
              onClick={() => bridge?.openTeamModal?.(t.id)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                {t.name}
                {t.preset && <Tag style={{ marginLeft: 4 }}>内置</Tag>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>{t.by} · {t.members?.length || 0} 位专家</div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4, lineHeight: 1.5 }}>{t.desc}</div>
              {t.domains && t.domains.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {t.domains.slice(0, 4).map((d) => <Tag key={d}>{d}</Tag>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'members',
      label: '协作人员',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map((m, i) => (
            <Card key={i} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: 'var(--brand)' }}>
                  {m.name?.[0] || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{m.roles?.join(' · ') || m.role || ''}</div>
                </div>
              </div>
            </Card>
          ))}
          {members.length === 0 && <Text type="secondary">暂无成员</Text>}
        </div>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 20px' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ flex: 1 }}
      />
    </div>
  );
}

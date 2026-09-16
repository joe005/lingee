import { useMemo } from 'react';
import { Button, Dropdown, Tag } from 'antd';
import Icon from '../components/icons/Icon';
import { useBridgeNamespace, useBridgeVersion } from '../hooks/useLingeeBridge';

/* 设置页（Phase 3 数据驱动）。env 列表从 bridge.env.getList() 读取，
   不再依赖 vanilla DOM。所有操作通过 bridge 方法。 */
export default function SettingsView() {
  const bridge = useBridgeNamespace('env');
  const version = useBridgeVersion('env');

  /* eslint-disable react-hooks/exhaustive-deps */
  const items = useMemo(() => {
    if (!bridge) return [];
    return bridge.getList() || [];
  }, [bridge, version]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!bridge) return null;

  function getConnTag(e) {
    if (e.envConn !== 'auth') return { text: '第三方应用', color: 'default' };
    const state = e.grantState || '';
    if (state === 'expired') return { text: '授权已失效', color: 'orange' };
    if (state === 'revoked' || state === 'none') return { text: '未授权', color: 'red' };
    return { text: 'OAuth 授权', color: 'green' };
  }

  function getConnSub(e) {
    if (e.envConn !== 'auth') return null;
    const s = e.grantState || '';
    if (s === 'none') return '配置已保存，还没有完成授权';
    if (s === 'revoked') return '已断开连接，重新授权后可以继续使用';
    if (s === 'expired') return '授权已失效，可能是被撤销或长期未使用';
    return `授权人 ${e.grantedBy || ''} · ${e.grantedAt || ''} 授权 · ${e.lastUsed || ''} 使用`;
  }

  function getMenuItems(e) {
    const isCloud = e.source === 'cloud';
    const items = [
      { key: 'edit', label: isCloud ? '查看' : '编辑', onClick: () => bridge.openModal(isCloud ? 'view' : 'edit', e.index) },
      { key: 'test', label: '测试连接', onClick: () => bridge.testItem(e.index) },
      { key: 'copy', label: '复制地址', onClick: () => bridge.copyUrl(e.index) },
      { key: 'default', label: '设为默认', onClick: () => bridge.setDefault(e.index) },
      { type: 'divider' },
      { key: 'delete', label: '删除', danger: true, onClick: () => bridge.deleteItem(e.index) },
    ];
    return items;
  }

  return (
    <div className="set-inner" style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <h1 className="set-title" style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>环境配置</h1>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>苍穹应用开发 测试环境</h2>
            <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>适用版本：苍穹 V8.0.10 及以上</div>
          </div>
          <Button type="primary" onClick={() => bridge.openModal('create', -1)}>
            <Icon name="plus" size={14} />
            新增
          </Button>
        </div>
        <div className="env-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((e) => {
            const connTag = getConnTag(e);
            const connSub = getConnSub(e);
            const pending = e.envConn === 'auth' && (e.grantState === 'expired' || e.grantState === 'revoked' || e.grantState === 'none');
            return (
              <div key={e.index} className="env-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div className="env-main" style={{ flex: 1, cursor: 'pointer' }} onClick={() => bridge.openModal(e.source === 'cloud' ? 'view' : 'edit', e.index)}>
                  <div className="env-head" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="env-name" style={{ fontWeight: 500 }}>{e.name}</span>
                    {e.isDefault && <Tag color="blue">默认</Tag>}
                    <Tag>{e.source === 'cloud' ? '云端' : '本地'}</Tag>
                    <Tag color={connTag.color}>{connTag.text}</Tag>
                    {e._testing && <Tag color="processing">连通中…</Tag>}
                    {e._testResult && <Tag color="success">{e._testResult}</Tag>}
                  </div>
                  <div className="env-url" style={{ fontSize: 13, color: 'var(--text-soft)' }}>{e.url}</div>
                  {connSub && (
                    <div className={`env-sub ${pending ? 'warn' : ''}`} style={{ fontSize: 12, color: pending ? 'var(--warning)' : 'var(--text-soft)', marginTop: 2 }}>
                      {connSub}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pending && (
                    <Button size="small" onClick={(ev) => { ev.stopPropagation(); bridge.reauth(); }}>
                      {e.grantState === 'none' ? '去授权' : '重新授权'}
                    </Button>
                  )}
                  <Dropdown menu={{ items: getMenuItems(e) }} trigger={['click']}>
                    <Button type="text" icon={<Icon name="more" size={16} />} onClick={(ev) => ev.stopPropagation()} />
                  </Dropdown>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

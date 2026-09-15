import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Button, Spin } from 'antd';
import Icon from '../icons/Icon';
import { useOpenBridgeModal, useBridgeNamespace } from '../../hooks/useLingeeBridge';

/* ERP 环境系统的 5 个弹窗（Phase 2d），见 docs/react-migration-plan.md。
   和 ExpertModals 一样的桥接模式：业务逻辑（验证、落库、OAuth 流程）
   留在 main.js，React 只负责渲染表单和收集值。 */

/* ---------- 新增/编辑/查看 ERP 环境 ---------- */
function EnvConfigModal() {
  const openModal = useOpenBridgeModal('env');
  const bridge = useBridgeNamespace('env');
  const open = openModal === 'env-config';
  const [form] = Form.useForm();
  const [connMode, setConnMode] = useState('auth'); // 'auth' | 'cred'
  const [normalAuthEnabled, setNormalAuthEnabled] = useState(true);
  const [testing, setTesting] = useState(false);

  const mode = useMemo(() => (open ? bridge?.getMode?.() ?? 'create' : 'create'), [open, bridge]);
  const dataCenters = useMemo(() => (open ? bridge?.getDataCenters?.() ?? [] : []), [open, bridge]);
  const initialData = useMemo(() => (open ? bridge?.getInitialData?.() : null), [open, bridge]);

  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue(initialData.fields);
      setConnMode(initialData.connMode || 'auth');
      setNormalAuthEnabled(initialData.normalAuthEnabled ?? true);
    }
  }, [open, initialData, form]);

  if (!bridge) return null;
  function close() { bridge.close(); }

  const isExisting = mode === 'edit' || mode === 'view';
  const isView = mode === 'view';

  async function submit() {
    try {
      const values = await form.validateFields();
      const payload = { ...values, connMode, normalAuthEnabled };
      bridge.save(payload);
    } catch { /* antd Form 校验错误已展示 */ }
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="app-window" size={18} color="var(--brand)" />
          {mode === 'view' ? '查看 ERP 环境' : mode === 'edit' ? '编辑 ERP 环境' : '新增 ERP 环境'}
        </span>
      }
      open={open}
      onCancel={close}
      width={640}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="disconnect" type="link" danger hidden={!isExisting || initialData?.connState !== 'connected'} onClick={() => bridge.disconnect()}>
          断开连接
        </Button>,
        <div key="spacer" style={{ flex: 1 }} />,
        <Button key="cancel" onClick={close}>{isView ? '关闭' : '取消'}</Button>,
        !isView && <Button key="test" loading={testing} onClick={() => { setTesting(true); bridge.testConnection?.(); setTimeout(() => setTesting(false), 800); }}>测试连接</Button>,
        !isView && <Button key="reauth" hidden={!isExisting} onClick={() => bridge.reauth?.()}>重新授权</Button>,
        !isView && <Button key="save" type="primary" onClick={submit}>保存</Button>,
      ].filter(Boolean)}
      footerStyle={{ display: 'flex', alignItems: 'center' }}
    >
      <Form form={form} layout="vertical">
        {/* 基本信息 */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>基本信息</div>
        <Form.Item label="环境名" name="name" rules={[{ required: true, message: '请输入环境名' }]}>
          <Input placeholder="为该环境取一个唯一名称" disabled={isExisting} />
        </Form.Item>
        <Form.Item label="环境类型" name="product" rules={[{ required: connMode !== 'auth', message: '请选择环境类型' }]}>
          <Select disabled={isExisting} options={[{ value: '', label: '请选择环境类型' }, { value: 'XK', label: 'AI 套件' }, { value: 'XH', label: 'AI 星瀚' }]} />
        </Form.Item>
        <Form.Item label="环境地址" name="url" rules={[{ required: true, message: '请输入环境地址' }]}>
          <Input placeholder="http://192.168.1.100:8080" disabled={isExisting} />
        </Form.Item>
        {connMode !== 'auth' && (
          <Form.Item label={<span>数据中心 <span style={{ color: 'var(--danger)' }}>*</span></span>} name="dataCenter">
            <Select placeholder="请选择数据中心" disabled={isExisting}
              options={dataCenters.map((d) => ({ value: d.id, label: `${d.name}（${d.id}）` }))} />
          </Form.Item>
        )}

        {/* 授权类型 */}
        {!isExisting && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 12, color: 'var(--text-secondary)' }}>授权类型</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div
                onClick={() => setConnMode('auth')}
                style={{ flex: 1, padding: '12px 14px', border: connMode === 'auth' ? '2px solid var(--brand)' : '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', background: connMode === 'auth' ? 'var(--brand-light)' : 'var(--bg)' }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>OAuth 授权</div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>在浏览器登录 ERP 并确认授权</div>
              </div>
              <div
                onClick={() => setConnMode('cred')}
                style={{ flex: 1, padding: '12px 14px', border: connMode === 'cred' ? '2px solid var(--brand)' : '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', background: connMode === 'cred' ? 'var(--brand-light)' : 'var(--bg)' }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>第三方应用</div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>填写应用 ID 与密钥</div>
              </div>
            </div>
          </>
        )}

        {/* OAuth 说明 */}
        {connMode === 'auth' && (
          <div style={{ padding: '12px 14px', background: 'var(--hover)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div>• 点「保存」后在浏览器登录并确认授权</div>
            <div>• 数据中心在 ERP 的授权页面里选择</div>
            <div>• 授权完成后数据中心回填到这条配置</div>
          </div>
        )}

        {/* 凭证 */}
        {connMode !== 'auth' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 12, color: 'var(--text-secondary)' }}>连接凭证</div>
            <div style={{ padding: '8px 12px', background: 'var(--hover)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: 'var(--text-soft)' }}>
              请确保 ERP 第三方应用的「代理用户控制」已关闭
            </div>
            <Form.Item label="第三方应用 ID (client_id)" name="clientId" rules={[{ required: connMode !== 'auth', message: '请输入应用 ID' }]}>
              <Input disabled={isView} />
            </Form.Item>
            <Form.Item label="第三方应用密钥 (client_secret)" name="clientSecret" rules={[{ required: connMode !== 'auth', message: '请输入密钥' }]}>
              <Input.Password disabled={isView} />
            </Form.Item>
            <Form.Item label="网关标识 (x-acgw-identity)" name="gateway" hidden={form.getFieldValue('product') !== 'XK'}>
              <Input.Password disabled={isView} />
            </Form.Item>
          </>
        )}

        {/* 历史 AccessToken 认证 */}
        {isExisting && !initialData?.normalAuthEnabled && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 12, color: 'var(--text-secondary)' }}>普通 Access Token 认证</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>普通 Access Token 认证 <span style={{ fontSize: 12, color: normalAuthEnabled ? 'var(--success)' : 'var(--text-soft)' }}>{normalAuthEnabled ? '已启用' : '未启用'}</span></div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{normalAuthEnabled ? '保存后切换为普通 AccessToken 认证，不可恢复。' : '该环境仍使用历史认证方式，需要填写代理用户。'}</div>
              </div>
              <Switch checked={normalAuthEnabled} disabled={isView} onChange={(v) => { if (!v) { setNormalAuthEnabled(false); } else { bridge.toggleNormalAuth?.(); } }} />
            </div>
            {!normalAuthEnabled && (
              <Form.Item label="代理用户" name="proxyUser" rules={[{ required: !normalAuthEnabled, message: '请输入代理用户' }]}>
                <Input disabled={isView} />
              </Form.Item>
            )}
          </>
        )}

        <Form.Item label={<span>设为默认环境</span>} name="isDefault" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ---------- 授权等待页 ---------- */
function EnvAuthorizeModal() {
  const openModal = useOpenBridgeModal('envAuthorize');
  const bridge = useBridgeNamespace('envAuthorize');
  const open = openModal === 'env-authorize';
  const [state, setState] = useState('waiting');

  useEffect(() => {
    if (open) {
      setState('waiting');
      const timer = setTimeout(() => setState('failed'), 3000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!bridge) return null;
  function close() { bridge.close(); }

  return (
    <Modal
      title="连接 ERP"
      open={open}
      onCancel={close}
      width={440}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="alt" type="link" onClick={() => { setState('waiting'); bridge.retry?.(); }}>
          {state === 'failed' ? '重新授权' : '没有跳转？重新打开'}
        </Button>,
        <div key="spacer" style={{ flex: 1 }} />,
        <Button key="cancel" onClick={close}>取消</Button>,
      ]}
      footerStyle={{ display: 'flex', alignItems: 'center' }}
    >
      {state === 'waiting' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, fontSize: 15, fontWeight: 500 }}>已在浏览器中打开授权页面</div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.7 }}>
            请在浏览器里登录 ERP 并点击「允许」<br />完成后会自动回到这里
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            浏览器可能会询问「是否打开 Kingdee Lingee」，请选择打开。
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>浏览器没能唤起客户端</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 12 }}>授权可能已经完成，但结果没有回到客户端</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            可以尝试：<br />
            1. 回到浏览器页面，点击「打开 Kingdee Lingee」<br />
            2. 若提示已拦截，允许该站点打开应用后重试<br />
            3. 仍然不行，重新安装客户端以恢复协议注册
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- 浏览器授权页（自定义全屏 overlay） ---------- */
function ErpConsentModal() {
  const openModal = useOpenBridgeModal('consent');
  const bridge = useBridgeNamespace('consent');
  const open = openModal === 'consent';
  const [step, setStep] = useState('login'); // 'login' | 'grant'
  const [tab, setTab] = useState('qr'); // 'qr' | 'pwd'

  useEffect(() => {
    if (open) { setStep(bridge?.getStep?.() ?? 'login'); setTab('qr'); }
  }, [open, bridge]);

  const dataCenters = useMemo(() => (open ? bridge?.getDataCenters?.() ?? [] : []), [open, bridge]);
  const scopeList = useMemo(() => (open ? bridge?.getScopeList?.() ?? [] : []), [open, bridge]);

  if (!bridge) return null;
  if (!open) return null;

  function allow() { bridge.allow?.(); }
  function deny() { bridge.deny?.(); }

  return (
    <div className="consent-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="browser-window" style={{ width: 480, maxHeight: '90vh', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }}>
        {/* 浏览器 chrome */}
        <div className="browser-chrome" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f5f5f5', borderBottom: '1px solid var(--border)' }}>
          <span className="browser-dots" style={{ display: 'flex', gap: 4 }}>
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          </span>
          <div className="browser-addr" style={{ flex: 1, padding: '4px 12px', background: '#fff', borderRadius: 6, fontSize: 12, color: 'var(--text-soft)' }}>
            {step === 'grant'
              ? 'https://erp.example.com/oauth2/authorize?client_id=lingee-build'
              : 'https://erp.example.com/login'}
          </div>
        </div>

        <div className="browser-page" style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
          {step === 'login' ? (
            <div id="consentLogin">
              <div style={{ fontSize: 18, fontWeight: 600, textAlign: 'center', marginBottom: 20 }}>金蝶云 · 苍穹</div>
              <h2 style={{ textAlign: 'center', fontSize: 16, marginBottom: 20 }}>登录后继续授权</h2>
              <label className="consent-field" style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>数据中心</span>
                <select id="consentDc" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} defaultValue={dataCenters[0]?.id}>
                  {dataCenters.map((d) => <option key={d.id} value={d.id}>{d.name}（{d.id}）</option>)}
                </select>
              </label>
              <div className="consent-tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                <button className={`consent-tab ${tab === 'qr' ? 'active' : ''}`} onClick={() => setTab('qr')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: tab === 'qr' ? '2px solid var(--brand)' : '2px solid transparent', color: tab === 'qr' ? 'var(--brand)' : 'var(--text-soft)' }}>扫码登录</button>
                <button className={`consent-tab ${tab === 'pwd' ? 'active' : ''}`} onClick={() => setTab('pwd')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: tab === 'pwd' ? '2px solid var(--brand)' : '2px solid transparent', color: tab === 'pwd' ? 'var(--brand)' : 'var(--text-soft)' }}>账号登录</button>
              </div>
              {tab === 'qr' ? (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => bridge.login?.()} style={{ width: 160, height: 160, border: '2px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--bg)' }}>
                    <svg viewBox="0 0 64 64" style={{ width: 120, height: 120, margin: 'auto' }}>
                      <rect x="4" y="4" width="18" height="18" rx="2" /><rect x="9" y="9" width="8" height="8" rx="1" />
                      <rect x="42" y="4" width="18" height="18" rx="2" /><rect x="47" y="9" width="8" height="8" rx="1" />
                      <rect x="4" y="42" width="18" height="18" rx="2" /><rect x="9" y="47" width="8" height="8" rx="1" />
                      <rect x="28" y="4" width="6" height="6" /><rect x="28" y="16" width="6" height="6" />
                      <rect x="28" y="28" width="6" height="6" /><rect x="40" y="28" width="6" height="6" />
                      <rect x="52" y="28" width="6" height="6" /><rect x="28" y="40" width="6" height="6" />
                      <rect x="40" y="40" width="6" height="6" /><rect x="52" y="52" width="6" height="6" />
                    </svg>
                  </button>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-soft)' }}>请用金蝶云之家扫码登录<br />（原型里点二维码即视为扫码成功）</div>
                </div>
              ) : (
                <div>
                  <label className="consent-field" style={{ display: 'block', marginBottom: 12 }}>
                    <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>用户名</span>
                    <input type="text" placeholder="手机号 / 邮箱 / 用户名" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, boxSizing: 'border-box' }} />
                  </label>
                  <label className="consent-field" style={{ display: 'block', marginBottom: 16 }}>
                    <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>密码</span>
                    <input type="password" placeholder="请输入密码" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, boxSizing: 'border-box' }} />
                  </label>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={() => bridge.login?.()} style={{ padding: '8px 24px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>登录</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div id="consentGrant">
              <div style={{ fontSize: 18, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>金蝶云 · 苍穹</div>
              <h2 style={{ textAlign: 'center', fontSize: 16, marginBottom: 12 }}>灵基 Build 请求访问你的 ERP</h2>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                当前登录 <b>吴**超</b> · 数据中心 <span>{dataCenters[0]?.name || '—'}</span>
                <button onClick={() => bridge.switchAccount?.()} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 12 }}>切换账号</button>
              </p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>将授予以下 {scopeList.length} 项 API 权限</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {scopeList.map((s) => (
                    <li key={s.path} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span>{s.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{s.path}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>授权后可在 ERP 的「我的授权」里随时撤销。</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={deny} style={{ padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'var(--bg)' }}>拒绝</button>
                <button onClick={allow} style={{ padding: '8px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>允许</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 断开连接确认 ---------- */
function EnvDisconnectModal() {
  const openModal = useOpenBridgeModal('envDisconnect');
  const bridge = useBridgeNamespace('envDisconnect');
  const open = openModal === 'env-disconnect';

  if (!bridge) return null;
  function close() { bridge.close(); }
  const envName = bridge.getEnvName?.() || '该环境';

  return (
    <Modal
      title="断开连接"
      open={open}
      onCancel={close}
      width={440}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>取消</Button>,
        <Button key="confirm" type="primary" danger onClick={() => bridge.confirm?.()}>断开连接</Button>,
      ]}
    >
      <p style={{ fontSize: 14, marginBottom: 12 }}>确定要断开与 <b>{envName}</b> 的连接吗？</p>
      <div style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.7 }}>
        <p style={{ margin: '0 0 8px' }}>客户端会通知 ERP 作废这条授权，并删除本机保存的凭证。断开后该环境下的智能体将无法访问 ERP 数据。</p>
        <p style={{ margin: 0 }}>需要恢复时重新授权即可，环境配置不会丢失。</p>
      </div>
    </Modal>
  );
}

/* ---------- 启用 AccessToken 确认 ---------- */
function EnvAuthConfirmModal() {
  const openModal = useOpenBridgeModal('envAuthConfirm');
  const bridge = useBridgeNamespace('envAuthConfirm');
  const open = openModal === 'env-auth-confirm';

  if (!bridge) return null;
  function close() { bridge.close(); }

  return (
    <Modal
      title="启用普通 AccessToken 认证？"
      open={open}
      onCancel={close}
      width={440}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>取消</Button>,
        <Button key="confirm" type="primary" danger onClick={() => bridge.confirm?.()}>确认启用</Button>,
      ]}
    >
      <p style={{ fontSize: 14 }}>保存后将切换为普通 AccessToken 认证，且不能切回原有认证方式。</p>
    </Modal>
  );
}

/* ---------- 统一导出 ---------- */
export default function EnvModals() {
  return (
    <>
      <EnvConfigModal />
      <EnvAuthorizeModal />
      <ErpConsentModal />
      <EnvDisconnectModal />
      <EnvAuthConfirmModal />
    </>
  );
}

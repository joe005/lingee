import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Tabs, Radio, Button, Tag, Typography } from 'antd';
import Icon from '../icons/Icon';
import { useOpenBridgeModal, useBridgeNamespace, useBridgeVersion } from '../../hooks/useLingeeBridge';

const { TextArea } = Input;
const { Text } = Typography;

/* 专家/专家团系统的 4 个弹窗（Phase 2c），见 docs/react-migration-plan.md。
   和 CollabModals.jsx 一样的桥接模式：打开哪个弹窗、提交后做什么，全部
   读/调 window.__lingeeBridge.expert / expertEdit / team / member——业务判断
   留在 src/scripts/main.js。挂载在 App.jsx 路由外，作为常驻兄弟节点。 */

/* ---------- 专家详情弹窗 ---------- */
function ExpertDetailModal() {
  const openModal = useOpenBridgeModal('expert');
  const bridge = useBridgeNamespace('expert');
  const open = openModal === 'expert-detail';
  const expertId = open ? bridge?.getExpertId?.() : null;

  const expert = useMemo(() => {
    if (!open || !bridge || !expertId) return null;
    return bridge.getExpert(expertId);
  }, [open, bridge, expertId]);

  if (!bridge) return null;

  function close() { bridge.close(); }

  const av = expert ? bridge.getAvatar(expert.k) : '';

  return (
    <Modal
      title={null}
      open={open}
      onCancel={close}
      footer={null}
      width={520}
      rootClassName="cv-modal-scope"
      closeIcon={null}
    >
      {expert && (
        <>
          <div className="x-detail-head" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <img className="x-av-lg" src={av} alt="" style={{ width: 56, height: 56, borderRadius: '50%' }} />
            <div>
              <div className="modal-title" style={{ fontSize: 17, fontWeight: 600 }}>
                {expert.name}
                {expert.ro && <span className="x-badge x-badge-ro" style={{ marginLeft: 6 }}>只读</span>}
              </div>
              <div className="x-sub" style={{ fontSize: 13, color: 'var(--text-soft)' }}>{expert.role} · {expert.by}</div>
            </div>
            <button type="button" className="modal-close" onClick={close} aria-label="关闭" style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
          </div>

          <div className="x-sec x-desc" style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{expert.desc}</div>

          {expert.cmds && expert.cmds.length > 0 && (
            <div className="x-sec" style={{ marginBottom: 16 }}>
              <div className="x-sec-t" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>常见触发词</div>
              {expert.cmds.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className="x-cmd"
                  onClick={() => bridge.callExpert(expert.id, c[0])}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6, cursor: 'pointer', background: 'var(--bg)', transition: 'border-color .15s' }}
                >
                  <span className="x-cmd-b" style={{ flex: 1, textAlign: 'left' }}>
                    <span className="x-cmd-q" style={{ fontSize: 14 }}>“{c[0]}”</span>
                    {c[1] && <span className="x-cmd-d" style={{ display: 'block', fontSize: 12, color: 'var(--text-soft)' }}>{c[1]}</span>}
                  </span>
                  <Icon name="message-circle" size={16} color="var(--brand)" />
                </button>
              ))}
            </div>
          )}

          {expert.skills && expert.skills.length > 0 && (
            <div className="x-sec" style={{ marginBottom: 16 }}>
              <div className="x-sec-t" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>挂载技能</div>
              <div className="x-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {expert.skills.map((s) => <Tag key={s}>{s}</Tag>)}
              </div>
            </div>
          )}

          <div className="x-sec" style={{ marginBottom: 16 }}>
            <div className="x-sec-t" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>能力项</div>
            <div className="x-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {expert.comp.map((c, i) => <Tag key={i} className="ptag ptag-comp" title={c.id}>{c.name}{c.level && <i className={`ptag-lv lv-${c.lv}`}>{c.level}</i>}</Tag>)}
            </div>
          </div>

          <div className="x-sec" style={{ marginBottom: 16 }}>
            <div className="x-sec-t" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>可承担的工作</div>
            <div className="x-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {expert.modes.map((m) => <Tag key={m}>{m}</Tag>)}
            </div>
          </div>

          <div className="modal-footer team-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {expert.mine && (
              <Button type="link" danger onClick={() => bridge.deleteExpert(expert.id)}>删除该专家</Button>
            )}
            <div style={{ flex: 1 }} />
            {expert.mine && (
              <Button onClick={() => bridge.editExpert(expert.id)}>编辑</Button>
            )}
            <Button type="primary" onClick={() => bridge.callExpert(expert.id)}>
              <Icon name="phone" size={14} />
              召唤专家
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- 创建 / 编辑专家弹窗 ---------- */
function ExpertEditModal() {
  const openModal = useOpenBridgeModal('expertEdit');
  const bridge = useBridgeNamespace('expertEdit');
  const open = openModal === 'expert-edit';
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('base');
  const [avatar, setAvatar] = useState('eng');
  const [modes, setModes] = useState(['分析', '设计', '实现']);
  const [cmds, setCmds] = useState([['', '']]);

  const avatars = useMemo(() => (open ? bridge?.getAvatars?.() ?? [] : []), [open, bridge]);
  const workModes = useMemo(() => (open ? bridge?.getWorkModes?.() ?? [] : []), [open, bridge]);

  useEffect(() => {
    if (open && bridge) {
      const data = bridge.getInitialData();
      if (data) {
        form.setFieldsValue({ name: data.name, role: data.role, desc: data.desc, tags: data.tags.join('、'), comp: data.comp.join('、'), visibility: data.visibility });
        setAvatar(data.k);
        setModes(data.modes.slice());
        setCmds(data.cmds.length ? data.cmds.map((c) => c.slice()) : [['', '']]);
      }
      setActiveTab('base');
    }
  }, [open, bridge, form]);

  if (!bridge) return null;
  function close() { bridge.close(); }

  function toggleMode(m) {
    setModes((prev) => prev.indexOf(m) >= 0 ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  async function submit() {
    try {
      const values = await form.validateFields();
      const draft = {
        k: avatar,
        name: values.name?.trim() || '',
        role: values.role?.trim() || '',
        desc: values.desc?.trim() || '',
        visibility: values.visibility || 'workspace',
        tags: (values.tags || '').split(/[、,，\n]/).map((x) => x.trim()).filter(Boolean),
        modes: modes.slice(),
        comp: (values.comp || '').split(/[、,，\n]/).map((x) => x.trim()).filter(Boolean),
        cmds: cmds.map((c) => [String(c[0] || '').trim(), String(c[1] || '').trim()]).filter((c) => c[0]),
      };
      bridge.save(draft);
    } catch { /* antd Form 校验错误已展示 */ }
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="pencil" size={18} color="var(--brand)" />
          {bridge.getEditingId?.() ? '编辑专家' : '创建专家'}
        </span>
      }
      open={open}
      onCancel={close}
      width={560}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="delete" type="link" danger hidden={!bridge.getEditingId?.()} onClick={() => bridge.delete(bridge.getEditingId())}>删除该专家</Button>,
        <div key="spacer" style={{ flex: 1 }} />,
        <Button key="cancel" onClick={close}>取消</Button>,
        <Button key="save" type="primary" onClick={submit}>保存</Button>,
      ]}
      footerStyle={{ display: 'flex', alignItems: 'center' }}
    >
      {/* 一句话创建入口 */}
      <button
        type="button"
        className="x-chat-entry"
        onClick={() => bridge.startByChat?.()}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', background: 'var(--bg)' }}
      >
        <span className="x-chat-ic"><Icon name="message-circle" size={20} color="var(--brand)" /></span>
        <span className="x-chat-b" style={{ flex: 1, textAlign: 'left' }}>
          <span className="x-chat-t" style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>不想填表单？一句话交给 expert-manager</span>
          <span className="x-chat-d" style={{ display: 'block', fontSize: 12, color: 'var(--text-soft)' }}>在对话里描述你要什么样的专家，它会问清背景后帮你建好</span>
        </span>
        <Icon name="chevron-right" size={16} color="var(--text-muted)" />
      </button>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'base',
            label: '专家',
            children: (
              <Form form={form} layout="vertical" initialValues={{ visibility: 'workspace' }}>
                <Form.Item label="名称" name="name" rules={[{ required: true, message: '请填写专家名称' }]}>
                  <Input placeholder="例如：苍穹工作流开发专家" />
                </Form.Item>
                <Form.Item label="职称" name="role" rules={[{ required: true, message: '请填写职称' }]}>
                  <Input placeholder="例如：苍穹流程建模师" />
                </Form.Item>
                <Form.Item label="简介" name="desc">
                  <TextArea rows={2} placeholder="他深耕什么领域、擅长什么、能帮你解决什么" />
                </Form.Item>
                <Form.Item label="标签" name="tags">
                  <Input placeholder="用逗号分隔，例如：流程建模, 苍穹工作流, 流程设计" />
                </Form.Item>

                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>头像</div>
                <div className="x-av-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {avatars.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={'x-av-opt' + (avatar === k ? ' on' : '')}
                      onClick={() => setAvatar(k)}
                      style={{ border: avatar === k ? '2px solid var(--brand)' : '2px solid var(--border)', borderRadius: '50%', padding: 2, cursor: 'pointer', background: 'var(--bg)' }}
                    >
                      <img src={bridge.getAvatar(k)} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    </button>
                  ))}
                </div>

                <Form.Item label="可见性" name="visibility">
                  <Radio.Group>
                    <Radio value="workspace">工作区</Radio>
                    <Radio value="private">个人</Radio>
                  </Radio.Group>
                </Form.Item>

                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>可承担的工作 <span style={{ color: 'var(--danger)' }}>*</span></div>
                <div className="x-mode-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {workModes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={'x-mode-opt' + (modes.indexOf(m) >= 0 ? ' on' : '')}
                      onClick={() => toggleMode(m)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: modes.indexOf(m) >= 0 ? '1px solid var(--brand)' : '1px solid var(--border)',
                        background: modes.indexOf(m) >= 0 ? 'var(--brand-light)' : 'var(--bg)', cursor: 'pointer', fontSize: 13,
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Form>
            ),
          },
          {
            key: 'more',
            label: '触发词与工作方式',
            children: (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>常见触发词</div>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                  用户平时会怎么说。需要用户提供的内容写成 [方括号]
                </Text>
                {cmds.map((c, i) => (
                  <div key={i} className="x-cmd-row" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Input
                      value={c[0]}
                      onChange={(e) => setCmds((prev) => prev.map((x, j) => j === i ? [e.target.value, x[1]] : x))}
                      placeholder="例如：按[验收条件]把功能实现出来"
                    />
                    <Button type="text" danger onClick={() => setCmds((prev) => {
                      const next = prev.filter((_, j) => j !== i);
                      return next.length ? next : [['', '']];
                    })}>
                      <Icon name="close" size={14} />
                    </Button>
                  </div>
                ))}
                <Button type="dashed" onClick={() => setCmds((prev) => [...prev, ['', '']])} style={{ width: '100%' }}>
                  ＋ 添加一条
                </Button>

                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                  <Form.Item label="能力项" name="comp">
                    <Input placeholder="用逗号分隔，例如：cosmic.workflow · advanced" />
                  </Form.Item>
                </Form>
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
}

/* ---------- 专家团配置弹窗 ---------- */
function TeamConfigModal() {
  const openModal = useOpenBridgeModal('team');
  const bridge = useBridgeNamespace('team');
  const version = useBridgeVersion('team');
  const open = openModal === 'team-config';
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('base');

  // 每次打开或 version 变化时重新读取 draft。version 来自 bridge.touch()，
  // 在 useMemo 的计算函数里不直接使用，但必须出现在依赖数组里才能触发重读取。
  /* eslint-disable react-hooks/exhaustive-deps */
  const draft = useMemo(() => {
    if (!open || !bridge) return null;
    return bridge.getDraft();
  }, [open, bridge, version]);

  const flow = useMemo(() => (draft ? bridge?.getFlow?.(draft) ?? [] : []), [draft, bridge, version]);
  const coverage = useMemo(() => (draft ? bridge?.getCoverage?.(draft) ?? [] : []), [draft, bridge, version]);
  const warnings = useMemo(() => (draft ? bridge?.getWarnings?.(draft) ?? [] : []), [draft, bridge, version]);
  const activeGates = useMemo(() => (draft ? bridge?.getActiveGates?.(draft, flow) ?? [] : []), [draft, flow, bridge, version]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (open && bridge) {
      const data = bridge.getInitialData();
      if (data) {
        form.setFieldsValue({ name: data.name, desc: data.desc, visibility: data.visibility });
      }
      setActiveTab('base');
    }
  }, [open, bridge, form]);

  if (!bridge) return null;
  function close() { bridge.close(); }

  const isPreset = draft?.preset;
  const editingId = bridge.getEditingId?.();

  async function submit() {
    try {
      const values = await form.validateFields();
      const teamDraft = bridge.getDraft();
      const payload = {
        ...teamDraft,
        name: values.name?.trim() || '',
        desc: values.desc?.trim() || '',
        visibility: values.visibility || 'workspace',
      };
      bridge.save(payload);
    } catch { /* antd Form 校验错误已展示 */ }
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="user-check" size={18} color="var(--brand)" />
          {editingId ? (isPreset ? draft.name : '编辑专家团') : '新建专家团'}
        </span>
      }
      open={open}
      onCancel={close}
      width={600}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="delete" type="link" danger hidden={isPreset || !editingId} onClick={() => bridge.delete(editingId)}>删除该专家团</Button>,
        <div key="spacer" style={{ flex: 1 }} />,
        <Button key="cancel" onClick={close}>{isPreset ? '取消' : '取消'}</Button>,
        <Button key="call" hidden={!editingId} onClick={() => bridge.callTeam(editingId)}>召唤专家团</Button>,
        <Button key="save" type={isPreset ? 'default' : 'primary'} onClick={submit}>{isPreset ? '另存为我的专家团' : '保存'}</Button>,
      ]}
      footerStyle={{ display: 'flex', alignItems: 'center' }}
    >
      {isPreset && (
        <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--hover)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          内置专家团由官方维护，仅供查看。可另存为自己的专家团后再调整。
        </div>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'base',
            label: <span>团队{warnings.length > 0 && <span className="modal-tab-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', marginLeft: 4 }} />}</span>,
            children: (
              <>
                <Form form={form} layout="vertical" initialValues={{ visibility: 'workspace' }}>
                  <Form.Item label="名称" name="name" rules={[{ required: true, message: '请填写专家团名称' }]}>
                    <Input placeholder="给这个专家团起个名字" disabled={isPreset} />
                  </Form.Item>
                  <Form.Item label="说明" name="desc">
                    <TextArea rows={2} placeholder="它擅长什么、适合什么场景" disabled={isPreset} />
                  </Form.Item>
                  <Form.Item label="可见性" name="visibility">
                    <Radio.Group disabled={isPreset}>
                      <Radio value="workspace">工作区</Radio>
                      <Radio value="private">个人</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Form>

                {/* 成员列表 */}
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                  成员 {draft?.members?.length || 0}
                  <span style={{ fontWeight: 400, color: 'var(--text-soft)', marginLeft: 8 }}>点名字看定义，星标设组长</span>
                </div>
                <div className="team-members" style={{ marginBottom: 8 }}>
                  {draft?.members?.length ? draft.members.map((id) => {
                    const e = bridge.getExpert(id);
                    if (!e) return null;
                    const isLead = draft.leadId === id;
                    return (
                      <div key={id} className="x-member" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                        <img src={bridge.getAvatar(e.k)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer' }} onClick={() => bridge.viewExpert(id)} />
                        <div className="x-member-b" style={{ flex: 1, cursor: 'pointer' }} onClick={() => bridge.viewExpert(id)}>
                          <div className="x-member-n" style={{ fontSize: 14, fontWeight: 500 }}>
                            {e.name}
                            {isLead && <span className="x-badge x-badge-lead" style={{ marginLeft: 6 }}>组长</span>}
                            {e.ro && <span className="x-badge x-badge-ro" style={{ marginLeft: 6 }}>只读</span>}
                          </div>
                          <div className="x-member-r" style={{ fontSize: 12, color: 'var(--text-soft)' }}>{e.role} · 可承担 {e.modes.join(' / ')}</div>
                        </div>
                        {!isPreset && (
                          <div className="x-member-a" style={{ display: 'flex', gap: 4 }}>
                            {!isLead && <button type="button" className="x-ic" onClick={() => bridge.setLead(id)} title="设为组长" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>☆</button>}
                            <button type="button" className="x-ic x-ic-dg" onClick={() => bridge.removeMember(id)} title="移出" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>✕</button>
                          </div>
                        )}
                      </div>
                    );
                  }) : <div className="x-empty-sm" style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-soft)' }}>还没有成员</div>}
                </div>
                {!isPreset && (
                  <Button type="dashed" onClick={() => bridge.openMemberPicker?.()} style={{ width: '100%' }}>＋ 添加成员</Button>
                )}

                {/* 能力覆盖 */}
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 16, marginBottom: 8 }}>能力覆盖</div>
                <div className="x-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {coverage.length ? coverage.map((c, i) => (
                    <Tag key={i} className="ptag ptag-comp" title={c.id}>{c.name}{c.level && <i className={`ptag-lv lv-${c.lv}`}>{c.level}</i>}</Tag>
                  )) : <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>还没有成员，能力覆盖为空</span>}
                </div>

                {/* 警告 */}
                {warnings.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    {warnings.map((w, i) => (
                      <div key={i} className="x-warn" style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 13, color: 'var(--warning)' }}>
                        <span>⚠</span><span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ),
          },
          {
            key: 'more',
            label: <span>触发词与流程{flow.filter((s) => !s.who).length > 0 && <span className="modal-tab-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', marginLeft: 4 }} />}</span>,
            children: (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>常见触发词</div>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                  {isPreset ? '点任意一条就会带着这个团开一个新会话。' : '用户平时会怎么找这个团做事。点「召唤专家团」会带上第一条。'}
                </Text>
                <div style={{ marginBottom: 16 }}>
                  {isPreset
                    ? (draft?.cmds?.filter((c) => c[0]).map((c, i) => (
                        <button key={i} type="button" className="x-cmd x-cmd-1" onClick={() => bridge.callTeamWithCmd(editingId, c[0])} title={c[1] || ''} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6, cursor: 'pointer', background: 'var(--bg)' }}>
                          <span className="x-cmd-b" style={{ flex: 1, textAlign: 'left' }}><span className="x-cmd-q">“{c[0]}”</span></span>
                          <Icon name="message-circle" size={16} color="var(--brand)" />
                        </button>
                      )) || <div className="x-empty-sm">这个团还没有触发词</div>)
                    : (<>
                        {draft?.cmds?.map((c, i) => (
                          <div key={i} className="x-cmd-row" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <Input
                              value={c[0]}
                              onChange={(e) => bridge.updateCmd(i, 0, e.target.value)}
                              placeholder="例如：帮我把这个想法做成能上线的功能"
                            />
                            <Button type="text" danger onClick={() => bridge.removeCmd(i)}>
                              <Icon name="close" size={14} />
                            </Button>
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => bridge.addCmd()} style={{ width: '100%' }}>＋ 添加一条</Button>
                      </>)
                  }
                </div>

                {/* 运行流程 */}
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>运行流程</div>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                  {flow.length} 步{activeGates.length ? `，${activeGates.length} 个人工确认` : ''}{flow.filter((s) => !s.who).length ? `，${flow.filter((s) => !s.who).length} 步无人可领` : ''}
                </Text>
                <div className="team-flow" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  {flow.map((s, i) => (
                    <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {i > 0 && <span className="x-ar">→</span>}
                      <div className={'x-node' + (s.who ? '' : ' miss')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: s.who ? '1px solid var(--border)' : '1px solid var(--warning)', background: 'var(--bg)' }}>
                        {s.who ? <img src={bridge.getAvatar(bridge.getExpert(s.who)?.k)} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} /> : null}
                        <div>
                          <b style={{ fontSize: 13 }}>{s.title}<span className="x-kind" style={{ fontSize: 11, color: 'var(--text-soft)', marginLeft: 4 }}>{s.k}</span></b>
                          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{s.who ? bridge.getExpert(s.who)?.name : '⚠ 无人可领'}</div>
                        </div>
                      </div>
                      {bridge.hasGate?.(draft, s.id) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="x-ar">→</span>
                          <div className="x-gate" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--warning)', background: 'var(--bg)' }}>
                            <Icon name="shield" size={16} color="var(--warning)" />
                            <div>
                              <b style={{ fontSize: 13 }}>人工确认<span className="x-kind" style={{ fontSize: 11, color: 'var(--text-soft)', marginLeft: 4 }}>gate</span></b>
                              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{s.title}后</div>
                            </div>
                            {!isPreset && <button type="button" className="x-ic x-ic-dg" onClick={() => bridge.toggleGate(draft, s.id)} title="移除">✕</button>}
                          </div>
                        </span>
                      )}
                      {!isPreset && !bridge.hasGate?.(draft, s.id) && (
                        <button type="button" className="x-gate-add" onClick={() => bridge.toggleGate(draft, s.id)} title={`在「${s.title}」之后插入人工确认`} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', color: 'var(--text-soft)' }}>＋</button>
                      )}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 12 }}>
                  {isPreset
                    ? (activeGates.length ? `这个团在 ${activeGates.length} 个步骤后需要人工确认，内置团不可改。` : '这个团全程自动流转，没有人工确认节点。')
                    : '点步骤之间的 ＋ 可插入人工审核确认节点，到这里编排会暂停等人点过才继续。'}
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--hover)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {(draft?.members?.length || 0) > 1
                    ? `${draft.members.length} 位成员 → 以 mode: team 运行，任务在成员间按依赖顺序流转。`
                    : '单一成员 → 以 mode: personal 运行，串行执行。'}
                  {activeGates.length ? ` 其中 ${activeGates.length} 个步骤后会停下来等人确认。` : ''}
                </div>
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
}

/* ---------- 添加成员弹窗 ---------- */
function MemberPickerModal() {
  const openModal = useOpenBridgeModal('member');
  const bridge = useBridgeNamespace('member');
  const teamVersion = useBridgeVersion('team'); // 订阅 team draft 变化以更新 isMember 标记
  const open = openModal === 'member-picker';
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (open) setKeyword('');
  }, [open]);

  // teamVersion 触发重读取（memberModal 修改 teamDraft 后 bridge.touch() 递增 version）
  /* eslint-disable react-hooks/exhaustive-deps */
  const members = useMemo(() => {
    if (!open || !bridge) return [];
    return bridge.getMembers(keyword);
  }, [open, bridge, keyword, teamVersion]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!bridge) return null;
  function close() { bridge.close(); }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="user-plus" size={18} color="var(--brand)" />
          添加成员
        </span>
      }
      open={open}
      onCancel={close}
      width={480}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="done" type="primary" onClick={close}>完成</Button>,
      ]}
    >
      <Input
        allowClear
        prefix={<Icon name="search" size={14} />}
        placeholder="搜索专家、职业或能力"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {members.length === 0 && <div className="x-empty-sm" style={{ padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-soft)' }}>没有匹配的专家</div>}
        {members.map((e) => {
          const isMember = e.isMember;
          return (
            <button
              key={e.id}
              type="button"
              className={'x-mrow' + (isMember ? ' on' : '')}
              onClick={() => bridge.toggleMember(e.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
                border: isMember ? '1px solid var(--brand)' : '1px solid var(--border)', borderRadius: 10,
                marginBottom: 6, cursor: 'pointer', background: isMember ? 'var(--brand-light)' : 'var(--bg)',
              }}
            >
              <img src={bridge.getAvatar(e.k)} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <span className="x-mrow-b" style={{ flex: 1, textAlign: 'left' }}>
                <span className="x-mrow-n" style={{ fontSize: 14, fontWeight: 500 }}>
                  {e.name}
                  {isMember && <span className="x-badge x-badge-lead" style={{ marginLeft: 6 }}>已加入</span>}
                  {e.ro && <span className="x-badge x-badge-ro" style={{ marginLeft: 6 }}>只读</span>}
                </span>
                <span className="x-mrow-d" style={{ display: 'block', fontSize: 12, color: 'var(--text-soft)' }}>{e.desc}</span>
                <span className="x-mrow-m" style={{ display: 'block', fontSize: 12, color: 'var(--text-soft)' }}>{e.modes.join(' / ')}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* ---------- 统一导出 ---------- */
export default function ExpertModals() {
  return (
    <>
      <ExpertDetailModal />
      <ExpertEditModal />
      <TeamConfigModal />
      <MemberPickerModal />
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Button, Row, Col, Typography } from 'antd';
import Icon from '../icons/Icon';
import { useOpenCollabModal, useCollabBridge } from '../../hooks/useCollabBridge';

const { TextArea } = Input;
const { Text } = Typography;

/* 协作开发的 7 个弹窗（同步任务/执行/转交/扭转/评审/添加人员/新建项目），
   见 docs/react-migration-plan.md Phase 2。这里只负责"显示 + 收集表单值"，
   打开哪个弹窗、提交后做什么，全部读/调 window.__lingeeBridge.collab——
   业务判断留在 src/scripts/main.js，不在这里重新发明。

   挂载位置：App.jsx 里作为一个始终挂载的兄弟节点（不挂在 <Routes> 下），
   因为协作开发页本身还是 100% vanilla、不在 React 路由里；antd Modal 默认
   通过 portal 渲染到 document.body，不依赖 #react-view-root 是否可见，
   所以这个组件即使在 react-view-root 被隐藏时也能正常弹出。 */

const COLLAB_MODES = [
  { key: '人人协作', badge: 'H', bg: 'linear-gradient(135deg,#7c5cfc,#5b8def)' },
  { key: '人Agent协作', badge: 'AI', bg: 'linear-gradient(135deg,#34c07a,var(--success))' },
  { key: 'Agent间协作', badge: 'A', bg: 'linear-gradient(135deg,var(--dot-blue),#5b8def)' },
  { key: '无需协作', badge: '—', bg: 'var(--border-hover)', color: 'var(--text-secondary)' },
];

function CollabModeGrid({ value, onChange }) {
  return (
    <div className="sync-collab-options">
      {COLLAB_MODES.map((m) => (
        <div
          key={m.key}
          className={'sync-collab-option' + (value === m.key ? ' sync-collab-option--selected' : '')}
          onClick={() => onChange(m.key)}
        >
          <div className="sync-collab-icon" style={{ background: m.bg, color: m.color }}>
            {m.badge}
          </div>
          <span className="sync-collab-name">{m.key}</span>
        </div>
      ))}
    </div>
  );
}

function PersonList({ people, value, onChange, emptyText }) {
  if (!people.length) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-soft)', fontSize: 12.5 }}>
        {emptyText}
      </div>
    );
  }
  return (
    <div className="person-list">
      {people.map((p) => (
        <button
          key={p.name}
          type="button"
          className={'person-item' + (value === p.name ? ' person-item--selected' : '')}
          onClick={() => onChange(p.name)}
        >
          <div className="person-avatar-sm">{p.name[0]}</div>
          <div>
            <div className="person-name-sm">{p.name}</div>
            <div className="person-role-sm">{p.roles.join(' · ')}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ArtifactRows({ artifacts }) {
  return (
    <div className="artifact-list">
      {artifacts.map((a) => (
        <div className="artifact-row" key={a.file}>
          <div className={'artifact-icon artifact-icon--' + a.kind}>{a.badge}</div>
          <span>{a.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-soft)' }}>{a.file}</span>
        </div>
      ))}
    </div>
  );
}

const TASK_TYPE_OPTIONS = ['需求', 'Bug', '任务', '改进'].map((v) => ({ value: v, label: v }));
const PRIORITY_OPTIONS = ['高', '中', '低'].map((v) => ({ value: v, label: v }));
const SOURCE_OPTIONS = ['对话自建', 'Jira', 'TAPD', 'API', '飞书'].map((v) => ({ value: v, label: v }));
const SIZE_OPTIONS = ['小任务', '大任务'].map((v) => ({ value: v, label: v }));

function SyncTaskModal({ open, bridge }) {
  const [form] = Form.useForm();
  const [collabMode, setCollabMode] = useState('Agent间协作');

  function close() {
    bridge?.closeSync();
  }

  async function handleSubmit(action) {
    try {
      const values = await form.validateFields();
      const payload = { ...values, collab: collabMode };
      if (action === 'save') bridge?.saveSyncTask(payload);
      else bridge?.startSyncTask(payload);
    } catch {
      /* antd Form 已经把校验错误展示在字段旁，这里不用再弹 toast */
    }
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="refresh-cw" size={18} color="var(--brand)" />
          同步任务
        </span>
      }
      open={open}
      onCancel={close}
      width={560}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="save" onClick={() => handleSubmit('save')}>
          仅保存
        </Button>,
        <Button key="start" type="primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleSubmit('start')}>
          <Icon name="play" size={14} />
          启动任务
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: '需求', priority: '中', source: '对话自建', size: '小任务' }}
      >
        <Form.Item label="任务标题" name="title" rules={[{ required: true, message: '请输入任务标题' }]}>
          <Input placeholder="请输入任务标题" />
        </Form.Item>
        <Form.Item label="任务描述" name="desc">
          <TextArea rows={3} placeholder="请输入任务描述" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="任务类型" name="type">
              <Select options={TASK_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="优先级" name="priority">
              <Select options={PRIORITY_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="来源" name="source">
              <Select options={SOURCE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="任务大小" name="size">
              <Select options={SIZE_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="协作模式">
          <CollabModeGrid value={collabMode} onChange={setCollabMode} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ExecModal({ open, bridge }) {
  const [collabMode, setCollabMode] = useState('Agent间协作');
  function close() {
    bridge?.closeTaskModal('exec');
  }
  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="play" size={18} color="var(--success)" />
          执行任务
        </span>
      }
      open={open}
      onCancel={close}
      width={520}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="start" type="primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => bridge?.confirmExec(collabMode)}>
          <Icon name="play" size={14} />
          启动执行
        </Button>,
      ]}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12.5 }}>
        选择协作模式
      </Text>
      <CollabModeGrid value={collabMode} onChange={setCollabMode} />
    </Modal>
  );
}

function TransferModal({ open, bridge }) {
  const [selected, setSelected] = useState(null);
  const members = useMemo(() => (open ? bridge?.getMembers() ?? [] : []), [open, bridge]);
  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);
  function close() {
    bridge?.closeTaskModal('transfer');
  }
  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="arrow-left-right" size={18} color="var(--dot-blue)" />
          转交任务
        </span>
      }
      open={open}
      onCancel={close}
      width={520}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={() => bridge?.confirmTransfer(selected)}>
          确认转交
        </Button>,
      ]}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12.5 }}>
        选择转交人员
      </Text>
      <PersonList people={members} value={selected} onChange={setSelected} emptyText="暂无可转交人员" />
    </Modal>
  );
}

function TwistModal({ open, bridge }) {
  const workflow = useMemo(
    () => (open ? bridge?.getWorkflowState() ?? { steps: [], nextLabel: '' } : { steps: [], nextLabel: '' }),
    [open, bridge],
  );
  const artifacts = useMemo(() => (open ? bridge?.getDefaultArtifacts() ?? [] : []), [open, bridge]);
  function close() {
    bridge?.closeTaskModal('twist');
  }
  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="rotate-ccw" size={18} color="#7858f9" />
          扭转任务
        </span>
      }
      open={open}
      onCancel={close}
      width={520}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="confirm" type="primary" style={{ background: '#7858f9', borderColor: '#7858f9' }} onClick={() => bridge?.confirmTwist()}>
          扭转到下一步
        </Button>,
      ]}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12.5 }}>
        研发流程 · 当前执行节点高亮
      </Text>
      {workflow.steps.map((s) => (
        <div
          key={s.name}
          className={'workflow-step' + (s.phase === 'done' ? ' workflow-step--done' : s.phase === 'current' ? ' workflow-step--current' : '')}
        >
          <div className="workflow-step-num">
            {s.phase === 'done' ? '✓' : workflow.steps.indexOf(s) + 1}
          </div>
          <div className="workflow-step-name">{s.name}</div>
          <div className="workflow-step-status">{s.status}</div>
        </div>
      ))}
      {workflow.nextLabel && (
        <div style={{ padding: '8px 12px', fontSize: 12, color: '#7858f9', fontWeight: 600 }}>
          下一步：{workflow.nextLabel}
        </div>
      )}
      <Text type="secondary" style={{ display: 'block', margin: '16px 0 8px', fontSize: 12.5 }}>
        传递产物
      </Text>
      <ArtifactRows artifacts={artifacts} />
    </Modal>
  );
}

function ReviewModal({ open, bridge }) {
  const [selected, setSelected] = useState(null);
  const candidates = useMemo(() => (open ? bridge?.getReviewCandidates() ?? [] : []), [open, bridge]);
  const artifacts = useMemo(() => (open ? bridge?.getDefaultArtifacts() ?? [] : []), [open, bridge]);
  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);
  function close() {
    bridge?.closeTaskModal('review');
  }
  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="clipboard-check" size={18} color="var(--warning)" />
          发起评审
        </span>
      }
      open={open}
      onCancel={close}
      width={520}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="confirm" type="primary" style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => bridge?.confirmReview(selected)}>
          发起评审
        </Button>,
      ]}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12.5 }}>
        按当前执行节点匹配评审岗位
      </Text>
      <PersonList people={candidates} value={selected} onChange={setSelected} emptyText="当前节点无匹配人员" />
      <Text type="secondary" style={{ display: 'block', margin: '16px 0 8px', fontSize: 12.5 }}>
        传递产物
      </Text>
      <ArtifactRows artifacts={artifacts} />
    </Modal>
  );
}

function AddMemberModal({ open, bridge }) {
  const [level, setLevel] = useState('member');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) {
      setLevel('member');
      setQuery('');
      setSelected([]);
    }
  }, [open]);

  const results = useMemo(() => (open ? bridge?.findThirdPartyMembers(query) ?? [] : []), [open, query, bridge]);

  function toggle(person) {
    setSelected((prev) =>
      prev.some((p) => p.name === person.name) ? prev.filter((p) => p.name !== person.name) : [...prev, person],
    );
  }

  function close() {
    bridge?.closeAddMember();
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="user-plus" size={18} color="var(--brand)" />
          添加协作人员
        </span>
      }
      open={open}
      onCancel={close}
      width={520}
      rootClassName="cv-modal-scope"
      footer={[
        <span key="count" className="addmember-selected-count">
          {selected.length > 0 ? `已选择 ${selected.length} 人` : ''}
        </span>,
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={() => bridge?.confirmAddMembers(selected, level)}>
          添加选中
        </Button>,
      ]}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12.5 }}>
        从 Lingee 组织架构中选择人员，并设置其协作身份
      </Text>
      <div style={{ marginBottom: 16 }}>
        <Text style={{ display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
          添加为
        </Text>
        <div className="seg-toggle">
          <button
            type="button"
            className={'seg-toggle__btn' + (level === 'member' ? ' seg-toggle__btn--active' : '')}
            onClick={() => setLevel('member')}
          >
            <Icon name="user-plus" size={14} />
            成员<span className="seg-toggle__hint">可参与任务与评审</span>
          </button>
          <button
            type="button"
            className={'seg-toggle__btn' + (level === 'admin' ? ' seg-toggle__btn--active' : '')}
            onClick={() => setLevel('admin')}
          >
            <Icon name="user-plus" size={14} />
            管理员<span className="seg-toggle__hint">可管理人员与项目设置</span>
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Text style={{ display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
          从 Lingee 获取人员
        </Text>
        <Input
          allowClear
          prefix={<Icon name="search" size={14} />}
          placeholder="搜索姓名、邮箱..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {results.length === 0 && <div className="tp-empty">未找到可添加的人员</div>}
        {results.map((m) => {
          const checked = selected.some((p) => p.name === m.name);
          return (
            <div
              key={m.name}
              className={'tp-item' + (checked ? ' tp-item--selected' : '')}
              onClick={() => toggle(m)}
            >
              <div className="tp-avatar">{m.name[0]}</div>
              <div className="tp-info">
                <div className="tp-name">{m.name}</div>
                <div className="tp-email">{m.email}</div>
              </div>
              <div className="tp-meta">
                <span className="tp-role">{m.role}</span>
                <span className="tp-dept">{m.dept}</span>
              </div>
              <div className="tp-check">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function NewProjectModal({ open, bridge }) {
  const [form] = Form.useForm();
  const statusOptions = useMemo(
    () => (bridge?.getProjectStatusOptions() ?? []).map((s) => ({ value: s.id, label: s.label })),
    [bridge],
  );
  const ownerOptions = useMemo(() => {
    const owners = bridge?.getProjectOwnerOptions() ?? [];
    return [{ value: '', label: '暂不指定' }, ...owners.map((o) => ({ value: o, label: o }))];
  }, [bridge]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ statusId: statusOptions[0]?.value, owner: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    bridge?.closeNewProject();
  }

  async function submit() {
    try {
      const values = await form.validateFields();
      bridge?.confirmNewProject(values);
    } catch {
      /* antd Form 已经把校验错误展示在字段旁 */
    }
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="folder" size={18} color="var(--brand)" />
          新建项目
        </span>
      }
      open={open}
      onCancel={close}
      width={560}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={submit}>
          创建项目
        </Button>,
      ]}
      afterOpenChange={(isOpen) => {
        if (isOpen) form.getFieldInstance('name')?.focus();
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="请输入项目名称" autoFocus />
        </Form.Item>
        <Form.Item label="项目描述" name="desc">
          <TextArea rows={3} placeholder="简单描述这个项目要做什么（可选）" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="状态" name="statusId">
              <Select options={statusOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="负责人" name="owner">
              <Select options={ownerOptions} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="代码仓库" name="repo">
          <Input placeholder="如 group/repo，可选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function CollabModals() {
  const openModal = useOpenCollabModal();
  const bridge = useCollabBridge();
  if (!bridge) return null;

  return (
    <>
      <SyncTaskModal open={openModal === 'sync'} bridge={bridge} />
      <ExecModal open={openModal === 'exec'} bridge={bridge} />
      <TransferModal open={openModal === 'transfer'} bridge={bridge} />
      <TwistModal open={openModal === 'twist'} bridge={bridge} />
      <ReviewModal open={openModal === 'review'} bridge={bridge} />
      <AddMemberModal open={openModal === 'addmember'} bridge={bridge} />
      <NewProjectModal open={openModal === 'newproject'} bridge={bridge} />
    </>
  );
}

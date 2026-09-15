import { Modal, Typography } from 'antd';
import Icon from '../icons/Icon';
import { useOpenBridgeModal, useBridgeNamespace } from '../../hooks/useLingeeBridge';

const { Text } = Typography;

/* 快捷键帮助面板（⌘//Ctrl+/ 触发），见 docs/react-migration-plan.md Phase 2b。
   内容是纯静态展示，不需要读 main.js 的数据——只有开关状态经
   window.__lingeeBridge.shortcut 广播，跟协作开发弹窗（CollabModals.jsx）
   是同一套桥接模式。挂载位置同理：作为始终挂载的兄弟节点，不挂路由。 */
const SECTIONS = [
  {
    title: '全局',
    rows: [
      { label: '搜索会话和项目', keys: ['⌘', 'K'] },
      { label: '折叠/展开侧边栏', keys: ['⌘', 'B'] },
      { label: '新会话', keys: ['⌘', 'N'] },
      { label: '历史记录', keys: ['⌘', '⇧', 'H'] },
      { label: '显示快捷键', keys: ['⌘', '/'] },
      { label: '关闭面板/下拉', keys: ['Esc'] },
    ],
  },
  {
    title: '模式切换',
    rows: [
      { label: '技能开发', keys: ['Alt', '1'] },
      { label: '智能体开发', keys: ['Alt', '2'] },
      { label: '通用应用', keys: ['Alt', '3'] },
      { label: '苍穹应用', keys: ['Alt', '4'] },
    ],
  },
  {
    title: '输入',
    rows: [
      { label: '发送消息', keys: ['Enter'] },
      { label: '换行', keys: ['⇧', 'Enter'] },
      { label: '停止生成', keys: ['任意键'] },
    ],
  },
];

export default function ShortcutModal() {
  const openModal = useOpenBridgeModal('shortcut');
  const bridge = useBridgeNamespace('shortcut');
  if (!bridge) return null;

  function close() {
    bridge.close();
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="keyboard" size={18} color="var(--brand)" />
          键盘快捷键
        </span>
      }
      open={openModal === 'shortcut'}
      onCancel={close}
      footer={null}
      width={440}
      rootClassName="cv-modal-scope"
    >
      <div className="shortcut-list">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <div className="shortcut-section">{sec.title}</div>
            {sec.rows.map((row) => (
              <div className="shortcut-row" key={row.label}>
                <Text>{row.label}</Text>
                {row.keys.map((k, i) => (
                  <kbd key={i}>{k}</kbd>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

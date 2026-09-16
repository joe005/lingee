import { useRef, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Tag } from 'antd';
import Icon from '../components/icons/Icon';

/* 新会话页（Phase 3）。composer 输入用 ref 非受控模式（§8.3），
   发送调 bridge.composer.send(text)，模式/专家从 bridge 读取。 */
export default function NewTaskView() {
  const inputRef = useRef(null);
  const [hasText, setHasText] = useState(false);
  const [mode, setMode] = useState('');

  useEffect(() => {
    // 从 bridge 读初始模式
    const m = window.__lingeeBridge?.composer?.getMode?.() || '';
    setMode(m);
  }, []);

  function handleInput() {
    const text = inputRef.current?.textContent?.trim() || '';
    setHasText(text.length > 0);
    if (!text && inputRef.current) inputRef.current.innerHTML = '';
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const text = inputRef.current?.textContent?.trim() || '';
    if (!text) { inputRef.current?.focus(); return; }
    window.__lingeeBridge?.composer?.send?.(text);
    if (inputRef.current) inputRef.current.innerHTML = '';
    setHasText(false);
  }

  function selectMode(m) {
    window.__lingeeBridge?.composer?.setMode?.(m);
    setMode(m);
    inputRef.current?.focus();
  }

  const modes = useMemo(() => window.__lingeeBridge?.composer?.getModes?.() || [], []);

  const addMenuItems = [
    { key: 'file', label: '添加文件', children: [
      { key: 'attach', label: '本地文件', onClick: () => window.__lingeeBridge?.composer?.openFilePicker?.() },
      { key: 'folder', label: '引用文件夹', onClick: () => window.__lingeeBridge?.composer?.openFilePicker?.() },
      { key: 'knowledge', label: '知识库', onClick: () => window.__lingeeBridge?.composer?.openFilePicker?.() },
    ]},
    { key: 'mode', label: '模式', children: modes.map(m => ({
      key: m, label: m, onClick: () => selectMode(m),
    }))},
    { key: 'connector', label: '连接器', onClick: () => window.__lingeeBridge?.toast?.('连接器功能') },
  ];

  return (
    <div className="main-center" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div className="greeting" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>即刻开启开发新范式</div>
      <div className="composer" style={{ width: '100%', maxWidth: 720 }}>
        {/* 模式标签 */}
        {mode && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <Tag color="blue">{mode}</Tag>
          </div>
        )}
        {/* contenteditable 输入（§8.3 非受控） */}
        <div
          ref={inputRef}
          className="composer-input"
          contentEditable={true}
          data-placeholder="布置任务"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          style={{
            minHeight: 56, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12,
            fontSize: 15, outline: 'none', lineHeight: 1.6, cursor: 'text',
          }}
        />
        {/* composer bar */}
        <div className="composer-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Dropdown menu={{ items: addMenuItems }} trigger={['click']}>
            <button className="round-btn" type="button" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={18} />
            </button>
          </Dropdown>
          <div style={{ flex: 1 }} />
          <Button type="primary" disabled={!hasText} onClick={handleSend}>
            <Icon name="play" size={14} />
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}

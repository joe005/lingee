import { useRef, useMemo, useState } from 'react';
import { Button } from 'antd';
import Icon from '../components/icons/Icon';
import { useBridgeNamespace, useBridgeVersion } from '../hooks/useLingeeBridge';

/* 会话页（Phase 3）。消息列表从 bridge.chat.getMessages() 渲染，
   chat 输入用 ref 非受控（§8.3）。预览面板保持 vanilla（iframe §8.4）。 */
export default function ChatView() {
  const inputRef = useRef(null);
  const [hasText, setHasText] = useState(false);
  const bridge = useBridgeNamespace('chat');
  const version = useBridgeVersion('chat');

  /* eslint-disable react-hooks/exhaustive-deps */
  const messages = useMemo(() => {
    if (!bridge) return [];
    return bridge.getMessages() || [];
  }, [bridge, version]);

  const title = useMemo(() => bridge?.getTitle?.() || '', [bridge, version]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
    // 复用 composer.send 的逻辑（会添加消息 + 模拟响应）
    window.__lingeeBridge?.composer?.send?.(text);
    if (inputRef.current) inputRef.current.innerHTML = '';
    setHasText(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#fff' }}>
      {/* Chat header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title || '新会话'}</span>
      </div>
      {/* Message list */}
      <div id="chatMessages" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-soft)', padding: 48 }}>
            开始对话吧
          </div>
        )}
        {messages.map((msg) => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id} className="message user" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <div className="message-content" style={{ maxWidth: '70%', padding: '10px 16px', background: 'var(--brand)', color: '#fff', borderRadius: '12px 12px 2px 12px', fontSize: 14, lineHeight: 1.6 }}>
                  {msg.text}
                </div>
              </div>
            );
          }
          if (msg.type === 'assistant') {
            return (
              <div key={msg.id} className="message assistant" style={{ marginBottom: 16 }}>
                <div className="message-content" style={{ padding: '12px 16px', background: 'var(--hover)', borderRadius: '2px 12px 12px 12px' }}>
                  {msg.steps?.map((step, i) => (
                    <div key={i} className="work-step" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                        background: step.status === 'done' ? 'var(--success)' : 'var(--brand)',
                        color: '#fff' }}>
                        {step.status === 'done' ? '✓' : '...'}
                      </span>
                      <span style={{ fontSize: 14 }}>{step.title}</span>
                      {step.status === 'running' && <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>执行中…</span>}
                    </div>
                  ))}
                  {msg.result && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.result.markdown}</div>
                      {msg.result.artifact && (
                        <div style={{ marginTop: 8, padding: '12px', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          onClick={() => window.__lingeeBridge?.toast?.('打开预览')}>
                          <Icon name="app-window" size={20} color="var(--brand)" />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>采购订单</div>
                            <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>点击预览</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
      {/* Chat input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div
            ref={inputRef}
            className="chat-input"
            contentEditable={true}
            data-placeholder="输入消息..."
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, minHeight: 40, maxHeight: 120, padding: '10px 14px',
              border: '1px solid var(--border)', borderRadius: 10,
              fontSize: 14, outline: 'none', lineHeight: 1.6, overflowY: 'auto',
            }}
          />
          <Button type="primary" disabled={!hasText} onClick={handleSend}>
            <Icon name="play" size={14} />
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}

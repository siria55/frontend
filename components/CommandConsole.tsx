'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export interface CommandConsoleProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  maxLogs?: number;
  onCommand?: (command: string) => void;
}

const panelStyle: React.CSSProperties = {
  position: 'relative',
  padding: '1rem',
  borderRadius: '12px',
  background: 'rgba(12, 10, 20, 0.75)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(10px)',
  minWidth: '280px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem'
};

const SYSTEM_LOG_EVENT = 'mars-system-log';

export default function CommandConsole({
  title,
  subtitle,
  placeholder,
  maxLogs,
  onCommand
}: CommandConsoleProps) {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const effectiveTitle = title ?? '阿瑞斯 指令输入';
  const effectiveSubtitle = subtitle ?? '指挥中心命令';
  const effectivePlaceholder = placeholder ?? '例如：扫描资源，返回状态';
  const effectiveMaxLogs = useMemo(() => (maxLogs && maxLogs > 0 ? maxLogs : 5), [maxLogs]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (!detail) return;
      setLogs((prev) => [detail, ...prev].slice(0, effectiveMaxLogs));
    };

    window.addEventListener(SYSTEM_LOG_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(SYSTEM_LOG_EVENT, handler as EventListener);
    };
  }, [effectiveMaxLogs]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    setLogs((prev) => [trimmed, ...prev].slice(0, effectiveMaxLogs));
    onCommand?.(trimmed);
    setCommand('');
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#b4b6d2' }}>{effectiveSubtitle}</span>
        <strong style={{ fontSize: '1.1rem', color: '#f4f4ff' }}>{effectiveTitle}</strong>
      </div>
      <form
        style={{
          display: 'flex',
          gap: '0.5rem',
          width: '100%'
        }}
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          placeholder={effectivePlaceholder}
          style={{
            flex: 1,
            padding: '0.6rem 0.75rem',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(22, 20, 34, 0.9)',
            color: '#f8f8ff',
            fontSize: '0.95rem',
            outline: 'none'
          }}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
        />
        <button
          type="submit"
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: '1px solid rgba(123,155,255,0.4)',
            background: 'linear-gradient(135deg, rgba(123,155,255,0.35), rgba(92,80,255,0.6))',
            color: '#f8f8ff',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          发送
        </button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#8d90ad' }}>近期命令</span>
        {logs.length === 0 ? (
          <span style={{ fontSize: '0.85rem', color: '#62637a' }}>暂无指令，等待输入…</span>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}
          >
            {logs.map((item, index) => (
              <li
                key={`${item}-${index}`}
                style={{
                  padding: '0.45rem 0.6rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.85rem',
                  color: '#d7d9ed'
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

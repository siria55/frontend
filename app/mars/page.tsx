'use client';

import { FormEvent, useState } from 'react';

import MarsSceneCanvas from '@/components/pixi/MarsSceneCanvas';

export default function MarsPage() {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    setLogs((prev) => [trimmed, ...prev].slice(0, 5));
    setCommand('');
  };

  return (
    <main style={{ minHeight: '100vh', margin: 0, padding: 0 }}>
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh'
        }}
      >
        <MarsSceneCanvas />
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(12, 10, 20, 0.75)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#b4b6d2' }}>指挥中心命令</span>
            <strong style={{ fontSize: '1.1rem', color: '#f4f4ff' }}>ARES 指令输入</strong>
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
              placeholder="例如：扫描资源，返回状态"
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
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
      </div>
    </main>
  );
}

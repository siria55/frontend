'use client';

import { useState, type ReactNode, useCallback } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsiblePanel({ title, children, defaultOpen = true }: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '320px',
        borderRadius: '12px',
        background: 'rgba(12, 10, 20, 0.78)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden'
      }}
    >
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          border: 'none',
          background: 'rgba(18, 16, 28, 0.55)',
          color: '#f5f5ff',
          padding: '0.75rem 1rem',
          textAlign: 'left',
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        {title}
        <span style={{ float: 'right', fontSize: '0.9rem', opacity: 0.7 }}>{open ? '⌄' : '›'}</span>
      </button>
      {open ? <div style={{ padding: '0.75rem 1rem' }}>{children}</div> : null}
    </div>
  );
}

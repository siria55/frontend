'use client';

interface AgentControlPadProps {
  agentId: string;
}

const panelStyle: React.CSSProperties = {
  position: 'relative',
  padding: '1rem',
  borderRadius: '12px',
  background: 'rgba(12, 10, 20, 0.72)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  minWidth: '180px'
};

const buttonStyle: React.CSSProperties = {
  padding: '0.6rem 0.8rem',
  borderRadius: '10px',
  border: '1px solid rgba(123,155,255,0.35)',
  background: 'rgba(36, 43, 76, 0.75)',
  color: '#f0f2ff',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s ease, transform 0.2s ease'
};

const rowsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '0.5rem'
};

const behaviors = [
  { id: 'move_up', label: '上移' },
  { id: 'move_left', label: '左移' },
  { id: 'move_right', label: '右移' },
  { id: 'move_down', label: '下移' }
];

export default function AgentControlPad({ agentId }: AgentControlPadProps) {
  const handleClick = (behavior: string) => {
    const event = new CustomEvent('mars-agent-command', {
      detail: {
        agentId,
        behavior
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#b4b6d2' }}>运动控制</span>
        <strong style={{ fontSize: '1.1rem', color: '#f4f4ff' }}>ARES 机动指令</strong>
      </div>
      <div style={rowsStyle}>
        {behaviors.map((item) => (
          <button
            key={item.id}
            type="button"
            style={buttonStyle}
            onClick={() => handleClick(item.id)}
            onMouseDown={(event) => {
              event.currentTarget.style.backgroundColor = 'rgba(62, 89, 166, 0.85)';
            }}
            onMouseUp={(event) => {
              event.currentTarget.style.backgroundColor = 'rgba(36, 43, 76, 0.75)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'rgba(36, 43, 76, 0.75)';
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

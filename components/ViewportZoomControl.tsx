'use client';

import { memo } from 'react';

interface ViewportZoomControlProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

function ViewportZoomControlComponent({
  value,
  min = 0.2,
  max = 2.5,
  step = 0.05,
  onChange
}: ViewportZoomControlProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        background: 'rgba(12, 10, 20, 0.75)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <label style={{ fontSize: '0.85rem', color: '#b4b6d2' }}>
        视野缩放 {value.toFixed(2)}x
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        style={{ width: '220px' }}
      />
    </div>
  );
}

const ViewportZoomControl = memo(ViewportZoomControlComponent);

export default ViewportZoomControl;

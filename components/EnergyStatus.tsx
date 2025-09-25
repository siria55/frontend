'use client';

import { useMemo } from 'react';

export interface EnergyInfo {
  id: string;
  label: string;
  type: 'storage' | 'consumer';
  capacity?: number;
  current?: number;
  output?: number;
  rate?: number;
}

interface EnergyStatusProps {
  items?: EnergyInfo[];
}

const panelStyle: React.CSSProperties = {
  position: 'relative',
  padding: '1rem',
  borderRadius: '12px',
  background: 'rgba(12, 10, 20, 0.78)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(10px)',
  minWidth: '240px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem'
};

const storageColor = '#9ef1d2';
const storageWarningColor = '#f2a65a';
const storageCriticalColor = '#ff6b6b';
const consumerColor = '#f0c27b';

export default function EnergyStatus({ items }: EnergyStatusProps) {
  const grouped = useMemo(() => {
    return (items ?? []).map((item) => {
      if (item.type === 'storage') {
        const capacity = item.capacity ?? 0;
        const current = Math.min(item.current ?? 0, capacity);
        const percent = capacity > 0 ? Math.round((current / capacity) * 100) : 0;
        const accent = percent <= 15
          ? storageCriticalColor
          : percent <= 35
            ? storageWarningColor
            : storageColor;
        return {
          ...item,
          display: `${current}/${capacity} MWh (${percent}%)`,
          percent,
          accent,
          low: percent <= 35
        };
      }
      return {
        ...item,
        display: `${item.rate ?? 0} kW 消耗`,
        accent: consumerColor
      };
    });
  }, [items]);

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#b4b6d2' }}>能源概览</span>
        <strong style={{ fontSize: '1.1rem', color: '#f4f4ff' }}>电力网络</strong>
      </div>
      {grouped.length === 0 ? (
        <span style={{ fontSize: '0.85rem', color: '#62637a' }}>暂未接入能源数据。</span>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          {grouped.map((item) => (
            <li
              key={item.id}
              style={{
                padding: '0.5rem 0.65rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}
            >
              <span style={{ fontSize: '0.95rem', color: '#f4f4ff' }}>{item.label}</span>
              <span style={{ fontSize: '0.8rem', color: '#b4b6d2' }}>{item.type === 'storage' ? '储能节点' : '负载节点'}</span>
              <div
                style={{
                  padding: '0.35rem 0.45rem',
                  borderRadius: '8px',
                  background: item.type === 'storage' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${item.accent}`,
                  color: item.accent,
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{item.display}</span>
                {item.type === 'storage' && item.low ? (
                  <span style={{ fontSize: '0.75rem', color: item.percent !== undefined && item.percent <= 15 ? '#ffb4b4' : '#f7d59c' }}>
                    {item.percent !== undefined && item.percent <= 15 ? '电量告急' : '电量偏低'}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

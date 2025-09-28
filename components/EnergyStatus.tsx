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
  summary?: EnergySummary;
}

export interface EnergySummary {
  totalConsumption: number;
  totalOutput: number;
  netFlow: number; // 正值表示储能增量，负值表示消耗
  perStorageRate: number; // 每个储能节点的净变化速度（始终 >=0）
  storageCount: number;
}

const storageColor = '#9ef1d2';
const storageWarningColor = '#f2a65a';
const storageCriticalColor = '#ff6b6b';
const consumerColor = '#f0c27b';

export default function EnergyStatus({ items, summary }: EnergyStatusProps) {
  const grouped = useMemo(() => {
    const timestamp = Date.now();
    return (items ?? []).map((item) => {
      if (item.type === 'storage') {
        const capacity = item.capacity ?? 0;
        const current = Math.min(item.current ?? 0, capacity);
        const percent = capacity > 0 ? Math.round((current / capacity) * 100) : 0;
        const isStorageWithCapacity = capacity > 0;
        if (!isStorageWithCapacity) {
          const accent = storageColor;
          return {
            ...item,
            display: `输出 ${item.output ?? 0} kW`,
            percent: undefined,
            accent,
            low: false,
            timestamp,
            trendLabel: `输出 ${item.output ?? 0} kW/s`,
            generator: true
          };
        }

        const accent =
          percent <= 15
            ? storageCriticalColor
            : percent <= 35
              ? storageWarningColor
              : storageColor;
        const delta = summary?.netFlow ?? 0;
        const perStorage = summary?.perStorageRate ?? 0;
        const trendLabel =
          delta < 0 ? `Δ -${perStorage} kW/s` : delta > 0 ? `Δ +${perStorage} kW/s` : 'Δ 0 kW/s';
        return {
          ...item,
          display: `${current}/${capacity} kW (${percent}%)`,
          percent,
          accent,
          low: percent <= 35,
          timestamp,
          trendLabel,
          delta,
          output: item.output ?? 0
        };
      }
      return {
        ...item,
        display: `${item.rate ?? 0} kW 消耗`,
        accent: consumerColor,
        low: false,
        percent: undefined,
        timestamp
      };
    });
  }, [items, summary]);

  if (grouped.length === 0) {
    return <span style={{ fontSize: '0.85rem', color: '#62637a' }}>暂未接入能源数据。</span>;
  }

  return (
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
      {summary ? (
        <li
          key="summary"
          style={{
            padding: '0.55rem 0.7rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          <span style={{ fontSize: '0.92rem', color: '#f4f4ff', fontWeight: 600 }}>能耗总览</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem', color: '#d3d4eb' }}>
            <span>总消耗：{summary.totalConsumption} kW</span>
            <span>总产出：{summary.totalOutput} kW</span>
            <span>
              净变化：
              {summary.netFlow > 0
                ? `+${summary.netFlow} kW/s`
                : `${summary.netFlow} kW/s`}
            </span>
            {summary.storageCount > 0 ? (
              <span>
                储能节点每秒 {summary.netFlow >= 0 ? '+' : '-'}
                {summary.perStorageRate} kW（共 {summary.storageCount} 座）
              </span>
            ) : null}
          </div>
        </li>
      ) : null}
      {grouped.map((item) => (
        <li
          key={`${item.id}-${item.timestamp}`}
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
            {item.type === 'storage' ? (
              <span
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color:
                    'generator' in item
                      ? '#d3d4eb'
                      : summary && summary.netFlow < 0
                        ? '#ffb4b4'
                        : '#b4f5c6'
                }}
              >
                <span>{('trendLabel' in item && item.trendLabel) || 'Δ 0 kW/s'}</span>
                <span style={{ color: '#d3d4eb' }}>· 输出 {item.output ?? 0} kW</span>
              </span>
            ) : null}
          </div>
          {item.type === 'storage' && !('generator' in item) && item.low ? (
            <span style={{ fontSize: '0.75rem', color: '#f7d59c' }}>
              {item.percent !== undefined && item.percent <= 15 ? '电量告急' : '电量偏低'}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

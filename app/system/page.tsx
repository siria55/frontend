'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SceneAgent, SceneBuilding, SceneDimensions, SceneGrid } from '@/types/scene';

type SceneMeta = {
  id: string;
  name: string;
};

type SystemSnapshot = {
  scene: SceneMeta;
  grid: SceneGrid;
  dimensions: SceneDimensions;
  buildings: SceneBuilding[];
  agents: SceneAgent[];
};

const panelStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderRadius: '16px',
  background: 'rgba(18, 16, 32, 0.85)',
  border: '1px solid rgba(123, 155, 255, 0.15)',
  backdropFilter: 'blur(12px)',
  color: '#e6e9ff'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
  color: '#9aa7ff'
};

const listStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.6rem',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 600
};

const badgePalette: Record<'storage' | 'consumer' | 'default', { background: string; color: string }> = {
  storage: { background: 'rgba(44, 160, 44, 0.12)', color: '#8bef8b' },
  consumer: { background: 'rgba(220, 150, 60, 0.12)', color: '#ffc58a' },
  default: { background: 'rgba(120, 130, 180, 0.15)', color: '#c9cff9' }
};

export default function SystemPage() {
  const backendBaseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
    []
  );

  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${backendBaseUrl}/v1/system/scene`);
      if (!response.ok) {
        throw new Error(`request failed: ${response.status}`);
      }
      const data: SystemSnapshot = await response.json();
      setSnapshot(data);
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100vw',
        margin: 0,
        padding: '3rem',
        background: 'radial-gradient(circle at top, #1b1630 0%, #0d0a18 55%, #070511 100%)',
        color: '#e5e8ff'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0, color: '#f0f2ff' }}>System Registry · Mars Scene</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#a9b3e0' }}>数据库 system_* 表实时快照。</p>
          </div>
          <button
            type="button"
            onClick={fetchSnapshot}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '10px',
              background: 'linear-gradient(120deg, #5868ff, #8c9bff)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            重新拉取
          </button>
        </header>

        {loading && (
          <div style={panelStyle}>正在从后端读取 system 数据…</div>
        )}

        {error && !loading && (
          <div style={{ ...panelStyle, border: '1px solid rgba(255, 99, 132, 0.35)', color: '#ff9aa8' }}>
            加载失败：{error}
          </div>
        )}

        {snapshot && !loading && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>场景信息</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <div style={{ color: '#9aa7ff', fontSize: '0.85rem' }}>Scene ID</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{snapshot.scene.id}</div>
                </div>
                <div>
                  <div style={{ color: '#9aa7ff', fontSize: '0.85rem' }}>Scene Name</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 500 }}>{snapshot.scene.name}</div>
                </div>
                <div>
                  <div style={{ color: '#9aa7ff', fontSize: '0.85rem' }}>Grid</div>
                  <div>{snapshot.grid.cols} × {snapshot.grid.rows}（tile size {snapshot.grid.tileSize}）</div>
                </div>
                <div>
                  <div style={{ color: '#9aa7ff', fontSize: '0.85rem' }}>Dimensions</div>
                  <div>{snapshot.dimensions.width} × {snapshot.dimensions.height}</div>
                </div>
              </div>
            </section>

            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>建筑（system_scene_buildings）</h2>
              <ul style={listStyle}>
                {snapshot.buildings.map((building) => {
                  const badge = building.energy?.type ?? 'default';
                  const palette = badgePalette[badge] ?? badgePalette.default;
                  return (
                    <li
                      key={building.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(36, 33, 58, 0.55)',
                        border: '1px solid rgba(140, 150, 190, 0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{building.label}</div>
                        <span style={{ ...badgeStyle, background: palette.background, color: palette.color }}>
                          {building.energy?.type ?? '未指定'}
                        </span>
                      </div>
                      <div style={{ marginTop: '0.5rem', color: '#b8bfed' }}>
                        区域：({building.rect[0]}, {building.rect[1]}) · {building.rect[2]} × {building.rect[3]}
                      </div>
                      {building.energy && (
                        <div style={{ marginTop: '0.35rem', color: '#dde1ff', fontSize: '0.9rem' }}>
                          {building.energy.capacity != null && <span>容量 {building.energy.capacity} · </span>}
                          {building.energy.current != null && <span>当前 {building.energy.current} · </span>}
                          {building.energy.output != null && <span>输出 {building.energy.output} · </span>}
                          {building.energy.rate != null && <span>消耗 {building.energy.rate}</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>Agent（system_scene_agents & actions）</h2>
              <ul style={listStyle}>
                {snapshot.agents.map((agent) => {
                  const actions = agent.actions ?? [];
                  return (
                  <li
                    key={agent.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(36, 33, 58, 0.55)',
                      border: '1px solid rgba(140, 150, 190, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{agent.label}</div>
                      <code style={{ fontSize: '0.85rem', color: '#92a0ff' }}>{agent.id}</code>
                    </div>
                    <div style={{ marginTop: '0.4rem', color: '#b8bfed' }}>
                      坐标：({agent.position[0]}, {agent.position[1]})
                    </div>
                    <div style={{ marginTop: '0.4rem', color: '#dde1ff', fontSize: '0.9rem' }}>
                      可执行动作：{actions.length ? actions.join('、') : '（无）'}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

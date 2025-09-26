'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

import type {
  SceneAgent,
  SceneBuilding,
  SceneBuildingTemplate,
  SceneDimensions,
  SceneGrid
} from '@/types/scene';

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
  templates: SceneBuildingTemplate[];
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

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  minWidth: '160px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#9aa7ff'
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  borderRadius: '8px',
  border: '1px solid rgba(123, 155, 255, 0.35)',
  background: 'rgba(24, 22, 38, 0.9)',
  color: '#f0f2ff',
  fontSize: '0.95rem',
  outline: 'none'
};

export default function SystemPage() {
  const backendBaseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
    []
  );

  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    cols: '',
    rows: '',
    tileSize: '',
    width: '',
    height: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    setSaveError(null);
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

  useEffect(() => {
    if (!snapshot) return;
    setForm({
      name: snapshot.scene.name,
      cols: String(snapshot.grid.cols),
      rows: String(snapshot.grid.rows),
      tileSize: String(snapshot.grid.tileSize ?? 1),
      width: String(snapshot.dimensions.width),
      height: String(snapshot.dimensions.height)
    });
  }, [snapshot]);

  const handleInputChange = useCallback(
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      setSaveMessage(null);
      setSaveError(null);
    },
    []
  );

  const isDirty = useMemo(() => {
    if (!snapshot) return false;
    return (
      snapshot.scene.name !== form.name.trim() ||
      String(snapshot.grid.cols) !== form.cols ||
      String(snapshot.grid.rows) !== form.rows ||
      String(snapshot.grid.tileSize ?? 0) !== form.tileSize ||
      String(snapshot.dimensions.width) !== form.width ||
      String(snapshot.dimensions.height) !== form.height
    );
  }, [form, snapshot]);

  const handleSave = useCallback(async () => {
    if (!snapshot) return;

    const parsePositive = (raw: string, label: string) => {
      const num = Number(raw);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error(`${label} 必须为正数`);
      }
      return Math.round(num);
    };

    try {
      setSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const name = form.name.trim();
      if (!name) {
        throw new Error('Scene Name 不能为空');
      }

      const cols = parsePositive(form.cols, 'Grid Cols');
      const rows = parsePositive(form.rows, 'Grid Rows');
      const tileSize = parsePositive(form.tileSize, 'Grid Tile Size');
      const width = parsePositive(form.width, 'Dimensions Width');
      const height = parsePositive(form.height, 'Dimensions Height');

      const response = await fetch(`${backendBaseUrl}/v1/system/scene`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_id: snapshot.scene.id,
          name,
          grid: { cols, rows, tileSize },
          dimensions: { width, height }
        })
      });

      if (!response.ok) {
        let message = `request failed: ${response.status}`;
        try {
          const payload = await response.json();
          if (payload?.error) {
            message = payload.error;
          }
        } catch (parseErr) {
          // ignore json parse error
        }
        throw new Error(message);
      }

      const data: SystemSnapshot = await response.json();
      setSnapshot(data);
      setSaveMessage('保存成功');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSaving(false);
    }
  }, [backendBaseUrl, form, snapshot]);

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
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={!snapshot || saving || !isDirty}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                background: saving ? 'rgba(88, 104, 255, 0.45)' : 'linear-gradient(120deg, #5868ff, #8c9bff)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                cursor: !snapshot || saving || !isDirty ? 'not-allowed' : 'pointer',
                opacity: !snapshot || saving || !isDirty ? 0.7 : 1
              }}
            >
              {saving ? '保存中…' : '保存修改'}
            </button>
            <button
              type="button"
              onClick={fetchSnapshot}
              disabled={loading}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                background: 'linear-gradient(120deg, #5868ff, #8c9bff)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              重新拉取
            </button>
          </div>
        </header>

        {(saveError || saveMessage) && (
          <div
            style={{
              ...panelStyle,
              padding: '0.75rem 1rem',
              border: saveError ? '1px solid rgba(255, 99, 132, 0.35)' : '1px solid rgba(108, 214, 143, 0.35)',
              color: saveError ? '#ff9aa8' : '#9af5c6'
            }}
          >
            {saveError ?? saveMessage}
          </div>
        )}

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div style={fieldGroupStyle}>
                    <span style={labelStyle}>Scene ID</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{snapshot.scene.id}</div>
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="scene-name">Scene Name</label>
                    <input
                      id="scene-name"
                      type="text"
                      value={form.name}
                      onChange={handleInputChange('name')}
                      style={inputStyle}
                      placeholder="输入场景名称"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="grid-cols">Grid Cols</label>
                    <input
                      id="grid-cols"
                      type="number"
                      min={1}
                      value={form.cols}
                      onChange={handleInputChange('cols')}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="grid-rows">Grid Rows</label>
                    <input
                      id="grid-rows"
                      type="number"
                      min={1}
                      value={form.rows}
                      onChange={handleInputChange('rows')}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="grid-tiles">Tile Size</label>
                    <input
                      id="grid-tiles"
                      type="number"
                      min={1}
                      value={form.tileSize}
                      onChange={handleInputChange('tileSize')}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="dim-width">Dimensions Width</label>
                    <input
                      id="dim-width"
                      type="number"
                      min={1}
                      value={form.width}
                      onChange={handleInputChange('width')}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="dim-height">Dimensions Height</label>
                    <input
                      id="dim-height"
                      type="number"
                      min={1}
                      value={form.height}
                      onChange={handleInputChange('height')}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
              <p style={{ marginTop: '1rem', color: '#9aa7ff', fontSize: '0.9rem', lineHeight: 1.5 }}>
                <strong>说明：</strong> <code>dimensions</code> 描述画布/渲染所用的连续场景宽高，
                <code>grid</code> 则定义寻路、碰撞等离散网格（多少行列、每格多大）。
                两者配合才能完整描述可视范围与物理逻辑。
              </p>
            </section>

            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>建筑模板（system_building_templates）</h2>
              <ul style={listStyle}>
                {(snapshot.templates ?? []).map((tpl) => (
                  <li
                    key={tpl.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(36, 33, 58, 0.55)',
                      border: '1px solid rgba(140, 150, 190, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{tpl.label}</div>
                      <code style={{ fontSize: '0.85rem', color: '#92a0ff' }}>{tpl.id}</code>
                    </div>
                    {tpl.energy && (
                      <div style={{ marginTop: '0.4rem', color: '#dde1ff', fontSize: '0.9rem' }}>
                        类型：{tpl.energy.type === 'storage' ? '储能' : '耗能'}
                        {tpl.energy.capacity != null && <span> · 容量 {tpl.energy.capacity}</span>}
                        {tpl.energy.current != null && <span> · 当前 {tpl.energy.current}</span>}
                        {tpl.energy.output != null && <span> · 输出 {tpl.energy.output}</span>}
                        {tpl.energy.rate != null && <span> · 消耗 {tpl.energy.rate}</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
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
                      {building.templateId && (
                        <div style={{ marginTop: '0.35rem', color: '#8ea0ff', fontSize: '0.85rem' }}>
                          模板：{building.templateId}
                        </div>
                      )}
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

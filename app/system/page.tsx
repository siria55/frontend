'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, RefObject } from 'react';

import {
  inputStyle,
  labelStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle
} from '@/components/system/styles';
import { BuildingTemplateSection } from '@/components/system/BuildingTemplateSection';
import { AgentTemplateSection } from '@/components/system/AgentTemplateSection';
import { SceneBuildingSection } from '@/components/system/SceneBuildingSection';
import { SceneAgentSection } from '@/components/system/SceneAgentSection';
import { ApiError } from '@/lib/api/client';
import {
  systemApi,
  type AgentTemplatePayload,
  type BuildingTemplatePayload,
  type SceneAgentPayload,
  type SceneBuildingPayload,
  type SystemSnapshot,
  type UpdateSystemScenePayload
} from '@/lib/api/system';

const pendingKey = (scope: string, id: string) => `${scope}:${id}`;

const fieldGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  minWidth: '140px'
};

const tocContainerStyle: CSSProperties = {
  position: 'sticky',
  top: '2.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  minWidth: '150px',
  padding: '0.85rem',
  borderRadius: '12px',
  background: 'rgba(24, 22, 40, 0.7)',
  border: '1px solid rgba(120, 126, 178, 0.28)',
  boxShadow: '0 8px 18px rgba(8, 5, 20, 0.32)',
  backdropFilter: 'blur(10px)'
};

const tocTitleStyle: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#c7cbf8',
  margin: 0
};

const tocButtonStyle: CSSProperties = {
  textAlign: 'left',
  padding: '0.45rem 0.55rem',
  borderRadius: '9px',
  border: '1px solid transparent',
  background: 'transparent',
  color: '#a9b3e0',
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease'
};

export default function SystemPage() {
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
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});

  const sceneInfoRef = useRef<HTMLDivElement | null>(null);
  const templatesRef = useRef<HTMLDivElement | null>(null);
  const entitiesRef = useRef<HTMLDivElement | null>(null);

  const scrollToRef = useCallback((target: RefObject<HTMLDivElement>) => {
    if (target.current) {
      target.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const clearStatus = useCallback(() => {
    setSaveError(null);
    setSaveMessage(null);
  }, []);

  const handleValidationError = useCallback((message: string) => {
    setSaveError(message);
    setSaveMessage(null);
  }, []);

  const setPendingFlag = useCallback((key: string, value: boolean) => {
    setPendingMap((prev) => {
      if (value) {
        if (prev[key]) {
          return prev;
        }
        return { ...prev, [key]: true };
      }
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const isPending = useCallback((key: string) => Boolean(pendingMap[key]), [pendingMap]);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const data = await systemApi.getSnapshot();
      setSnapshot(data);
    } catch (err) {
      setSnapshot(null);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'unknown error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const performSnapshotUpdate = useCallback(
    async (key: string, operation: () => Promise<SystemSnapshot>, successMessage: string) => {
      setSaveError(null);
      setSaveMessage(null);
      setPendingFlag(key, true);
      try {
        const data = await operation();
        setSnapshot(data);
        setSaveMessage(successMessage);
      } catch (err) {
        if (err instanceof ApiError) {
          setSaveError(err.message);
        } else {
          setSaveError(err instanceof Error ? err.message : 'unknown error');
        }
      } finally {
        setPendingFlag(key, false);
      }
    },
    [setPendingFlag]
  );

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

      const updatePayload: UpdateSystemScenePayload = {
        scene_id: snapshot.scene.id,
        name,
        grid: { cols, rows, tileSize },
        dimensions: { width, height }
      };

      const data = await systemApi.updateScene(updatePayload);
      setSnapshot(data);
      setSaveMessage('保存成功');
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError(err instanceof Error ? err.message : 'unknown error');
      }
    } finally {
      setSaving(false);
    }
  }, [form, snapshot]);

  const isBuildingTemplatePending = useCallback(
    (id: string) => isPending(pendingKey('tpl-building', id)),
    [isPending]
  );

  const isAgentTemplatePending = useCallback(
    (id: string) => isPending(pendingKey('tpl-agent', id)),
    [isPending]
  );

  const isSceneBuildingPending = useCallback(
    (id: string) =>
      isPending(pendingKey('scene-building', id)) || isPending(pendingKey('scene-building-delete', id)),
    [isPending]
  );

  const isSceneAgentPending = useCallback(
    (id: string) => isPending(pendingKey('scene-agent', id)),
    [isPending]
  );

  const saveBuildingTemplate = useCallback(
    (id: string, payload: BuildingTemplatePayload) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('tpl-building', id),
        () => systemApi.updateBuildingTemplate(id, payload),
        '建筑模板已保存'
      );
    },
    [clearStatus, performSnapshotUpdate]
  );

  const saveAgentTemplate = useCallback(
    (id: string, payload: AgentTemplatePayload) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('tpl-agent', id),
        () => systemApi.updateAgentTemplate(id, payload),
        'Agent 模板已保存'
      );
    },
    [clearStatus, performSnapshotUpdate]
  );

  const saveSceneBuilding = useCallback(
    (id: string, payload: SceneBuildingPayload) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('scene-building', id),
        () => systemApi.updateSceneBuilding(id, payload),
        '场景建筑已保存'
      );
    },
    [clearStatus, performSnapshotUpdate]
  );

  const deleteSceneBuilding = useCallback(
    (id: string) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('scene-building-delete', id),
        () => systemApi.deleteSceneBuilding(id),
        '场景建筑已删除'
      );
    },
    [clearStatus, performSnapshotUpdate]
  );

  const saveSceneAgent = useCallback(
    (id: string, payload: SceneAgentPayload) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('scene-agent', id),
        () => systemApi.updateSceneAgent(id, payload),
        '场景 Agent 已保存'
      );
    },
    [clearStatus, performSnapshotUpdate]
  );

  const groupGridStyle: CSSProperties = {
    display: 'grid',
    gap: '0.9rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
  };

  const groupNoteStyle: CSSProperties = {
    margin: '0.35rem 0 0',
    color: '#9aaafe',
    fontSize: '0.85rem'
  };

  const tocItems = useMemo(
    () => [
      { key: 'scene', label: '场景信息', ref: sceneInfoRef },
      { key: 'templates', label: '模板配置', ref: templatesRef },
      { key: 'entities', label: '场景实体', ref: entitiesRef }
    ],
    [sceneInfoRef, templatesRef, entitiesRef]
  );

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100vw',
        margin: 0,
        padding: '2.2rem',
        background: 'radial-gradient(circle at top, #1b1630 0%, #0d0a18 55%, #070511 100%)',
        color: '#e5e8ff'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '1.8rem',
          alignItems: 'flex-start'
        }}
      >
        <aside style={tocContainerStyle}>
          <h2 style={tocTitleStyle}>内容导航</h2>
          {tocItems.map((item) => (
            <button
              key={item.key}
              type="button"
              style={tocButtonStyle}
              onClick={() => scrollToRef(item.ref)}
              onMouseEnter={(event) => {
                (event.currentTarget.style.backgroundColor = 'rgba(126, 132, 190, 0.18)');
                event.currentTarget.style.borderColor = 'rgba(161, 168, 228, 0.45)';
                event.currentTarget.style.color = '#dee2ff';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
                event.currentTarget.style.borderColor = 'transparent';
                event.currentTarget.style.color = '#a9b3e0';
              }}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
            <div>
              <h1 style={{ fontSize: '1.65rem', margin: 0, color: '#f0f2ff' }}>System Registry · Mars Scene</h1>
              <p style={{ margin: '0.2rem 0 0', color: '#a9b3e0', fontSize: '0.9rem' }}>数据库 system_* 表实时快照。</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={!snapshot || saving || !isDirty}
              style={primaryButtonStyle(!snapshot || saving || !isDirty)}
            >
              {saving ? '保存中…' : '保存修改'}
            </button>
            <button
              type="button"
              onClick={fetchSnapshot}
              disabled={loading}
              style={primaryButtonStyle(loading)}
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
          <div style={{ display: 'grid', gap: '1.1rem' }}>
            <section ref={sceneInfoRef} style={{ ...panelStyle, scrollMarginTop: '90px' }}>
              <h2 style={sectionTitleStyle}>场景信息</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
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
            </section>

            <section ref={templatesRef} style={{ ...panelStyle, scrollMarginTop: '90px' }}>
              <h2 style={sectionTitleStyle}>模板配置</h2>
              <p style={groupNoteStyle}>维护系统级模板，影响所有场景实例的默认外观与属性。</p>
              <div style={groupGridStyle}>
                <BuildingTemplateSection
                  templates={snapshot.buildingTemplates}
                  onSave={saveBuildingTemplate}
                  onClearStatus={clearStatus}
                  onValidationError={handleValidationError}
                  isPending={isBuildingTemplatePending}
                  framed={false}
                  title="建筑模板"
                />
                <AgentTemplateSection
                  templates={snapshot.agentTemplates}
                  onSave={saveAgentTemplate}
                  onClearStatus={clearStatus}
                  onValidationError={handleValidationError}
                  isPending={isAgentTemplatePending}
                  framed={false}
                  title="Agent 模板"
                />
              </div>
            </section>

            <section ref={entitiesRef} style={{ ...panelStyle, scrollMarginTop: '90px' }}>
              <h2 style={sectionTitleStyle}>场景实体</h2>
              <p style={groupNoteStyle}>直接作用于当前场景的建筑与 Agent 实例，可覆盖模板配置。</p>
              <div style={groupGridStyle}>
                <SceneBuildingSection
                  buildings={snapshot.buildings}
                  onSave={saveSceneBuilding}
                  onDelete={deleteSceneBuilding}
                  onClearStatus={clearStatus}
                  onValidationError={handleValidationError}
                  isPending={isSceneBuildingPending}
                  framed={false}
                  title="建筑实例"
                />
                <SceneAgentSection
                  agents={snapshot.agents}
                  onSave={saveSceneAgent}
                  onClearStatus={clearStatus}
                  onValidationError={handleValidationError}
                  isPending={isSceneAgentPending}
                  framed={false}
                  title="Agent 实例"
                />
              </div>
            </section>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}

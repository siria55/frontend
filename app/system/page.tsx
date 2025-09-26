'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';

import {
  inputStyle,
  labelStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle
} from '@/components/system/styles';
import {
  BuildingTemplateSection,
  type BuildingTemplatePayload
} from '@/components/system/BuildingTemplateSection';
import {
  AgentTemplateSection,
  type AgentTemplatePayload
} from '@/components/system/AgentTemplateSection';
import {
  SceneBuildingSection,
  type SceneBuildingPayload
} from '@/components/system/SceneBuildingSection';
import {
  SceneAgentSection,
  type SceneAgentPayload
} from '@/components/system/SceneAgentSection';
import type {
  SceneAgent,
  SceneAgentTemplate,
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
  buildingTemplates: SceneBuildingTemplate[];
  agentTemplates: SceneAgentTemplate[];
};

const pendingKey = (scope: string, id: string) => `${scope}:${id}`;

const fieldGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  minWidth: '160px'
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
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});

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

  const performSnapshotUpdate = useCallback(
    async (key: string, url: string, payload: unknown, successMessage: string) => {
      setSaveError(null);
      setSaveMessage(null);
      setPendingFlag(key, true);
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          let message = `request failed: ${response.status}`;
          try {
            const body = await response.json();
            if (body?.error) {
              message = body.error;
            }
          } catch {
            // ignore parse failure
          }
          throw new Error(message);
        }

        const data: SystemSnapshot = await response.json();
        setSnapshot(data);
        setSaveMessage(successMessage);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'unknown error');
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
        } catch {
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

  const isBuildingTemplatePending = useCallback(
    (id: string) => isPending(pendingKey('tpl-building', id)),
    [isPending]
  );

  const isAgentTemplatePending = useCallback(
    (id: string) => isPending(pendingKey('tpl-agent', id)),
    [isPending]
  );

  const isSceneBuildingPending = useCallback(
    (id: string) => isPending(pendingKey('scene-building', id)),
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
        `${backendBaseUrl}/v1/system/templates/buildings/${encodeURIComponent(id)}`,
        payload,
        '建筑模板已保存'
      );
    },
    [backendBaseUrl, clearStatus, performSnapshotUpdate]
  );

  const saveAgentTemplate = useCallback(
    (id: string, payload: AgentTemplatePayload) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('tpl-agent', id),
        `${backendBaseUrl}/v1/system/templates/agents/${encodeURIComponent(id)}`,
        payload,
        'Agent 模板已保存'
      );
    },
    [backendBaseUrl, clearStatus, performSnapshotUpdate]
  );

  const saveSceneBuilding = useCallback(
    (id: string, payload: SceneBuildingPayload) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('scene-building', id),
        `${backendBaseUrl}/v1/system/scene/buildings/${encodeURIComponent(id)}`,
        payload,
        '场景建筑已保存'
      );
    },
    [backendBaseUrl, clearStatus, performSnapshotUpdate]
  );

  const saveSceneAgent = useCallback(
    (id: string, payload: SceneAgentPayload) => {
      clearStatus();
      void performSnapshotUpdate(
        pendingKey('scene-agent', id),
        `${backendBaseUrl}/v1/system/scene/agents/${encodeURIComponent(id)}`,
        payload,
        '场景 Agent 已保存'
      );
    },
    [backendBaseUrl, clearStatus, performSnapshotUpdate]
  );

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
            </section>

            <BuildingTemplateSection
              templates={snapshot.buildingTemplates}
              onSave={saveBuildingTemplate}
              onClearStatus={clearStatus}
              onValidationError={handleValidationError}
              isPending={isBuildingTemplatePending}
            />

            <AgentTemplateSection
              templates={snapshot.agentTemplates}
              onSave={saveAgentTemplate}
              onClearStatus={clearStatus}
              onValidationError={handleValidationError}
              isPending={isAgentTemplatePending}
            />

            <SceneBuildingSection
              buildings={snapshot.buildings}
              onSave={saveSceneBuilding}
              onClearStatus={clearStatus}
              onValidationError={handleValidationError}
              isPending={isSceneBuildingPending}
            />

            <SceneAgentSection
              agents={snapshot.agents}
              onSave={saveSceneAgent}
              onClearStatus={clearStatus}
              onValidationError={handleValidationError}
              isPending={isSceneAgentPending}
            />
          </div>
        )}
      </div>
    </main>
  );
}

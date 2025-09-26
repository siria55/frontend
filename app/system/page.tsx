'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

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

type BuildingTemplateForm = {
  label: string;
  energyType: string;
  energyCapacity: string;
  energyCurrent: string;
  energyOutput: string;
  energyRate: string;
};

type AgentTemplateForm = {
  label: string;
  color: string;
  defaultPosX: string;
  defaultPosY: string;
};

type SceneBuildingForm = {
  label: string;
  templateId: string;
  posX: string;
  posY: string;
  width: string;
  height: string;
  energyType: string;
  energyCapacity: string;
  energyCurrent: string;
  energyOutput: string;
  energyRate: string;
};

type SceneAgentForm = {
  label: string;
  templateId: string;
  posX: string;
  posY: string;
  color: string;
  actions: string;
};

const pendingKey = (scope: string, id: string) => `${scope}:${id}`;

const createEmptyBuildingTemplateForm = (): BuildingTemplateForm => ({
  label: '',
  energyType: '',
  energyCapacity: '',
  energyCurrent: '',
  energyOutput: '',
  energyRate: ''
});

const createEmptyAgentTemplateForm = (): AgentTemplateForm => ({
  label: '',
  color: '',
  defaultPosX: '',
  defaultPosY: ''
});

const createEmptySceneBuildingForm = (): SceneBuildingForm => ({
  label: '',
  templateId: '',
  posX: '',
  posY: '',
  width: '',
  height: '',
  energyType: '',
  energyCapacity: '',
  energyCurrent: '',
  energyOutput: '',
  energyRate: ''
});

const createEmptySceneAgentForm = (): SceneAgentForm => ({
  label: '',
  templateId: '',
  posX: '',
  posY: '',
  color: '',
  actions: ''
});

const numberToString = (value?: number | null): string => (value ?? value === 0 ? String(value) : '');

const buildingTemplateToForm = (tpl: SceneBuildingTemplate): BuildingTemplateForm => ({
  label: tpl.label,
  energyType: tpl.energy?.type ?? '',
  energyCapacity: numberToString(tpl.energy?.capacity),
  energyCurrent: numberToString(tpl.energy?.current),
  energyOutput: numberToString(tpl.energy?.output),
  energyRate: numberToString(tpl.energy?.rate)
});

const agentTemplateToForm = (tpl: SceneAgentTemplate): AgentTemplateForm => ({
  label: tpl.label,
  color: numberToString(tpl.color),
  defaultPosX: numberToString(tpl.position?.[0]),
  defaultPosY: numberToString(tpl.position?.[1])
});

const sceneBuildingToForm = (building: SceneBuilding): SceneBuildingForm => ({
  label: building.label,
  templateId: building.templateId ?? '',
  posX: numberToString(building.rect[0]),
  posY: numberToString(building.rect[1]),
  width: numberToString(building.rect[2]),
  height: numberToString(building.rect[3]),
  energyType: building.energy?.type ?? '',
  energyCapacity: numberToString(building.energy?.capacity),
  energyCurrent: numberToString(building.energy?.current),
  energyOutput: numberToString(building.energy?.output),
  energyRate: numberToString(building.energy?.rate)
});

const sceneAgentToForm = (agent: SceneAgent): SceneAgentForm => ({
  label: agent.label,
  templateId: agent.templateId ?? '',
  posX: numberToString(agent.position[0]),
  posY: numberToString(agent.position[1]),
  color: numberToString(agent.color),
  actions: (agent.actions ?? []).join('\n')
});

const parseOptionalInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseActions = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);

const isBuildingTemplateDirty = (tpl: SceneBuildingTemplate, form: BuildingTemplateForm): boolean => {
  if (tpl.label !== form.label.trim()) return true;
  const originalType = tpl.energy?.type ?? '';
  if ((form.energyType || '').trim() !== originalType) return true;
  const originalCapacity = tpl.energy?.capacity ?? null;
  if (parseOptionalInt(form.energyCapacity) !== originalCapacity) return true;
  const originalCurrent = tpl.energy?.current ?? null;
  if (parseOptionalInt(form.energyCurrent) !== originalCurrent) return true;
  const originalOutput = tpl.energy?.output ?? null;
  if (parseOptionalInt(form.energyOutput) !== originalOutput) return true;
  const originalRate = tpl.energy?.rate ?? null;
  if (parseOptionalInt(form.energyRate) !== originalRate) return true;
  return false;
};

const isAgentTemplateDirty = (tpl: SceneAgentTemplate, form: AgentTemplateForm): boolean => {
  if (tpl.label !== form.label.trim()) return true;
  if (parseOptionalInt(form.color) !== (tpl.color ?? null)) return true;
  const origX = tpl.position?.[0] ?? null;
  const origY = tpl.position?.[1] ?? null;
  if (parseOptionalInt(form.defaultPosX) !== origX) return true;
  if (parseOptionalInt(form.defaultPosY) !== origY) return true;
  return false;
};

const isSceneBuildingDirty = (building: SceneBuilding, form: SceneBuildingForm): boolean => {
  if (building.label !== form.label.trim()) return true;
  if ((building.templateId ?? '') !== form.templateId.trim()) return true;
  const [x, y, w, h] = building.rect;
  if (parseOptionalInt(form.posX) !== x) return true;
  if (parseOptionalInt(form.posY) !== y) return true;
  if (parseOptionalInt(form.width) !== w) return true;
  if (parseOptionalInt(form.height) !== h) return true;
  const originalType = building.energy?.type ?? '';
  if ((form.energyType || '').trim() !== originalType) return true;
  if (parseOptionalInt(form.energyCapacity) !== (building.energy?.capacity ?? null)) return true;
  if (parseOptionalInt(form.energyCurrent) !== (building.energy?.current ?? null)) return true;
  if (parseOptionalInt(form.energyOutput) !== (building.energy?.output ?? null)) return true;
  if (parseOptionalInt(form.energyRate) !== (building.energy?.rate ?? null)) return true;
  return false;
};

const isSceneAgentDirty = (agent: SceneAgent, form: SceneAgentForm): boolean => {
  if (agent.label !== form.label.trim()) return true;
  if ((agent.templateId ?? '') !== form.templateId.trim()) return true;
  if (parseOptionalInt(form.posX) !== agent.position[0]) return true;
  if (parseOptionalInt(form.posY) !== agent.position[1]) return true;
  if (parseOptionalInt(form.color) !== (agent.color ?? null)) return true;
  const originalActions = agent.actions ?? [];
  const nextActions = parseActions(form.actions);
  if (originalActions.length !== nextActions.length) return true;
  for (let i = 0; i < originalActions.length; i += 1) {
    if (originalActions[i] !== nextActions[i]) return true;
  }
  return false;
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

const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '0.55rem 1.1rem',
  borderRadius: '10px',
  border: 'none',
  background: disabled ? 'rgba(88, 104, 255, 0.35)' : 'linear-gradient(120deg, #5868ff, #8c9bff)',
  color: '#ffffff',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.65 : 1
});

const secondaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '0.5rem 1.05rem',
  borderRadius: '10px',
  border: '1px solid rgba(140, 150, 190, 0.4)',
  background: 'transparent',
  color: '#d0d6ff',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1
});

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
  const [buildingTemplateForms, setBuildingTemplateForms] = useState<Record<string, BuildingTemplateForm>>({});
  const [agentTemplateForms, setAgentTemplateForms] = useState<Record<string, AgentTemplateForm>>({});
  const [sceneBuildingForms, setSceneBuildingForms] = useState<Record<string, SceneBuildingForm>>({});
  const [sceneAgentForms, setSceneAgentForms] = useState<Record<string, SceneAgentForm>>({});
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});

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

  const handleBuildingTemplateFieldChange = useCallback(
    (id: string, key: keyof BuildingTemplateForm) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setBuildingTemplateForms((prev) => {
          const current = prev[id] ?? createEmptyBuildingTemplateForm();
          return { ...prev, [id]: { ...current, [key]: value } };
        });
        setSaveMessage(null);
        setSaveError(null);
      },
    [setBuildingTemplateForms, setSaveError, setSaveMessage]
  );

  const handleAgentTemplateFieldChange = useCallback(
    (id: string, key: keyof AgentTemplateForm) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setAgentTemplateForms((prev) => {
          const current = prev[id] ?? createEmptyAgentTemplateForm();
          return { ...prev, [id]: { ...current, [key]: value } };
        });
        setSaveMessage(null);
        setSaveError(null);
      },
    [setAgentTemplateForms, setSaveError, setSaveMessage]
  );

  const handleSceneBuildingFieldChange = useCallback(
    (id: string, key: keyof SceneBuildingForm) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setSceneBuildingForms((prev) => {
          const current = prev[id] ?? createEmptySceneBuildingForm();
          return { ...prev, [id]: { ...current, [key]: value } };
        });
        setSaveMessage(null);
        setSaveError(null);
      },
    [setSceneBuildingForms, setSaveError, setSaveMessage]
  );

  const handleSceneAgentFieldChange = useCallback(
    (id: string, key: keyof SceneAgentForm) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setSceneAgentForms((prev) => {
          const current = prev[id] ?? createEmptySceneAgentForm();
          return { ...prev, [id]: { ...current, [key]: value } };
        });
        setSaveMessage(null);
        setSaveError(null);
      },
    [setSceneAgentForms, setSaveError, setSaveMessage]
  );

  const handleSceneAgentActionsChange = useCallback(
    (id: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setSceneAgentForms((prev) => {
        const current = prev[id] ?? createEmptySceneAgentForm();
        return { ...prev, [id]: { ...current, actions: value } };
      });
      setSaveMessage(null);
      setSaveError(null);
    },
    [setSceneAgentForms, setSaveError, setSaveMessage]
  );

  const handleResetBuildingTemplate = useCallback(
    (id: string) => {
      if (!snapshot) return;
      const tpl = snapshot.buildingTemplates.find((item) => item.id === id);
      if (!tpl) return;
      setBuildingTemplateForms((prev) => ({ ...prev, [id]: buildingTemplateToForm(tpl) }));
      setSaveMessage(null);
      setSaveError(null);
    },
    [snapshot, setBuildingTemplateForms, setSaveError, setSaveMessage]
  );

  const handleResetAgentTemplate = useCallback(
    (id: string) => {
      if (!snapshot) return;
      const tpl = snapshot.agentTemplates.find((item) => item.id === id);
      if (!tpl) return;
      setAgentTemplateForms((prev) => ({ ...prev, [id]: agentTemplateToForm(tpl) }));
      setSaveMessage(null);
      setSaveError(null);
    },
    [snapshot, setAgentTemplateForms, setSaveError, setSaveMessage]
  );

  const handleResetSceneBuilding = useCallback(
    (id: string) => {
      if (!snapshot) return;
      const building = snapshot.buildings.find((item) => item.id === id);
      if (!building) return;
      setSceneBuildingForms((prev) => ({ ...prev, [id]: sceneBuildingToForm(building) }));
      setSaveMessage(null);
      setSaveError(null);
    },
    [snapshot, setSceneBuildingForms, setSaveError, setSaveMessage]
  );

  const handleResetSceneAgent = useCallback(
    (id: string) => {
      if (!snapshot) return;
      const agent = snapshot.agents.find((item) => item.id === id);
      if (!agent) return;
      setSceneAgentForms((prev) => ({ ...prev, [id]: sceneAgentToForm(agent) }));
      setSaveMessage(null);
      setSaveError(null);
    },
    [snapshot, setSceneAgentForms, setSaveError, setSaveMessage]
  );

  const handleSaveBuildingTemplate = useCallback(
    (id: string) => {
      const form = buildingTemplateForms[id];
      if (!form) return;
      const label = form.label.trim();
      if (!label) {
        setSaveError('模板名称不能为空');
        setSaveMessage(null);
        return;
      }

      const payload = {
        label,
        energy: {
          type: form.energyType.trim() ? form.energyType.trim() : null,
          capacity: parseOptionalInt(form.energyCapacity),
          current: parseOptionalInt(form.energyCurrent),
          output: parseOptionalInt(form.energyOutput),
          rate: parseOptionalInt(form.energyRate)
        }
      };

      void performSnapshotUpdate(
        pendingKey('tpl-building', id),
        `${backendBaseUrl}/v1/system/templates/buildings/${encodeURIComponent(id)}`,
        payload,
        '建筑模板已保存'
      );
    },
    [backendBaseUrl, buildingTemplateForms, performSnapshotUpdate, setSaveError, setSaveMessage]
  );

  const handleSaveAgentTemplate = useCallback(
    (id: string) => {
      const form = agentTemplateForms[id];
      if (!form) return;
      const label = form.label.trim();
      if (!label) {
        setSaveError('Agent 模板名称不能为空');
        setSaveMessage(null);
        return;
      }

      const posX = parseOptionalInt(form.defaultPosX);
      const posY = parseOptionalInt(form.defaultPosY);
      const position = posX !== null && posY !== null ? ([posX, posY] as [number, number]) : undefined;

      const payload = {
        label,
        color: parseOptionalInt(form.color),
        defaultPosition: position ?? null
      };

      void performSnapshotUpdate(
        pendingKey('tpl-agent', id),
        `${backendBaseUrl}/v1/system/templates/agents/${encodeURIComponent(id)}`,
        payload,
        'Agent 模板已保存'
      );
    },
    [agentTemplateForms, backendBaseUrl, performSnapshotUpdate, setSaveError, setSaveMessage]
  );

  const handleSaveSceneBuilding = useCallback(
    (id: string) => {
      const form = sceneBuildingForms[id];
      if (!form) return;
      const label = form.label.trim();
      if (!label) {
        setSaveError('建筑名称不能为空');
        setSaveMessage(null);
        return;
      }

      const posX = parseOptionalInt(form.posX);
      const posY = parseOptionalInt(form.posY);
      const width = parseOptionalInt(form.width);
      const height = parseOptionalInt(form.height);

      if (posX === null || posY === null || width === null || height === null) {
        setSaveError('请填写完整的坐标与尺寸');
        setSaveMessage(null);
        return;
      }
      if (width <= 0 || height <= 0) {
        setSaveError('宽度与高度必须大于 0');
        setSaveMessage(null);
        return;
      }

      const payload = {
        label,
        templateId: form.templateId.trim() ? form.templateId.trim() : null,
        rect: [posX, posY, width, height],
        energy: {
          type: form.energyType.trim() ? form.energyType.trim() : null,
          capacity: parseOptionalInt(form.energyCapacity),
          current: parseOptionalInt(form.energyCurrent),
          output: parseOptionalInt(form.energyOutput),
          rate: parseOptionalInt(form.energyRate)
        }
      };

      void performSnapshotUpdate(
        pendingKey('scene-building', id),
        `${backendBaseUrl}/v1/system/scene/buildings/${encodeURIComponent(id)}`,
        payload,
        '场景建筑已保存'
      );
    },
    [backendBaseUrl, performSnapshotUpdate, sceneBuildingForms, setSaveError, setSaveMessage]
  );

  const handleSaveSceneAgent = useCallback(
    (id: string) => {
      const form = sceneAgentForms[id];
      if (!form) return;
      const label = form.label.trim();
      if (!label) {
        setSaveError('Agent 名称不能为空');
        setSaveMessage(null);
        return;
      }

      const posX = parseOptionalInt(form.posX);
      const posY = parseOptionalInt(form.posY);
      if (posX === null || posY === null) {
        setSaveError('请填写 Agent 坐标');
        setSaveMessage(null);
        return;
      }

      const payload = {
        label,
        templateId: form.templateId.trim() ? form.templateId.trim() : null,
        position: [posX, posY],
        color: parseOptionalInt(form.color),
        actions: parseActions(form.actions)
      };

      void performSnapshotUpdate(
        pendingKey('scene-agent', id),
        `${backendBaseUrl}/v1/system/scene/agents/${encodeURIComponent(id)}`,
        payload,
        '场景 Agent 已保存'
      );
    },
    [backendBaseUrl, performSnapshotUpdate, sceneAgentForms, setSaveError, setSaveMessage]
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

  useEffect(() => {
    if (!snapshot) {
      setBuildingTemplateForms({});
      setAgentTemplateForms({});
      setSceneBuildingForms({});
      setSceneAgentForms({});
      return;
    }

    const tplForms: Record<string, BuildingTemplateForm> = {};
    snapshot.buildingTemplates.forEach((tpl) => {
      tplForms[tpl.id] = buildingTemplateToForm(tpl);
    });
    setBuildingTemplateForms(tplForms);

    const agentTplForms: Record<string, AgentTemplateForm> = {};
    snapshot.agentTemplates.forEach((tpl) => {
      agentTplForms[tpl.id] = agentTemplateToForm(tpl);
    });
    setAgentTemplateForms(agentTplForms);

    const buildingForms: Record<string, SceneBuildingForm> = {};
    snapshot.buildings.forEach((building) => {
      buildingForms[building.id] = sceneBuildingToForm(building);
    });
    setSceneBuildingForms(buildingForms);

    const agentForms: Record<string, SceneAgentForm> = {};
    snapshot.agents.forEach((agent) => {
      agentForms[agent.id] = sceneAgentToForm(agent);
    });
    setSceneAgentForms(agentForms);
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
              <h2 style={sectionTitleStyle}>建筑模板（system_template_buildings）</h2>
              <ul style={listStyle}>
                {(snapshot.buildingTemplates ?? []).map((tpl) => {
                  const form = buildingTemplateForms[tpl.id] ?? buildingTemplateToForm(tpl);
                  const dirty = isBuildingTemplateDirty(tpl, form);
                  const busy = isPending(pendingKey('tpl-building', tpl.id));
                  return (
                    <li
                      key={tpl.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(36, 33, 58, 0.55)',
                        border: '1px solid rgba(140, 150, 190, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 240px' }}>
                          <span style={labelStyle}>模板名称</span>
                          <input
                            type="text"
                            value={form.label}
                            onChange={handleBuildingTemplateFieldChange(tpl.id, 'label')}
                            style={inputStyle}
                            placeholder="输入模板名称"
                          />
                        </div>
                        <code style={{ fontSize: '0.85rem', color: '#92a0ff' }}>{tpl.id}</code>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gap: '0.6rem',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>能源类型</span>
                          <select
                            value={form.energyType}
                            onChange={handleBuildingTemplateFieldChange(tpl.id, 'energyType')}
                            style={inputStyle}
                          >
                            <option value="">（无）</option>
                            <option value="storage">储能</option>
                            <option value="consumer">耗能</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>容量</span>
                          <input
                            type="number"
                            value={form.energyCapacity}
                            onChange={handleBuildingTemplateFieldChange(tpl.id, 'energyCapacity')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>当前</span>
                          <input
                            type="number"
                            value={form.energyCurrent}
                            onChange={handleBuildingTemplateFieldChange(tpl.id, 'energyCurrent')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>输出</span>
                          <input
                            type="number"
                            value={form.energyOutput}
                            onChange={handleBuildingTemplateFieldChange(tpl.id, 'energyOutput')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>消耗</span>
                          <input
                            type="number"
                            value={form.energyRate}
                            onChange={handleBuildingTemplateFieldChange(tpl.id, 'energyRate')}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveBuildingTemplate(tpl.id)}
                          disabled={!dirty || busy}
                          style={primaryButtonStyle(!dirty || busy)}
                        >
                          {busy ? '保存中…' : '保存'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetBuildingTemplate(tpl.id)}
                          disabled={busy || !dirty}
                          style={secondaryButtonStyle(busy || !dirty)}
                        >
                          重置
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>Agent 模板（system_template_agents）</h2>
              <ul style={listStyle}>
                {(snapshot.agentTemplates ?? []).map((tpl) => {
                  const form = agentTemplateForms[tpl.id] ?? agentTemplateToForm(tpl);
                  const dirty = isAgentTemplateDirty(tpl, form);
                  const busy = isPending(pendingKey('tpl-agent', tpl.id));
                  return (
                    <li
                      key={tpl.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(36, 33, 58, 0.55)',
                        border: '1px solid rgba(140, 150, 190, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 220px' }}>
                          <span style={labelStyle}>模板名称</span>
                          <input
                            type="text"
                            value={form.label}
                            onChange={handleAgentTemplateFieldChange(tpl.id, 'label')}
                            style={inputStyle}
                          />
                        </div>
                        <code style={{ fontSize: '0.85rem', color: '#92a0ff' }}>{tpl.id}</code>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gap: '0.6rem',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>色值</span>
                          <input
                            type="number"
                            value={form.color}
                            onChange={handleAgentTemplateFieldChange(tpl.id, 'color')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>默认 X</span>
                          <input
                            type="number"
                            value={form.defaultPosX}
                            onChange={handleAgentTemplateFieldChange(tpl.id, 'defaultPosX')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>默认 Y</span>
                          <input
                            type="number"
                            value={form.defaultPosY}
                            onChange={handleAgentTemplateFieldChange(tpl.id, 'defaultPosY')}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveAgentTemplate(tpl.id)}
                          disabled={!dirty || busy}
                          style={primaryButtonStyle(!dirty || busy)}
                        >
                          {busy ? '保存中…' : '保存'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetAgentTemplate(tpl.id)}
                          disabled={busy || !dirty}
                          style={secondaryButtonStyle(busy || !dirty)}
                        >
                          重置
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>建筑（system_scene_buildings）</h2>
              <ul style={listStyle}>
                {snapshot.buildings.map((building) => {
                  const form = sceneBuildingForms[building.id] ?? sceneBuildingToForm(building);
                  const dirty = isSceneBuildingDirty(building, form);
                  const busy = isPending(pendingKey('scene-building', building.id));
                  return (
                    <li
                      key={building.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(36, 33, 58, 0.55)',
                        border: '1px solid rgba(140, 150, 190, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gap: '0.75rem',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>建筑名称</span>
                          <input
                            type="text"
                            value={form.label}
                            onChange={handleSceneBuildingFieldChange(building.id, 'label')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>模板 ID</span>
                          <input
                            type="text"
                            value={form.templateId}
                            onChange={handleSceneBuildingFieldChange(building.id, 'templateId')}
                            style={inputStyle}
                            placeholder="可选"
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>能源类型</span>
                          <select
                            value={form.energyType}
                            onChange={handleSceneBuildingFieldChange(building.id, 'energyType')}
                            style={inputStyle}
                          >
                            <option value="">（无）</option>
                            <option value="storage">储能</option>
                            <option value="consumer">耗能</option>
                          </select>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gap: '0.6rem',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>X</span>
                          <input
                            type="number"
                            value={form.posX}
                            onChange={handleSceneBuildingFieldChange(building.id, 'posX')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>Y</span>
                          <input
                            type="number"
                            value={form.posY}
                            onChange={handleSceneBuildingFieldChange(building.id, 'posY')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>宽度</span>
                          <input
                            type="number"
                            value={form.width}
                            onChange={handleSceneBuildingFieldChange(building.id, 'width')}
                            style={inputStyle}
                            min={1}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>高度</span>
                          <input
                            type="number"
                            value={form.height}
                            onChange={handleSceneBuildingFieldChange(building.id, 'height')}
                            style={inputStyle}
                            min={1}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>容量</span>
                          <input
                            type="number"
                            value={form.energyCapacity}
                            onChange={handleSceneBuildingFieldChange(building.id, 'energyCapacity')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>当前</span>
                          <input
                            type="number"
                            value={form.energyCurrent}
                            onChange={handleSceneBuildingFieldChange(building.id, 'energyCurrent')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>输出</span>
                          <input
                            type="number"
                            value={form.energyOutput}
                            onChange={handleSceneBuildingFieldChange(building.id, 'energyOutput')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>消耗</span>
                          <input
                            type="number"
                            value={form.energyRate}
                            onChange={handleSceneBuildingFieldChange(building.id, 'energyRate')}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveSceneBuilding(building.id)}
                          disabled={!dirty || busy}
                          style={primaryButtonStyle(!dirty || busy)}
                        >
                          {busy ? '保存中…' : '保存'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetSceneBuilding(building.id)}
                          disabled={busy || !dirty}
                          style={secondaryButtonStyle(busy || !dirty)}
                        >
                          重置
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>Agent（system_scene_agents & actions）</h2>
              <ul style={listStyle}>
                {snapshot.agents.map((agent) => {
                  const form = sceneAgentForms[agent.id] ?? sceneAgentToForm(agent);
                  const dirty = isSceneAgentDirty(agent, form);
                  const busy = isPending(pendingKey('scene-agent', agent.id));
                  return (
                    <li
                      key={agent.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(36, 33, 58, 0.55)',
                        border: '1px solid rgba(140, 150, 190, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 220px' }}>
                          <span style={labelStyle}>Agent 名称</span>
                          <input
                            type="text"
                            value={form.label}
                            onChange={handleSceneAgentFieldChange(agent.id, 'label')}
                            style={inputStyle}
                          />
                        </div>
                        <code style={{ fontSize: '0.85rem', color: '#92a0ff' }}>{agent.id}</code>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gap: '0.6rem',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>模板 ID</span>
                          <input
                            type="text"
                            value={form.templateId}
                            onChange={handleSceneAgentFieldChange(agent.id, 'templateId')}
                            style={inputStyle}
                            placeholder="可选"
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>X</span>
                          <input
                            type="number"
                            value={form.posX}
                            onChange={handleSceneAgentFieldChange(agent.id, 'posX')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>Y</span>
                          <input
                            type="number"
                            value={form.posY}
                            onChange={handleSceneAgentFieldChange(agent.id, 'posY')}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={labelStyle}>色值</span>
                          <input
                            type="number"
                            value={form.color}
                            onChange={handleSceneAgentFieldChange(agent.id, 'color')}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={labelStyle}>可执行动作（逗号或换行分隔）</span>
                        <textarea
                          value={form.actions}
                          onChange={handleSceneAgentActionsChange(agent.id)}
                          style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveSceneAgent(agent.id)}
                          disabled={!dirty || busy}
                          style={primaryButtonStyle(!dirty || busy)}
                        >
                          {busy ? '保存中…' : '保存'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetSceneAgent(agent.id)}
                          disabled={busy || !dirty}
                          style={secondaryButtonStyle(busy || !dirty)}
                        >
                          重置
                        </button>
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

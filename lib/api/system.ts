import type {
  SceneAgent,
  SceneAgentTemplate,
  SceneBuilding,
  SceneBuildingTemplate,
  SceneDimensions,
  SceneGrid
} from '@/types/scene';

import { apiClient } from './client';

export type SystemSnapshot = {
  scene: { id: string; name: string };
  grid: SceneGrid;
  dimensions: SceneDimensions;
  buildings: SceneBuilding[];
  agents: SceneAgent[];
  buildingTemplates: SceneBuildingTemplate[];
  agentTemplates: SceneAgentTemplate[];
};

export type BuildingTemplatePayload = {
  label: string;
  energy: {
    type: string | null;
    capacity: number | null;
    current: number | null;
    output: number | null;
    rate: number | null;
  };
};

export type AgentTemplatePayload = {
  label: string;
  color: number | null;
  defaultPosition: [number, number] | null;
};

export type SceneBuildingPayload = {
  label: string;
  templateId: string | null;
  rect: [number, number, number, number];
  energy: {
    type: string | null;
    capacity: number | null;
    current: number | null;
    output: number | null;
    rate: number | null;
  };
};

export type SceneAgentPayload = {
  label: string;
  templateId: string | null;
  position: [number, number];
  color: number | null;
  actions: string[];
};

export type UpdateSystemScenePayload = {
  scene_id: string;
  name: string;
  grid: { cols: number; rows: number; tileSize: number };
  dimensions: { width: number; height: number };
};

export type TablePreviewRow = Record<string, unknown>;

export type TablePreview = {
  name: string;
  columns: string[];
  rows: TablePreviewRow[];
};

export type DatabasePreviewResponse = {
  tables: TablePreview[];
};

const encodeId = (value: string) => encodeURIComponent(value);

export const systemApi = {
  getSnapshot: () => apiClient.get<SystemSnapshot>('/v1/system/scene'),
  updateScene: (payload: UpdateSystemScenePayload) => apiClient.put<SystemSnapshot>('/v1/system/scene', payload),
  updateBuildingTemplate: (id: string, payload: BuildingTemplatePayload) =>
    apiClient.put<SystemSnapshot>(`/v1/system/templates/buildings/${encodeId(id)}`, payload),
  updateAgentTemplate: (id: string, payload: AgentTemplatePayload) =>
    apiClient.put<SystemSnapshot>(`/v1/system/templates/agents/${encodeId(id)}`, payload),
  updateSceneBuilding: (id: string, payload: SceneBuildingPayload) =>
    apiClient.put<SystemSnapshot>(`/v1/system/scene/buildings/${encodeId(id)}`, payload),
  deleteSceneBuilding: (id: string) =>
    apiClient.delete<SystemSnapshot>(`/v1/system/scene/buildings/${encodeId(id)}`),
  previewDatabase: (params?: { tables?: string[]; limit?: number }) => {
    const search = new URLSearchParams();
    params?.tables?.forEach((table) => {
      if (table) search.append('table', table);
    });
    if (params?.limit) search.set('limit', String(params.limit));
    const query = search.toString();
    return apiClient.get<DatabasePreviewResponse>(
      `/v1/system/db/preview${query ? `?${query}` : ''}`
    );
  },
  updateSceneAgent: (id: string, payload: SceneAgentPayload) =>
    apiClient.put<SystemSnapshot>(`/v1/system/scene/agents/${encodeId(id)}`, payload)
};

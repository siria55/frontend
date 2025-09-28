import type { SceneBuilding, SceneDefinition } from '@/types/scene';

import { apiClient } from './client';

export interface MaintainEnergyResponse {
  scene: SceneDefinition;
  created: SceneBuilding[];
  netFlowBefore: number;
  netFlowAfter: number;
  towersBuilt: number;
}

export const gameApi = {
  getScene: () => apiClient.get<SceneDefinition>('/v1/game/scene'),
  buildSceneStreamUrl: () => apiClient.buildWsUrl('/v1/game/scene/stream'),
  updateAgentPosition: (agentId: string, position: [number, number]) =>
    apiClient.put(`/v1/game/scene/agents/${encodeURIComponent(agentId)}/position`, {
      x: position[0],
      y: position[1]
    }),
  maintainEnergy: (agentId: string) =>
    apiClient.post<MaintainEnergyResponse>(
      `/v1/game/scene/agents/${encodeURIComponent(agentId)}/behaviors/maintain-energy`
    )
};

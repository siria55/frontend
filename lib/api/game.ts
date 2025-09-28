import type { SceneDefinition } from '@/types/scene';

import { apiClient } from './client';

export const gameApi = {
  getScene: () => apiClient.get<SceneDefinition>('/v1/game/scene'),
  buildSceneStreamUrl: () => apiClient.buildWsUrl('/v1/game/scene/stream')
};

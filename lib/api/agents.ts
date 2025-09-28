import { apiClient } from './client';

export type LogAgentActionPayload = {
  action_type: string;
  actions: string[];
  source: string;
  issued_by?: string;
  result_status?: string;
};

export const agentsApi = {
  logAction: (agentId: string, payload: LogAgentActionPayload) =>
    apiClient.post<void>(`/v1/agents/${encodeURIComponent(agentId)}/actions`, payload)
};

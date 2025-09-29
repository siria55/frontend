import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PF from 'pathfinding';

import { agentsApi } from '@/lib/api/agents';
import { gameApi } from '@/lib/api/game';
import type { SceneAgent, SceneBuilding, SceneDefinition } from '@/types/scene';

const MOVEMENT_ACTIONS = ['move_left', 'move_right', 'move_up', 'move_down'] as const;
const SCENE_SYNC_EVENT = 'mars-scene-sync';
const SYSTEM_LOG_EVENT = 'mars-system-log';

export type AgentBehavior = (typeof MOVEMENT_ACTIONS)[number];
type AgentAction = AgentBehavior | 'maintain_energy';
export type AgentState = {
  id: string;
  label: string;
  position: [number, number];
  color?: number;
  actions: AgentBehavior[];
  updatedAt?: number;
};

const isMovementAction = (value: string): value is AgentBehavior =>
  (MOVEMENT_ACTIONS as readonly string[]).includes(value);

const ensureRect = (rect: number[]): [number, number, number, number] => {
  if (rect.length !== 4) {
    throw new Error('Mars 场景建筑矩形应包含 4 个元素');
  }
  return [rect[0], rect[1], rect[2], rect[3]];
};

const ensurePosition = (position: number[]): [number, number] => {
  if (position.length !== 2) {
    throw new Error('Mars 场景 Agent 坐标应包含 2 个元素');
  }
  return [Number(position[0]), Number(position[1])];
};

const isMovementActionString = (value: string): value is AgentBehavior => isMovementAction(value);

const MOVEMENT_SPEED = 0.1;
const COMMAND_STEP = 0.12;
const PLAYER_ID = 'ares-01';
const PATH_STEP = 0.08;
const PATH_DELAY_MS = 500;

export function useAgentController(scene: SceneDefinition) {
  const buildings = useMemo<SceneBuilding[]>(
    () => scene.buildings.map((building) => ({ ...building, rect: ensureRect(building.rect) })),
    [scene]
  );

  const initialAgents = useMemo<AgentState[]>(
    () =>
      (scene.agents ?? []).map((agent: SceneAgent) => ({
        ...agent,
        position: ensurePosition(agent.position),
        actions: (agent.actions as AgentBehavior[] | undefined)?.filter(isMovementActionString) ?? [],
        updatedAt: agent.updatedAt ? Date.parse(agent.updatedAt) : undefined
      })),
    [scene]
  );

  const [agents, setAgents] = useState<AgentState[]>(initialAgents);

  const persistedPositionsRef = useRef<Map<string, { position: [number, number]; updatedAt: number }>>(
    new Map()
  );
  const latestPositionsRef = useRef<Map<string, [number, number]>>(new Map());
  const lastSyncedPositionsRef = useRef<Map<string, [number, number]>>(new Map());
  const pathQueueRef = useRef<Map<string, [number, number][]>>(new Map());
  const pathCooldownRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const nextPersisted = new Map(persistedPositionsRef.current);

    const refreshedAgents = initialAgents.map((agent) => {
      const incomingPos: [number, number] = [agent.position[0], agent.position[1]];
      const incomingTs = agent.updatedAt ?? 0;
      const stored = nextPersisted.get(agent.id);

      if (!stored || incomingTs > stored.updatedAt) {
        nextPersisted.set(agent.id, { position: incomingPos, updatedAt: incomingTs });
        return agent;
      }

      return {
        ...agent,
        position: stored.position,
        updatedAt: stored.updatedAt
      };
    });

    const validIds = new Set(refreshedAgents.map((agent) => agent.id));
    Array.from(nextPersisted.keys()).forEach((id) => {
      if (!validIds.has(id)) {
        nextPersisted.delete(id);
      }
    });

    persistedPositionsRef.current = nextPersisted;

    const latest = new Map<string, [number, number]>();
    refreshedAgents.forEach((agent) => {
      const pos: [number, number] = [agent.position[0], agent.position[1]];
      latest.set(agent.id, pos);
      if (!lastSyncedPositionsRef.current.has(agent.id)) {
        lastSyncedPositionsRef.current.set(agent.id, pos);
      }
    });
    latestPositionsRef.current = latest;

    setAgents(refreshedAgents);
  }, [initialAgents]);

  useEffect(() => {
    const map = new Map<string, [number, number]>();
    agents.forEach((agent) => {
      map.set(agent.id, [agent.position[0], agent.position[1]]);
    });
    latestPositionsRef.current = map;
  }, [agents]);

  const cols = scene.dimensions.width;
  const rows = scene.dimensions.height;

  const isBlocked = useCallback(
    (x: number, y: number) => {
      return buildings.some((building) => {
        const [bx, by, bw, bh] = building.rect;
        return x >= bx && x < bx + bw && y >= by && y < by + bh;
      });
    },
    [buildings]
  );

  const buildNavigationGrid = useCallback(() => {
    const grid = new PF.Grid(cols, rows);
    buildings.forEach((building) => {
      const [bx, by, bw, bh] = building.rect;
      for (let x = bx; x < bx + bw; x += 1) {
        for (let y = by; y < by + bh; y += 1) {
          if (x >= 0 && x < cols && y >= 0 && y < rows) {
            grid.setWalkableAt(x, y, false);
          }
        }
      }
    });
    return grid;
  }, [buildings, cols, rows]);

  const finderRef = useRef(new PF.AStarFinder());

  const computePath = useCallback(
    (from: [number, number], to: [number, number]) => {
      if (cols <= 0 || rows <= 0) return null;

      const clamp = (value: number, max: number) => {
        if (value < 0) return 0;
        if (value >= max) return max - 1;
        return value;
      };

      const startX = clamp(Math.round(from[0]), cols);
      const startY = clamp(Math.round(from[1]), rows);
      const goalX = clamp(Math.round(to[0]), cols);
      const goalY = clamp(Math.round(to[1]), rows);

      if (isBlocked(goalX, goalY)) {
        return null;
      }

      const grid = buildNavigationGrid();
      const rawPath = finderRef.current.findPath(startX, startY, goalX, goalY, grid);
      if (!rawPath || rawPath.length <= 1) {
        return null;
      }

      const [, ...rest] = rawPath;
      return rest.map(([x, y]) => [x + 0.5, y + 0.5] as [number, number]);
    },
    [buildNavigationGrid, cols, isBlocked, rows]
  );

  const clampWithinBounds = useCallback(
    (value: number, max: number) => {
      if (max <= 0) return value;
      if (value < 0) return 0;
      if (value >= max) return max - Number.EPSILON;
      return value;
    },
    []
  );

  const logAgentAction = useCallback(
    async (agentId: string, action: AgentAction, origin: string) => {
      try {
        await agentsApi.logAction(agentId, {
          action_type: action,
          actions: [action],
          source: 'frontend',
          issued_by: origin,
          result_status: 'accepted'
        });
      } catch (error) {
        console.warn('failed to log agent action', error);
      }
    },
    []
  );

  useEffect(() => {
    const keyState: Record<string, boolean> = {};

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) return;
      keyState[key] = true;
      event.preventDefault();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) return;
      keyState[key] = false;
      event.preventDefault();
    };

    let animationFrame = 0;

    const update = () => {
      setAgents((prev) =>
        prev.map((agent) => {
          const persistent = new Set(agent.actions ?? []);
          const isPlayer = agent.id === PLAYER_ID;
          const activePath = pathQueueRef.current.get(agent.id);

          let nextX = agent.position[0];
          let nextY = agent.position[1];

          if (activePath && activePath.length > 0) {
            const nowTs = Date.now();
            const lastMoveTs = pathCooldownRef.current.get(agent.id) ?? 0;
            if (nowTs - lastMoveTs < PATH_DELAY_MS) {
              return agent;
            }
            const [targetX, targetY] = activePath[0];
            const dx = targetX - nextX;
            const dy = targetY - nextY;
            const dist = Math.hypot(dx, dy);

            if (dist <= PATH_STEP) {
              nextX = targetX;
              nextY = targetY;
              activePath.shift();
              if (activePath.length === 0) {
                pathQueueRef.current.delete(agent.id);
                pathCooldownRef.current.delete(agent.id);
              }
            } else if (dist > 0) {
              const step = Math.min(PATH_STEP, dist);
              nextX += (dx / dist) * step;
              nextY += (dy / dist) * step;
            }

            if (pathQueueRef.current.has(agent.id)) {
              pathCooldownRef.current.set(agent.id, nowTs);
            }
            persistent.clear();
          } else {
            pathCooldownRef.current.delete(agent.id);
            if (isPlayer) {
              if (keyState.w) nextY -= MOVEMENT_SPEED;
              if (keyState.s) nextY += MOVEMENT_SPEED;
              if (keyState.a) nextX -= MOVEMENT_SPEED;
              if (keyState.d) nextX += MOVEMENT_SPEED;
            }

            if (persistent.has('move_up')) nextY -= COMMAND_STEP;
            if (persistent.has('move_down')) nextY += COMMAND_STEP;
            if (persistent.has('move_left')) nextX -= COMMAND_STEP;
            if (persistent.has('move_right')) nextX += COMMAND_STEP;

            if (!isPlayer && persistent.size === 0) {
              return agent;
            }
          }

          nextX = clampWithinBounds(nextX, cols);
          nextY = clampWithinBounds(nextY, rows);

          if (isBlocked(nextX, nextY)) {
            return agent;
          }

          if (nextX === agent.position[0] && nextY === agent.position[1]) {
            return agent;
          }

          const now = Date.now();
          if (isPlayer) {
            const wrappedPosition: [number, number] = [nextX, nextY];
            persistedPositionsRef.current.set(agent.id, {
              position: wrappedPosition,
              updatedAt: now
            });
            latestPositionsRef.current.set(agent.id, wrappedPosition);
          }

          return {
            ...agent,
            actions: Array.from(persistent),
            position: [nextX, nextY],
            updatedAt: now
          };
        })
      );

      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrame);
    };
  }, [clampWithinBounds, cols, isBlocked, rows]);

  const persistAgentPosition = useCallback((agentId: string, position: [number, number]) => {
    return gameApi
      .updateAgentPosition(agentId, position)
      .then(() => {
        lastSyncedPositionsRef.current.set(agentId, [position[0], position[1]]);
      })
      .catch((error) => {
        console.warn('failed to persist agent position', agentId, error);
        throw error;
      });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const EPSILON = 0.05;
      latestPositionsRef.current.forEach((pos, id) => {
        if (id !== PLAYER_ID) {
          return;
        }
        const lastSynced = lastSyncedPositionsRef.current.get(id);
        if (!lastSynced || Math.abs(lastSynced[0] - pos[0]) > EPSILON || Math.abs(lastSynced[1] - pos[1]) > EPSILON) {
          const snapshot: [number, number] = [pos[0], pos[1]];
          void persistAgentPosition(id, snapshot);
        }
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, [persistAgentPosition]);

  useEffect(() => {
    const handleAgentCommand = (event: Event) => {
      const custom = event as CustomEvent<{ agentId: string; action: string; origin?: string }>;
      const { agentId, action, origin } = custom.detail ?? {};
      if (!agentId || !action) return;

      const issuedBy = origin ?? 'mars_ui';

      if (action === 'maintain_energy') {
        void logAgentAction(agentId, action as AgentBehavior, issuedBy);
        void gameApi
          .maintainEnergy(agentId)
          .then((payload) => {
            window.dispatchEvent(
              new CustomEvent<SceneDefinition>(SCENE_SYNC_EVENT, {
                detail: payload.scene
              })
            );

            const relocation = payload.relocation;
            if (relocation) {
              const [rx, ry] = relocation.position;
              const message = `系统提示：${relocation.id} 自动导航至 (${Math.round(rx)}, ${Math.round(ry)}) 以部署太阳能塔`;
              window.dispatchEvent(
                new CustomEvent<string>(SYSTEM_LOG_EVENT, {
                  detail: message
                })
              );
              const current = latestPositionsRef.current.get(relocation.id);
              if (current) {
                const path = computePath(current, [rx, ry]);
                if (path && path.length > 0) {
                  pathQueueRef.current.set(relocation.id, path);
                  pathCooldownRef.current.set(relocation.id, Date.now());
                  setAgents((prev) =>
                    prev.map((agent) =>
                      agent.id === relocation.id
                        ? {
                            ...agent,
                            actions: [],
                            updatedAt: Date.now()
                          }
                        : agent
                    )
                  );
                } else {
                  pathCooldownRef.current.delete(relocation.id);
                  const now = Date.now();
                  const snapshot: [number, number] = [rx, ry];
                  persistedPositionsRef.current.set(relocation.id, {
                    position: snapshot,
                    updatedAt: now
                  });
                  latestPositionsRef.current.set(relocation.id, snapshot);
                  lastSyncedPositionsRef.current.set(relocation.id, snapshot);
                  setAgents((prev) =>
                    prev.map((agent) =>
                      agent.id === relocation.id
                        ? {
                            ...agent,
                            position: snapshot,
                            updatedAt: now,
                            actions: []
                          }
                        : agent
                    )
                  );
                }
              }
            }
          })
          .catch((error) => {
            console.warn('failed to maintain energy balance', error);
          });
        return;
      }

      if (!isMovementAction(action)) {
        void logAgentAction(agentId, action as AgentBehavior, issuedBy);
        return;
      }

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent;
          const nextActions: AgentBehavior[] = [action];
          return {
            ...agent,
            actions: nextActions
          };
        })
      );

      void logAgentAction(agentId, action as AgentBehavior, issuedBy);
    };

    window.addEventListener('mars-agent-command', handleAgentCommand as EventListener);
    return () => {
      window.removeEventListener('mars-agent-command', handleAgentCommand as EventListener);
    };
  }, [logAgentAction, computePath]);

  return {
    agents,
    buildings
  };
}

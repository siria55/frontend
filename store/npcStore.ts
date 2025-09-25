import { create } from 'zustand';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Waypoint {
  id: string;
  label: string;
  point: [number, number];
}

export interface NpcState {
  id: string;
  name: string;
  color: number;
  position: Vec2;
  path: [number, number][];
  currentWaypoint: number;
  speed: number;
}

export interface LogEntry {
  id: string;
  text: string;
  timestamp: number;
}

export type PathPlanner = (
  from: Vec2,
  to: [number, number]
) => [number, number][];

export interface NpcStore {
  npcs: NpcState[];
  waypoints: Waypoint[];
  logs: LogEntry[];
  tick(delta: number, planPath: PathPlanner): void;
  clearLogs(): void;
}

const waypointLoop: Waypoint[] = [
  { id: 'central', label: '联合指挥穹顶', point: [32, 30] },
  { id: 'resource', label: '资源开采带', point: [20, 54] },
  { id: 'solar', label: '能量塔阵列', point: [52, 22] },
  { id: 'rover', label: '外勤车库', point: [46, 36] }
];

const createLog = (text: string): LogEntry => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  text,
  timestamp: Date.now()
});

export const useNpcStore = create<NpcStore>((set, get) => ({
  npcs: [
    {
      id: 'ares-01',
      name: '阿瑞斯-01',
      color: 0xfff7cc,
      position: { x: 32, y: 30 },
      path: [],
      currentWaypoint: 0,
      speed: 0.12
    },
    {
      id: 'support-11',
      name: 'Support-11',
      color: 0x8dd2ff,
      position: { x: 34, y: 32 },
      path: [],
      currentWaypoint: 1,
      speed: 0.1
    }
  ],
  waypoints: waypointLoop,
  logs: [createLog('阿瑞斯-01 完成自检，开始巡逻。')],
  tick(delta: number, planPath: PathPlanner) {
    if (!planPath) return;
    const producedLogs: LogEntry[] = [];

    set((state) => {
      const npcs = state.npcs.map((npc) => {
        let { path, position, currentWaypoint } = npc;

        if (!path.length) {
          const nextIndex = (currentWaypoint + 1) % state.waypoints.length;
          const waypoint = state.waypoints[nextIndex];
          const planned = planPath(position, waypoint.point);
          if (planned.length > 1) {
            path = planned.slice(1);
            currentWaypoint = nextIndex;
            producedLogs.push(createLog(`${npc.name} 正前往 ${waypoint.label}`));
          }
        }

        if (!path.length) {
          return { ...npc, path, currentWaypoint };
        }

        const [targetX, targetY] = path[0];
        const dx = targetX - position.x;
        const dy = targetY - position.y;
        const distance = Math.hypot(dx, dy);
        const step = npc.speed * (delta || 1);

        let nextPosition = position;
        let nextPath = path;
        let reachedWaypoint = false;

        if (distance <= step || distance < 0.01) {
          nextPosition = { x: targetX, y: targetY };
          nextPath = path.slice(1);
          if (!nextPath.length) {
            const current = state.waypoints[currentWaypoint];
            if (current) {
              producedLogs.push(createLog(`${npc.name} 抵达 ${current.label}`));
            }
            reachedWaypoint = true;
          }
        } else {
          const ratio = step / distance;
          nextPosition = {
            x: position.x + dx * ratio,
            y: position.y + dy * ratio
          };
        }

        return {
          ...npc,
          position: nextPosition,
          path: nextPath,
          currentWaypoint: reachedWaypoint ? currentWaypoint : npc.currentWaypoint
        };
      });

      const logs = producedLogs.length
        ? [...producedLogs, ...state.logs].slice(0, 18)
        : state.logs;

      return { npcs, logs };
    });
  },
  clearLogs() {
    set({ logs: [] });
  }
}));

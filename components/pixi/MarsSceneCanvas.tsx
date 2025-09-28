'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { ReactNode } from 'react';
import { Container, Graphics, PixiComponent, Stage, Text, useApp } from '@pixi/react';
import type { Application, Graphics as PixiGraphics } from 'pixi.js';
import { TextStyle } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

import { agentsApi } from '@/lib/api/agents';
import { gameApi } from '@/lib/api/game';
import type { SceneDefinition, SceneBuilding, SceneAgent } from '@/types/scene';

type AgentAction = 'move_left' | 'move_right' | 'move_up' | 'move_down';
type AgentCommandDetail = {
  agentId: string;
  action: AgentAction;
  origin?: string;
};

type AgentState = {
  id: string;
  label: string;
  position: [number, number];
  color?: number;
  actions: AgentAction[];
  updatedAt?: number;
};

type PersistedEntry = {
  position: [number, number];
  updatedAt: number;
};

type ViewportComponentProps = {
  app: Application;
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  minScale?: number;
  maxScale?: number;
  scale?: number;
  children?: ReactNode;
};

type ViewportProps = Omit<ViewportComponentProps, 'app'>;

type MarsSceneCanvasProps = {
  scene: SceneDefinition;
  zoom?: number;
};

const BACKGROUND_COLOR = 0x120b1c;
const BUILDING_COLOR = 0xd7dce4;
const GRID_COLOR = 0x2a1f36;
const DEFAULT_AGENT_COLOR = 0x7b9bff;
const TERRAIN_COLOR = 0xc86f32;

const buildingLabelStyle = new TextStyle({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 14,
  fontWeight: '600',
  fill: '#1a0c1c',
  align: 'center'
});

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

const PixiViewportComponent = PixiComponent<ViewportComponentProps, Viewport>('PixiViewport', {
  create: ({ app, width, height, worldWidth, worldHeight, minScale, maxScale, scale }) => {
    const viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth,
      worldHeight,
      interaction: app.renderer.events,
      ticker: app.ticker
    });

    viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clamp({ direction: 'all' })
      .clampZoom({ minScale: minScale ?? 1, maxScale: maxScale ?? 3 });

    const initialZoom = Math.max(minScale ?? 1, Math.min(scale ?? 1, maxScale ?? 3));
    viewport.setZoom(initialZoom, true);
    viewport.moveCenter(worldWidth / 2, worldHeight / 2);
    return viewport;
  },
  applyProps: (instance, oldProps, newProps) => {
    const prev = oldProps as ViewportComponentProps;
    const next = newProps as ViewportComponentProps;
    const { width, height, worldWidth, worldHeight, minScale, maxScale, scale } = next;
    if (prev.width !== width || prev.height !== height) {
      instance.resize(width, height, worldWidth, worldHeight);
    }
    if (prev.worldWidth !== worldWidth || prev.worldHeight !== worldHeight) {
      instance.worldWidth = worldWidth;
      instance.worldHeight = worldHeight;
      instance.clamp({ direction: 'all' });
    }
    if (prev.minScale !== minScale || prev.maxScale !== maxScale) {
      instance.clampZoom({ minScale: minScale ?? 1, maxScale: maxScale ?? 3 });
    }
    if (scale !== undefined && prev.scale !== scale) {
      const clamped = Math.max(minScale ?? 1, Math.min(scale, maxScale ?? 3));
      instance.setZoom(clamped, true);
    }
  },
  willUnmount: (instance) => {
    instance.destroy({ children: true });
  }
});

const ViewportLayer = ({ children, ...props }: ViewportProps) => {
  const app = useApp();
  return <PixiViewportComponent {...props} app={app}>{children}</PixiViewportComponent>;
};

const useViewportSize = () => {
  const [size, setSize] = useState({ width: 1280, height: 720 });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
};

export default function MarsSceneCanvas({ scene, zoom }: MarsSceneCanvasProps) {
  const { width, height } = useViewportSize();
const persistedPositionsRef = useRef<Map<string, PersistedEntry>>(new Map());
const latestPositionsRef = useRef<Map<string, [number, number]>>(new Map());
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

  const buildings: SceneBuilding[] = useMemo(
    () => scene.buildings.map((building) => ({ ...building, rect: ensureRect(building.rect) })),
    [scene]
  );

const initialAgents = useMemo<AgentState[]>(
  () =>
    (scene.agents ?? []).map((agent: SceneAgent) => ({
      ...agent,
      position: ensurePosition(agent.position),
      actions: (agent.actions as AgentAction[] | undefined) ?? [],
      updatedAt: agent.updatedAt ? Date.parse(agent.updatedAt) : undefined
    })),
  [scene]
);

  const [agents, setAgents] = useState<AgentState[]>(initialAgents);

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
      latest.set(agent.id, [agent.position[0], agent.position[1]]);
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

  const rows = scene.dimensions.height;
  const cols = scene.dimensions.width;

  const tileSize = useMemo(() => {
    const tentative = Math.floor(Math.min(width / cols, height / rows));
    return Math.max(tentative, scene.grid.tileSize ?? 12);
  }, [cols, height, rows, width, scene.grid.tileSize]);

  const mapWidth = cols * tileSize;
  const mapHeight = rows * tileSize;

  const wrapCoord = useCallback((value: number, size: number) => {
    if (size <= 0) return value;
    const mod = value % size;
    return mod >= 0 ? mod : mod + size;
  }, []);

  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(BACKGROUND_COLOR);
      g.drawRect(0, 0, width, height);
      g.endFill();
    },
    [height, width]
  );

  const drawTerrain = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(TERRAIN_COLOR);
      g.drawRect(0, 0, mapWidth, mapHeight);
      g.endFill();
    },
    [mapHeight, mapWidth]
  );

  const drawGrid = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.lineStyle(1, GRID_COLOR, 0.3);
      for (let x = 0; x <= cols; x += 1) {
        const px = x * tileSize;
        g.moveTo(px, 0);
        g.lineTo(px, mapHeight);
      }
      for (let y = 0; y <= rows; y += 1) {
        const py = y * tileSize;
        g.moveTo(0, py);
        g.lineTo(mapWidth, py);
      }
    },
    [cols, mapHeight, mapWidth, rows, tileSize]
  );

const drawBuildings = useCallback(
  (g: PixiGraphics) => {
    g.clear();
    buildings.forEach((building) => {
      const [x, y, w, h] = building.rect;
      const px = x * tileSize;
      const py = y * tileSize;
      const bw = w * tileSize;
      const bh = h * tileSize;
      g.beginFill(BUILDING_COLOR, 0.9);
      g.drawRect(px, py, bw, bh);
      g.endFill();
    });
  },
  [buildings, tileSize]
);

  useEffect(() => {
    const speed = 0.22;
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
          const isPlayer = agent.id === 'ares-01';

          let nextX = agent.position[0];
          let nextY = agent.position[1];

          if (isPlayer) {
            if (keyState.w) nextY -= speed;
            if (keyState.s) nextY += speed;
            if (keyState.a) nextX -= speed;
            if (keyState.d) nextX += speed;
          }

          const commandStep = 0.12;
          if (persistent.has('move_up')) nextY -= commandStep;
          if (persistent.has('move_down')) nextY += commandStep;
          if (persistent.has('move_left')) nextX -= commandStep;
          if (persistent.has('move_right')) nextX += commandStep;

          if (!isPlayer && persistent.size === 0) {
            return agent;
          }

          const wrappedPosition: [number, number] = [wrapCoord(nextX, cols), wrapCoord(nextY, rows)];
          if (wrappedPosition[0] === agent.position[0] && wrappedPosition[1] === agent.position[1]) {
            return agent;
          }

          const now = Date.now();
          if (isPlayer) {
            persistedPositionsRef.current.set(agent.id, {
              position: wrappedPosition,
              updatedAt: now
            });
          }

          return {
            ...agent,
            actions: Array.from(persistent),
            position: wrappedPosition,
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
  }, [cols, rows, wrapCoord]);

  const persistAgentPosition = useCallback((agentId: string, position: [number, number]) => {
    void gameApi
      .updateAgentPosition(agentId, position)
      .catch((error) => console.warn('failed to persist agent position', agentId, error));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const EPSILON = 0.05;
      latestPositionsRef.current.forEach((pos, id) => {
        if (id !== 'ares-01') {
          return;
        }
        const prev = persistedPositionsRef.current.get(id);
        if (!prev || Math.abs(prev.position[0] - pos[0]) > EPSILON || Math.abs(prev.position[1] - pos[1]) > EPSILON) {
          const snapshot: [number, number] = [pos[0], pos[1]];
          const now = Date.now();
          persistedPositionsRef.current.set(id, { position: snapshot, updatedAt: now });
          persistAgentPosition(id, snapshot);
        }
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, [persistAgentPosition]);

  useEffect(() => {
    const handleAgentCommand = (event: Event) => {
      const custom = event as CustomEvent<AgentCommandDetail>;
      const { agentId, action, origin } = custom.detail ?? {};
      if (!agentId || !action) return;

      const issuedBy = origin ?? 'mars_ui';

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent;
          const nextActions: AgentAction[] = [action];
          return {
            ...agent,
            actions: nextActions
          };
        })
      );

      void logAgentAction(agentId, action, issuedBy);
    };

    window.addEventListener('mars-agent-command', handleAgentCommand as EventListener);
    return () => {
      window.removeEventListener('mars-agent-command', handleAgentCommand as EventListener);
    };
  }, [logAgentAction]);

  const agentElements = useMemo(
    () =>
      agents.map((agent) => {
        const [ax, ay] = agent.position;
        const color = agent.color ?? DEFAULT_AGENT_COLOR;
        const x = ax * tileSize;
        const y = ay * tileSize;
        return (
          <Container key={agent.id} x={x} y={y}>
            <Graphics
              draw={(g) => {
                g.clear();
                g.beginFill(color, 0.95);
                g.drawRect(0, 0, tileSize, tileSize);
                g.endFill();
              }}
            />
            <Text
              text={agent.label}
              anchor={{ x: 0.5, y: 0 }}
              x={tileSize / 2}
              y={tileSize + 4}
              style={new TextStyle({
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 12,
                fill: '#f5f5ff',
                dropShadow: true,
                dropShadowDistance: 1,
                dropShadowColor: '#0d0d1c'
              })}
              scale={{ x: 1 / (zoom ?? 1), y: 1 / (zoom ?? 1) }}
            />
          </Container>
        );
      }),
    [agents, tileSize, zoom]
  );

  const minScaleEstimate = useMemo(() => {
    const widthScale = width / mapWidth;
    const heightScale = height / mapHeight;
    return Math.max(Math.min(widthScale, heightScale), 1);
  }, [height, mapHeight, mapWidth, width]);

  const clampedZoom = useMemo(() => {
    const target = zoom ?? minScaleEstimate;
    return Math.max(minScaleEstimate, Math.min(target, 3));
  }, [minScaleEstimate, zoom]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'radial-gradient(circle at top, rgba(227, 93, 54, 0.18), transparent 60%), rgba(9,6,20,0.95)'
      }}
    >
      <Stage
        width={width}
        height={height}
        options={{ backgroundAlpha: 0, antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Graphics draw={drawBackground} />
        <ViewportLayer
          width={width}
          height={height}
          worldWidth={mapWidth}
          worldHeight={mapHeight}
          minScale={minScaleEstimate}
          maxScale={3}
          scale={clampedZoom}
        >
          <Graphics draw={drawTerrain} />
          <Graphics draw={drawGrid} />
          <Graphics draw={drawBuildings} />
          {buildings.map((building) => {
            const [x, y, w, h] = building.rect;
            const centerX = (x + w / 2) * tileSize;
            const centerY = (y + h / 2) * tileSize;
            return (
              <Text
                key={building.id}
                text={building.label}
                anchor={0.5}
                x={centerX}
                y={centerY}
                style={buildingLabelStyle}
              />
            );
          })}
          {agentElements}
        </ViewportLayer>
      </Stage>
    </div>
  );
}

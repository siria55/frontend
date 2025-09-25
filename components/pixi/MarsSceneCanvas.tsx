'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react';
import type { ReactNode } from 'react';
import { Container, Graphics, PixiComponent, Stage, Text, useApp } from '@pixi/react';
import type { Application, Graphics as PixiGraphics } from 'pixi.js';
import { TextStyle } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

import sceneData from '@/assets/scenes/mars_outpost.json';

type SceneDefinition = {
  id: string;
  name: string;
  grid: { cols: number; rows: number; tileSize?: number };
  dimensions: { width: number; height: number };
  buildings: Array<{
    id: string;
    label: string;
    rect: [number, number, number, number];
    energy?: {
      type: 'storage' | 'consumer';
      capacity?: number;
      current?: number;
      output?: number;
      rate?: number;
    };
  }>;
  agents?: Array<{
    id: string;
    label: string;
    position: [number, number];
    color?: number;
    behaviors?: string[];
  }>;
};

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
  return [position[0], position[1]];
};

type AgentBehavior = 'move_left' | 'move_right' | 'move_up' | 'move_down';
type AgentCommandDetail = {
  agentId: string;
  behavior: AgentBehavior;
};

type ViewportInternalProps = {
  app: Application;
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  minScale?: number;
  maxScale?: number;
};

type ViewportProps = Omit<ViewportInternalProps, 'app'> & {
  children?: ReactNode;
};

const PixiViewportComponent = PixiComponent<ViewportInternalProps>('PixiViewport', {
  create: ({ app, width, height, worldWidth, worldHeight, minScale, maxScale }) => {
    const viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth,
      worldHeight,
      events: app.renderer.events,
      ticker: app.ticker
    });

    viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clamp({ direction: 'all' })
      .clampZoom({ minScale: minScale ?? 0.3, maxScale: maxScale ?? 3 });

    viewport.moveCenter(worldWidth / 2, worldHeight / 2);
    return viewport;
  },
  applyProps: (instance, oldProps, newProps) => {
    const { width, height, worldWidth, worldHeight, minScale, maxScale } = newProps;
    if (oldProps.width !== width || oldProps.height !== height) {
      instance.resize(width, height, worldWidth, worldHeight);
    }
    if (oldProps.worldWidth !== worldWidth || oldProps.worldHeight !== worldHeight) {
      instance.worldWidth = worldWidth;
      instance.worldHeight = worldHeight;
      instance.clamp({ direction: 'all' });
    }
    if (oldProps.minScale !== minScale || oldProps.maxScale !== maxScale) {
      instance.clampZoom({ minScale: minScale ?? 0.3, maxScale: maxScale ?? 3 });
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

const data: SceneDefinition = {
  ...sceneData,
  buildings: sceneData.buildings.map((building) => ({
    ...building,
    rect: ensureRect(building.rect)
  })),
  agents: sceneData.agents?.map((agent) => ({
    ...agent,
    position: ensurePosition(agent.position),
    behaviors: agent.behaviors ?? []
  }))
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

export default function MarsSceneCanvas() {
  const { width, height } = useViewportSize();
  const rows = data.dimensions.height;
  const cols = data.dimensions.width;

  const tileSize = useMemo(() => {
    const tentative = Math.floor(Math.min(width / cols, height / rows));
    return Math.max(tentative, 12);
  }, [cols, height, rows, width]);

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
      data.buildings.forEach((building) => {
        const [x, y, w, h] = building.rect;
        const px = x * tileSize;
        const py = y * tileSize;
        const bw = w * tileSize;
        const bh = h * tileSize;
        g.beginFill(BUILDING_COLOR, 0.9);
        g.drawRoundedRect(px, py, bw, bh, 10);
        g.endFill();
      });
    },
    [tileSize]
  );

  const initialAgents = useMemo(() => data.agents ?? [], []);
  const [agents, setAgents] = useState(initialAgents);

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
          const persistent = new Set(agent.behaviors ?? []);
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

          return {
            ...agent,
            behaviors: Array.from(persistent),
            position: [wrapCoord(nextX, cols), wrapCoord(nextY, rows)] as [number, number]
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

  useEffect(() => {
    const handleAgentCommand = (event: Event) => {
      const custom = event as CustomEvent<AgentCommandDetail>;
      const { agentId, behavior } = custom.detail ?? {};
      if (!agentId || !behavior) return;

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent;
          const nextBehaviors: AgentBehavior[] = [behavior];
          return {
            ...agent,
            behaviors: nextBehaviors
          };
        })
      );
    };

    window.addEventListener('mars-agent-command', handleAgentCommand as EventListener);
    return () => {
      window.removeEventListener('mars-agent-command', handleAgentCommand as EventListener);
    };
  }, []);

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
                fontSize: Math.max(tileSize * 0.4, 10),
                fill: '#f5f5ff',
                dropShadow: true,
                dropShadowDistance: 1,
                dropShadowColor: '#0d0d1c'
              })}
            />
          </Container>
        );
      }),
    [agents, tileSize]
  );

  const minScaleEstimate = useMemo(() => {
    const widthScale = width / mapWidth;
    const heightScale = height / mapHeight;
    return Math.max(Math.min(widthScale, heightScale), 0.12);
  }, [height, mapHeight, mapWidth, width]);

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
        >
          <Graphics draw={drawTerrain} />
          <Graphics draw={drawGrid} />
          <Graphics draw={drawBuildings} />
          {data.buildings.map((building) => {
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

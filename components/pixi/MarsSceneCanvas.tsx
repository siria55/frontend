'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Container, Graphics, Stage, Text, useTick } from '@pixi/react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { TextStyle as PixiTextStyle } from 'pixi.js';
import { AStarFinder, DiagonalMovement, Grid as PFGrid } from 'pathfinding';

import marsSceneRaw from '@/assets/scenes/mars_outpost.json';
import { useNpcStore } from '@/store/npcStore';
import { useWorldStore } from '@/store/worldStore';

type EntityShape = 'round' | 'ring' | 'rect' | 'grid' | 'spoke' | 'arc';

type Entity = {
  id: string;
  label?: string;
  position: [number, number];
  size: [number, number];
  kind?: string;
  shape?: EntityShape;
  thickness?: number;
  components?: string[];
};

type Corridor = {
  id: string;
  label?: string;
  from: [number, number];
  to: [number, number];
  width?: number;
};

type Marker = {
  id: string;
  label?: string;
  position: [number, number];
  tone?: 'rare' | 'vital' | 'drone';
};

type SceneData = {
  grid: { cols: number; rows: number };
  layers: Array<{
    id: string;
    type: string;
    entities?: Entity[];
    corridors?: Corridor[];
    markers?: Marker[];
  }>;
  navigation: {
    walkable: string[];
    blocked: Array<{
      shape: 'rect';
      position: [number, number];
      size: [number, number];
    }>;
  };
};

type ViewportState = {
  x: number;
  y: number;
  scale: number;
};

const marsData = marsSceneRaw as SceneData;

const TILE_SIZE = 24;
const BASE_WIDTH = marsData.grid.cols * TILE_SIZE;
const BASE_HEIGHT = marsData.grid.rows * TILE_SIZE;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;

const structureColor: Record<string, number> = {
  command: 0xffc26f,
  plaza: 0xf5d58a,
  habitat: 0xff9ecd,
  industrial: 0xf77b72,
  energy: 0x6fd4ff,
  pad: 0x7b95ff,
  logistics: 0xa6ffe6,
  tower: 0xfff48c,
  barrier: 0xfbceff
};

const markerColor: Record<string, number> = {
  rare: 0xfff0c4,
  vital: 0xa6ffe6,
  drone: 0xbca3ff
};

const toPixels = ([x, y]: [number, number]) => [x * TILE_SIZE, y * TILE_SIZE] as [number, number];

const formatTime = (minutes: number) => {
  const total = Math.floor(minutes) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const pad = (v: number) => v.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}`;
};

const buildBlockedMatrix = (scene: SceneData) => {
  const { cols, rows } = scene.grid;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  const markRect = (position: [number, number], size: [number, number]) => {
    const [px, py] = position;
    const [sx, sy] = size;
    for (let y = py; y < py + sy; y += 1) {
      if (y < 0 || y >= rows) continue;
      for (let x = px; x < px + sx; x += 1) {
        if (x < 0 || x >= cols) continue;
        matrix[y][x] = 1;
      }
    }
  };

  scene.navigation.blocked.forEach((block) => {
    if (block.shape === 'rect') {
      markRect(block.position, block.size);
    }
  });

  const structures = scene.layers.find((layer) => layer.id === 'structures');
  structures?.entities?.forEach((entity) => {
    if (!entity.shape) return;
    if (entity.shape === 'rect' || entity.shape === 'round' || entity.shape === 'grid') {
      markRect(entity.position, entity.size);
    }
  });

  return matrix;
};

const useResizeObserver = (ref: React.RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(width, 320),
        height: Math.max(height, 240)
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};

const useDpi = () => {
  const [dpi, setDpi] = useState(1);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDpi(Math.min(window.devicePixelRatio || 1, 2));
  }, []);
  return dpi;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const StructureShape = ({ entity }: { entity: Entity }) => {
  const [x, y] = entity.position;
  const [w, h] = entity.size;
  const color = structureColor[entity.kind ?? ''] ?? 0xffbfbf;
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;
  const width = w * TILE_SIZE;
  const height = h * TILE_SIZE;

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(color, 0.85);
      if (entity.shape === 'round') {
        g.drawCircle(px + width / 2, py + height / 2, Math.max(width, height) / 2);
      } else if (entity.shape === 'ring') {
        g.beginFill(0, 0);
        g.lineStyle(entity.thickness ?? 6, color, 0.9);
        g.drawCircle(px + width / 2, py + height / 2, Math.max(width, height) / 2);
      } else if (entity.shape === 'grid') {
        g.beginFill(color, 0.18);
        g.drawRoundedRect(px, py, width, height, 12);
        g.endFill();
        g.lineStyle(1, color, 0.8);
        const cell = TILE_SIZE * 2;
        for (let yy = py + cell / 2; yy < py + height; yy += cell) {
          for (let xx = px + cell / 2; xx < px + width; xx += cell) {
            g.beginFill(color, 0.55);
            g.drawCircle(xx, yy, TILE_SIZE * 0.6);
            g.endFill();
          }
        }
      } else if (entity.shape === 'spoke') {
        g.beginFill(color, 0.18);
        g.drawRoundedRect(px, py, width, height, 10);
        g.endFill();
        g.lineStyle(3, color, 0.9);
        const centerX = px + width / 2;
        const centerY = py + height / 2;
        g.moveTo(centerX, py);
        g.lineTo(centerX, py + height);
        g.moveTo(px, centerY);
        g.lineTo(px + width, centerY);
      } else if (entity.shape === 'arc') {
        const centerX = px + width / 2;
        const centerY = py + height / 2;
        const outerRadius = Math.max(width, height) * 0.6;
        g.beginFill(color, 0.08);
        g.drawEllipse(centerX, centerY, width, height);
        g.endFill();
        g.lineStyle(entity.thickness ?? 5, color, 0.8);
        g.arc(centerX, centerY, outerRadius, Math.PI * 0.2, Math.PI * 0.9);
      } else {
        g.drawRoundedRect(px, py, width, height, 12);
      }
      g.endFill();
    },
    [color, entity.shape, entity.thickness, height, px, py, width]
  );

  return <Graphics draw={draw} />;
};

const structureLabelStyle = new PixiTextStyle({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 13,
  fontWeight: '600',
  fill: '#0f0615',
  align: 'center'
});

const StructureLabel = ({ entity }: { entity: Entity }) => {
  const [x, y] = entity.position;
  const [w, h] = entity.size;
  const text = entity.label ?? entity.id;
  return (
    <Text
      text={text}
      anchor={0.5}
      x={(x + w / 2) * TILE_SIZE}
      y={(y + h / 2) * TILE_SIZE}
      style={structureLabelStyle}
    />
  );
};

const CorridorLayer = ({ corridors }: { corridors: Corridor[] }) => {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      corridors.forEach((corridor) => {
        const [fromX, fromY] = toPixels(corridor.from);
        const [toX, toY] = toPixels(corridor.to);
        const width = (corridor.width ?? 2) * 2;
        g.lineStyle(width, 0x67e8f9, 0.4);
        g.moveTo(fromX, fromY);
        g.lineTo(toX, toY);
        g.lineStyle(width / 2, 0xffffff, 0.8);
        g.moveTo(fromX, fromY);
        g.lineTo(toX, toY);
      });
    },
    [corridors]
  );

  return <Graphics draw={draw} />;
};

const MarkerNode = ({ marker }: { marker: Marker }) => {
  const color = markerColor[marker.tone ?? 'rare'] ?? 0xffffff;
  const [x, y] = marker.position;
  const [px, py] = toPixels([x, y]);

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(color, 0.95);
      g.drawCircle(px, py, TILE_SIZE * 0.5);
      g.endFill();
      g.beginFill(0x0b0315, 1);
      g.drawCircle(px, py, TILE_SIZE * 0.2);
      g.endFill();
    },
    [color, px, py]
  );

  return <Graphics draw={draw} />;
};

const NpcSprite = ({
  x,
  y,
  color,
  name
}: {
  x: number;
  y: number;
  color: number;
  name: string;
}) => {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(color, 1);
      g.drawCircle(0, 0, TILE_SIZE * 0.4);
      g.endFill();
      g.lineStyle(2, 0xffffff, 0.7);
      g.moveTo(0, 0);
      g.lineTo(0, -TILE_SIZE * 0.55);
    },
    [color]
  );

  return (
    <Container x={x * TILE_SIZE} y={y * TILE_SIZE} sortableChildren>
      <Graphics draw={draw} />
      <Text
        text={name}
        anchor={{ x: 0.5, y: 0 }}
        y={TILE_SIZE * 0.6}
        style={new PixiTextStyle({
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 12,
          fill: '#ffffff',
          dropShadow: true,
          dropShadowDistance: 1,
          dropShadowColor: '#0d0d22'
        })}
      />
    </Container>
  );
};

const NpcLayer = () => {
  const npcs = useNpcStore((state) => state.npcs);
  const labelStyle = useMemo(
    () =>
      new PixiTextStyle({
        fontFamily: 'Menlo, monospace',
        fontSize: 11,
        fill: '#f0f4ff'
      }),
    []
  );

  return (
    <Container>
      {npcs.map((npc) => (
        <Container key={npc.id}>
          <NpcSprite
            x={npc.position.x}
            y={npc.position.y}
            color={npc.color}
            name={npc.name}
          />
          {npc.path.length > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                g.lineStyle(2, npc.color, 0.45);
                g.moveTo(npc.position.x * TILE_SIZE, npc.position.y * TILE_SIZE);
                npc.path.forEach(([px, py]) => {
                  g.lineTo(px * TILE_SIZE, py * TILE_SIZE);
                });
              }}
            />
          )}
          <Text
            text={`(${npc.position.x.toFixed(1)}, ${npc.position.y.toFixed(1)})`}
            anchor={{ x: 0.5, y: 0 }}
            x={npc.position.x * TILE_SIZE}
            y={npc.position.y * TILE_SIZE - TILE_SIZE}
            style={labelStyle}
          />
        </Container>
      ))}
    </Container>
  );
};

const SimulationTicker = ({
  planPath
}: {
  planPath: (from: { x: number; y: number }, to: [number, number]) => [number, number][];
}) => {
  const tickWorld = useWorldStore((state) => state.tick);
  const tickNpc = useNpcStore((state) => state.tick);

  useTick((delta) => {
    tickWorld(delta);
    tickNpc(delta, planPath);
  });

  return null;
};

const GridOverlay = () => {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.lineStyle(1, 0x241531, 0.4);
    for (let x = 0; x <= BASE_WIDTH; x += TILE_SIZE * 4) {
      g.moveTo(x, 0);
      g.lineTo(x, BASE_HEIGHT);
    }
    for (let y = 0; y <= BASE_HEIGHT; y += TILE_SIZE * 4) {
      g.moveTo(0, y);
      g.lineTo(BASE_WIDTH, y);
    }
  }, []);

  return <Graphics draw={draw} />;
};

const MapLayers = () => {
  const structures = useMemo(
    () => marsData.layers.find((layer) => layer.id === 'structures')?.entities ?? [],
    []
  );
  const corridors = useMemo(
    () => marsData.layers.find((layer) => layer.id === 'transit')?.corridors ?? [],
    []
  );
  const markers = useMemo(
    () => marsData.layers.find((layer) => layer.id === 'markers')?.markers ?? [],
    []
  );

  return (
    <Container sortableChildren>
      <GridOverlay />
      <CorridorLayer corridors={corridors} />
      {structures.map((entity) => (
        <Container key={entity.id}>
          <StructureShape entity={entity} />
          <StructureLabel entity={entity} />
        </Container>
      ))}
      {markers.map((marker) => (
        <MarkerNode key={marker.id} marker={marker} />
      ))}
      <NpcLayer />
    </Container>
  );
};

const LogsPanel = () => {
  const logs = useNpcStore((state) => state.logs);
  const time = useWorldStore((state) => state.minutes);
  const weather = useWorldStore((state) => state.weather);

  return (
    <aside
      style={{
        width: '320px',
        minHeight: '360px',
        maxHeight: '80vh',
        padding: '1.4rem',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,12,24,0.82)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        color: '#f5f5f6'
      }}
    >
      <section>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>前哨站状态</h2>
        <p style={{ margin: '0.35rem 0 0', color: '#b1b3c9' }}>
          当前时间：{formatTime(time)} · 天气：{weather}
        </p>
      </section>
      <section style={{ flex: 1, overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 0.6rem', fontSize: '1rem', color: '#c7c9de' }}>事件日志</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.map((entry) => (
            <li
              key={entry.id}
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <span style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{entry.text}</span>
              <br />
              <span style={{ fontSize: '0.75rem', color: '#7e829b' }}>
                {new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </li>
          ))}
          {!logs.length && (
            <li style={{ color: '#7e829b' }}>暂无事件，巡逻进行中。</li>
          )}
        </ul>
      </section>
    </aside>
  );
};

const useViewport = (size: { width: number; height: number }) => {
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, scale: 1 });
  const interacted = useRef(false);

  useEffect(() => {
    if (interacted.current) return;
    const scale = clamp(
      Math.min(size.width / BASE_WIDTH, size.height / BASE_HEIGHT),
      MIN_SCALE,
      1.2
    );
    const centeredX = (size.width - BASE_WIDTH * scale) / 2;
    const centeredY = (size.height - BASE_HEIGHT * scale) / 2;
    setViewport({ x: centeredX, y: centeredY, scale });
  }, [size.height, size.width]);

  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    interacted.current = true;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y
    };
  }, [viewport.x, viewport.y]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setViewport((prev) => ({ ...prev, x: dragRef.current.originX + dx, y: dragRef.current.originY + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      interacted.current = true;
      const { clientX, clientY, deltaY } = event;
      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;
      setViewport((prev) => {
        const zoomFactor = 1 - deltaY * 0.0015;
        const nextScale = clamp(prev.scale * zoomFactor, MIN_SCALE, MAX_SCALE);
        const worldX = (pointerX - prev.x) / prev.scale;
        const worldY = (pointerY - prev.y) / prev.scale;
        const nextX = pointerX - worldX * nextScale;
        const nextY = pointerY - worldY * nextScale;
        return { x: nextX, y: nextY, scale: nextScale };
      });
    },
    []
  );

  return { viewport, onPointerDown, onPointerMove, onPointerUp, onWheel };
};

export default function MarsSceneCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dpi = useDpi();
  const size = useResizeObserver(wrapperRef);
  const { viewport, onPointerDown, onPointerMove, onPointerUp, onWheel } = useViewport(size);

  const navigationMatrix = useMemo(() => buildBlockedMatrix(marsData), []);
  const planPath = useCallback(
    (from: { x: number; y: number }, to: [number, number]) => {
      const gridMatrix = navigationMatrix.map((row) => row.slice());
      const grid = new PFGrid(marsData.grid.cols, marsData.grid.rows, gridMatrix);
      const finder = new AStarFinder({ diagonalMovement: DiagonalMovement.Never });
      const startX = clamp(Math.round(from.x), 0, marsData.grid.cols - 1);
      const startY = clamp(Math.round(from.y), 0, marsData.grid.rows - 1);
      const [targetX, targetY] = [
        clamp(Math.round(to[0]), 0, marsData.grid.cols - 1),
        clamp(Math.round(to[1]), 0, marsData.grid.rows - 1)
      ];
      const rawPath = finder.findPath(startX, startY, targetX, targetY, grid);
      return rawPath.map(([x, y]) => [x, y] as [number, number]);
    },
    [navigationMatrix]
  );

  const stageWidth = Math.round(size.width);
  const stageHeight = Math.round(size.height);

  return (
    <div
      style={{
        display: 'flex',
        gap: '1.5rem',
        width: '100%',
        padding: '1.8rem 2.4rem',
        boxSizing: 'border-box',
        alignItems: 'flex-start',
        color: '#f4f2ff'
      }}
    >
      <div
        ref={wrapperRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        style={{
          flex: '1 1 auto',
          minHeight: '480px',
          height: '70vh',
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'radial-gradient(circle at top, rgba(220, 78, 48, 0.2), transparent 70%), rgba(9,6,20,0.9)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(15,0,30,0.55)'
        }}
      >
        <Stage
          width={stageWidth}
          height={stageHeight}
          options={{
            backgroundAlpha: 0,
            antialias: true,
            resolution: dpi
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <SimulationTicker planPath={planPath} />
          <Container x={viewport.x} y={viewport.y} scale={{ x: viewport.scale, y: viewport.scale }}>
            <MapLayers />
          </Container>
        </Stage>
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            padding: '0.6rem 0.9rem',
            borderRadius: '12px',
            background: 'rgba(11, 8, 22, 0.65)',
            border: '1px solid rgba(255,255,255,0.07)',
            fontSize: '0.85rem'
          }}
        >
          拖拽平移 · 滚轮缩放
        </div>
      </div>
      <LogsPanel />
    </div>
  );
}

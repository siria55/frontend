'use client';

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Container, Graphics, Stage, Text } from '@pixi/react';
import type { Graphics as PixiGraphics } from 'pixi.js';
import { TextStyle } from 'pixi.js';

import sceneData from '@/assets/scenes/mars_outpost.json';

type SceneDefinition = {
  grid: { cols: number; rows: number };
  dimensions: { width: number; height: number };
  buildings: Array<{
    id: string;
    label: string;
    rect: [number, number, number, number];
  }>;
};

const data = sceneData as SceneDefinition;

const BACKGROUND_COLOR = 0x120b1c;
const BUILDING_COLOR = 0xea885a;
const GRID_COLOR = 0x2a1f36;

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

  const clampAxis = useCallback((value: number, available: number) => {
    if (available === 0) return 0;
    const min = available < 0 ? available : 0;
    const max = available > 0 ? available : 0;
    if (min === max) return min;
    return Math.min(Math.max(value, min), max);
  }, []);

  const clampCamera = useCallback(
    (x: number, y: number) => {
      const availableX = width - mapWidth;
      const availableY = height - mapHeight;
      return {
        x: clampAxis(x, availableX),
        y: clampAxis(y, availableY)
      };
    },
    [clampAxis, height, mapHeight, mapWidth, width]
  );

  const cameraRef = useRef({ x: 0, y: 0 });
  const dragState = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });

  const [camera, setCamera] = useState(() => clampCamera(0, 0));
  cameraRef.current = camera;

  useLayoutEffect(() => {
    const availableX = width - mapWidth;
    const availableY = height - mapHeight;
    const target = clampCamera(availableX / 2, availableY / 2);
    setCamera((prev) => {
      if (dragState.current.active) {
        return clampCamera(prev.x, prev.y);
      }
      return target;
    });
  }, [clampCamera, height, mapHeight, mapWidth, width]);

  const setCameraClamped = useCallback(
    (nextX: number, nextY: number) => {
      const next = clampCamera(nextX, nextY);
      setCamera(next);
    },
    [clampCamera]
  );

  const [isDragging, setIsDragging] = useState(false);

  const clearDragState = useCallback(() => {
    dragState.current = {
      active: false,
      pointerId: -1,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0
    };
    setIsDragging(false);
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const mapX = (localX - cameraRef.current.x) / tileSize;
      const mapY = (localY - cameraRef.current.y) / tileSize;

      const insideMap = mapX >= 0 && mapX <= cols && mapY >= 0 && mapY <= rows;

      if (insideMap) {
        clearDragState();
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragState.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: cameraRef.current.x,
        originY: cameraRef.current.y
      };
      setIsDragging(true);
    },
    [clearDragState, cols, rows, tileSize]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragState.current.active) return;
      const dx = event.clientX - dragState.current.startX;
      const dy = event.clientY - dragState.current.startY;
      setCameraClamped(dragState.current.originX + dx, dragState.current.originY + dy);
    },
    [setCameraClamped]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragState.current.pointerId !== -1) {
        event.currentTarget.releasePointerCapture(dragState.current.pointerId);
      }
      clearDragState();
    },
    [clearDragState]
  );

  const handlePointerLeave = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(BACKGROUND_COLOR);
      g.drawRect(0, 0, width, height);
      g.endFill();
    },
    [height, width]
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

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'radial-gradient(circle at top, rgba(227, 93, 54, 0.18), transparent 60%), rgba(9,6,20,0.95)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <Stage
        width={width}
        height={height}
        options={{ backgroundAlpha: 0, antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Graphics draw={drawBackground} />
        <Container x={camera.x} y={camera.y}>
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
        </Container>
      </Stage>
    </div>
  );
}

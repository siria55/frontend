import { useCallback } from 'react';
import { Graphics, Text } from '@pixi/react';
import type { Graphics as PixiGraphics } from 'pixi.js';
import { TextStyle } from 'pixi.js';

import type { SceneBuilding } from '@/types/scene';

const TERRAIN_COLOR = 0xc86f32;
const GRID_COLOR = 0x2a1f36;
const BUILDING_COLOR = 0xd7dce4;

const buildingLabelStyle = new TextStyle({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 14,
  fontWeight: '600',
  fill: '#1a0c1c',
  align: 'center'
});

interface SceneLayersProps {
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  buildings: SceneBuilding[];
}

export default function SceneLayers({
  mapWidth,
  mapHeight,
  tileSize,
  buildings
}: SceneLayersProps) {
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
      const cols = Math.round(mapWidth / tileSize);
      const rows = Math.round(mapHeight / tileSize);
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
    [mapHeight, mapWidth, tileSize]
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

  return (
    <>
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
    </>
  );
}

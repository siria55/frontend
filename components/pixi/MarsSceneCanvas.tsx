'use client';

import { useMemo } from 'react';
import { Graphics, Stage } from '@pixi/react';

import { useAgentController } from './hooks/useAgentController';
import { useViewportSize } from './hooks/useViewportSize';
import AgentLayer from './layers/AgentLayer';
import SceneLayers from './layers/SceneLayers';
import MarsViewport from './viewport/MarsViewport';
import type { SceneDefinition } from '@/types/scene';

type MarsSceneCanvasProps = {
  scene: SceneDefinition;
  zoom?: number;
};

export default function MarsSceneCanvas({ scene, zoom }: MarsSceneCanvasProps) {
  const { width, height } = useViewportSize();
  const { agents, buildings } = useAgentController(scene);

  const tileSize = useMemo(() => {
    const cols = scene.dimensions.width;
    const rows = scene.dimensions.height;
    const tentative = Math.floor(Math.min(width / cols, height / rows));
    return Math.max(tentative, scene.grid.tileSize ?? 12);
  }, [height, scene.dimensions.height, scene.dimensions.width, scene.grid.tileSize, width]);

  const mapWidth = scene.dimensions.width * tileSize;
  const mapHeight = scene.dimensions.height * tileSize;

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
      <Stage width={width} height={height} options={{ backgroundAlpha: 0, antialias: true }}>
        <Graphics
          draw={(g) => {
            g.clear();
            g.beginFill(0x120b1c);
            g.drawRect(0, 0, width, height);
            g.endFill();
          }}
        />
        <MarsViewport
          width={width}
          height={height}
          worldWidth={mapWidth}
          worldHeight={mapHeight}
          minScale={minScaleEstimate}
          maxScale={3}
          scale={clampedZoom}
        >
          <SceneLayers
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            tileSize={tileSize}
            buildings={buildings}
          />
          <AgentLayer agents={agents} tileSize={tileSize} zoom={clampedZoom} />
        </MarsViewport>
      </Stage>
    </div>
  );
}

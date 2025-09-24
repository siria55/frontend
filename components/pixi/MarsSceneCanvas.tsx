'use client';

import { useCallback, useMemo } from 'react';
import { Container, Graphics, Stage, Text } from '@pixi/react';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { TextStyle as PixiTextStyle } from 'pixi.js';
import marsScene from '@/assets/scenes/mars_outpost.json';

type Entity = {
  id: string;
  label?: string;
  position: [number, number];
  size: [number, number];
  kind?: string;
};

type SceneData = {
  grid: { cols: number; rows: number };
  layers: Array<{
    id: string;
    type: string;
    entities?: Entity[];
  }>;
};

const TILE_SIZE = 16;

const palette: Record<string, number> = {
  default: 0xffa36f,
  central_dome: 0xff6b6b,
  bio_lab: 0x8de4af,
  resource_strip: 0xf1ba6c,
  rover_bay: 0x6fb4ff,
  solar_field: 0xf9e36f
};

function pickColor(id: string) {
  return palette[id] ?? palette.default;
}

function useSceneEntities(data: SceneData) {
  return useMemo(() => {
    const structureLayer = data.layers.find((layer) => layer.id === 'structures');
    return structureLayer?.entities ?? [];
  }, [data]);
}

const marsData = marsScene as SceneData;

const stageWidth = marsData.grid.cols * TILE_SIZE;
const stageHeight = marsData.grid.rows * TILE_SIZE;

function Grid() {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.lineStyle(1, 0x2a2535, 0.4);
    for (let x = 0; x <= stageWidth; x += TILE_SIZE * 4) {
      g.moveTo(x, 0);
      g.lineTo(x, stageHeight);
    }
    for (let y = 0; y <= stageHeight; y += TILE_SIZE * 4) {
      g.moveTo(0, y);
      g.lineTo(stageWidth, y);
    }
  }, []);

  return <Graphics draw={draw} />;
}

type ZoneProps = {
  entity: Entity;
  textStyle: TextStyle;
};

function Zone({ entity, textStyle }: ZoneProps) {
  const { id, label = id, position, size } = entity;
  const [x, y] = position;
  const [w, h] = size;
  const color = pickColor(id);

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(color, 0.75);
      g.drawRoundedRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE, 12);
      g.endFill();
      g.lineStyle(2, 0xffffff, 0.4);
      g.drawRoundedRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE, 12);
    },
    [color, h, w, x, y]
  );

  return (
    <Container>
      <Graphics draw={draw} />
      <Text
        text={label}
        anchor={0.5}
        x={(x + w / 2) * TILE_SIZE}
        y={(y + h / 2) * TILE_SIZE}
        style={textStyle}
      />
    </Container>
  );
}

export default function MarsSceneCanvas() {
  const entities = useSceneEntities(marsData);

  const textStyle = useMemo<TextStyle>(() => {
    return new PixiTextStyle({
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
      fontSize: 14,
      fill: '#1b1528',
      fontWeight: '600',
      align: 'center'
    });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>火星前哨站场景</h1>
        <p style={{ marginTop: '0.5rem', color: '#b0b0c3' }}>
          参考场景配置文件渲染的 PixiJS 初始布局，后续可替换为真实贴图与交互。
        </p>
      </header>
      <div
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(135deg, rgba(255, 145, 77, 0.12), rgba(69, 47, 104, 0.35))',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(9, 0, 20, 0.55)',
          maxWidth: '1024px'
        }}
      >
        <Stage
          width={stageWidth}
          height={stageHeight}
          options={{ background: 0x140d21, antialias: true, resolution: 1 }}
        >
          <Grid />
          {entities.map((entity) => (
            <Zone key={entity.id} entity={entity} textStyle={textStyle} />
          ))}
        </Stage>
      </div>
      <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>场景网格</strong>
          <span>尺寸：{marsData.grid.cols} × {marsData.grid.rows}，单元格：{TILE_SIZE}px。</span>
        </div>
        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>天气循环</strong>
          <span>模拟 24 分钟一日，含沙尘暴事件占位。</span>
        </div>
      </section>
    </div>
  );
}

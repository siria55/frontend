import { Container, Graphics, Text } from '@pixi/react';
import type { Graphics as PixiGraphics } from 'pixi.js';
import { TextStyle } from 'pixi.js';

import type { AgentState } from '../hooks/useAgentController';

const agentLabelStyle = new TextStyle({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 12,
  fill: '#f5f5ff',
  dropShadow: true,
  dropShadowDistance: 1,
  dropShadowColor: '#0d0d1c'
});

interface AgentLayerProps {
  agents: AgentState[];
  tileSize: number;
  zoom: number;
}

export default function AgentLayer({ agents, tileSize, zoom }: AgentLayerProps) {
  return (
    <>
      {agents.map((agent) => {
        const [ax, ay] = agent.position;
        const color = agent.color ?? 0x7b9bff;
        const x = ax * tileSize;
        const y = ay * tileSize;
        return (
          <Container key={agent.id} x={x} y={y}>
            <Graphics
              draw={(g: PixiGraphics) => {
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
              style={agentLabelStyle}
              scale={{ x: 1 / zoom, y: 1 / zoom }}
            />
          </Container>
        );
      })}
    </>
  );
}

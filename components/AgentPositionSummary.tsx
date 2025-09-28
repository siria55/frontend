import { useEffect, useMemo, useState } from 'react';

import type { SceneDefinition } from '@/types/scene';

interface AgentPositionSummaryProps {
  agentId: string;
  scene: SceneDefinition;
}

const panelStyle: React.CSSProperties = {
  padding: '1rem',
  borderRadius: '12px',
  background: 'rgba(12, 10, 20, 0.7)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f0f2ff',
  minWidth: '220px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem'
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#9aa7ff'
};

const coordStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 600,
  letterSpacing: '0.05em'
};

const metaStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#b4b6d2'
};

const SCENE_SYNC_EVENT = 'mars-scene-sync';

export default function AgentPositionSummary({ agentId, scene }: AgentPositionSummaryProps) {
  const [displayScene, setDisplayScene] = useState(scene);

  useEffect(() => {
    setDisplayScene(scene);
  }, [scene]);

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = (event as CustomEvent<SceneDefinition | null>).detail;
      if (!payload) return;
      setDisplayScene(payload);
    };

    window.addEventListener(SCENE_SYNC_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(SCENE_SYNC_EVENT, handler as EventListener);
    };
  }, []);

  const agent = useMemo(
    () => displayScene.agents?.find((item) => item.id === agentId),
    [displayScene, agentId]
  );

  if (!agent) {
    return null;
  }

  const [x, y] = agent.position ?? [0, 0];

  return (
    <div style={panelStyle}>
      <span style={titleStyle}>阿瑞斯-01 指挥体 · 坐标</span>
      <span style={coordStyle}>
        X: {x.toFixed(2)} | Y: {y.toFixed(2)}
      </span>
      <span style={metaStyle}>更新于：{agent.updatedAt ? new Date(agent.updatedAt).toLocaleString() : '未知'}</span>
    </div>
  );
}

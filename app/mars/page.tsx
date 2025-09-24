'use client';

import { useCallback } from 'react';

import CommandConsole from '@/components/CommandConsole';
import AgentControlPad from '@/components/AgentControlPad';
import MarsSceneCanvas from '@/components/pixi/MarsSceneCanvas';

export default function MarsPage() {
  const dispatchAgentBehavior = useCallback((agentId: string, behavior: string) => {
    const event = new CustomEvent('mars-agent-command', {
      detail: { agentId, behavior }
    });
    window.dispatchEvent(event);
  }, []);

  const handleConsoleCommand = useCallback(
    (rawCommand: string) => {
      const normalized = rawCommand.toLowerCase();
      const compact = normalized.replace(/\s+/g, '');

      const behaviorTable = [
        { behavior: 'move_left', keywords: ['left', '向左', '左移', '左转', '←'] },
        { behavior: 'move_right', keywords: ['right', '向右', '右移', '右转', '→'] },
        { behavior: 'move_up', keywords: ['up', '向上', '上移', '上升', '↑'] },
        { behavior: 'move_down', keywords: ['down', '向下', '下移', '下降', '↓'] }
      ] as const;

      const match = behaviorTable.find((entry) =>
        entry.keywords.some((keyword) => normalized.includes(keyword) || compact.includes(keyword))
      );

      if (match) {
        dispatchAgentBehavior('ares-01', match.behavior);
      }
    },
    [dispatchAgentBehavior]
  );

  return (
    <main style={{ minHeight: '100vh', margin: 0, padding: 0 }}>
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh'
        }}
      >
        <MarsSceneCanvas />
        <CommandConsole onCommand={handleConsoleCommand} />
        <AgentControlPad agentId="ares-01" />
      </div>
    </main>
  );
}

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';

import CommandConsole from '@/components/CommandConsole';
import AgentControlPad from '@/components/AgentControlPad';
import EnergyStatus from '@/components/EnergyStatus';
import MarsSceneCanvas from '@/components/pixi/MarsSceneCanvas';
import sceneData from '@/assets/scenes/mars_outpost.json';

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
        { behavior: 'move_left', keywords: ['left', '向左', '左移', '左转', '左', '←'] },
        { behavior: 'move_right', keywords: ['right', '向右', '右移', '右转', '右', '→'] },
        { behavior: 'move_up', keywords: ['up', '向上', '上移', '上升', '上', '↑'] },
        { behavior: 'move_down', keywords: ['down', '向下', '下移', '下降', '下', '↓'] }
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

  const initialEnergyItems = useMemo(() => {
    return (sceneData.buildings ?? [])
      .filter((building) => building.energy)
      .map((building) => ({
        id: building.id,
        label: building.label,
        type: building.energy?.type ?? 'consumer',
        capacity: building.energy?.capacity,
        current: building.energy?.current,
        output: building.energy?.output,
        rate: building.energy?.rate
      }));
  }, []);

  const [energyItems, setEnergyItems] = useState(initialEnergyItems);

  useEffect(() => {
    const tickMs = 1000;
    const drainFactor = 0.002;

    const interval = setInterval(() => {
      setEnergyItems((prev) => {
        if (!prev.length) return prev;

        const totalConsumption = prev
          .filter((item) => item.type === 'consumer')
          .reduce((sum, item) => sum + (item.rate ?? 0), 0);
        const totalOutput = prev
          .filter((item) => item.type === 'storage')
          .reduce((sum, item) => sum + (item.output ?? 0), 0);

        const netLoad = Math.max(totalConsumption - totalOutput, 0);
        const drain = netLoad * drainFactor * (tickMs / 1000);

        if (drain <= 0) {
          return prev;
        }

        let changed = false;
        const next = prev.map((item) => {
          if (item.type !== 'storage') return item;
          const capacity = item.capacity ?? 0;
          const current = Math.max((item.current ?? 0) - drain, 0);
          if (current !== item.current) {
            changed = true;
            return { ...item, current };
          }
          return item;
        });

        return changed ? next : prev;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, []);

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
        <div
          style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex'
          }}
        >
          <EnergyStatus items={energyItems} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '32px',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          <CommandConsole onCommand={handleConsoleCommand} />
          <AgentControlPad agentId="ares-01" />
        </div>
      </div>
    </main>
  );
}

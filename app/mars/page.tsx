'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

import CommandConsole from '@/components/CommandConsole';
import AgentControlPad from '@/components/AgentControlPad';
import EnergyStatus, { EnergyInfo } from '@/components/EnergyStatus';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import ViewportZoomControl from '@/components/ViewportZoomControl';
import type { SceneDefinition } from '@/types/scene';

const MarsSceneCanvas = dynamic(() => import('@/components/pixi/MarsSceneCanvas'), {
  ssr: false
});

export default function MarsPage() {
  const [viewportZoom, setViewportZoom] = useState(0.6);
  const [scene, setScene] = useState<SceneDefinition | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [sceneLoading, setSceneLoading] = useState(true);

  const dispatchAgentAction = useCallback((agentId: string, action: string) => {
    const event = new CustomEvent('mars-agent-command', {
      detail: { agentId, action, origin: 'command_console' }
    });
    window.dispatchEvent(event);
  }, []);

  const handleConsoleCommand = useCallback(
    (rawCommand: string) => {
      const normalized = rawCommand.toLowerCase();
      const compact = normalized.replace(/\s+/g, '');

      const actionTable = [
        { action: 'move_left', keywords: ['left', '向左', '左移', '左转', '左', '←'] },
        { action: 'move_right', keywords: ['right', '向右', '右移', '右转', '右', '→'] },
        { action: 'move_up', keywords: ['up', '向上', '上移', '上升', '上', '↑'] },
        { action: 'move_down', keywords: ['down', '向下', '下移', '下降', '下', '↓'] }
      ] as const;

      const match = actionTable.find((entry) =>
        entry.keywords.some((keyword) => normalized.includes(keyword) || compact.includes(keyword))
      );

      if (match) {
        dispatchAgentAction('ares-01', match.action);
      }
    },
    [dispatchAgentAction]
  );

  const buildEnergyItems = useCallback((sceneDef: SceneDefinition | null): EnergyInfo[] => {
    if (!sceneDef) return [];
    return (sceneDef.buildings ?? [])
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

  const [energyItems, setEnergyItems] = useState<EnergyInfo[]>([]);

  const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  const sceneEndpoint = `${backendBaseUrl}/v1/game/scene`;

  const fetchScene = useCallback(async () => {
    setSceneLoading(true);
    setSceneError(null);
    try {
      const response = await fetch(sceneEndpoint);
      if (!response.ok) {
        throw new Error(`failed to load scene: ${response.status}`);
      }
      const payload: SceneDefinition = await response.json();
      setScene(payload);
      setEnergyItems(buildEnergyItems(payload));
    } catch (error) {
      setSceneError(error instanceof Error ? error.message : 'unknown error');
      setScene(null);
      setEnergyItems([]);
    } finally {
      setSceneLoading(false);
    }
  }, [buildEnergyItems, sceneEndpoint]);

  useEffect(() => {
    fetchScene();
  }, [fetchScene]);

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

  const handleZoomChange = useCallback((value: number) => {
    setViewportZoom(value);
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
        {scene ? (
          <MarsSceneCanvas scene={scene} zoom={viewportZoom} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b4b6d2'
            }}
          >
            {sceneLoading ? '加载火星场景中…' : sceneError ? `场景加载失败：${sceneError}` : '暂无场景数据'}
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <CollapsiblePanel title="能源概览">
            <EnergyStatus items={energyItems} />
          </CollapsiblePanel>
          <CollapsiblePanel title="视野缩放">
            <ViewportZoomControl value={viewportZoom} onChange={handleZoomChange} />
          </CollapsiblePanel>
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

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import CommandConsole from '@/components/CommandConsole';
import AgentControlPad from '@/components/AgentControlPad';
import EnergyStatus, { EnergyInfo, type EnergySummary } from '@/components/EnergyStatus';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import ViewportZoomControl from '@/components/ViewportZoomControl';
import { gameApi } from '@/lib/api/game';
import type { SceneDefinition } from '@/types/scene';

const MarsSceneCanvas = dynamic(() => import('@/components/pixi/MarsSceneCanvas'), {
  ssr: false
});

export default function MarsPage() {
  const [viewportZoom, setViewportZoom] = useState(1);
  const [scene, setScene] = useState<SceneDefinition | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [sceneLoading, setSceneLoading] = useState(true);
  const [sceneVersion, setSceneVersion] = useState(0);

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

  const deriveEnergyItems = useCallback((sceneDef: SceneDefinition | null): EnergyInfo[] => {
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

  const { energyItems, energySummary } = useMemo<{
    energyItems: EnergyInfo[];
    energySummary: EnergySummary | undefined;
  }>(() => {
    const items = deriveEnergyItems(scene);
    if (!scene) {
      return { energyItems: items, energySummary: undefined };
    }
    let totalConsumption = 0;
    let totalOutput = 0;
    let storageCount = 0;
    items.forEach((item) => {
      if (item.type === 'consumer') {
        totalConsumption += item.rate ?? 0;
      } else if (item.type === 'storage') {
        totalOutput += item.output ?? 0;
        storageCount += 1;
      }
    });
    const netFlow = totalOutput - totalConsumption;
    const perStorageRate = storageCount > 0 ? Math.abs(netFlow) : 0;
    const summary: EnergySummary = {
      totalConsumption,
      totalOutput,
      netFlow,
      perStorageRate,
      storageCount
    };
    return { energyItems: items, energySummary: summary };
  }, [deriveEnergyItems, scene]);

  const fetchScene = useCallback(async () => {
    setSceneLoading(true);
    setSceneError(null);
    try {
      const payload = await gameApi.getScene();
      setScene(payload);
      setSceneVersion((version) => version + 1);
    } catch (error) {
      setSceneError(error instanceof Error ? error.message : 'unknown error');
      setScene(null);
    } finally {
      setSceneLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScene();
  }, [fetchScene]);

  const wsEndpoint = useMemo(() => {
    try {
      return gameApi.buildSceneStreamUrl();
    } catch (error) {
      console.warn('failed to resolve scene websocket endpoint', error);
      return '';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!wsEndpoint) {
      return;
    }

    let socket: WebSocket | null = null;
    let closing = false;
    let reconnectTimer: number | undefined;

    const scheduleReconnect = () => {
      if (closing) return;
      reconnectTimer = window.setTimeout(connect, 2000);
    };

    const handleMessage = (event: MessageEvent) => {
      const applyPayload = (text: string) => {
        try {
          const payload: SceneDefinition = JSON.parse(text);
          console.log('[mars-stream] scene update', payload);
          setScene(payload);
          setSceneVersion((version) => version + 1);
          setSceneLoading(false);
          setSceneError(null);
        } catch (error) {
          console.warn('failed to parse scene websocket payload', error);
        }
      };

      if (typeof event.data === 'string') {
        applyPayload(event.data);
        return;
      }

      if (event.data instanceof Blob) {
        void event.data
          .text()
          .then(applyPayload)
          .catch((error) => {
            console.warn('failed to read websocket blob', error);
          });
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(new Uint8Array(event.data));
        applyPayload(text);
      }
    };

    const connect = () => {
      try {
        socket = new WebSocket(wsEndpoint);
      } catch (error) {
        console.warn('failed to open scene websocket', error);
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        console.log('[mars-stream] scene websocket open');
        setSceneError(null);
      };

      socket.onmessage = handleMessage;

      socket.onerror = (event) => {
        console.warn('scene websocket error', event);
      };

      socket.onclose = (event) => {
        console.warn('[mars-stream] scene websocket closed', event);
        socket = null;
        if (!closing) {
          scheduleReconnect();
        }
      };
    };

    connect();

    return () => {
      closing = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      if (socket) {
        const ref = socket;
        socket = null;
        ref.onclose = null;
        if (ref.readyState === WebSocket.OPEN || ref.readyState === WebSocket.CLOSING) {
          ref.close();
        } else if (ref.readyState === WebSocket.CONNECTING) {
          ref.addEventListener('open', () => ref.close(), { once: true });
        }
      }
    };
  }, [wsEndpoint]);

  const handleZoomChange = useCallback((value: number) => {
    setViewportZoom(Math.max(1, value));
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
          <EnergyStatus key={sceneVersion} items={energyItems} summary={energySummary} />
        </CollapsiblePanel>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'flex-end'
          }}
        >
          <CollapsiblePanel title="视野缩放">
            <ViewportZoomControl min={1} max={3} value={viewportZoom} onChange={handleZoomChange} />
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

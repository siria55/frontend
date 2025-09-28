'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [viewportZoom, setViewportZoom] = useState(1);
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

  const wsEndpoint = useMemo(() => {
    try {
      const url = new URL(sceneEndpoint);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/v1/game/scene/stream';
      url.search = '';
      return url.toString();
    } catch (error) {
      console.warn('failed to resolve scene websocket endpoint', error);
      return '';
    }
  }, [sceneEndpoint]);

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
          setScene(payload);
          setEnergyItems(buildEnergyItems(payload));
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
        setSceneError(null);
      };

      socket.onmessage = handleMessage;

      socket.onerror = (event) => {
        console.warn('scene websocket error', event);
      };

      socket.onclose = () => {
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
        ref.close();
      }
    };
  }, [wsEndpoint, buildEnergyItems]);

  useEffect(() => {
    const tickMs = 1000;
    const seconds = tickMs / 1000;
    const drainFactor = 0.002;
    let cancelled = false;
    let ticking = false;

    const advanceEnergy = async () => {
      if (ticking || cancelled) return;
      ticking = true;
      try {
        const response = await fetch(`${backendBaseUrl}/v1/game/scene/energy/tick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds, drainFactor })
        });
        if (!response.ok) {
          throw new Error(`failed to advance energy state: ${response.status}`);
        }
        const payload: SceneDefinition = await response.json();
        if (!cancelled) {
          setScene(payload);
          setEnergyItems(buildEnergyItems(payload));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('failed to advance energy state', error);
        }
      } finally {
        ticking = false;
      }
    };

    const interval = setInterval(() => {
      void advanceEnergy();
    }, tickMs);

    // 组件挂载后立即尝试推进一次，避免等完整周期
    void advanceEnergy();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [backendBaseUrl, buildEnergyItems]);

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
            <EnergyStatus items={energyItems} />
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

import type { ReactNode } from 'react';
import { PixiComponent, useApp } from '@pixi/react';
import type { Application } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export type MarsViewportProps = {
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  minScale?: number;
  maxScale?: number;
  scale?: number;
  children?: ReactNode;
};

const PixiViewportComponent = PixiComponent<
  MarsViewportProps & { app: Application },
  Viewport
>('PixiViewport', {
  create: ({ app, width, height, worldWidth, worldHeight, minScale, maxScale, scale }) => {
    const viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth,
      worldHeight,
      interaction: app.renderer.events,
      ticker: app.ticker
    });

    viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clamp({ direction: 'all' })
      .clampZoom({ minScale: minScale ?? 1, maxScale: maxScale ?? 3 });

    const initialZoom = Math.max(minScale ?? 1, Math.min(scale ?? 1, maxScale ?? 3));
    viewport.setZoom(initialZoom, true);
    viewport.moveCenter(worldWidth / 2, worldHeight / 2);

    return viewport;
  },
  applyProps: (instance, oldProps, newProps) => {
    const prev = oldProps as MarsViewportProps;
    const next = newProps as MarsViewportProps;
    const { width, height, worldWidth, worldHeight, minScale, maxScale, scale } = next;
    if (prev.width !== width || prev.height !== height) {
      instance.resize(width, height, worldWidth, worldHeight);
    }
    if (prev.worldWidth !== worldWidth || prev.worldHeight !== worldHeight) {
      instance.worldWidth = worldWidth;
      instance.worldHeight = worldHeight;
      instance.clamp({ direction: 'all' });
    }
    if (prev.minScale !== minScale || prev.maxScale !== maxScale) {
      instance.clampZoom({ minScale: minScale ?? 1, maxScale: maxScale ?? 3 });
    }
    if (scale !== undefined && prev.scale !== scale) {
      const clamped = Math.max(minScale ?? 1, Math.min(scale, maxScale ?? 3));
      instance.setZoom(clamped, true);
    }
  },
  willUnmount: (instance) => {
    instance.destroy({ children: true });
  }
});

export default function MarsViewport({ children, ...props }: MarsViewportProps) {
  const app = useApp();
  return <PixiViewportComponent {...props} app={app}>{children}</PixiViewportComponent>;
}

import MarsSceneCanvas from '@/components/pixi/MarsSceneCanvas';

export default function MarsPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <MarsSceneCanvas />
    </main>
  );
}

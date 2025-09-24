import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '4rem 6rem', maxWidth: '960px' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>场景集成原型</h1>
        <p style={{ color: '#b0b0c3' }}>使用 Next.js + PixiJS 搭建的交互演示入口。</p>
      </header>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.75rem' }}>场景列表</h2>
        <Link
          href="/mars"
          style={{
            padding: '1rem 1.2rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.2s ease, border-color 0.2s ease'
          }}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>火星前哨站（Mars Outpost）</span>
          <p style={{ margin: '0.4rem 0 0', color: '#b0b0c3' }}>基于 PixiJS 的低重力沙尘场景原型。</p>
        </Link>
      </section>
    </main>
  );
}

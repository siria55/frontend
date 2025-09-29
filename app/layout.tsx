import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '火星前哨站',
  description: '基于 Next.js 与 PixiJS 的火星场景原型'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}

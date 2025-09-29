'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import DatabaseGrid from '@/components/system/DatabaseGrid';
import { systemApi, type TablePreview } from '@/lib/api/system';

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '1.5rem',
  maxWidth: '960px',
  margin: '0 auto'
};

const headingStyle: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 600
};

const noteStyle: CSSProperties = {
  color: '#94a3b8'
};

export default function DataPreviewPage() {
  const [tables, setTables] = useState<TablePreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      try {
        const data = await systemApi.previewDatabase();
        if (!cancelled) {
          setTables(data.tables ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={containerStyle}>
      <h1 style={headingStyle}>数据库预览</h1>
      <p style={noteStyle}>展示当前数据库 public schema 下各表的前 25 行数据。</p>
      {error && <p style={{ color: '#ef4444' }}>加载失败：{error}</p>}
      {!error && loading && <p>正在加载数据库表…</p>}
      {!error && !loading && tables.length === 0 && <p>未找到可预览的表。</p>}
      {!error && tables.length > 0 &&
        tables.map((table) => (
          <DatabaseGrid
            key={table.name}
            title={table.name}
            schema={table.schema}
            columns={table.columns}
            rows={table.rows}
            description="展示前 25 行"
          />
        ))}
    </main>
  );
}

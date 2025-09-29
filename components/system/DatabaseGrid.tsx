'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

import { panelStyle, sectionTitleStyle } from '@/components/system/styles';

type RowData = Record<string, unknown>;

const gridContainerStyle: CSSProperties = {
  width: '100%',
  height: '320px',
  backgroundColor: '#13141b',
  borderRadius: '12px',
  padding: '0.5rem',
  ['--ag-background-color' as any]: '#1c1e26',
  ['--ag-foreground-color' as any]: '#f5f5f7',
  ['--ag-header-background-color' as any]: '#242733',
  ['--ag-header-foreground-color' as any]: '#f5f5f7',
  ['--ag-odd-row-background-color' as any]: '#191b23',
  ['--ag-even-row-background-color' as any]: '#1c1e26',
  ['--ag-border-color' as any]: '#2a2d3a',
  ['--ag-row-hover-color' as any]: '#2f3241',
  ['--ag-selected-row-background-color' as any]: '#31344a'
};

const noteStyle: CSSProperties = {
  margin: '0 0 0.75rem',
  color: '#9aaafe',
  fontSize: '0.85rem'
};

const themeClass = 'ag-theme-alpine';

const ensureModulesRegistered = () => {
  if (typeof globalThis === 'undefined') {
    return;
  }
  const scope = globalThis as typeof globalThis & {
    __agGridCommunityRegistered?: boolean;
  };
  if (!scope.__agGridCommunityRegistered) {
    ModuleRegistry.registerModules([AllCommunityModule]);
    scope.__agGridCommunityRegistered = true;
  }
};

ensureModulesRegistered();

interface DatabaseGridProps {
  title: string;
  schema?: string;
  columns: string[];
  rows: RowData[];
  description?: string;
}

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return '[object]';
    }
  }
  return String(value);
};

export default function DatabaseGrid({ title, schema, columns, rows, description }: DatabaseGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridApiRef = useRef<GridApi<RowData> | null>(null);

  const columnDefs = useMemo<ColDef<RowData>[]>(
    () =>
      columns.map((column) => ({
        headerName: column,
        field: column,
        valueFormatter: (params) => formatCellValue(params.value),
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: Math.min(Math.max(column.length * 12, 120), 280)
      })),
    [columns]
  );

  const normalizedRows = useMemo<RowData[]>(() => {
    return rows.map((row) => {
      const normalized: RowData = {};
      columns.forEach((column) => {
        normalized[column] = row[column] ?? null;
      });
      return normalized;
    });
  }, [columns, rows]);

  useEffect(() => {
    if (!gridRef.current || gridApiRef.current) {
      return;
    }

    const gridOptions: GridOptions<RowData> = {
      columnDefs,
      rowData: normalizedRows,
      animateRows: true,
      defaultColDef: {
        sortable: true,
        resizable: true,
        filter: true
      },
      suppressCellFocus: true
    };

    gridApiRef.current = createGrid(gridRef.current, gridOptions);

    return () => {
      gridApiRef.current?.destroy();
      gridApiRef.current = null;
    };
    // We only need to initialise the grid once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gridApiRef.current) {
      return;
    }
    gridApiRef.current.setGridOption('columnDefs', columnDefs);
    gridApiRef.current.setGridOption('rowData', normalizedRows);
  }, [columnDefs, normalizedRows]);

  return (
    <section style={panelStyle}>
      <h2 style={sectionTitleStyle}>{schema ? `${schema}.${title}` : title}</h2>
      <p style={noteStyle}>
        共 {rows.length} 条记录
        {description ? ` · ${description}` : ''}
      </p>
      <div className={themeClass} style={gridContainerStyle}>
        <div ref={gridRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </section>
  );
}

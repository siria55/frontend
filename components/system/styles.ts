import type { CSSProperties } from 'react';

export const panelStyle: CSSProperties = {
  padding: '1.5rem',
  borderRadius: '16px',
  background: 'rgba(18, 16, 32, 0.85)',
  border: '1px solid rgba(123, 155, 255, 0.15)',
  backdropFilter: 'blur(12px)',
  color: '#e6e9ff'
};

export const sectionTitleStyle: CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
  color: '#9aa7ff'
};

export const listStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
};

export const labelStyle: CSSProperties = {
  fontSize: '0.8rem',
  color: '#9aa7ff'
};

export const inputStyle: CSSProperties = {
  padding: '0.5rem 0.65rem',
  borderRadius: '8px',
  border: '1px solid rgba(123, 155, 255, 0.35)',
  background: 'rgba(24, 22, 38, 0.9)',
  color: '#f0f2ff',
  fontSize: '0.95rem',
  outline: 'none'
};

export const primaryButtonStyle = (disabled: boolean): CSSProperties => ({
  padding: '0.55rem 1.1rem',
  borderRadius: '10px',
  border: 'none',
  background: disabled ? 'rgba(88, 104, 255, 0.35)' : 'linear-gradient(120deg, #5868ff, #8c9bff)',
  color: '#ffffff',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.65 : 1
});

export const secondaryButtonStyle = (disabled: boolean): CSSProperties => ({
  padding: '0.5rem 1.05rem',
  borderRadius: '10px',
  border: '1px solid rgba(140, 150, 190, 0.4)',
  background: 'transparent',
  color: '#d0d6ff',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1
});

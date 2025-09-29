import type { CSSProperties } from 'react';

export const panelStyle: CSSProperties = {
  padding: '1rem',
  borderRadius: '12px',
  background: 'rgba(18, 16, 32, 0.78)',
  border: '1px solid rgba(123, 155, 255, 0.12)',
  backdropFilter: 'blur(10px)',
  color: '#e6e9ff'
};

export const sectionTitleStyle: CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 600,
  marginBottom: '0.6rem',
  color: '#a5b2ff'
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
  fontSize: '0.75rem',
  color: '#9aa7ff'
};

export const inputStyle: CSSProperties = {
  padding: '0.45rem 0.6rem',
  borderRadius: '7px',
  border: '1px solid rgba(123, 155, 255, 0.3)',
  background: 'rgba(24, 22, 38, 0.85)',
  color: '#f0f2ff',
  fontSize: '0.9rem',
  outline: 'none'
};

export const primaryButtonStyle = (disabled: boolean): CSSProperties => ({
  padding: '0.5rem 1rem',
  borderRadius: '9px',
  border: 'none',
  background: disabled ? 'rgba(88, 104, 255, 0.35)' : 'linear-gradient(120deg, #5868ff, #8c9bff)',
  color: '#ffffff',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.65 : 1
});

export const secondaryButtonStyle = (disabled: boolean): CSSProperties => ({
  padding: '0.45rem 0.95rem',
  borderRadius: '9px',
  border: '1px solid rgba(140, 150, 190, 0.4)',
  background: 'transparent',
  color: '#d0d6ff',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1
});

export const dangerButtonStyle = (disabled: boolean): CSSProperties => ({
  padding: '0.45rem 0.95rem',
  borderRadius: '9px',
  border: '1px solid rgba(255, 122, 122, 0.45)',
  background: disabled ? 'rgba(255, 92, 112, 0.35)' : 'linear-gradient(120deg, #ff4d6d, #ff7d92)',
  color: '#ffffff',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1
});

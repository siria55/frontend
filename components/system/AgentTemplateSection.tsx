import { useCallback } from 'react';
import type { ChangeEvent } from 'react';
import type { SceneAgentTemplate } from '@/types/scene';
import {
  inputStyle,
  labelStyle,
  listStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle
} from '@/components/system/styles';
import { numberToString, parseOptionalInt } from '@/components/system/formUtils';
import { useFormMap } from '@/components/system/useFormMap';

type AgentTemplateForm = {
  label: string;
  color: string;
  defaultPosX: string;
  defaultPosY: string;
};

export type AgentTemplatePayload = {
  label: string;
  color: number | null;
  defaultPosition: [number, number] | null;
};

const createEmptyForm = (): AgentTemplateForm => ({
  label: '',
  color: '',
  defaultPosX: '',
  defaultPosY: ''
});

const toForm = (tpl: SceneAgentTemplate): AgentTemplateForm => ({
  label: tpl.label,
  color: numberToString(tpl.color),
  defaultPosX: numberToString(tpl.position?.[0]),
  defaultPosY: numberToString(tpl.position?.[1])
});

const isDirty = (tpl: SceneAgentTemplate, form: AgentTemplateForm): boolean => {
  if (tpl.label !== form.label.trim()) return true;
  if (parseOptionalInt(form.color) !== (tpl.color ?? null)) return true;
  if (parseOptionalInt(form.defaultPosX) !== (tpl.position?.[0] ?? null)) return true;
  if (parseOptionalInt(form.defaultPosY) !== (tpl.position?.[1] ?? null)) return true;
  return false;
};

type Props = {
  templates: SceneAgentTemplate[];
  onSave: (id: string, payload: AgentTemplatePayload) => void;
  onClearStatus: () => void;
  onValidationError: (message: string) => void;
  isPending: (id: string) => boolean;
  framed?: boolean;
  title?: string;
};

export function AgentTemplateSection({
  templates,
  onSave,
  onClearStatus,
  onValidationError,
  isPending,
  framed = true,
  title = 'Agent 模板（system_template_agents）'
}: Props) {
  const getId = useCallback((tpl: SceneAgentTemplate) => tpl.id, []);
  const { getForm, setFieldValue, resetForm } = useFormMap(templates, getId, toForm, createEmptyForm);

  const handleFieldChange = useCallback(
    (id: string, key: keyof AgentTemplateForm) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        onClearStatus();
        setFieldValue(id, key, event.target.value);
      },
    [onClearStatus, setFieldValue]
  );

  const handleSave = useCallback(
    (tpl: SceneAgentTemplate) => {
      const form = getForm(tpl.id);
      const label = form.label.trim();
      if (!label) {
        onValidationError('Agent 模板名称不能为空');
        return;
      }

      const posX = parseOptionalInt(form.defaultPosX);
      const posY = parseOptionalInt(form.defaultPosY);
      const position = posX !== null && posY !== null ? ([posX, posY] as [number, number]) : null;

      const payload: AgentTemplatePayload = {
        label,
        color: parseOptionalInt(form.color),
        defaultPosition: position
      };

      onSave(tpl.id, payload);
    },
    [getForm, onSave, onValidationError]
  );

  const handleReset = useCallback(
    (id: string) => {
      onClearStatus();
      resetForm(id);
    },
    [onClearStatus, resetForm]
  );

  const HeadingTag: 'h2' | 'h3' = framed ? 'h2' : 'h3';

  return (
    <section style={framed ? panelStyle : undefined}>
      <HeadingTag style={sectionTitleStyle}>{title}</HeadingTag>
      <ul style={listStyle}>
        {(templates ?? []).map((tpl) => {
          const form = getForm(tpl.id);
          const dirty = isDirty(tpl, form);
          const busy = isPending(tpl.id);
          return (
            <li
              key={tpl.id}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(36, 33, 58, 0.55)',
                border: '1px solid rgba(140, 150, 190, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 220px' }}>
                  <span style={labelStyle}>模板名称</span>
                  <input
                    type="text"
                    value={form.label}
                    onChange={handleFieldChange(tpl.id, 'label')}
                    style={inputStyle}
                    placeholder="输入模板名称"
                  />
                </div>
                <code style={{ fontSize: '0.85rem', color: '#92a0ff' }}>{tpl.id}</code>
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: '0.6rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>色值</span>
                  <input
                    type="number"
                    value={form.color}
                    onChange={handleFieldChange(tpl.id, 'color')}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>默认 X</span>
                  <input
                    type="number"
                    value={form.defaultPosX}
                    onChange={handleFieldChange(tpl.id, 'defaultPosX')}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>默认 Y</span>
                  <input
                    type="number"
                    value={form.defaultPosY}
                    onChange={handleFieldChange(tpl.id, 'defaultPosY')}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSave(tpl)}
                  disabled={!dirty || busy}
                  style={primaryButtonStyle(!dirty || busy)}
                >
                  {busy ? '保存中…' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReset(tpl.id)}
                  disabled={busy || !dirty}
                  style={secondaryButtonStyle(busy || !dirty)}
                >
                  重置
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

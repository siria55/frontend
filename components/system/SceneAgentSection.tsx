import { useCallback } from 'react';
import type { ChangeEvent } from 'react';
import type { SceneAgent } from '@/types/scene';
import {
  inputStyle,
  labelStyle,
  listStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle
} from '@/components/system/styles';
import { parseActions, parseOptionalInt } from '@/components/system/formUtils';
import { useFormMap } from '@/components/system/useFormMap';

type SceneAgentForm = {
  label: string;
  templateId: string;
  posX: string;
  posY: string;
  color: string;
  actions: string;
};

export type SceneAgentPayload = {
  label: string;
  templateId: string | null;
  position: [number, number];
  color: number | null;
  actions: string[];
};

const createEmptyForm = (): SceneAgentForm => ({
  label: '',
  templateId: '',
  posX: '',
  posY: '',
  color: '',
  actions: ''
});

const toForm = (agent: SceneAgent): SceneAgentForm => ({
  label: agent.label,
  templateId: agent.templateId ?? '',
  posX: String(agent.position[0]),
  posY: String(agent.position[1]),
  color: agent.color != null ? String(agent.color) : '',
  actions: (agent.actions ?? []).join('\n')
});

const isDirty = (agent: SceneAgent, form: SceneAgentForm): boolean => {
  if (agent.label !== form.label.trim()) return true;
  if ((agent.templateId ?? '') !== form.templateId.trim()) return true;
  if (parseOptionalInt(form.posX) !== agent.position[0]) return true;
  if (parseOptionalInt(form.posY) !== agent.position[1]) return true;
  if (parseOptionalInt(form.color) !== (agent.color ?? null)) return true;
  const originalActions = agent.actions ?? [];
  const nextActions = parseActions(form.actions);
  if (originalActions.length !== nextActions.length) return true;
  for (let i = 0; i < originalActions.length; i += 1) {
    if (originalActions[i] !== nextActions[i]) return true;
  }
  return false;
};

type Props = {
  agents: SceneAgent[];
  onSave: (id: string, payload: SceneAgentPayload) => void;
  onClearStatus: () => void;
  onValidationError: (message: string) => void;
  isPending: (id: string) => boolean;
};

export function SceneAgentSection({ agents, onSave, onClearStatus, onValidationError, isPending }: Props) {
  const getId = useCallback((agent: SceneAgent) => agent.id, []);
  const { getForm, setFieldValue, resetForm } = useFormMap(agents, getId, toForm, createEmptyForm);

  const handleFieldChange = useCallback(
    (id: string, key: keyof SceneAgentForm) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        onClearStatus();
        setFieldValue(id, key, event.target.value);
      },
    [onClearStatus, setFieldValue]
  );

  const handleActionsChange = useCallback(
    (id: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      onClearStatus();
      setFieldValue(id, 'actions', event.target.value);
    },
    [onClearStatus, setFieldValue]
  );

  const handleSave = useCallback(
    (agent: SceneAgent) => {
      const form = getForm(agent.id);
      const label = form.label.trim();
      if (!label) {
        onValidationError('Agent 名称不能为空');
        return;
      }

      const posX = parseOptionalInt(form.posX);
      const posY = parseOptionalInt(form.posY);
      if (posX === null || posY === null) {
        onValidationError('请填写 Agent 坐标');
        return;
      }

      const payload: SceneAgentPayload = {
        label,
        templateId: form.templateId.trim() ? form.templateId.trim() : null,
        position: [posX, posY],
        color: parseOptionalInt(form.color),
        actions: parseActions(form.actions)
      };

      onSave(agent.id, payload);
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

  return (
    <section style={panelStyle}>
      <h2 style={sectionTitleStyle}>Agent（system_scene_agents & actions）</h2>
      <ul style={listStyle}>
        {agents.map((agent) => {
          const form = getForm(agent.id);
          const dirty = isDirty(agent, form);
          const busy = isPending(agent.id);
          return (
            <li
              key={agent.id}
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
                  <span style={labelStyle}>Agent 名称</span>
                  <input
                    type="text"
                    value={form.label}
                    onChange={handleFieldChange(agent.id, 'label')}
                    style={inputStyle}
                    placeholder="输入 Agent 名称"
                  />
                </div>
                <code style={{ fontSize: '0.85rem', color: '#92a0ff' }}>{agent.id}</code>
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: '0.6rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>模板 ID</span>
                  <input
                    type="text"
                    value={form.templateId}
                    onChange={handleFieldChange(agent.id, 'templateId')}
                    style={inputStyle}
                    placeholder="可选"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>X</span>
                  <input
                    type="number"
                    value={form.posX}
                    onChange={handleFieldChange(agent.id, 'posX')}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>Y</span>
                  <input
                    type="number"
                    value={form.posY}
                    onChange={handleFieldChange(agent.id, 'posY')}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>色值</span>
                  <input
                    type="number"
                    value={form.color}
                    onChange={handleFieldChange(agent.id, 'color')}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={labelStyle}>可执行动作（逗号或换行分隔）</span>
                <textarea
                  value={form.actions}
                  onChange={handleActionsChange(agent.id)}
                  style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSave(agent)}
                  disabled={!dirty || busy}
                  style={primaryButtonStyle(!dirty || busy)}
                >
                  {busy ? '保存中…' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReset(agent.id)}
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

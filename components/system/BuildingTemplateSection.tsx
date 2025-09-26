import { useCallback } from 'react';
import type { ChangeEvent } from 'react';
import type { SceneBuildingTemplate } from '@/types/scene';
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

type BuildingTemplateForm = {
  label: string;
  energyType: string;
  energyCapacity: string;
  energyCurrent: string;
  energyOutput: string;
  energyRate: string;
};

export type BuildingTemplatePayload = {
  label: string;
  energy: {
    type: string | null;
    capacity: number | null;
    current: number | null;
    output: number | null;
    rate: number | null;
  };
};

const createEmptyForm = (): BuildingTemplateForm => ({
  label: '',
  energyType: '',
  energyCapacity: '',
  energyCurrent: '',
  energyOutput: '',
  energyRate: ''
});

const toForm = (tpl: SceneBuildingTemplate): BuildingTemplateForm => ({
  label: tpl.label,
  energyType: tpl.energy?.type ?? '',
  energyCapacity: numberToString(tpl.energy?.capacity),
  energyCurrent: numberToString(tpl.energy?.current),
  energyOutput: numberToString(tpl.energy?.output),
  energyRate: numberToString(tpl.energy?.rate)
});

const isDirty = (tpl: SceneBuildingTemplate, form: BuildingTemplateForm): boolean => {
  if (tpl.label !== form.label.trim()) return true;
  if ((form.energyType || '').trim() !== (tpl.energy?.type ?? '')) return true;
  if (parseOptionalInt(form.energyCapacity) !== (tpl.energy?.capacity ?? null)) return true;
  if (parseOptionalInt(form.energyCurrent) !== (tpl.energy?.current ?? null)) return true;
  if (parseOptionalInt(form.energyOutput) !== (tpl.energy?.output ?? null)) return true;
  if (parseOptionalInt(form.energyRate) !== (tpl.energy?.rate ?? null)) return true;
  return false;
};

type Props = {
  templates: SceneBuildingTemplate[];
  onSave: (id: string, payload: BuildingTemplatePayload) => void;
  onClearStatus: () => void;
  onValidationError: (message: string) => void;
  isPending: (id: string) => boolean;
  framed?: boolean;
  title?: string;
};

export function BuildingTemplateSection({
  templates,
  onSave,
  onClearStatus,
  onValidationError,
  isPending,
  framed = true,
  title = '建筑模板（system_template_buildings）'
}: Props) {
  const getId = useCallback((tpl: SceneBuildingTemplate) => tpl.id, []);
  const { getForm, setFieldValue, resetForm } = useFormMap(templates, getId, toForm, createEmptyForm);

  const handleFieldChange = useCallback(
    (id: string, key: keyof BuildingTemplateForm) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        onClearStatus();
        setFieldValue(id, key, event.target.value);
      },
    [onClearStatus, setFieldValue]
  );

  const handleSave = useCallback(
    (tpl: SceneBuildingTemplate) => {
      const form = getForm(tpl.id);
      const label = form.label.trim();
      if (!label) {
        onValidationError('模板名称不能为空');
        return;
      }

      const typeValue = form.energyType.trim();
      const payload: BuildingTemplatePayload = {
        label,
        energy: {
          type: typeValue ? typeValue : null,
          capacity: parseOptionalInt(form.energyCapacity),
          current: parseOptionalInt(form.energyCurrent),
          output: parseOptionalInt(form.energyOutput),
          rate: parseOptionalInt(form.energyRate)
        }
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 240px' }}>
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>能源类型</span>
                  <select
                    value={form.energyType}
                    onChange={handleFieldChange(tpl.id, 'energyType')}
                    style={inputStyle}
                  >
                    <option value="">（无）</option>
                    <option value="storage">储能</option>
                    <option value="consumer">耗能</option>
                  </select>
                </div>
                {form.energyType === 'storage' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={labelStyle}>容量（单位）</span>
                      <input
                        type="number"
                        value={form.energyCapacity}
                        onChange={handleFieldChange(tpl.id, 'energyCapacity')}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={labelStyle}>当前（单位）</span>
                      <input
                        type="number"
                        value={form.energyCurrent}
                        onChange={handleFieldChange(tpl.id, 'energyCurrent')}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={labelStyle}>输出（单位/小时）</span>
                      <input
                        type="number"
                        value={form.energyOutput}
                        onChange={handleFieldChange(tpl.id, 'energyOutput')}
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}
                {form.energyType === 'consumer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={labelStyle}>消耗（单位/小时）</span>
                    <input
                      type="number"
                      value={form.energyRate}
                      onChange={handleFieldChange(tpl.id, 'energyRate')}
                      style={inputStyle}
                    />
                  </div>
                )}
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

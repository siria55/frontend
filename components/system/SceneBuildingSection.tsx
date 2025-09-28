import { useCallback } from 'react';
import type { ChangeEvent } from 'react';
import type { SceneBuilding } from '@/types/scene';
import type { SceneBuildingPayload } from '@/lib/api/system';
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

type SceneBuildingForm = {
  label: string;
  templateId: string;
  posX: string;
  posY: string;
  width: string;
  height: string;
  energyType: string;
  energyCapacity: string;
  energyCurrent: string;
  energyOutput: string;
  energyRate: string;
};

const createEmptyForm = (): SceneBuildingForm => ({
  label: '',
  templateId: '',
  posX: '',
  posY: '',
  width: '',
  height: '',
  energyType: '',
  energyCapacity: '',
  energyCurrent: '',
  energyOutput: '',
  energyRate: ''
});

const toForm = (building: SceneBuilding): SceneBuildingForm => ({
  label: building.label,
  templateId: building.templateId ?? '',
  posX: numberToString(building.rect[0]),
  posY: numberToString(building.rect[1]),
  width: numberToString(building.rect[2]),
  height: numberToString(building.rect[3]),
  energyType: building.energy?.type ?? '',
  energyCapacity: numberToString(building.energy?.capacity),
  energyCurrent: numberToString(building.energy?.current),
  energyOutput: numberToString(building.energy?.output),
  energyRate: numberToString(building.energy?.rate)
});

const isDirty = (building: SceneBuilding, form: SceneBuildingForm): boolean => {
  if (building.label !== form.label.trim()) return true;
  if ((building.templateId ?? '') !== form.templateId.trim()) return true;
  if (parseOptionalInt(form.posX) !== building.rect[0]) return true;
  if (parseOptionalInt(form.posY) !== building.rect[1]) return true;
  if (parseOptionalInt(form.width) !== building.rect[2]) return true;
  if (parseOptionalInt(form.height) !== building.rect[3]) return true;
  if ((form.energyType || '').trim() !== (building.energy?.type ?? '')) return true;
  if (parseOptionalInt(form.energyCapacity) !== (building.energy?.capacity ?? null)) return true;
  if (parseOptionalInt(form.energyCurrent) !== (building.energy?.current ?? null)) return true;
  if (parseOptionalInt(form.energyOutput) !== (building.energy?.output ?? null)) return true;
  if (parseOptionalInt(form.energyRate) !== (building.energy?.rate ?? null)) return true;
  return false;
};

type Props = {
  buildings: SceneBuilding[];
  onSave: (id: string, payload: SceneBuildingPayload) => void;
  onClearStatus: () => void;
  onValidationError: (message: string) => void;
  isPending: (id: string) => boolean;
  framed?: boolean;
  title?: string;
};

export function SceneBuildingSection({
  buildings,
  onSave,
  onClearStatus,
  onValidationError,
  isPending,
  framed = true,
  title = '建筑（system_scene_buildings）'
}: Props) {
  const getId = useCallback((building: SceneBuilding) => building.id, []);
  const { getForm, setFieldValue, resetForm } = useFormMap(buildings, getId, toForm, createEmptyForm);

  const handleFieldChange = useCallback(
    (id: string, key: keyof SceneBuildingForm) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        onClearStatus();
        setFieldValue(id, key, event.target.value);
      },
    [onClearStatus, setFieldValue]
  );

  const handleSave = useCallback(
    (building: SceneBuilding) => {
      const form = getForm(building.id);
      const label = form.label.trim();
      if (!label) {
        onValidationError('建筑名称不能为空');
        return;
      }

      const posX = parseOptionalInt(form.posX);
      const posY = parseOptionalInt(form.posY);
      const width = parseOptionalInt(form.width);
      const height = parseOptionalInt(form.height);

      if (posX === null || posY === null || width === null || height === null) {
        onValidationError('请填写完整的坐标与尺寸');
        return;
      }

      if (width <= 0 || height <= 0) {
        onValidationError('宽度与高度必须大于 0');
        return;
      }

      const typeValue = form.energyType.trim();
      const payload: SceneBuildingPayload = {
        label,
        templateId: form.templateId.trim() ? form.templateId.trim() : null,
        rect: [posX, posY, width, height],
        energy: {
          type: typeValue ? typeValue : null,
          capacity: parseOptionalInt(form.energyCapacity),
          current: parseOptionalInt(form.energyCurrent),
          output: parseOptionalInt(form.energyOutput),
          rate: parseOptionalInt(form.energyRate)
        }
      };

      onSave(building.id, payload);
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
        {buildings.map((building) => {
          const form = getForm(building.id);
          const dirty = isDirty(building, form);
          const busy = isPending(building.id);
          return (
            <li
              key={building.id}
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
                  display: 'grid',
                  gap: '0.75rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>建筑名称</span>
                  <input
                    type="text"
                    value={form.label}
                    onChange={handleFieldChange(building.id, 'label')}
                    style={inputStyle}
                    placeholder="输入建筑名称"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>模板 ID</span>
                  <input
                    type="text"
                    value={form.templateId}
                    onChange={handleFieldChange(building.id, 'templateId')}
                    style={inputStyle}
                    placeholder="可选"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>能源类型</span>
                  <select
                    value={form.energyType}
                    onChange={handleFieldChange(building.id, 'energyType')}
                    style={inputStyle}
                  >
                    <option value="">（无）</option>
                    <option value="storage">储能</option>
                    <option value="consumer">耗能</option>
                  </select>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: '0.6rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>X</span>
                  <input
                    type="number"
                    value={form.posX}
                    onChange={handleFieldChange(building.id, 'posX')}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>Y</span>
                  <input
                    type="number"
                    value={form.posY}
                    onChange={handleFieldChange(building.id, 'posY')}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>宽度</span>
                  <input
                    type="number"
                    value={form.width}
                    onChange={handleFieldChange(building.id, 'width')}
                    style={inputStyle}
                    min={1}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={labelStyle}>高度</span>
                  <input
                    type="number"
                    value={form.height}
                    onChange={handleFieldChange(building.id, 'height')}
                    style={inputStyle}
                    min={1}
                  />
                </div>
                {form.energyType === 'storage' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={labelStyle}>容量（单位）</span>
                      <input
                        type="number"
                        value={form.energyCapacity}
                        onChange={handleFieldChange(building.id, 'energyCapacity')}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={labelStyle}>当前（单位）</span>
                      <input
                        type="number"
                        value={form.energyCurrent}
                        onChange={handleFieldChange(building.id, 'energyCurrent')}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={labelStyle}>输出（单位/小时）</span>
                      <input
                        type="number"
                        value={form.energyOutput}
                        onChange={handleFieldChange(building.id, 'energyOutput')}
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
                      onChange={handleFieldChange(building.id, 'energyRate')}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSave(building)}
                  disabled={!dirty || busy}
                  style={primaryButtonStyle(!dirty || busy)}
                >
                  {busy ? '保存中…' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReset(building.id)}
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

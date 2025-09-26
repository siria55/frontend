import { useCallback, useEffect, useState } from 'react';

export function useFormMap<TItem, TForm>(
  items: readonly TItem[],
  getId: (item: TItem) => string,
  toForm: (item: TItem) => TForm,
  createEmpty: () => TForm
) {
  const [forms, setForms] = useState<Record<string, TForm>>({});

  useEffect(() => {
    const next: Record<string, TForm> = {};
    for (const item of items) {
      next[getId(item)] = toForm(item);
    }
    setForms(next);
  }, [items, getId, toForm]);

  const getForm = useCallback(
    (id: string) => forms[id] ?? createEmpty(),
    [forms, createEmpty]
  );

  const setFieldValue = useCallback(
    (id: string, key: keyof TForm, value: string) => {
      setForms((prev) => {
        const current = prev[id] ?? createEmpty();
        const next = { ...current, [key]: value };
        if (next === current) return prev;
        return { ...prev, [id]: next };
      });
    },
    [createEmpty]
  );

  const resetForm = useCallback(
    (id: string) => {
      setForms((prev) => {
        const original = items.find((item) => getId(item) === id);
        if (!original) return prev;
        return { ...prev, [id]: toForm(original) };
      });
    },
    [items, getId, toForm]
  );

  return {
    forms,
    getForm,
    setFieldValue,
    resetForm,
    setForms
  };
}

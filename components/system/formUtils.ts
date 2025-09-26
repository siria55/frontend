export const numberToString = (value?: number | null): string =>
  value !== undefined && value !== null ? String(value) : '';

export const parseOptionalInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const parseActions = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((token) => token.trim())
    .filter((token, index, arr) => token.length > 0 && arr.indexOf(token) === index);

export const EM_DASH = '—';

export type RowLabel<T> = string | ((row: T) => string);
export type ActionColor =
  | 'inherit'
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

export function resolveLabel<T>(label: RowLabel<T> | undefined, row: T, fallback: string): string {
  if (typeof label === 'function') return label(row);
  return label ?? fallback;
}

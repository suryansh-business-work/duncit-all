/** Narrowing for block props, which arrive as untyped JSON from a page. */

export const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

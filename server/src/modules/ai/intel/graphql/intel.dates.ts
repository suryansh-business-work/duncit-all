/**
 * Dates leave the API as ISO 8601 strings. A Mongo Date handed to a GraphQL
 * String would serialise as epoch milliseconds, so every date field of every
 * Intel type gets this resolver.
 */
export const toIso = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
};

export function dateFields<K extends string>(...fields: K[]): Record<K, (parent: Record<string, unknown>) => string | null> {
  return Object.fromEntries(fields.map((f) => [f, (parent: Record<string, unknown>) => toIso(parent[f])])) as Record<K, (parent: Record<string, unknown>) => string | null>;
}

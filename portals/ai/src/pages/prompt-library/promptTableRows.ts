import type { TableFilterValue, TablePage, TableQueryState } from '@duncit/table';
import type { AiPrompt } from './queries';

type FieldKind = 'string' | 'number' | 'boolean' | 'date';

/**
 * The server has no aiPromptsTable(query: TableQueryInput) yet — only the
 * full-list aiPrompts(filter) query (search applied server-side). Until that
 * query exists, fetchRows applies filters/sort/pagination in memory over the
 * complete server-filtered list, which stays exact at this tiny-config scale.
 */
const FIELD_KINDS: Record<string, FieldKind> = {
  name: 'string',
  category: 'string',
  target_model: 'string',
  token_count: 'number',
  is_active: 'boolean',
  created_at: 'date',
};

function rawValue(prompt: AiPrompt, field: string): unknown {
  return (prompt as unknown as Record<string, unknown>)[field];
}

/** Numeric stand-in for range comparisons (plain number, or date → epoch ms). */
function toNumber(value: unknown, kind: FieldKind): number {
  if (kind === 'date') {
    return value ? new Date(String(value)).getTime() : Number.NaN;
  }
  if (typeof value === 'number') return value;
  return Number.parseFloat(String(value ?? ''));
}

function matchesRange(actual: number, filter: TableFilterValue, kind: FieldKind): boolean {
  if (filter.op === 'gte') return actual >= toNumber(filter.value, kind);
  if (filter.op === 'lte') return actual <= toNumber(filter.value, kind);
  const [min, max] = filter.values ?? [];
  return actual >= toNumber(min, kind) && actual <= toNumber(max, kind);
}

/** Mirrors the server allowlist semantics: unknown fields/ops match everything. */
function matchesFilter(prompt: AiPrompt, filter: TableFilterValue): boolean {
  const kind = FIELD_KINDS[filter.field];
  if (!kind) return true;
  const value = rawValue(prompt, filter.field);
  if (filter.op === 'is_true') return Boolean(value);
  if (filter.op === 'is_false') return !value;
  if (filter.op === 'contains') {
    const needle = (filter.value ?? '').toLowerCase();
    return String(value ?? '').toLowerCase().includes(needle);
  }
  if (filter.op === 'gte' || filter.op === 'lte' || filter.op === 'between') {
    return matchesRange(toNumber(value, kind), filter, kind);
  }
  return true;
}

function compareRows(a: AiPrompt, b: AiPrompt, field: string, kind: FieldKind): number {
  const av = rawValue(a, field);
  const bv = rawValue(b, field);
  if (kind === 'string') {
    return String(av ?? '').toLowerCase().localeCompare(String(bv ?? '').toLowerCase());
  }
  if (kind === 'boolean') {
    return Number(Boolean(av)) - Number(Boolean(bv));
  }
  const diff = toNumber(av, kind) - toNumber(bv, kind);
  return Number.isNaN(diff) ? 0 : diff;
}

/** Filters → sort → page slice. With sortBy null the server order is kept. */
export function applyPromptTableState(
  prompts: readonly AiPrompt[],
  q: TableQueryState,
): TablePage<AiPrompt> {
  const rows = prompts.filter((p) => q.filters.every((f) => matchesFilter(p, f)));
  const sortBy = q.sortBy;
  const kind = sortBy ? FIELD_KINDS[sortBy] : undefined;
  if (sortBy && kind) {
    const dir = q.sortDir === 'desc' ? -1 : 1;
    rows.sort((a, b) => dir * compareRows(a, b, sortBy, kind));
  }
  const start = (q.page - 1) * q.pageSize;
  return { rows: rows.slice(start, start + q.pageSize), total: rows.length };
}

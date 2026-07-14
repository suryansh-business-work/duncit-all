import type { DuncitColumn, TableFilterValue } from '../types';

export interface FilterDraft {
  text: string;
  selected: string[];
  min: string;
  max: string;
  from: Date | null;
  to: Date | null;
  bool: '' | 'true' | 'false';
}

export type FilterDraftMap = Record<string, FilterDraft>;

export function emptyDraft(): FilterDraft {
  return { text: '', selected: [], min: '', max: '', from: null, to: null, bool: '' };
}

function rangeFilter(field: string, min: string, max: string): TableFilterValue | null {
  if (min && max) return { field, op: 'between', values: [min, max] };
  if (min) return { field, op: 'gte', value: min };
  if (max) return { field, op: 'lte', value: max };
  return null;
}

function draftToFilter<T>(column: DuncitColumn<T>, draft: FilterDraft): TableFilterValue | null {
  const { filter, field } = column;
  if (!filter) return null;
  if (filter.type === 'text') {
    const value = draft.text.trim();
    return value ? { field, op: 'contains', value } : null;
  }
  if (filter.type === 'select') {
    if (draft.selected.length === 0) return null;
    if (filter.multiple) return { field, op: 'in', values: [...draft.selected] };
    return { field, op: 'eq', value: draft.selected[0] };
  }
  if (filter.type === 'number') {
    return rangeFilter(field, draft.min.trim(), draft.max.trim());
  }
  if (filter.type === 'date') {
    return rangeFilter(field, draft.from?.toISOString() ?? '', draft.to?.toISOString() ?? '');
  }
  // boolean
  if (draft.bool === 'true') return { field, op: 'is_true' };
  if (draft.bool === 'false') return { field, op: 'is_false' };
  return null;
}

/** Builds the applied filter list from the popover draft (unfilled controls are dropped). */
export function draftToFilters<T>(
  columns: ReadonlyArray<DuncitColumn<T>>,
  drafts: FilterDraftMap,
): TableFilterValue[] {
  const result: TableFilterValue[] = [];
  for (const column of columns) {
    const draft = drafts[column.field];
    if (!draft) continue;
    const filter = draftToFilter(column, draft);
    if (filter) result.push(filter);
  }
  return result;
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fillDraftFromFilter(draft: FilterDraft, filter: TableFilterValue, isDate: boolean): void {
  if (filter.op === 'contains') draft.text = filter.value ?? '';
  if (filter.op === 'eq') draft.selected = filter.value ? [filter.value] : [];
  if (filter.op === 'in') draft.selected = filter.values ?? [];
  if (filter.op === 'is_true') draft.bool = 'true';
  if (filter.op === 'is_false') draft.bool = 'false';
  const low = filter.op === 'between' ? filter.values?.[0] : undefined;
  const high = filter.op === 'between' ? filter.values?.[1] : undefined;
  const min = filter.op === 'gte' ? filter.value : low;
  const max = filter.op === 'lte' ? filter.value : high;
  if (isDate) {
    draft.from = parseIsoDate(min);
    draft.to = parseIsoDate(max);
  } else {
    draft.min = min ?? '';
    draft.max = max ?? '';
  }
}

/** Prefills the popover draft from the currently applied filters. */
export function filtersToDraft<T>(
  columns: ReadonlyArray<DuncitColumn<T>>,
  filters: ReadonlyArray<TableFilterValue>,
): FilterDraftMap {
  const drafts: FilterDraftMap = {};
  for (const column of columns) {
    if (!column.filter) continue;
    const draft = emptyDraft();
    const applied = filters.find((f) => f.field === column.field);
    if (applied) fillDraftFromFilter(draft, applied, column.filter.type === 'date');
    drafts[column.field] = draft;
  }
  return drafts;
}

const OP_LABELS: Record<string, string> = {
  eq: '=',
  ne: '≠',
  contains: 'contains',
  gte: '≥',
  lte: '≤',
};

/** Human label for an active-filter chip. */
export function filterChipLabel<T>(
  columns: ReadonlyArray<DuncitColumn<T>>,
  filter: TableFilterValue,
): string {
  const header = columns.find((c) => c.field === filter.field)?.headerName ?? filter.field;
  if (filter.op === 'is_true') return `${header}: Yes`;
  if (filter.op === 'is_false') return `${header}: No`;
  if (filter.op === 'in') return `${header}: ${(filter.values ?? []).join(', ')}`;
  if (filter.op === 'between') {
    return `${header}: ${(filter.values ?? []).join(' – ')}`;
  }
  const op = OP_LABELS[filter.op] ?? filter.op;
  return `${header} ${op} ${filter.value ?? ''}`.trim();
}

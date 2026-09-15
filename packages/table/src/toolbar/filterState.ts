import { endOfDay, isValid, startOfDay } from 'date-fns';
import { formatDateCell } from '../cells';
import { columnHeader } from '../columnTypes';
import type { Translate } from '../i18n';
import type { DuncitColumn, TableFilterOp, TableFilterValue } from '../types';

/**
 * One column's filter while it is being edited. Only the slots its type reads
 * are ever filled: `op` + `value` (+ `valueTo`) for text and number, `from` /
 * `to` for a date, `bool` for a boolean, `selected` for an enum.
 */
export interface FilterDraft {
  op: TableFilterOp;
  value: string;
  valueTo: string;
  from: Date | null;
  to: Date | null;
  bool: '' | 'true' | 'false';
  selected: string[];
}

/** The draft a column opens with when nothing is applied to it. */
export function emptyDraft<T>(column: DuncitColumn<T>): FilterDraft {
  const op: TableFilterOp = column.type === 'number' ? 'eq' : 'contains';
  return { op, value: '', valueTo: '', from: null, to: null, bool: '', selected: [] };
}

function rangeFilter(field: string, min: string, max: string): TableFilterValue | null {
  if (min && max) return { field, op: 'between', values: [min, max] };
  if (min) return { field, op: 'gte', value: min };
  if (max) return { field, op: 'lte', value: max };
  return null;
}

/** A picked day as the instant its range starts or ends on — '' when unset or half-typed. */
function dayBound(date: Date | null, edge: (day: Date) => Date): string {
  return date && isValid(date) ? edge(date).toISOString() : '';
}

function numberFilter(field: string, draft: FilterDraft): TableFilterValue | null {
  const value = draft.value.trim();
  if (draft.op === 'between') return rangeFilter(field, value, draft.valueTo.trim());
  return value ? { field, op: draft.op, value } : null;
}

/**
 * The filter a column's draft applies, or `null` when it is left empty.
 *
 * A date range is whole days: `from` starts at local midnight and `to` ends at
 * the last millisecond of its day, so "to 8 Sep" includes rows written on 8 Sep.
 */
export function draftToFilter<T>(column: DuncitColumn<T>, draft: FilterDraft): TableFilterValue | null {
  const { field } = column;
  if (column.type === 'number') return numberFilter(field, draft);
  if (column.type === 'date') {
    return rangeFilter(field, dayBound(draft.from, startOfDay), dayBound(draft.to, endOfDay));
  }
  if (column.type === 'boolean') {
    if (draft.bool === '') return null;
    return { field, op: draft.bool === 'true' ? 'is_true' : 'is_false' };
  }
  if (column.type === 'enum') {
    return draft.selected.length > 0 ? { field, op: 'in', values: [...draft.selected] } : null;
  }
  const value = draft.value.trim();
  return value ? { field, op: draft.op, value } : null;
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
}

/** Reopens a column's popover on the filter it already has. */
export function filterToDraft<T>(column: DuncitColumn<T>, filter: TableFilterValue | undefined): FilterDraft {
  const draft = emptyDraft(column);
  if (!filter) return draft;
  const [low, high] = filter.values ?? [];
  if (column.type === 'date') {
    draft.from = parseIsoDate(filter.op === 'lte' ? undefined : (filter.value ?? low));
    draft.to = parseIsoDate(filter.op === 'lte' ? filter.value : high);
    return draft;
  }
  if (column.type === 'boolean') {
    draft.bool = filter.op === 'is_true' ? 'true' : 'false';
    return draft;
  }
  if (column.type === 'enum') {
    draft.selected = filter.values ?? [];
    return draft;
  }
  draft.op = filter.op;
  draft.value = filter.value ?? low ?? '';
  draft.valueTo = high ?? '';
  return draft;
}

/**
 * The comparison shown on an active-filter chip.
 *
 * Only `contains` is a word; the rest are mathematical symbols that read the
 * same in every language, so `contains` is the one entry that takes a key.
 */
const OP_SYMBOLS: Record<string, string> = {
  eq: '=',
  ne: '≠',
  gte: '≥',
  lte: '≤',
};

/** A raw filter value as the reader knows it: a formatted date, an option's label. */
function displayValue<T>(column: DuncitColumn<T> | undefined, value: string): string {
  if (column?.type === 'date') return formatDateCell(value);
  if (column?.type === 'enum') {
    return column.options.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}

/** Human label for an active-filter chip. */
export function filterChipLabel<T>(
  columns: ReadonlyArray<DuncitColumn<T>>,
  filter: TableFilterValue,
  t: Translate,
): string {
  const column = columns.find((c) => c.field === filter.field);
  const header = column ? columnHeader(column, t) : filter.field;
  const shown = (filter.values ?? []).map((value) => displayValue(column, value));
  if (filter.op === 'is_true') return `${header}: ${t('shell.table.yes')}`;
  if (filter.op === 'is_false') return `${header}: ${t('shell.table.no')}`;
  if (filter.op === 'in') return `${header}: ${shown.join(', ')}`;
  if (filter.op === 'between') return `${header}: ${shown.join(' – ')}`;
  const op = OP_SYMBOLS[filter.op] ?? t('shell.table.opContains');
  return `${header} ${op} ${displayValue(column, filter.value ?? '')}`.trim();
}

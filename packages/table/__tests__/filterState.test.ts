import { describe, expect, it } from 'vitest';
import {
  draftToFilters,
  emptyDraft,
  filterChipLabel,
  filtersToDraft,
  type FilterDraftMap,
} from '../src/toolbar/filterState';
import type { DuncitColumn, TableFilterValue } from '../src/types';

type Row = Record<string, unknown>;

const columns: DuncitColumn<Row>[] = [
  { field: 'name', headerName: 'Name', filter: { type: 'text' } },
  {
    field: 'status',
    headerName: 'Status',
    filter: {
      type: 'select',
      options: [
        { value: 'A', label: 'Active' },
        { value: 'I', label: 'Inactive' },
      ],
      multiple: true,
    },
  },
  {
    field: 'kind',
    headerName: 'Kind',
    filter: { type: 'select', options: [{ value: 'x', label: 'X' }] },
  },
  { field: 'age', headerName: 'Age', filter: { type: 'number' } },
  { field: 'created', headerName: 'Created', filter: { type: 'date' } },
  { field: 'active', headerName: 'Active', filter: { type: 'boolean' } },
  { field: 'plain', headerName: 'Plain' }, // not filterable
];

function draftsWith(overrides: FilterDraftMap): FilterDraftMap {
  const base: FilterDraftMap = {};
  for (const column of columns) {
    if (column.filter) base[column.field] = emptyDraft();
  }
  return { ...base, ...overrides };
}

describe('draftToFilters', () => {
  it('text -> contains, trimmed; empty dropped', () => {
    expect(draftToFilters(columns, draftsWith({ name: { ...emptyDraft(), text: ' ab ' } }))).toEqual(
      [{ field: 'name', op: 'contains', value: 'ab' }],
    );
    expect(draftToFilters(columns, draftsWith({}))).toEqual([]);
  });

  it('multi select -> in; single select -> eq', () => {
    const drafts = draftsWith({
      status: { ...emptyDraft(), selected: ['A', 'I'] },
      kind: { ...emptyDraft(), selected: ['x'] },
    });
    expect(draftToFilters(columns, drafts)).toEqual([
      { field: 'status', op: 'in', values: ['A', 'I'] },
      { field: 'kind', op: 'eq', value: 'x' },
    ]);
  });

  it('number min+max -> between; only min -> gte; only max -> lte', () => {
    expect(
      draftToFilters(columns, draftsWith({ age: { ...emptyDraft(), min: '1', max: '9' } })),
    ).toEqual([{ field: 'age', op: 'between', values: ['1', '9'] }]);
    expect(draftToFilters(columns, draftsWith({ age: { ...emptyDraft(), min: '1' } }))).toEqual([
      { field: 'age', op: 'gte', value: '1' },
    ]);
    expect(draftToFilters(columns, draftsWith({ age: { ...emptyDraft(), max: '9' } }))).toEqual([
      { field: 'age', op: 'lte', value: '9' },
    ]);
  });

  it('date range -> between/gte/lte with ISO values', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');
    expect(
      draftToFilters(columns, draftsWith({ created: { ...emptyDraft(), from, to } })),
    ).toEqual([
      { field: 'created', op: 'between', values: [from.toISOString(), to.toISOString()] },
    ]);
    expect(draftToFilters(columns, draftsWith({ created: { ...emptyDraft(), from } }))).toEqual([
      { field: 'created', op: 'gte', value: from.toISOString() },
    ]);
  });

  it('boolean -> is_true / is_false / dropped', () => {
    expect(
      draftToFilters(columns, draftsWith({ active: { ...emptyDraft(), bool: 'true' } })),
    ).toEqual([{ field: 'active', op: 'is_true' }]);
    expect(
      draftToFilters(columns, draftsWith({ active: { ...emptyDraft(), bool: 'false' } })),
    ).toEqual([{ field: 'active', op: 'is_false' }]);
  });
});

describe('filtersToDraft (round trip)', () => {
  it('rebuilds the draft from every filter type', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const filters: TableFilterValue[] = [
      { field: 'name', op: 'contains', value: 'ab' },
      { field: 'status', op: 'in', values: ['A'] },
      { field: 'kind', op: 'eq', value: 'x' },
      { field: 'age', op: 'between', values: ['1', '9'] },
      { field: 'created', op: 'gte', value: from.toISOString() },
      { field: 'active', op: 'is_false' },
    ];
    const drafts = filtersToDraft(columns, filters);
    expect(drafts.name.text).toBe('ab');
    expect(drafts.status.selected).toEqual(['A']);
    expect(drafts.kind.selected).toEqual(['x']);
    expect(drafts.age).toMatchObject({ min: '1', max: '9' });
    expect(drafts.created.from?.toISOString()).toBe(from.toISOString());
    expect(drafts.created.to).toBeNull();
    expect(drafts.active.bool).toBe('false');
    expect(drafts.plain).toBeUndefined(); // non-filterable columns get no draft
    // and the round trip back:
    expect(draftToFilters(columns, drafts)).toEqual(filters);
  });

  it('ignores invalid ISO dates', () => {
    const drafts = filtersToDraft(columns, [{ field: 'created', op: 'gte', value: 'garbage' }]);
    expect(drafts.created.from).toBeNull();
  });
});

describe('filterChipLabel', () => {
  it('labels every op shape with the column header', () => {
    expect(filterChipLabel(columns, { field: 'name', op: 'contains', value: 'ab' })).toBe(
      'Name contains ab',
    );
    expect(filterChipLabel(columns, { field: 'status', op: 'in', values: ['A', 'I'] })).toBe(
      'Status: A, I',
    );
    expect(filterChipLabel(columns, { field: 'age', op: 'between', values: ['1', '9'] })).toBe(
      'Age: 1 – 9',
    );
    expect(filterChipLabel(columns, { field: 'age', op: 'gte', value: '1' })).toBe('Age ≥ 1');
    expect(filterChipLabel(columns, { field: 'active', op: 'is_true' })).toBe('Active: Yes');
    expect(filterChipLabel(columns, { field: 'active', op: 'is_false' })).toBe('Active: No');
    expect(filterChipLabel(columns, { field: 'unknown', op: 'eq', value: '1' })).toBe(
      'unknown = 1',
    );
  });
});

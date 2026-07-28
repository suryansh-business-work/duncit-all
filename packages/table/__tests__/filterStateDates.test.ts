import { describe, expect, it } from 'vitest';
import {
  draftToFilters,
  emptyDraft,
  filterChipLabel,
  filtersToDraft,
} from '../src/toolbar/filterState';
import type { DuncitColumn, TableFilterValue } from '../src/types';

type Row = Record<string, unknown>;

const columns: DuncitColumn<Row>[] = [
  { field: 'created', headerName: 'Created', filter: { type: 'date' } },
  { field: 'age', headerName: 'Age', filter: { type: 'number' } },
];

const FROM = new Date('2026-01-01T00:00:00.000Z');
const TO = new Date('2026-02-01T00:00:00.000Z');

describe('date-range drafts', () => {
  it('a to-only date draft becomes an lte filter with the ISO value', () => {
    expect(draftToFilters(columns, { created: { ...emptyDraft(), to: TO } })).toEqual([
      { field: 'created', op: 'lte', value: TO.toISOString() },
    ]);
  });

  it('a between filter on a date column prefills both pickers as Dates', () => {
    const drafts = filtersToDraft(columns, [
      { field: 'created', op: 'between', values: [FROM.toISOString(), TO.toISOString()] },
    ]);
    expect(drafts.created.from).toEqual(FROM);
    expect(drafts.created.to).toEqual(TO);
    // Dates go to the pickers, never to the text min/max inputs.
    expect(drafts.created).toMatchObject({ min: '', max: '' });
    // …and it round-trips back to the same filter.
    expect(draftToFilters(columns, drafts)).toEqual([
      { field: 'created', op: 'between', values: [FROM.toISOString(), TO.toISOString()] },
    ]);
  });

  it('an lte filter on a date column fills only the "to" picker', () => {
    const drafts = filtersToDraft(columns, [
      { field: 'created', op: 'lte', value: TO.toISOString() },
    ]);
    expect(drafts.created.from).toBeNull();
    expect(drafts.created.to).toEqual(TO);
  });

  it('a between filter whose high bound is not a date leaves that picker empty', () => {
    const drafts = filtersToDraft(columns, [
      { field: 'created', op: 'between', values: [FROM.toISOString(), 'not-a-date'] },
    ]);
    expect(drafts.created.from).toEqual(FROM);
    expect(drafts.created.to).toBeNull();
  });

  it('a filter for a column that is not in the table leaves every draft empty', () => {
    const drafts = filtersToDraft(columns, [{ field: 'ghost', op: 'contains', value: 'x' }]);
    expect(drafts.created).toEqual(emptyDraft());
    expect(drafts.age).toEqual(emptyDraft());
    expect(drafts.ghost).toBeUndefined();
  });
});

describe('filterChipLabel operator symbols', () => {
  it('renders the remaining mapped operators', () => {
    expect(filterChipLabel(columns, { field: 'age', op: 'lte', value: '9' })).toBe('Age ≤ 9');
    expect(filterChipLabel(columns, { field: 'age', op: 'ne', value: '9' })).toBe('Age ≠ 9');
  });

  it('labels a date range with the column header and an en dash', () => {
    const filter: TableFilterValue = {
      field: 'created',
      op: 'between',
      values: [FROM.toISOString(), TO.toISOString()],
    };
    expect(filterChipLabel(columns, filter)).toBe(
      `Created: ${FROM.toISOString()} – ${TO.toISOString()}`,
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  draftToFilter,
  emptyDraft,
  filterChipLabel,
  filterToDraft,
  type FilterDraft,
} from '../src/toolbar/filterState';
import { fallbackT } from '../src/i18n';
import type { DuncitColumn, TableFilterValue } from '../src/types';

type Payout = Record<string, unknown>;

// One column per type a filter control exists for — the type alone decides the
// draft slots, the operator and the chip wording. Dates have their own suite.
const columns: DuncitColumn<Payout>[] = [
  { field: 'host_name', headerName: 'Host', type: 'text' },
  {
    field: 'status',
    headerName: 'Status',
    type: 'enum',
    options: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'PAID', label: 'Paid' },
    ],
  },
  { field: 'amount', headerName: 'Amount', type: 'number' },
  { field: 'is_settled', headerName: 'Settled', type: 'boolean' },
];

function column(field: string): DuncitColumn<Payout> {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
}

function draftFor(field: string, patch: Partial<FilterDraft>): FilterDraft {
  return { ...emptyDraft(column(field)), ...patch };
}

describe('emptyDraft', () => {
  it('opens a number column on equals and every other column on contains, with every slot empty', () => {
    const empty = { value: '', valueTo: '', from: null, to: null, bool: '', selected: [] };
    expect(emptyDraft(column('amount'))).toEqual({ op: 'eq', ...empty });
    expect(emptyDraft(column('host_name'))).toEqual({ op: 'contains', ...empty });
    expect(emptyDraft(column('status'))).toEqual({ op: 'contains', ...empty });
  });
});

describe('draftToFilter', () => {
  it('applies a text draft with its operator and a trimmed value, and nothing when left blank', () => {
    const host = column('host_name');
    expect(draftToFilter(host, draftFor('host_name', { value: ' Asha ' }))).toEqual({
      field: 'host_name',
      op: 'contains',
      value: 'Asha',
    });
    expect(draftToFilter(host, draftFor('host_name', { op: 'ne', value: 'Ravi' }))).toEqual({
      field: 'host_name',
      op: 'ne',
      value: 'Ravi',
    });
    expect(draftToFilter(host, draftFor('host_name', { value: '   ' }))).toBeNull();
  });

  it('applies a number comparison, and nothing without a value', () => {
    const amount = column('amount');
    expect(draftToFilter(amount, draftFor('amount', { op: 'gte', value: ' 1200 ' }))).toEqual({
      field: 'amount',
      op: 'gte',
      value: '1200',
    });
    expect(draftToFilter(amount, draftFor('amount', { op: 'eq', value: '' }))).toBeNull();
  });

  it('turns a number range into between, or into an open-ended bound when only one side is given', () => {
    const amount = column('amount');
    expect(draftToFilter(amount, draftFor('amount', { op: 'between', value: '500', valueTo: ' 2500 ' }))).toEqual({
      field: 'amount',
      op: 'between',
      values: ['500', '2500'],
    });
    expect(draftToFilter(amount, draftFor('amount', { op: 'between', value: '500' }))).toEqual({
      field: 'amount',
      op: 'gte',
      value: '500',
    });
    expect(draftToFilter(amount, draftFor('amount', { op: 'between', valueTo: '2500' }))).toEqual({
      field: 'amount',
      op: 'lte',
      value: '2500',
    });
    expect(draftToFilter(amount, draftFor('amount', { op: 'between' }))).toBeNull();
  });

  it('turns a boolean draft into is_true / is_false, and Any into no filter', () => {
    const settled = column('is_settled');
    expect(draftToFilter(settled, draftFor('is_settled', { bool: 'true' }))).toEqual({
      field: 'is_settled',
      op: 'is_true',
    });
    expect(draftToFilter(settled, draftFor('is_settled', { bool: 'false' }))).toEqual({
      field: 'is_settled',
      op: 'is_false',
    });
    expect(draftToFilter(settled, draftFor('is_settled', { bool: '' }))).toBeNull();
  });

  it('turns picked enum options into an in filter on a copy of the list, and none picked into no filter', () => {
    const selected = ['PENDING', 'PAID'];
    const applied = draftToFilter(column('status'), draftFor('status', { selected }));
    expect(applied).toEqual({ field: 'status', op: 'in', values: ['PENDING', 'PAID'] });
    expect(applied?.values).not.toBe(selected);
    expect(draftToFilter(column('status'), draftFor('status', { selected: [] }))).toBeNull();
  });
});

describe('filterToDraft', () => {
  it('opens on an empty draft when the column has no filter applied', () => {
    expect(filterToDraft(column('amount'), undefined)).toEqual(emptyDraft(column('amount')));
  });

  it('reopens a boolean filter on its choice', () => {
    expect(filterToDraft(column('is_settled'), { field: 'is_settled', op: 'is_true' }).bool).toBe('true');
    expect(filterToDraft(column('is_settled'), { field: 'is_settled', op: 'is_false' }).bool).toBe('false');
  });

  it('reopens an enum filter on its picked options, and on none when it carries no list', () => {
    const status = column('status');
    expect(filterToDraft(status, { field: 'status', op: 'in', values: ['PAID'] }).selected).toEqual(['PAID']);
    expect(filterToDraft(status, { field: 'status', op: 'in' }).selected).toEqual([]);
  });

  it('reopens a text or number filter on its operator and value, or on its range bounds', () => {
    expect(filterToDraft(column('host_name'), { field: 'host_name', op: 'eq', value: 'Asha' })).toMatchObject({
      op: 'eq',
      value: 'Asha',
      valueTo: '',
    });
    expect(
      filterToDraft(column('amount'), { field: 'amount', op: 'between', values: ['500', '2500'] }),
    ).toMatchObject({ op: 'between', value: '500', valueTo: '2500' });
    // A hand-built filter with neither a value nor a list reopens blank rather than on "undefined".
    expect(filterToDraft(column('amount'), { field: 'amount', op: 'gte' })).toMatchObject({
      op: 'gte',
      value: '',
      valueTo: '',
    });
  });

  it('round-trips every applied shape back to the same filter', () => {
    const applied: Array<[string, TableFilterValue]> = [
      ['host_name', { field: 'host_name', op: 'contains', value: 'Asha' }],
      ['amount', { field: 'amount', op: 'between', values: ['500', '2500'] }],
      ['amount', { field: 'amount', op: 'lte', value: '2500' }],
      ['is_settled', { field: 'is_settled', op: 'is_false' }],
      ['status', { field: 'status', op: 'in', values: ['PENDING'] }],
    ];
    for (const [field, filter] of applied) {
      expect(draftToFilter(column(field), filterToDraft(column(field), filter))).toEqual(filter);
    }
  });
});

describe('filterChipLabel', () => {
  const label = (filter: TableFilterValue) => filterChipLabel(columns, filter, fallbackT);

  it('words contains, and writes every other comparison as its symbol', () => {
    expect(label({ field: 'host_name', op: 'contains', value: 'Asha' })).toBe('Host contains Asha');
    expect(label({ field: 'amount', op: 'eq', value: '1200' })).toBe('Amount = 1200');
    expect(label({ field: 'amount', op: 'ne', value: '1200' })).toBe('Amount ≠ 1200');
    expect(label({ field: 'amount', op: 'gte', value: '500' })).toBe('Amount ≥ 500');
    expect(label({ field: 'amount', op: 'lte', value: '2500' })).toBe('Amount ≤ 2500');
  });

  it('labels a range, a boolean and an enum by what the reader sees', () => {
    expect(label({ field: 'amount', op: 'between', values: ['500', '2500'] })).toBe('Amount: 500 – 2500');
    expect(label({ field: 'is_settled', op: 'is_true' })).toBe('Settled: Yes');
    expect(label({ field: 'is_settled', op: 'is_false' })).toBe('Settled: No');
    // An option the column no longer lists still shows its raw value.
    expect(label({ field: 'status', op: 'in', values: ['PAID', 'ON_HOLD'] })).toBe('Status: Paid, ON_HOLD');
  });

  it('falls back to the field for a filter no column shows, and reads a missing value or list as empty', () => {
    expect(label({ field: 'club_id', op: 'eq', value: 'DUN-CLUB-12' })).toBe('club_id = DUN-CLUB-12');
    expect(label({ field: 'host_name', op: 'contains' })).toBe('Host contains');
    expect(label({ field: 'status', op: 'in' })).toBe('Status: ');
  });
});

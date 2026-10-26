import { describe, expect, it } from 'vitest';
import type { DuncitColumn } from '@duncit/table';
import { urlColumnFilters } from '../../src/shared/useUrlColumnFilters';

type Row = { id: string };

const COLUMNS: DuncitColumn<Row>[] = [
  { field: 'name', type: 'text' },
  {
    field: 'status',
    type: 'enum',
    options: [
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Declined' },
    ],
  },
  { field: 'is_active', type: 'boolean' },
  { field: 'is_verified', type: 'boolean', filterable: false },
];

const filtersFor = (query: string) => urlColumnFilters(new URLSearchParams(query), COLUMNS);

describe('urlColumnFilters', () => {
  it('turns a dashboard tile query into the matching table filters', () => {
    expect(filtersFor('status=REJECTED')).toEqual([{ field: 'status', op: 'eq', value: 'REJECTED' }]);
    expect(filtersFor('is_active=false')).toEqual([{ field: 'is_active', op: 'is_false' }]);
    expect(filtersFor('is_active=true&status=APPROVED')).toEqual([
      { field: 'status', op: 'eq', value: 'APPROVED' },
      { field: 'is_active', op: 'is_true' },
    ]);
  });

  it('asks for nothing when the URL names no filter', () => {
    expect(filtersFor('')).toEqual([]);
  });

  it('ignores values and fields the columns would not accept', () => {
    // An option the enum does not offer, a non-boolean flag, a text column, an
    // unfilterable column and a field no column has: none reach the server.
    expect(
      filtersFor('status=BOGUS&is_active=maybe&name=Riya&is_verified=true&owner_id=abc'),
    ).toEqual([]);
  });
});

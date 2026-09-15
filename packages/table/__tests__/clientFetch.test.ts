import { describe, expect, it } from 'vitest';
import { clientTableFetch } from '../src/clientFetch';
import type { DuncitColumn, TableFilterValue, TableQueryState } from '../src/types';

// A list a portal already holds — a full answer from a small query. The fetch
// applies search, column filters, sort and paging in memory, comparing each
// field the way its column's type says.
type Venue = {
  id: string;
  name: string;
  capacity: number | null;
  is_active: boolean;
  city?: string;
  opened_at: string | null;
  category: { name: string } | null;
};

const venues: Venue[] = [
  {
    id: 'VEN-000001',
    name: 'Blue Tokai Koramangala',
    capacity: 40,
    is_active: true,
    city: 'Bengaluru',
    opened_at: '2024-03-10T00:00:00.000Z',
    category: { name: 'Cafe' },
  },
  {
    id: 'VEN-000002',
    name: 'Third Wave Indiranagar',
    capacity: 25,
    is_active: false,
    city: 'Bengaluru',
    opened_at: '2025-01-05T00:00:00.000Z',
    category: { name: 'Cafe' },
  },
  { id: 'VEN-000003', name: 'araku Coffee', capacity: null, is_active: true, opened_at: null, category: null },
  {
    id: 'VEN-000004',
    name: 'Cafe Zoe',
    capacity: 60,
    is_active: false,
    city: 'Mumbai',
    opened_at: 'not-a-date',
    category: { name: 'Bistro' },
  },
];

const columns: DuncitColumn<Venue>[] = [
  { field: 'name', headerName: 'Name', type: 'text' },
  { field: 'capacity', headerName: 'Capacity', type: 'number' },
  { field: 'is_active', headerName: 'Active', type: 'boolean' },
  { field: 'city', headerName: 'City', type: 'text' },
  { field: 'opened_at', headerName: 'Opened', type: 'date' },
  {
    field: 'category.name',
    headerName: 'Category',
    type: 'enum',
    options: [
      { value: 'Cafe', label: 'Cafe' },
      { value: 'Bistro', label: 'Bistro' },
    ],
  },
];

function query(overrides: Partial<TableQueryState> = {}): TableQueryState {
  return { search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'asc', filters: [], ...overrides };
}

const fetchVenues = clientTableFetch(venues, (row) => `${row.name} ${row.city ?? ''}`, columns);
const namesOf = (rows: Venue[]) => rows.map((row) => row.name);
const filtered = async (...filters: TableFilterValue[]) => namesOf((await fetchVenues(query({ filters }))).rows);

describe('clientTableFetch search, sort and paging', () => {
  it('returns every row in the given order when nothing is searched or sorted', async () => {
    const page = await fetchVenues(query());
    expect(namesOf(page.rows)).toEqual(namesOf(venues));
    expect(page.total).toBe(4);
  });

  it('matches the search term case-insensitively against the caller text, trimmed', async () => {
    const page = await fetchVenues(query({ search: '  BENGALURU ' }));
    expect(namesOf(page.rows)).toEqual(['Blue Tokai Koramangala', 'Third Wave Indiranagar']);
    expect(page.total).toBe(2);
  });

  it('sorts text ignoring case, in both directions', async () => {
    const asc = await fetchVenues(query({ sortBy: 'name', sortDir: 'asc' }));
    expect(namesOf(asc.rows)).toEqual(['araku Coffee', 'Blue Tokai Koramangala', 'Cafe Zoe', 'Third Wave Indiranagar']);
    const desc = await fetchVenues(query({ sortBy: 'name', sortDir: 'desc' }));
    expect(namesOf(desc.rows)).toEqual(namesOf(asc.rows).reverse());
  });

  it('sorts a number column numerically, with an empty cell first', async () => {
    const asc = await fetchVenues(query({ sortBy: 'capacity', sortDir: 'asc' }));
    expect(asc.rows.map((row) => row.capacity)).toEqual([null, 25, 40, 60]);
    const desc = await fetchVenues(query({ sortBy: 'capacity', sortDir: 'desc' }));
    expect(desc.rows.map((row) => row.capacity)).toEqual([60, 40, 25, null]);
  });

  it('sorts booleans false-first', async () => {
    const page = await fetchVenues(query({ sortBy: 'is_active', sortDir: 'asc' }));
    expect(page.rows.map((row) => row.is_active)).toEqual([false, false, true, true]);
  });

  it('sorts a date column chronologically, with a missing or unreadable date first', async () => {
    const page = await fetchVenues(query({ sortBy: 'opened_at', sortDir: 'asc' }));
    expect(namesOf(page.rows)).toEqual(['araku Coffee', 'Cafe Zoe', 'Blue Tokai Koramangala', 'Third Wave Indiranagar']);
  });

  it('sorts on a nested path, and on a field no column shows as text', async () => {
    const byCategory = await fetchVenues(query({ sortBy: 'category.name', sortDir: 'desc' }));
    expect(byCategory.rows.map((row) => row.category?.name ?? null)).toEqual(['Cafe', 'Cafe', 'Bistro', null]);
    const byId = await fetchVenues(query({ sortBy: 'id', sortDir: 'desc' }));
    expect(byId.rows.map((row) => row.id)).toEqual(['VEN-000004', 'VEN-000003', 'VEN-000002', 'VEN-000001']);
  });

  it('pages the sorted result and reports the full matched total', async () => {
    const second = await fetchVenues(query({ sortBy: 'name', page: 2, pageSize: 3 }));
    expect(namesOf(second.rows)).toEqual(['Third Wave Indiranagar']);
    expect(second.total).toBe(4);
  });

  it('never reorders the caller list', async () => {
    await fetchVenues(query({ sortBy: 'name', sortDir: 'desc' }));
    expect(venues[0].name).toBe('Blue Tokai Koramangala');
  });
});

describe('clientTableFetch column filters', () => {
  it('matches text with contains (ignoring case) and with equals / not equal', async () => {
    expect(await filtered({ field: 'city', op: 'contains', value: 'BENGAL' })).toEqual([
      'Blue Tokai Koramangala',
      'Third Wave Indiranagar',
    ]);
    expect(await filtered({ field: 'name', op: 'eq', value: 'cafe zoe' })).toEqual(['Cafe Zoe']);
    expect(await filtered({ field: 'name', op: 'ne', value: 'cafe zoe' })).toEqual([
      'Blue Tokai Koramangala',
      'Third Wave Indiranagar',
      'araku Coffee',
    ]);
  });

  it('lets a contains with no value through every row that has the field', async () => {
    expect(await filtered({ field: 'city', op: 'contains' })).toEqual([
      'Blue Tokai Koramangala',
      'Third Wave Indiranagar',
      'Cafe Zoe',
    ]);
  });

  it('compares numbers numerically, leaving an empty cell out of every bound', async () => {
    expect(await filtered({ field: 'capacity', op: 'gte', value: '40' })).toEqual(['Blue Tokai Koramangala', 'Cafe Zoe']);
    expect(await filtered({ field: 'capacity', op: 'lte', value: '40' })).toEqual([
      'Blue Tokai Koramangala',
      'Third Wave Indiranagar',
    ]);
    expect(await filtered({ field: 'capacity', op: 'between', values: ['25', '40'] })).toEqual([
      'Blue Tokai Koramangala',
      'Third Wave Indiranagar',
    ]);
  });

  it('reads an equals with no value, or with an unreadable number, as "is empty"', async () => {
    expect(await filtered({ field: 'capacity', op: 'eq' })).toEqual(['araku Coffee']);
    expect(await filtered({ field: 'capacity', op: 'eq', value: 'forty' })).toEqual(['araku Coffee']);
  });

  it('matches nothing for a between that is missing a bound', async () => {
    expect(await filtered({ field: 'capacity', op: 'between', values: ['30'] })).toEqual([]);
    expect(await filtered({ field: 'capacity', op: 'between' })).toEqual([]);
  });

  it('matches booleans with is_true / is_false', async () => {
    expect(await filtered({ field: 'is_active', op: 'is_true' })).toEqual(['Blue Tokai Koramangala', 'araku Coffee']);
    expect(await filtered({ field: 'is_active', op: 'is_false' })).toEqual(['Third Wave Indiranagar', 'Cafe Zoe']);
  });

  it('compares dates chronologically', async () => {
    expect(await filtered({ field: 'opened_at', op: 'gte', value: '2025-01-01T00:00:00.000Z' })).toEqual([
      'Third Wave Indiranagar',
    ]);
  });

  it('matches an enum on any of its picked values, through a nested path', async () => {
    expect(await filtered({ field: 'category.name', op: 'in', values: ['Bistro', 'Pub'] })).toEqual(['Cafe Zoe']);
    expect(await filtered({ field: 'category.name', op: 'in' })).toEqual([]);
  });

  it('compares a field no column shows as text, reading an object as its JSON', async () => {
    expect(await filtered({ field: 'category', op: 'contains', value: 'bistro' })).toEqual(['Cafe Zoe']);
  });

  it('requires every filter to match, alongside the search', async () => {
    const page = await fetchVenues(
      query({
        search: 'bengaluru',
        filters: [
          { field: 'is_active', op: 'is_false' },
          { field: 'capacity', op: 'lte', value: '30' },
        ],
      }),
    );
    expect(namesOf(page.rows)).toEqual(['Third Wave Indiranagar']);
    expect(page.total).toBe(1);
  });
});

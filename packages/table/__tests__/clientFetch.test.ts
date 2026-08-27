import { describe, expect, it } from 'vitest';
import { clientTableFetch } from '../src/clientFetch';
import type { TableQueryState } from '../src/types';

// A list a portal already holds — a full answer from a small query. The fetch
// applies search, sort and paging in memory with the server bridge's semantics.
type Venue = {
  id: string;
  name: string;
  capacity: number | null;
  is_active: boolean;
  city?: string;
};

const venues: Venue[] = [
  { id: 'VEN-000001', name: 'Blue Tokai Koramangala', capacity: 40, is_active: true, city: 'Bengaluru' },
  { id: 'VEN-000002', name: 'Third Wave Indiranagar', capacity: 25, is_active: false, city: 'Bengaluru' },
  { id: 'VEN-000003', name: 'araku Coffee', capacity: null, is_active: true },
  { id: 'VEN-000004', name: 'Cafe Zoe', capacity: 60, is_active: false, city: 'Mumbai' },
];

function query(overrides: Partial<TableQueryState> = {}): TableQueryState {
  return { search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'asc', filters: [], ...overrides };
}

const fetchVenues = clientTableFetch(venues, (row) => `${row.name} ${row.city ?? ''}`);
const namesOf = (rows: Venue[]) => rows.map((row) => row.name);

describe('clientTableFetch', () => {
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
    expect(namesOf(asc.rows)).toEqual([
      'araku Coffee',
      'Blue Tokai Koramangala',
      'Cafe Zoe',
      'Third Wave Indiranagar',
    ]);
    const desc = await fetchVenues(query({ sortBy: 'name', sortDir: 'desc' }));
    expect(namesOf(desc.rows)).toEqual(namesOf(asc.rows).reverse());
  });

  it('sorts numbers numerically, with a missing number compared as empty text', async () => {
    const page = await fetchVenues(query({ sortBy: 'capacity', sortDir: 'asc' }));
    expect(page.rows.map((row) => row.capacity)).toEqual([null, 25, 40, 60]);
  });

  it('sorts booleans false-first', async () => {
    const page = await fetchVenues(query({ sortBy: 'is_active', sortDir: 'asc' }));
    expect(page.rows.map((row) => row.is_active)).toEqual([false, false, true, true]);
  });

  it('compares an absent text field as empty so undefined cities sort first', async () => {
    const page = await fetchVenues(query({ sortBy: 'city', sortDir: 'asc' }));
    expect(page.rows[0].name).toBe('araku Coffee');
    expect(page.rows[3].city).toBe('Mumbai');
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

import { describe, expect, it } from 'vitest';

import { filterByQuery, matchesQuery } from '../src/search';

describe('matchesQuery', () => {
  it('matches every whitespace-separated token, in any order and any field', () => {
    expect(matchesQuery(['Sunday Badminton', 'Koramangala'], 'badminton koramangala')).toBe(true);
    expect(matchesQuery(['Sunday Badminton', 'Koramangala'], 'koramangala sunday')).toBe(true);
  });

  it('fails when any one token is missing', () => {
    expect(matchesQuery(['Sunday Badminton'], 'badminton tennis')).toBe(false);
  });

  it('ignores case and combining diacritics, so "Café" matches "cafe"', () => {
    expect(matchesQuery(['Caf\u00e9 Mocha'], 'cafe')).toBe(true);
    expect(matchesQuery(['cafe mocha'], 'CAF\u00c9')).toBe(true);
  });

  it('keeps everything for an empty or whitespace-only query', () => {
    expect(matchesQuery(['anything'], '')).toBe(true);
    expect(matchesQuery(['anything'], '   \t ')).toBe(true);
  });

  it('skips null and undefined parts instead of matching the word "null"', () => {
    expect(matchesQuery([null, undefined, 'Chess Club'], 'chess')).toBe(true);
    expect(matchesQuery([null, undefined, 'Chess Club'], 'null')).toBe(false);
  });

  it('matches on a substring, not only a whole word', () => {
    expect(matchesQuery(['Badminton'], 'badmin')).toBe(true);
  });
});

describe('filterByQuery', () => {
  const items = [
    { name: 'Sunday Badminton', city: 'Koramangala' },
    { name: 'Chess Club', city: 'Indiranagar' },
    { name: 'Caf\u00e9 Meetup', city: 'Koramangala' },
  ];
  const textOf = (i: (typeof items)[number]) => [i.name, i.city];

  it('keeps only the matching items', () => {
    expect(filterByQuery(items, 'koramangala', textOf).map((i) => i.name)).toEqual([
      'Sunday Badminton',
      'Caf\u00e9 Meetup',
    ]);
  });

  it('returns a copy of everything for an empty query, never the original array', () => {
    const all = filterByQuery(items, '   ', textOf);

    expect(all).toEqual(items);
    expect(all).not.toBe(items);
  });

  it('returns nothing when no item matches', () => {
    expect(filterByQuery(items, 'kabaddi', textOf)).toEqual([]);
  });
});

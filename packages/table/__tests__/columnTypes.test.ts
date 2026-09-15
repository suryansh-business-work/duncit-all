import { describe, expect, it } from 'vitest';
import {
  columnHeader,
  isColumnFilterable,
  isColumnSortable,
  NUMBER_OPS,
  OPERATOR_KEYS,
  readField,
  sortingOrderOf,
  TEXT_OPS,
} from '../src/columnTypes';
import { fallbackT } from '../src/i18n';
import type { DuncitColumn } from '../src/types';

type Venue = Record<string, unknown>;

const text: DuncitColumn<Venue> = { field: 'venue_name', headerName: 'Venue', type: 'text' };
const number: DuncitColumn<Venue> = { field: 'capacity', type: 'number' };
const date: DuncitColumn<Venue> = { field: 'created_at', headerKey: 'shell.common.created', type: 'date' };
const flag: DuncitColumn<Venue> = { field: 'is_active', type: 'boolean' };
const status: DuncitColumn<Venue> = {
  field: 'status',
  type: 'enum',
  options: [{ value: 'LIVE', label: 'Live' }],
};
const actions: DuncitColumn<Venue> = { field: 'actions', type: 'actions' };

describe('columnHeader', () => {
  it('translates a headerKey, else shows the headerName, else the field', () => {
    expect(columnHeader(date, fallbackT)).toBe('Created');
    expect(columnHeader(text, fallbackT)).toBe('Venue');
    expect(columnHeader(number, fallbackT)).toBe('capacity');
  });
});

describe('isColumnSortable / isColumnFilterable', () => {
  it('sort and filter every type but actions', () => {
    for (const column of [text, number, date, flag, status]) {
      expect(isColumnSortable(column)).toBe(true);
      expect(isColumnFilterable(column)).toBe(true);
    }
    expect(isColumnSortable(actions)).toBe(false);
    expect(isColumnFilterable(actions)).toBe(false);
  });

  it('let a column opt out of either one on its own', () => {
    // A value computed per row (a count of another collection) has nothing stored to order or match on.
    const noSort = { ...number, sortable: false };
    const noFilter = { ...number, filterable: false };
    expect(isColumnSortable(noSort)).toBe(false);
    expect(isColumnFilterable(noSort)).toBe(true);
    expect(isColumnSortable(noFilter)).toBe(true);
    expect(isColumnFilterable(noFilter)).toBe(false);
  });
});

describe('sortingOrderOf', () => {
  it('walks numbers and dates largest / newest first, and everything else A→Z first', () => {
    expect(sortingOrderOf(number)).toEqual(['desc', 'asc', null]);
    expect(sortingOrderOf(date)).toEqual(['desc', 'asc', null]);
    expect(sortingOrderOf(text)).toEqual(['asc', 'desc', null]);
    expect(sortingOrderOf(status)).toEqual(['asc', 'desc', null]);
  });
});

describe('condition operators', () => {
  it('offer text and number comparisons, each with its own copy', () => {
    expect(TEXT_OPS).toEqual(['contains', 'eq', 'ne']);
    expect(NUMBER_OPS).toEqual(['eq', 'ne', 'gte', 'lte', 'between']);
    for (const op of [...TEXT_OPS, ...NUMBER_OPS]) {
      expect(fallbackT(OPERATOR_KEYS[op] ?? op)).not.toBe(op);
    }
  });
});

describe('readField', () => {
  const venue = { venue_name: 'Third Wave', category: { name: 'Cafe' }, owner: null, city: 'Pune' };

  it('reads a field, following a dotted path into nested objects', () => {
    expect(readField(venue, 'venue_name')).toBe('Third Wave');
    expect(readField(venue, 'category.name')).toBe('Cafe');
  });

  it('reads undefined when the path runs through something that is not an object', () => {
    expect(readField(venue, 'owner.name')).toBeUndefined();
    expect(readField(venue, 'city.name')).toBeUndefined();
    expect(readField(null, 'venue_name')).toBeUndefined();
  });
});

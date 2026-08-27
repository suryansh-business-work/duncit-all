import { describe, expect, it } from 'vitest';
import { EM_DASH, dateColumn, formatDateCell } from '../src/cells';

/**
 * A value getter runs inside the grid's paint, so a date it cannot read used to
 * throw `RangeError: Invalid time value` and take the whole page down with it —
 * one unreadable cell, no table, no page. The Tech console's rate-limiting
 * board hit this when the server sent timestamps as epoch millis.
 */

type Row = { id: string; last_seen_at: string | null };

const UNREADABLE = [
  '1787824800000', // a Date serialized by GraphQL's String scalar
  'not a date',
  '',
];

describe('formatDateCell survives an unreadable value', () => {
  it.each(UNREADABLE)('renders the em dash for %j instead of throwing', (value) => {
    expect(() => formatDateCell(value)).not.toThrow();
    expect(formatDateCell(value)).toBe(EM_DASH);
  });

  it('still formats a real ISO timestamp', () => {
    expect(formatDateCell('2026-08-27T09:15:00.000Z')).toBe('27 Aug 2026');
  });
});

describe('dateColumn survives an unreadable value', () => {
  it('paints the em dash rather than throwing out of the value getter', () => {
    const col = dateColumn<Row>({ field: 'last_seen_at', hide: false });
    const row: Row = { id: 'DUN-SYS-01', last_seen_at: '1787824800000' };

    expect(() => col.valueGetter?.(row)).not.toThrow();
    expect(col.valueGetter?.(row)).toBe(EM_DASH);
  });
});

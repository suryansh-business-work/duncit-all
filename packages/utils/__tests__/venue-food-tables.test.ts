import { describe, expect, it } from 'vitest';
import { FOOD_ORDER_LIMITS } from '../src/venue-food';
import {
  FOOD_TABLE_PARAM,
  VENUE_TABLE_STICKERS_QUERY,
  foodTableFromParam,
  foodTablesFromCount,
  foodTablesText,
  isFoodTableTooLong,
  parseFoodTables,
} from '../src/venue-food-tables';

const MAX = FOOD_ORDER_LIMITS.tableMax;

describe('foodTableFromParam', () => {
  it('reads the table a sticker link names, trimmed', () => {
    expect(FOOD_TABLE_PARAM).toBe('table');
    expect(foodTableFromParam('  Patio 2 ')).toBe('Patio 2');
  });

  it('takes the first value of a repeated parameter', () => {
    expect(foodTableFromParam(['T4', 'T9'])).toBe('T4');
  });

  it('cuts a label to the checkout field limit', () => {
    expect(foodTableFromParam('x'.repeat(MAX + 10))).toBe('x'.repeat(MAX));
  });

  it('answers blank for a missing or non-text value', () => {
    expect(foodTableFromParam(undefined)).toBe('');
    expect(foodTableFromParam(null)).toBe('');
    expect(foodTableFromParam(7)).toBe('');
    expect(foodTableFromParam([])).toBe('');
    expect(foodTableFromParam([3])).toBe('');
  });
});

describe('parseFoodTables', () => {
  it('splits on commas and new lines, trims and drops blanks', () => {
    expect(parseFoodTables('1, 2,  Patio\n\nRoof ,')).toEqual(['1', '2', 'Patio', 'Roof']);
    expect(parseFoodTables('A\r\nB')).toEqual(['A', 'B']);
  });

  it('keeps a repeated label once, ignoring case, in its first spelling', () => {
    expect(parseFoodTables('Patio, patio, PATIO, 1, 1')).toEqual(['Patio', '1']);
  });

  it('answers no tables for blank text', () => {
    expect(parseFoodTables('')).toEqual([]);
    expect(parseFoodTables(' , \n ')).toEqual([]);
  });
});

describe('foodTablesText', () => {
  it('joins the labels as the field shows them', () => {
    expect(foodTablesText(['1', '2', 'Patio'])).toBe('1, 2, Patio');
  });

  it('is blank for none', () => {
    expect(foodTablesText([])).toBe('');
    expect(foodTablesText(null)).toBe('');
    expect(foodTablesText(undefined)).toBe('');
  });

  it('round-trips through parseFoodTables', () => {
    expect(parseFoodTables(foodTablesText(['1', 'Patio']))).toEqual(['1', 'Patio']);
  });
});

describe('foodTablesFromCount', () => {
  it('numbers the tables from 1', () => {
    expect(foodTablesFromCount(3, 50)).toBe('1, 2, 3');
  });

  it('stops at the venue table limit', () => {
    expect(foodTablesFromCount(10, 4)).toBe('1, 2, 3, 4');
  });

  it('drops a fraction and lists nothing for zero or a negative count', () => {
    expect(foodTablesFromCount(2.9, 50)).toBe('1, 2');
    expect(foodTablesFromCount(0, 50)).toBe('');
    expect(foodTablesFromCount(-3, 50)).toBe('');
  });
});

describe('isFoodTableTooLong', () => {
  it('refuses a label longer than the checkout field holds, and only that', () => {
    expect(isFoodTableTooLong('x'.repeat(MAX))).toBe(false);
    expect(isFoodTableTooLong('x'.repeat(MAX + 1))).toBe(true);
    expect(isFoodTableTooLong('')).toBe(false);
  });
});

describe('VENUE_TABLE_STICKERS_QUERY', () => {
  it('asks for every sticker of one venue in one PDF with its headings', () => {
    expect(VENUE_TABLE_STICKERS_QUERY).toContain(
      'myVenueTableStickersPdfBase64(venue_id: $venueId, headline: $headline, table_heading: $tableHeading)',
    );
    expect(VENUE_TABLE_STICKERS_QUERY).toContain('query MyVenueTableStickers($venueId: ID!, $headline: String!, $tableHeading: String!)');
  });
});

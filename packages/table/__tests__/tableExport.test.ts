import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TableQueryState } from '../src/types';

const { downloadTextFile } = vi.hoisted(() => ({ downloadTextFile: vi.fn() }));
vi.mock('@duncit/utils', () => ({ downloadTextFile }));

const { fetchAllRows, rowsToCsv, rowsToJson, saveRows } = await import('../src/export/tableExport');
const { fallbackT } = await import('../src/i18n');
type Columns = Parameters<typeof rowsToCsv<Payout>>[1];

type Payout = { id: string; host: string; amount: number; meta?: unknown; paid_at?: Date | null };

const columns: Columns = [
  { field: 'id', headerName: 'Payout', type: 'text' },
  { field: 'host', headerName: 'Host, name', type: 'text' },
  { field: 'amount', headerName: 'Amount', type: 'number', valueGetter: (row) => `INR ${row.amount}` },
  { field: 'meta', headerKey: 'shell.table.download', type: 'text' },
  { field: 'paid_at', headerName: 'Paid', type: 'date' },
  { field: 'secret', headerName: 'Hidden', type: 'text', hide: true },
];

const QUERY = { search: '', page: 3, pageSize: 25, sortBy: null, sortDir: 'asc' as const, filters: [] };

beforeEach(() => {
  downloadTextFile.mockReset();
});

describe('fetchAllRows', () => {
  it('walks every page at the server ceiling and stops at the total', async () => {
    const fetchRows = vi.fn(async (q: TableQueryState) => ({
      rows: Array.from({ length: q.page === 3 ? 5 : 100 }, (_, i) => ({ id: `${q.page}-${i}` })),
      total: 205,
    }));
    const rows = await fetchAllRows(fetchRows, QUERY, 205);
    expect(rows).toHaveLength(205);
    expect(fetchRows).toHaveBeenCalledTimes(3);
    expect(fetchRows).toHaveBeenLastCalledWith({ ...QUERY, page: 3, pageSize: 100 });
  });

  it('stops early when a page comes back empty', async () => {
    const fetchRows = vi.fn(async () => ({ rows: [], total: 0 }));
    expect(await fetchAllRows(fetchRows, QUERY, 500)).toEqual([]);
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });
});

describe('rowsToCsv', () => {
  it('writes the visible columns as the grid reads them, quoted and formula-safe', () => {
    const csv = rowsToCsv<Payout>(
      [
        { id: 'DUN-POD-4821', host: 'Asha "A" Rao', amount: 1200, meta: { city: 'Pune' }, paid_at: new Date('2026-09-01T10:00:00Z') },
        { id: '=HYPERLINK()', host: 'Line\nbreak', amount: 0, meta: null, paid_at: undefined },
      ],
      columns,
      { paid_at: false },
      fallbackT,
    );
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Payout,"Host, name",Amount,Download,Paid',
      'DUN-POD-4821,"Asha ""A"" Rao",INR 1200,"{""city"":""Pune""}",2026-09-01T10:00:00.000Z',
      `'=HYPERLINK(),"Line\nbreak",INR 0,,`,
    ]);
  });

  it('writes numbers and booleans as they are', () => {
    const csv = rowsToCsv([{ n: -5, ok: true }], [
      { field: 'n', headerName: 'N', type: 'number' },
      { field: 'ok', headerName: 'OK', type: 'boolean' },
    ], {}, fallbackT);
    expect(csv.slice(1).split('\r\n')[1]).toBe('-5,true');
  });
});

describe('rowsToJson', () => {
  it('keeps the rows as returned, minus Apollo bookkeeping', () => {
    expect(JSON.parse(rowsToJson([{ __typename: 'Pod', id: 'p1', club: { __typename: 'Club', name: 'Runners' } }]))).toEqual([
      { id: 'p1', club: { name: 'Runners' } },
    ]);
  });
});

describe('saveRows', () => {
  const base = { tableId: 'payouts', page: 3, rows: [{ id: 'p1', host: 'Asha', amount: 10 }], columns, hiddenOverrides: {}, t: fallbackT };

  it('names a page CSV after the table and the page', () => {
    saveRows<Payout>({ ...base, scope: 'page', format: 'csv' });
    expect(downloadTextFile).toHaveBeenCalledWith(expect.stringContaining('Payout'), 'payouts-page-3.csv', 'text/csv;charset=utf-8');
  });

  it('names an all-rows JSON after the table', () => {
    saveRows<Payout>({ ...base, scope: 'all', format: 'json' });
    expect(downloadTextFile).toHaveBeenCalledWith(expect.stringContaining('"p1"'), 'payouts-all.json', 'application/json');
  });
});

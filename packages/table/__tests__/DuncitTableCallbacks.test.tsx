import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real AG Grid emits SortChanged/RowClicked from deep browser layout that jsdom
// can't reproduce, and its CSV exporter dispatches a MouseEvent jsdom rejects. Here
// the grid is stubbed so DuncitTable's own callback wiring can be driven with crafted
// events, covering the controlled-sort echo guard and the row-click target filter.
type SortChanged = (event: { api: { getColumnState: () => Array<{ colId: string; sort: string | null }> } }) => void;
type RowClicked = (event: { data?: unknown; event?: { target?: unknown } }) => void;

const { captured, mockExport } = vi.hoisted(() => ({
  captured: {} as { onSortChanged?: SortChanged; onRowClicked?: RowClicked },
  mockExport: vi.fn(),
}));

vi.mock('ag-grid-react', async () => {
  const react = await import('react');
  return {
    AgGridReact: react.forwardRef(
      (props: { onSortChanged?: SortChanged; onRowClicked?: RowClicked }, ref: React.Ref<unknown>) => {
        captured.onSortChanged = props.onSortChanged;
        captured.onRowClicked = props.onRowClicked;
        react.useImperativeHandle(ref, () => ({ api: { exportDataAsCsv: mockExport } }));
        return react.createElement('div', { 'data-testid': 'ag-grid-stub' });
      },
    ),
  };
});

// eslint-disable-next-line import/first -- must import after the ag-grid-react mock is registered
import { DuncitTable } from '../src/DuncitTable';
import type { DuncitColumn, TablePage, TableQueryState } from '../src/types';

type Person = { id: string; name: string };

const columns: DuncitColumn<Person>[] = [{ field: 'name', headerName: 'Name' }];

function makeFetch() {
  return vi.fn(
    async (_q: TableQueryState): Promise<TablePage<Person>> => ({
      rows: [{ id: 'p1', name: 'Person 1' }],
      total: 1,
    }),
  );
}

function sortEvent(states: Array<{ colId: string; sort: string | null }>) {
  return { api: { getColumnState: () => states } };
}

beforeEach(() => {
  window.localStorage.clear();
  mockExport.mockClear();
  captured.onSortChanged = undefined;
  captured.onRowClicked = undefined;
});

describe('DuncitTable controlled sort echo guard', () => {
  it('forwards genuine header sorts and swallows echoes/clears', async () => {
    const fetchRows = makeFetch();
    render(
      <DuncitTable<Person>
        tableId="sort"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1));

    // A real ascending sort is forwarded.
    act(() => captured.onSortChanged?.(sortEvent([{ colId: 'name', sort: 'asc' }])));
    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'name', sortDir: 'asc' }),
      ),
    );

    // The grid echoes the same state back -> guard returns, no refetch.
    const callsAfterAsc = fetchRows.mock.calls.length;
    act(() => captured.onSortChanged?.(sortEvent([{ colId: 'name', sort: 'asc' }])));
    await Promise.resolve();
    expect(fetchRows.mock.calls.length).toBe(callsAfterAsc);

    // Clearing the sort (no sorted column) while a sort is active is forwarded as a clear.
    act(() => captured.onSortChanged?.(sortEvent([])));
    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: null })),
    );

    // Echoing the cleared (null) state back -> guard returns, no refetch.
    const callsAfterClear = fetchRows.mock.calls.length;
    act(() => captured.onSortChanged?.(sortEvent([])));
    await Promise.resolve();
    expect(fetchRows.mock.calls.length).toBe(callsAfterClear);

    // A descending sort is forwarded.
    act(() => captured.onSortChanged?.(sortEvent([{ colId: 'name', sort: 'desc' }])));
    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'name', sortDir: 'desc' }),
      ),
    );
  });
});

describe('DuncitTable row-click target filter', () => {
  it('fires onRowClick for plain targets and missing events, but not for buttons or empty rows', async () => {
    const onRowClick = vi.fn();
    render(
      <DuncitTable<Person>
        tableId="rowclick-unit"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    const row = { id: 'p1', name: 'Person 1' };

    // Plain element target -> fires.
    act(() => captured.onRowClicked?.({ data: row, event: { target: document.createElement('div') } }));
    expect(onRowClick).toHaveBeenCalledWith(row);

    // No wrapped event (target undefined) -> still fires.
    onRowClick.mockClear();
    act(() => captured.onRowClicked?.({ data: row }));
    expect(onRowClick).toHaveBeenCalledWith(row);

    // Target inside a button -> suppressed.
    onRowClick.mockClear();
    act(() => captured.onRowClicked?.({ data: row, event: { target: document.createElement('button') } }));
    expect(onRowClick).not.toHaveBeenCalled();

    // No row data -> suppressed.
    act(() => captured.onRowClicked?.({ data: undefined, event: { target: document.createElement('div') } }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('is a no-op when no onRowClick handler is supplied', async () => {
    render(
      <DuncitTable<Person>
        tableId="rowclick-none"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(() =>
      captured.onRowClicked?.({ data: { id: 'p1', name: 'x' }, event: { target: document.createElement('div') } }),
    ).not.toThrow();
  });
});

describe('DuncitTable CSV export', () => {
  it('the Export CSV toolbar button exports with the tableId filename', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <DuncitTable<Person>
        tableId="csv-table"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() => expect(mockExport).toHaveBeenCalledWith({ fileName: 'csv-table.csv' }));
  });
});

describe('DuncitTable rows-per-page', () => {
  it('changing the page size refetches with the new size and resets to page 1', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const fetchRows = makeFetch();
    render(
      <DuncitTable<Person>
        tableId="pagesize"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1));

    // The only combobox on the page is TablePagination's rows-per-page select.
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: '50' }));
    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageSize: 50, page: 1 }),
      ),
    );
  });
});

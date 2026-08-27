import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real AG Grid needs browser layout jsdom cannot provide, so it is stubbed and the
// props DuncitTable hands it are captured instead. That is the contract every portal
// depends on: the escaped empty-state overlay, the row-id bridge, and the density that
// drives header height + cell padding.
type CellStyle = Record<string, string | number>;
type GridProps = {
  overlayNoRowsTemplate?: string;
  headerHeight?: number;
  defaultColDef?: { cellStyle?: CellStyle };
  getRowId?: (params: { data: unknown }) => string;
};
type GridHandle = {
  api?: {
    exportDataAsCsv: (options: { fileName: string }) => void;
    refreshCells: (params: { force: boolean }) => void;
  };
};

const { captured, gridHandle, mockExport } = vi.hoisted(() => ({
  captured: {} as GridProps,
  gridHandle: { current: undefined as GridHandle | undefined },
  mockExport: vi.fn(),
}));

vi.mock('ag-grid-react', async () => {
  const react = await import('react');
  return {
    AgGridReact: react.forwardRef((props: GridProps, ref: React.Ref<unknown>) => {
      Object.assign(captured, props);
      react.useImperativeHandle(ref, () => gridHandle.current);
      return react.createElement('div', { 'data-testid': 'ag-grid-stub' });
    }),
  };
});

// eslint-disable-next-line import/first -- must import after the ag-grid-react mock is registered
import { DuncitTable } from '../src/DuncitTable';
import type { DuncitColumn, TablePage, TableQueryState } from '../src/types';

type Person = { id: string; name: string };

const columns: DuncitColumn<Person>[] = [{ field: 'name', headerName: 'Name' }];
const ROW: Person = { id: 'p1', name: 'Person 1' };

function makeFetch() {
  return vi.fn(async (_q: TableQueryState): Promise<TablePage<Person>> => ({ rows: [ROW], total: 1 }));
}

beforeEach(() => {
  window.localStorage.clear();
  mockExport.mockClear();
  gridHandle.current = { api: { exportDataAsCsv: mockExport, refreshCells: () => undefined } };
  for (const key of Object.keys(captured)) {
    delete captured[key as keyof GridProps];
  }
});

describe('DuncitTable empty-state overlay', () => {
  it('escapes HTML in emptyText so the overlay cannot inject markup', async () => {
    render(
      <DuncitTable<Person>
        tableId="empty-escape"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        emptyText={`Tom & "Jerry" <b>'s</b>`}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(captured.overlayNoRowsTemplate).toBe(
      '<span>Tom &amp; &quot;Jerry&quot; &lt;b&gt;&#39;s&lt;/b&gt;</span>',
    );
  });

  it('falls back to the default empty message when no emptyText is given', async () => {
    render(
      <DuncitTable<Person>
        tableId="empty-default"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(captured.overlayNoRowsTemplate).toBe('<span>No rows to display</span>');
  });
});

describe('DuncitTable getRowId bridge', () => {
  it('unwraps AG Grid params and returns the caller row id', async () => {
    const getRowId = vi.fn((row: Person) => `row-${row.id}`);
    render(
      <DuncitTable<Person>
        tableId="rowid"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={getRowId}
      />,
    );
    await screen.findByTestId('ag-grid-stub');

    expect(captured.getRowId?.({ data: ROW })).toBe('row-p1');
    expect(getRowId).toHaveBeenCalledWith(ROW);
  });
});

describe('DuncitTable density', () => {
  it('toggling density shrinks the header height and the cell padding', async () => {
    render(
      <DuncitTable<Person>
        tableId="density"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(captured.headerHeight).toBe(48);
    expect(captured.defaultColDef?.cellStyle).toMatchObject({
      paddingTop: '12px',
      paddingBottom: '12px',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compact density' }));
    await waitFor(() => expect(captured.headerHeight).toBe(36));
    expect(captured.defaultColDef?.cellStyle).toMatchObject({
      paddingTop: '4px',
      paddingBottom: '4px',
    });

    // …and back again, which is what a user toggling twice must get.
    fireEvent.click(screen.getByRole('button', { name: 'Standard density' }));
    await waitFor(() => expect(captured.headerHeight).toBe(48));
  });
});

describe('DuncitTable refetchRef handoff', () => {
  it('publishes refetch on mount and releases it on unmount', async () => {
    const refetchRef: { current: (() => void) | null } = { current: null };
    const { unmount } = render(
      <DuncitTable<Person>
        tableId="refetch-ref"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        refetchRef={refetchRef}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(typeof refetchRef.current).toBe('function');

    unmount();
    // A parent that fires the ref after the table is gone must not reach a dead hook.
    expect(refetchRef.current).toBeNull();
  });
});

describe('DuncitTable CSV export guard', () => {
  it('does nothing when the grid api is not ready yet', async () => {
    gridHandle.current = undefined;
    render(
      <DuncitTable<Person>
        tableId="csv-not-ready"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(mockExport).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exports once the api is attached', async () => {
    render(
      <DuncitTable<Person>
        tableId="csv-ready"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(mockExport).toHaveBeenCalledWith({ fileName: 'csv-ready.csv' });
  });
});

describe('DuncitTable updateRowRef handoff', () => {
  it('publishes updateRow on mount and releases it on unmount', async () => {
    const updateRowRef: { current: ((row: Person) => void) | null } = { current: null };
    const { unmount } = render(
      <DuncitTable<Person>
        tableId="update-row-ref"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        updateRowRef={updateRowRef}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(typeof updateRowRef.current).toBe('function');

    unmount();
    // A parent whose mutation resolves after the table is gone must not reach a dead hook.
    expect(updateRowRef.current).toBeNull();
  });
});

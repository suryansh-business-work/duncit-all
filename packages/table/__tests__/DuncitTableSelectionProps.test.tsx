import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The grid is stubbed here so the OPT-IN half of the contract can be asserted directly:
// a table that never asked for selection must hand AG Grid nothing selection-shaped, and
// the rowSelection object it does hand over must keep its identity across re-renders —
// a fresh object each time makes AG Grid reconfigure selection and drop the ticks.
type SelectionChanged = (event: { api: { getSelectedRows: () => unknown[] } }) => void;
type GridProps = {
  rowSelection?: { mode: string };
  onSelectionChanged?: SelectionChanged;
  headerHeight?: number;
};
type GridHandle = { api?: { deselectAll: () => void } };

const { captured, gridHandle, mockDeselectAll } = vi.hoisted(() => ({
  captured: {} as GridProps,
  gridHandle: { current: undefined as GridHandle | undefined },
  mockDeselectAll: vi.fn(),
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

function selectionEvent(rows: Person[]) {
  return { api: { getSelectedRows: () => rows } };
}

beforeEach(() => {
  window.localStorage.clear();
  mockDeselectAll.mockClear();
  gridHandle.current = { api: { deselectAll: mockDeselectAll } };
  for (const key of Object.keys(captured)) {
    delete captured[key as keyof GridProps];
  }
});

describe('DuncitTable selection opt-in', () => {
  it('hands the grid no selection config at all without the prop', async () => {
    render(
      <DuncitTable<Person>
        tableId="selection-absent"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByTestId('ag-grid-stub');

    expect(captured.rowSelection).toBeUndefined();
    expect(captured.onSelectionChanged).toBeUndefined();
  });

  it('enables multiRow selection and forwards whatever the grid says is selected', async () => {
    const onChange = vi.fn();
    render(
      <DuncitTable<Person>
        tableId="selection-present"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        selection={{ onChange }}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(captured.rowSelection).toEqual({ mode: 'multiRow' });

    act(() => captured.onSelectionChanged?.(selectionEvent([ROW])));
    expect(onChange).toHaveBeenLastCalledWith([ROW]);

    // The wipe AG Grid performs itself on a page/sort/filter change arrives the same
    // way, as an empty set — the parent mirrors it instead of keeping the old ids.
    act(() => captured.onSelectionChanged?.(selectionEvent([])));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('keeps the rowSelection object identical across re-renders', async () => {
    render(
      <DuncitTable<Person>
        tableId="selection-stable"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        selection={{ onChange: vi.fn() }}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    const first = captured.rowSelection;

    fireEvent.click(screen.getByRole('button', { name: 'Compact density' }));
    await waitFor(() => expect(captured.headerHeight).toBe(36));
    expect(captured.rowSelection).toBe(first);
  });
});

describe('DuncitTable clearRef', () => {
  it('deselects in the grid once the api is attached', async () => {
    const clearRef: { current: (() => void) | null } = { current: null };
    render(
      <DuncitTable<Person>
        tableId="clear-ready"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        selection={{ onChange: vi.fn(), clearRef }}
      />,
    );
    await screen.findByTestId('ag-grid-stub');

    act(() => clearRef.current?.());
    expect(mockDeselectAll).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the grid api is not ready yet', async () => {
    gridHandle.current = undefined;
    const clearRef: { current: (() => void) | null } = { current: null };
    render(
      <DuncitTable<Person>
        tableId="clear-not-ready"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        selection={{ onChange: vi.fn(), clearRef }}
      />,
    );
    await screen.findByTestId('ag-grid-stub');

    act(() => clearRef.current?.());
    expect(mockDeselectAll).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DuncitTable } from '../src/DuncitTable';
import type { DuncitColumn, TablePage, TableQueryState } from '../src/types';

// The real AG Grid runs here (jsdom renders its selection column fine), because the
// thing worth proving is the grid's own behaviour: what a tick reports, and that a page
// change deselects behind our back. AG Grid batches `selectionChanged` onto a later
// task, so every assertion on onChange has to be awaited.
type Person = { id: string; name: string };

const people: Person[] = Array.from({ length: 30 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Person ${i + 1}`,
}));

const columns: DuncitColumn<Person>[] = [{ field: 'name', headerName: 'Name' }];

function makeFetch() {
  return vi.fn(async (q: TableQueryState): Promise<TablePage<Person>> => {
    const start = (q.page - 1) * q.pageSize;
    return { rows: people.slice(start, start + q.pageSize), total: people.length };
  });
}

function rowCheckboxes(): HTMLElement[] {
  return screen.getAllByRole('checkbox', { name: 'Select row' });
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('DuncitTable checkbox selection', () => {
  it('renders no checkbox column at all when the selection prop is absent', async () => {
    render(
      <DuncitTable<Person>
        tableId="selection-off"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
      />,
    );
    await screen.findByText('Person 1');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('reports the ticked rows, and the parent clears them through clearRef', async () => {
    const onChange = vi.fn();
    const clearRef: { current: (() => void) | null } = { current: null };
    render(
      <DuncitTable<Person>
        tableId="selection-tick"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        selection={{ onChange, clearRef }}
      />,
    );
    await screen.findByText('Person 1');

    fireEvent.click(rowCheckboxes()[0]);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([people[0]]));

    // A second tick reports BOTH rows — onChange is the full ticked set, not a delta.
    fireEvent.click(rowCheckboxes()[1]);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([people[0], people[1]]));

    // clearRef has to untick the GRID, not just reset whatever the parent stored:
    // the checkboxes go back to unchecked and the empty set is reported back.
    act(() => clearRef.current?.());
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]));
    for (const box of rowCheckboxes()) {
      expect(box).not.toBeChecked();
    }
  });

  it('releases clearRef on unmount so a late caller cannot reach a dead grid', async () => {
    const clearRef: { current: (() => void) | null } = { current: null };
    const { unmount } = render(
      <DuncitTable<Person>
        tableId="selection-clearref"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        selection={{ onChange: vi.fn(), clearRef }}
      />,
    );
    await screen.findByText('Person 1');
    expect(typeof clearRef.current).toBe('function');

    unmount();
    expect(clearRef.current).toBeNull();
  });

  it('a page change deselects the rows that left and reports an empty set', async () => {
    const onChange = vi.fn();
    render(
      <DuncitTable<Person>
        tableId="selection-paged"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        selection={{ onChange }}
      />,
    );
    await screen.findByText('Person 1');

    fireEvent.click(rowCheckboxes()[0]);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([people[0]]));

    // Page 2 replaces the row data; AG Grid's immutable path drops the nodes that went
    // and deselects them. This is why a parent must mirror rather than accumulate.
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    await screen.findByText('Person 26');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]));
    // The box follows the report rather than arriving with it: `onChange` is the
    // grid's selection model, and the header/row checkboxes repaint on a later
    // task again. Asserting it synchronously off the back of the report above is
    // a race that only loses on a slow machine.
    await waitFor(() => expect(rowCheckboxes()[0]).not.toBeChecked());
  });
});

describe('DuncitTable selection column vs row clicks', () => {
  it('a click anywhere in the checkbox cell must not open the row', async () => {
    // The checkbox is a 16px input inside a 50px cell and stops propagation on
    // its own; every other pixel of that cell used to reach onRowClick, so
    // aiming at the tick and missing opened the page's drawer with nothing
    // selected.
    const onRowClick = vi.fn();
    const { container } = render(
      <DuncitTable<Person>
        tableId="selection-vs-click"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        onRowClick={onRowClick}
        selection={{ onChange: vi.fn() }}
      />,
    );
    await screen.findByText('Person 1');

    const cell = container.querySelector('[col-id="duncit-select"].ag-cell');
    expect(cell).not.toBeNull();
    fireEvent.click(cell as Element);
    expect(onRowClick).not.toHaveBeenCalled();

    // An ordinary cell still opens the row — the guard is scoped, not blanket.
    fireEvent.click(screen.getByText('Person 1'));
    await waitFor(() => expect(onRowClick).toHaveBeenCalledTimes(1));
  });
});

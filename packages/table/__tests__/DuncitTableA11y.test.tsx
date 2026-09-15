import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real grid fires gridReady and cellKeyDown from browser focus and layout jsdom
// cannot drive, so it is stubbed and the handlers DuncitTable hands it are called
// with crafted events: the grid's accessible name and the keyboard way into a row.
type KeyDown = (event: { data?: unknown; event?: unknown }) => void;
type GridReady = (event: { api: { setGridAriaProperty: (property: string, value: string | null) => void } }) => void;
type GridProps = { onCellKeyDown?: KeyDown; onGridReady?: GridReady; suppressCellFocus?: boolean };

const { captured } = vi.hoisted(() => ({ captured: {} as GridProps }));

vi.mock('ag-grid-react', async () => {
  const react = await import('react');
  return {
    AgGridReact: react.forwardRef((props: GridProps, ref: React.Ref<unknown>) => {
      Object.assign(captured, props);
      react.useImperativeHandle(ref, () => ({ api: { refreshCells: () => undefined } }));
      return react.createElement('div', { 'data-testid': 'ag-grid-stub' });
    }),
  };
});

// eslint-disable-next-line import/first -- must import after the ag-grid-react mock is registered
import { DuncitTable } from '../src/DuncitTable';
import type { DuncitColumn, TablePage, TableQueryState } from '../src/types';

type Pod = { id: string; name: string };

const columns: DuncitColumn<Pod>[] = [{ field: 'name', headerName: 'Name' }];
const ROW: Pod = { id: 'DUN-POD-4821', name: 'Sunday badminton' };

function makeFetch() {
  return vi.fn(async (_q: TableQueryState): Promise<TablePage<Pod>> => ({ rows: [ROW], total: 1 }));
}

function enter(target: Element = document.createElement('div'), key = 'Enter') {
  const event = new KeyboardEvent('keydown', { key });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

beforeEach(() => {
  window.localStorage.clear();
  for (const key of Object.keys(captured)) {
    delete captured[key as keyof GridProps];
  }
});

describe('DuncitTable accessible name', () => {
  it('names the grid from ariaLabel once it is ready', async () => {
    render(
      <DuncitTable<Pod> tableId="a11y-name" columns={columns} fetchRows={makeFetch()} getRowId={(row) => row.id} ariaLabel="Pods" />,
    );
    await screen.findByTestId('ag-grid-stub');
    const setGridAriaProperty = vi.fn();
    act(() => captured.onGridReady?.({ api: { setGridAriaProperty } }));
    expect(setGridAriaProperty).toHaveBeenCalledWith('label', 'Pods');
  });

  it('leaves the grid unnamed when no ariaLabel is given', async () => {
    render(<DuncitTable<Pod> tableId="a11y-unnamed" columns={columns} fetchRows={makeFetch()} getRowId={(row) => row.id} />);
    await screen.findByTestId('ag-grid-stub');
    const setGridAriaProperty = vi.fn();
    act(() => captured.onGridReady?.({ api: { setGridAriaProperty } }));
    expect(setGridAriaProperty).not.toHaveBeenCalled();
  });
});

describe('DuncitTable keyboard row activation', () => {
  it('keeps cells out of the tab order for a read-only grid, and ignores keys there', async () => {
    render(<DuncitTable<Pod> tableId="a11y-readonly" columns={columns} fetchRows={makeFetch()} getRowId={(row) => row.id} />);
    await screen.findByTestId('ag-grid-stub');
    expect(captured.suppressCellFocus).toBe(true);
    expect(() => act(() => captured.onCellKeyDown?.({ data: ROW, event: enter() }))).not.toThrow();
  });

  it('opens a row on Enter, but not from another key, a control, a missing row or a non-keyboard event', async () => {
    const onRowClick = vi.fn();
    render(
      <DuncitTable<Pod>
        tableId="a11y-keys"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    await screen.findByTestId('ag-grid-stub');
    expect(captured.suppressCellFocus).toBe(false);

    act(() => captured.onCellKeyDown?.({ data: ROW, event: enter() }));
    expect(onRowClick).toHaveBeenCalledWith(ROW);
    // A synthetic key with no target at all still opens the row.
    act(() => captured.onCellKeyDown?.({ data: ROW, event: new KeyboardEvent('keydown', { key: 'Enter' }) }));
    expect(onRowClick).toHaveBeenCalledTimes(2);
    onRowClick.mockClear();

    act(() => captured.onCellKeyDown?.({ data: ROW, event: enter(document.createElement('div'), 'ArrowDown') }));
    act(() => captured.onCellKeyDown?.({ data: ROW, event: enter(document.createElement('button')) }));
    act(() => captured.onCellKeyDown?.({ data: undefined, event: enter() }));
    act(() => captured.onCellKeyDown?.({ data: ROW, event: new MouseEvent('click') }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('marks the grid busy while a fetch is in flight', async () => {
    render(<DuncitTable<Pod> tableId="a11y-busy" columns={columns} fetchRows={makeFetch()} getRowId={(row) => row.id} />);
    await screen.findByTestId('ag-grid-stub');
    expect(screen.getByTestId('duncit-table-grid')).toHaveAttribute('aria-busy');
  });
});

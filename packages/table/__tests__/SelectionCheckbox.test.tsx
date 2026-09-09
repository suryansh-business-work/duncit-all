import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CustomCellRendererProps, CustomHeaderProps } from 'ag-grid-react';
import { SelectionCheckbox, SelectionHeaderCheckbox } from '../src/SelectionCheckbox';

// The two MUI checkboxes are driven here against hand-built AG Grid node/api
// stubs, so the edges the real grid never shows in jsdom can be asserted: a node
// that has no selection state yet, the header tick in both directions, and the
// cleanup that must not touch a destroyed api.
type Listener = () => void;

function makeNode(selected: boolean | undefined) {
  const listeners: Record<string, Listener> = {};
  const node = {
    isSelected: vi.fn(() => selected),
    setSelected: vi.fn(),
    addEventListener: vi.fn((name: string, cb: Listener) => {
      listeners[name] = cb;
    }),
    removeEventListener: vi.fn(),
  };
  return { node, listeners };
}

function makeApi(total: number, selected: number, destroyed = false) {
  const listeners: Record<string, Listener> = {};
  const api = {
    forEachNode: (cb: () => void) => {
      for (let i = 0; i < total; i += 1) cb();
    },
    getSelectedNodes: () => Array.from({ length: selected }, (_, i) => ({ id: `n${i}` })),
    addEventListener: vi.fn((name: string, cb: Listener) => {
      listeners[name] = cb;
    }),
    removeEventListener: vi.fn(),
    isDestroyed: () => destroyed,
    selectAll: vi.fn(),
    deselectAll: vi.fn(),
  };
  return { api, listeners };
}

function renderRow(node: unknown) {
  return render(<SelectionCheckbox {...({ node } as unknown as CustomCellRendererProps)} />);
}

function renderHeader(api: unknown) {
  return render(<SelectionHeaderCheckbox {...({ api } as unknown as CustomHeaderProps)} />);
}

describe('SelectionCheckbox', () => {
  it('treats a node with no selection state yet as unticked, and hands the tick to the grid', () => {
    const { node } = makeNode(undefined);
    renderRow(node);
    const box = screen.getByRole('checkbox', { name: 'Select row' });
    expect(box).not.toBeChecked();

    fireEvent.click(box);
    expect(node.setSelected).toHaveBeenCalledWith(true);
  });

  it('follows the grid: a rowSelected event re-reads node.isSelected()', () => {
    const { node, listeners } = makeNode(true);
    const { unmount } = renderRow(node);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeChecked();

    node.isSelected.mockReturnValue(false);
    act(() => listeners.rowSelected());
    expect(screen.getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();

    unmount();
    expect(node.removeEventListener).toHaveBeenCalledWith('rowSelected', listeners.rowSelected);
  });

  // The file-manager gesture: a plain tick sets the anchor, shift-click sweeps
  // the SAME value over every placed row between the anchor and here.
  it('shift-click applies the tick to every row between the anchor and here', () => {
    const rows = [0, 1, 2, 3, 4].map((rowIndex) => ({ rowIndex, setSelected: vi.fn() }));
    // A node the grid has not placed yet sits outside every range.
    const unplaced = { rowIndex: null, setSelected: vi.fn() };
    const api = {
      forEachNode: (cb: (row: { rowIndex: number | null; setSelected: (v: boolean) => void }) => void) => {
        [...rows, unplaced].forEach(cb);
      },
    };
    const first = { ...makeNode(false).node, rowIndex: 1 };
    const { unmount } = render(
      <SelectionCheckbox {...({ node: first, api } as unknown as CustomCellRendererProps)} />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
    expect(first.setSelected).toHaveBeenCalledWith(true);
    unmount();

    const third = { ...makeNode(false).node, rowIndex: 3 };
    render(<SelectionCheckbox {...({ node: third, api } as unknown as CustomCellRendererProps)} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }), { shiftKey: true });
    expect(rows[1].setSelected).toHaveBeenCalledWith(true);
    expect(rows[2].setSelected).toHaveBeenCalledWith(true);
    expect(rows[3].setSelected).toHaveBeenCalledWith(true);
    expect(rows[0].setSelected).not.toHaveBeenCalled();
    expect(rows[4].setSelected).not.toHaveBeenCalled();
    expect(unplaced.setSelected).not.toHaveBeenCalled();
    // The range path spoke for this row; the single path did not run as well.
    expect(third.setSelected).not.toHaveBeenCalled();
  });

  it('shift-click with no anchor yet, or on a row the grid has not placed, ticks just this row', () => {
    const api = { forEachNode: vi.fn() };
    const unplaced = { ...makeNode(false).node, rowIndex: null };
    const { unmount } = render(
      <SelectionCheckbox {...({ node: unplaced, api } as unknown as CustomCellRendererProps)} />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }), { shiftKey: true });
    expect(unplaced.setSelected).toHaveBeenCalledWith(true);
    expect(api.forEachNode).not.toHaveBeenCalled();
    unmount();

    // Placed, shift held, but this api has never seen a plain tick: no anchor.
    const placed = { ...makeNode(false).node, rowIndex: 2 };
    render(<SelectionCheckbox {...({ node: placed, api } as unknown as CustomCellRendererProps)} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }), { shiftKey: true });
    expect(placed.setSelected).toHaveBeenCalledWith(true);
    expect(api.forEachNode).not.toHaveBeenCalled();
  });
});

describe('SelectionHeaderCheckbox', () => {
  it('ticks every row on the page when checked, and unticks them when unchecked', () => {
    const { api } = makeApi(3, 0);
    const { unmount } = renderHeader(api);
    const box = screen.getByRole('checkbox', { name: 'Select every row on this page' });
    expect(box).not.toBeChecked();
    expect(box).toBeEnabled();

    fireEvent.click(box);
    expect(api.selectAll).toHaveBeenCalledTimes(1);
    unmount();

    const full = makeApi(3, 3);
    renderHeader(full.api);
    const all = screen.getByRole('checkbox', { name: 'Select every row on this page' });
    expect(all).toBeChecked();
    fireEvent.click(all);
    expect(full.api.deselectAll).toHaveBeenCalledTimes(1);
  });

  it('is indeterminate for a partial page and disabled for an empty one', () => {
    const { api, listeners } = makeApi(0, 0);
    renderHeader(api);
    const box = screen.getByRole('checkbox', { name: 'Select every row on this page' });
    expect(box).toBeDisabled();

    // The grid fills in: modelUpdated re-counts, selectionChanged re-ticks.
    api.forEachNode = (cb) => {
      cb();
      cb();
    };
    act(() => listeners.modelUpdated());
    expect(box).toBeEnabled();
    expect(box).not.toBeChecked();

    api.getSelectedNodes = () => [{ id: 'n0' }];
    act(() => listeners.selectionChanged());
    expect(box).toHaveAttribute('data-indeterminate', 'true');
  });

  it('unsubscribes from a live api on unmount, and leaves a destroyed one alone', () => {
    const live = makeApi(2, 0);
    const first = renderHeader(live.api);
    first.unmount();
    expect(live.api.removeEventListener).toHaveBeenCalledWith(
      'selectionChanged',
      live.listeners.selectionChanged,
    );
    expect(live.api.removeEventListener).toHaveBeenCalledWith(
      'modelUpdated',
      live.listeners.modelUpdated,
    );

    const gone = makeApi(2, 0, true);
    const second = renderHeader(gone.api);
    second.unmount();
    expect(gone.api.removeEventListener).not.toHaveBeenCalled();
  });
});

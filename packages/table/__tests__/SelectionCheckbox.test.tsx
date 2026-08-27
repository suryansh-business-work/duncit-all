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

/**
 * What Customise, Save, Cancel and Reset do to the live grid — exercised
 * against a stubbed grid handle and layout store, so each transition can be
 * asserted without GridStack's pointer engine or an Apollo round-trip.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultLayout } from '../src/layout';
import { useDashboardController } from '../src/useDashboardController';
import type { DashboardLayoutItem, DashboardWidget } from '../src/types';
import type { UseGridStackOptions } from '../src/useGridStack';

const store = vi.hoisted(() => ({
  saved: null as DashboardLayoutItem[] | null,
  ready: true,
  saving: false,
  loadFailed: false,
  save: vi.fn<[items: readonly DashboardLayoutItem[]], Promise<void>>(),
  reset: vi.fn<[], Promise<void>>(),
}));

const grid = vi.hoisted(() => ({
  read: vi.fn<[], DashboardLayoutItem[]>(),
  apply: vi.fn<[items: readonly DashboardLayoutItem[]], void>(),
}));

const gridOptions = vi.hoisted(() => ({ current: null as UseGridStackOptions | null }));

vi.mock('../src/useDashboardLayout', () => ({
  useDashboardLayout: () => store,
}));

vi.mock('../src/useGridStack', () => ({
  DRAG_HANDLE_CLASS: 'duncit-dashboard-drag',
  useGridStack: (options: UseGridStackOptions) => {
    gridOptions.current = options;
    return grid;
  },
}));

const widget = (id: string, x: number): DashboardWidget => ({
  id,
  title: id,
  content: null,
  defaultLayout: { x, y: 0, w: 6, h: 2 },
});

const WIDGETS = [widget('pods', 0), widget('revenue', 6)];
const DEFAULTS = defaultLayout(WIDGETS);
const MOVED: DashboardLayoutItem[] = [
  { id: 'pods', x: 6, y: 0, w: 6, h: 2 },
  { id: 'revenue', x: 0, y: 0, w: 6, h: 2 },
];

const labels = { saveFailed: 'Save failed', resetFailed: 'Reset failed', loadFailed: 'Load failed' };

const mount = () => renderHook(() => useDashboardController('admin.overview', WIDGETS, labels));

const startEditing = () => {
  const hook = mount();
  act(() => hook.result.current.startEditing());
  return hook;
};

beforeEach(() => {
  vi.clearAllMocks();
  store.saved = null;
  store.ready = true;
  store.loadFailed = false;
  store.save.mockResolvedValue(undefined);
  store.reset.mockResolvedValue(undefined);
  grid.read.mockReturnValue(DEFAULTS);
});

describe('useDashboardController', () => {
  it('has no layout until the store is ready, then resolves the saved slots', () => {
    store.ready = false;
    expect(mount().result.current.layout).toBeNull();

    store.ready = true;
    store.saved = MOVED;
    expect(mount().result.current.layout).toEqual(MOVED);
  });

  it('starts at rest, and Customise snapshots the grid as the Cancel baseline', () => {
    const { result } = mount();
    expect(result.current.editing).toBe(false);
    expect(result.current.dirty).toBe(false);

    act(() => result.current.startEditing());

    expect(result.current.editing).toBe(true);
    expect(grid.read).toHaveBeenCalledTimes(1);
  });

  it('lights up Save only while the grid differs from that baseline', () => {
    const { result } = startEditing();

    act(() => gridOptions.current?.onChange(MOVED));
    expect(result.current.dirty).toBe(true);

    act(() => gridOptions.current?.onChange(DEFAULTS));
    expect(result.current.dirty).toBe(false);
  });

  it('Cancel puts the baseline back on the grid and leaves editing', () => {
    const { result } = startEditing();
    act(() => gridOptions.current?.onChange(MOVED));

    act(() => result.current.cancelEditing());

    expect(grid.apply).toHaveBeenCalledWith(DEFAULTS);
    expect(result.current.editing).toBe(false);
    expect(result.current.dirty).toBe(false);
  });

  it('Save sends what is on the grid and leaves editing once it lands', async () => {
    grid.read.mockReturnValue(MOVED);
    const { result } = startEditing();

    act(() => result.current.saveLayout());

    await waitFor(() => expect(result.current.editing).toBe(false));
    expect(store.save).toHaveBeenCalledWith(MOVED);
    expect(result.current.error).toBeNull();
  });

  it('a failed Save stays in editing and says so', async () => {
    store.save.mockRejectedValue(new Error('offline'));
    const { result } = startEditing();

    act(() => result.current.saveLayout());

    await waitFor(() => expect(result.current.error).toBe(labels.saveFailed));
    expect(result.current.editing).toBe(true);
  });

  it('Reset asks first, and the dialog can be dismissed', () => {
    const { result } = startEditing();

    act(() => result.current.askReset());
    expect(result.current.confirmingReset).toBe(true);

    act(() => result.current.closeReset());
    expect(result.current.confirmingReset).toBe(false);
  });

  it('a confirmed Reset restores every widget to its declared slot', async () => {
    const { result } = startEditing();
    act(() => result.current.askReset());

    act(() => result.current.confirmReset());

    expect(result.current.confirmingReset).toBe(false);
    await waitFor(() => expect(result.current.editing).toBe(false));
    expect(store.reset).toHaveBeenCalledTimes(1);
    expect(grid.apply).toHaveBeenCalledWith(DEFAULTS);
  });

  it('a failed Reset says so and keeps the grid as it was', async () => {
    store.reset.mockRejectedValue(new Error('offline'));
    const { result } = startEditing();

    act(() => result.current.confirmReset());

    await waitFor(() => expect(result.current.error).toBe(labels.resetFailed));
    expect(grid.apply).not.toHaveBeenCalled();
    expect(result.current.editing).toBe(true);
  });

  it('surfaces a failed load until a fresher error replaces it', async () => {
    store.loadFailed = true;
    store.save.mockRejectedValue(new Error('offline'));
    const { result } = mount();
    expect(result.current.error).toBe(labels.loadFailed);

    act(() => result.current.startEditing());
    expect(result.current.error).toBe(labels.loadFailed);

    act(() => result.current.saveLayout());
    await waitFor(() => expect(result.current.error).toBe(labels.saveFailed));
  });
});

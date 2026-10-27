import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

const h = vi.hoisted(() => ({
  notify: vi.fn(),
  mutate: vi.fn(),
  mutationLoading: false,
  queryState: { data: undefined as { telemetryDeleteCount: number } | undefined, loading: false, error: undefined as Error | undefined },
  queryArgs: [] as unknown[],
}));

vi.mock('@duncit/dialogs', () => ({ notify: h.notify, useConfirm: () => vi.fn() }));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useMutation: () => [h.mutate, { loading: h.mutationLoading }],
  useQuery: (...args: unknown[]) => {
    h.queryArgs = args;
    return h.queryState;
  },
}));
// The date pickers are a third-party widget; what is under test is that each
// side of the window is passed through and cleared correctly.
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: (p: {
    label: string;
    value: Date | null;
    disabled?: boolean;
    onChange: (next: Date | null) => void;
  }) => (
    <div>
      <span data-testid={`value-${p.label}`}>{p.value ? p.value.toISOString() : 'none'}</span>
      <button type="button" disabled={p.disabled} onClick={() => p.onChange(new Date('2026-03-04T05:06:07.000Z'))}>
        {`set-${p.label}`}
      </button>
      <button type="button" disabled={p.disabled} onClick={() => p.onChange(null)}>
        {`clear-${p.label}`}
      </button>
    </div>
  ),
}));

import DeleteDateWindow, {
  EMPTY_WINDOW,
  windowIsInverted,
  windowToScope,
} from '../../src/components/telemetry-delete/DeleteDateWindow';
import { scopeFromView, scopeIsEverything } from '../../src/components/telemetry-delete/queries';
import {
  useRunTelemetryDelete,
  useTelemetryDeleteCount,
} from '../../src/components/telemetry-delete/useTelemetryDelete';
import type { TableQuerySnapshot } from '@duncit/table';

beforeEach(() => {
  h.notify.mockReset();
  h.mutate.mockReset();
  h.mutationLoading = false;
  h.queryState = { data: undefined, loading: false, error: undefined };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('window helpers', () => {
  it('flags only a window whose sides cross', () => {
    const a = new Date('2026-01-01T00:00:00Z');
    const b = new Date('2026-02-01T00:00:00Z');
    expect(windowIsInverted({ from: b, to: a })).toBe(true);
    expect(windowIsInverted({ from: a, to: b })).toBe(false);
    expect(windowIsInverted({ from: a, to: a })).toBe(false);
    expect(windowIsInverted({ from: a, to: null })).toBe(false);
    expect(windowIsInverted({ from: null, to: b })).toBe(false);
    expect(windowIsInverted(EMPTY_WINDOW)).toBe(false);
  });

  it('turns a window into ISO bounds with nulls for open sides', () => {
    const a = new Date('2026-01-01T00:00:00.000Z');
    expect(windowToScope({ from: a, to: null })).toEqual({ from: '2026-01-01T00:00:00.000Z', to: null });
    expect(windowToScope({ from: null, to: a })).toEqual({ from: null, to: '2026-01-01T00:00:00.000Z' });
    expect(windowToScope(EMPTY_WINDOW)).toEqual({ from: null, to: null });
  });
});

describe('DeleteDateWindow', () => {
  it('applies an older-than preset as an upper bound at the start of that day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15, 13, 45));
    const onChange = vi.fn();
    renderWithProviders(<DeleteDateWindow value={EMPTY_WINDOW} onChange={onChange} disabled={false} />);
    const presets = screen.getAllByRole('button').filter((b) => /older|days/i.test(b.textContent ?? ''));
    expect(presets.length).toBe(3);
    fireEvent.click(presets[1]);
    const arg = onChange.mock.calls[0][0];
    expect(arg.from).toBeNull();
    expect(arg.to).toEqual(new Date(2026, 4, 16, 0, 0, 0, 0));
  });

  it('clears the window with the no-limit chip', () => {
    const onChange = vi.fn();
    const value = { from: new Date('2026-01-01T00:00:00Z'), to: new Date('2026-02-01T00:00:00Z') };
    renderWithProviders(<DeleteDateWindow value={value} onChange={onChange} disabled={false} />);
    fireEvent.click(screen.getByText('No date limit'));
    expect(onChange).toHaveBeenCalledWith(EMPTY_WINDOW);
  });

  it('changes each side independently and keeps the other', () => {
    const onChange = vi.fn();
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');
    renderWithProviders(<DeleteDateWindow value={{ from, to }} onChange={onChange} disabled={false} />);
    expect(screen.getByTestId('value-From')).toHaveTextContent('2026-01-01T00:00:00.000Z');

    fireEvent.click(screen.getByText('set-From'));
    expect(onChange).toHaveBeenLastCalledWith({ from: new Date('2026-03-04T05:06:07.000Z'), to });
    fireEvent.click(screen.getByText('clear-To'));
    expect(onChange).toHaveBeenLastCalledWith({ from, to: null });
    fireEvent.click(screen.getByText('set-To'));
    expect(onChange).toHaveBeenLastCalledWith({ from, to: new Date('2026-03-04T05:06:07.000Z') });
    fireEvent.click(screen.getByText('clear-From'));
    expect(onChange).toHaveBeenLastCalledWith({ from: null, to });
  });

  it('warns when the window is inverted and not otherwise', () => {
    const later = new Date('2026-03-01T00:00:00Z');
    const earlier = new Date('2026-01-01T00:00:00Z');
    const view = renderWithProviders(
      <DeleteDateWindow value={{ from: later, to: earlier }} onChange={vi.fn()} disabled={false} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    view.unmount();
    renderWithProviders(<DeleteDateWindow value={EMPTY_WINDOW} onChange={vi.fn()} disabled={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables every control while a delete is running', () => {
    renderWithProviders(<DeleteDateWindow value={EMPTY_WINDOW} onChange={vi.fn()} disabled />);
    expect(screen.getByText('set-From')).toBeDisabled();
    expect(screen.getByText('set-To')).toBeDisabled();
    expect(screen.getByText('No date limit').closest('.MuiChip-root')).toHaveClass('Mui-disabled');
  });
});

const snapshot = (over: Partial<TableQuerySnapshot['query']> = {}): TableQuerySnapshot => ({
  total: 40,
  query: {
    search: '',
    page: 3,
    pageSize: 25,
    sortBy: 'created_at',
    sortDir: 'desc',
    filters: [],
    ...over,
  } as TableQuerySnapshot['query'],
});

describe('scopeFromView', () => {
  it('keeps search and filters but drops paging and sorting', () => {
    const scope = scopeFromView(
      snapshot({ search: 'timeout', filters: [{ field: 'environment', op: 'eq', value: 'production' }] }),
      { from: '2026-01-01T00:00:00.000Z', to: null },
    );
    expect(scope).toEqual({
      query: {
        search: 'timeout',
        page: 1,
        page_size: 1,
        sort_by: null,
        sort_dir: 'desc',
        filters: [{ field: 'environment', op: 'eq', value: 'production', values: null }],
      },
      from: '2026-01-01T00:00:00.000Z',
      to: null,
    });
  });

  it('defaults the window to open on both sides', () => {
    const scope = scopeFromView(snapshot());
    expect(scope.from).toBeNull();
    expect(scope.to).toBeNull();
    expect(scope.query?.search).toBeNull();
  });
});

describe('scopeIsEverything', () => {
  it('is false when ids, a window or a query narrows it', () => {
    expect(scopeIsEverything({ ids: ['a'] })).toBe(false);
    expect(scopeIsEverything({ from: '2026-01-01T00:00:00.000Z' })).toBe(false);
    expect(scopeIsEverything({ to: '2026-01-01T00:00:00.000Z' })).toBe(false);
    expect(scopeIsEverything(scopeFromView(snapshot({ search: 'x' })))).toBe(false);
    expect(
      scopeIsEverything(scopeFromView(snapshot({ filters: [{ field: 'level', op: 'eq', value: 'error' }] }))),
    ).toBe(false);
  });

  it('is true for an empty scope or a view with no search or filters', () => {
    expect(scopeIsEverything({})).toBe(true);
    expect(scopeIsEverything(scopeFromView(snapshot()))).toBe(true);
    const noFilters = { query: { search: null, page: 1, page_size: 1, sort_by: null } } as never;
    expect(scopeIsEverything(noFilters)).toBe(true);
  });
});

describe('useTelemetryDeleteCount', () => {
  it('asks the server for the count of a scope, uncached', () => {
    h.queryState = { data: { telemetryDeleteCount: 42 }, loading: false, error: undefined };
    const { result } = renderHook(() => useTelemetryDeleteCount('LOGS', { ids: ['a'] }, false));
    expect(result.current.count).toBe(42);
    expect(h.queryArgs[1]).toMatchObject({
      variables: { target: 'LOGS', scope: { ids: ['a'] } },
      skip: false,
      fetchPolicy: 'network-only',
    });
  });

  it('reports zero before an answer and passes skip and errors through', () => {
    const failure = new Error('count failed');
    h.queryState = { data: undefined, loading: true, error: failure };
    const { result } = renderHook(() => useTelemetryDeleteCount('BUGS', {}, true));
    expect(result.current).toEqual({ count: 0, loading: true, error: failure });
    expect(h.queryArgs[1]).toMatchObject({ skip: true });
  });
});

describe('useRunTelemetryDelete', () => {
  it('reports what the server says was removed and refreshes the table', async () => {
    h.mutate.mockResolvedValue({ data: { deleteTelemetryRecords: 7 } });
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useRunTelemetryDelete('LOGS', onDeleted));
    await act(() => result.current.run({ ids: ['a', 'b'] }));
    expect(h.mutate).toHaveBeenCalledWith({ variables: { target: 'LOGS', scope: { ids: ['a', 'b'] } } });
    expect(h.notify).toHaveBeenCalledWith(expect.stringContaining('7'), 'success');
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('claims zero when the server returns no count', async () => {
    h.mutate.mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useRunTelemetryDelete('BUGS', vi.fn()));
    await act(() => result.current.run({}));
    expect(h.notify).toHaveBeenCalledWith(expect.stringContaining('0'), 'success');
  });

  it('shows the API error and does not refresh when the delete fails', async () => {
    h.mutate.mockRejectedValue(new Error('not allowed'));
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useRunTelemetryDelete('LOGS', onDeleted));
    await act(() => result.current.run({}));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('not allowed', 'error'));
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('exposes the mutation loading state as running', () => {
    h.mutationLoading = true;
    const { result } = renderHook(() => useRunTelemetryDelete('LOGS', vi.fn()));
    expect(result.current.running).toBe(true);
  });
});

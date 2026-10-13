import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TableQuerySnapshot } from '@duncit/table';
import type { DeleteWindow } from '../../src/components/telemetry-delete/DeleteDateWindow';

const m = vi.hoisted(() => ({
  confirm: vi.fn(),
  run: vi.fn(),
  running: false,
  onDeletedCb: null as null | (() => void),
  count: { count: 0, loading: false, error: undefined as Error | undefined },
  countArgs: [] as unknown[][],
}));

vi.mock('@duncit/dialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/dialogs')>();
  return { ...actual, useConfirm: () => m.confirm };
});
vi.mock('../../src/components/telemetry-delete/useTelemetryDelete', () => ({
  useRunTelemetryDelete: (_target: string, onDeleted: () => void) => {
    m.onDeletedCb = onDeleted;
    return { run: m.run, running: m.running };
  },
  useTelemetryDeleteCount: (...args: unknown[]) => {
    m.countArgs.push(args);
    return m.count;
  },
}));
vi.mock('../../src/components/telemetry-delete/DeleteDateWindow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/components/telemetry-delete/DeleteDateWindow')>();
  return {
    ...actual,
    default: (p: { value: DeleteWindow; onChange: (w: DeleteWindow) => void; disabled: boolean }) => (
      <div>
        <button
          type="button"
          disabled={p.disabled}
          onClick={() => p.onChange({ from: null, to: new Date('2026-01-01T00:00:00.000Z') })}
        >
          set-to
        </button>
        <button
          type="button"
          onClick={() =>
            p.onChange({ from: new Date('2026-02-01T00:00:00.000Z'), to: new Date('2026-01-01T00:00:00.000Z') })
          }
        >
          set-inverted
        </button>
      </div>
    ),
  };
});

import TelemetryBulkBar from '../../src/components/telemetry-delete/TelemetryBulkBar';
import TelemetryDeleteDialog from '../../src/components/telemetry-delete/TelemetryDeleteDialog';

const view = (over: Partial<TableQuerySnapshot['query']> = {}, total = 50): TableQuerySnapshot =>
  ({
    query: { search: '', page: 3, pageSize: 25, sortBy: 'last_seen_at', sortDir: 'desc', filters: [], ...over },
    total,
  }) as unknown as TableQuerySnapshot;

beforeEach(() => {
  vi.clearAllMocks();
  m.running = false;
  m.count = { count: 0, loading: false, error: undefined };
  m.countArgs = [];
});

describe('TelemetryBulkBar', () => {
  const bar = (over: Record<string, unknown> = {}) => {
    const props = {
      target: 'BUGS' as const,
      selectedIds: ['a', 'b'],
      view: view(),
      onClear: vi.fn(),
      onDeleted: vi.fn(),
      ...over,
    };
    const utils = render(<TelemetryBulkBar {...props} />);
    return { props, ...utils };
  };
  const binButton = () => screen.getByTestId('DeleteOutlinedIcon').closest('button') as HTMLButtonElement;

  it('renders nothing before the table has answered or when nothing is ticked', () => {
    const noView = bar({ view: null });
    expect(noView.container).toBeEmptyDOMElement();
    noView.unmount();
    const empty = bar({ selectedIds: [] });
    expect(empty.container).toBeEmptyDOMElement();
  });

  it('deletes only the ticked ids after the operator confirms', async () => {
    m.confirm.mockResolvedValue(true);
    bar();
    fireEvent.click(binButton());
    await vi.waitFor(() => expect(m.run).toHaveBeenCalledWith({ ids: ['a', 'b'] }));
    expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
  });

  it('does not delete when the confirmation is declined', async () => {
    m.confirm.mockResolvedValue(false);
    bar();
    fireEvent.click(binButton());
    await vi.waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(m.run).not.toHaveBeenCalled();
  });

  it('escalates to every matching row and deletes by query without paging or sort', async () => {
    m.confirm.mockResolvedValue(true);
    bar({ view: view({ search: 'boom' }, 120) });
    fireEvent.click(screen.getByRole('button', { name: /120/ }));
    // the escalation link disappears once "all matching" is active
    expect(screen.queryByRole('button', { name: /120/ })).toBeNull();
    fireEvent.click(binButton());
    await vi.waitFor(() => expect(m.run).toHaveBeenCalledTimes(1));
    const scope = m.run.mock.calls[0][0];
    expect(scope.ids).toBeUndefined();
    expect(scope.query).toMatchObject({ search: 'boom', page: 1, page_size: 1, sort_by: null });
  });

  it('offers no escalation when the ticked page already is the whole set', () => {
    bar({ selectedIds: ['a', 'b'], view: view({}, 2) });
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('keeps the escalation across paging but drops it when a filter changes the set', () => {
    const { rerender, props } = bar({ view: view({ search: 'a' }, 99) });
    fireEvent.click(screen.getByRole('button', { name: /99/ }));
    rerender(<TelemetryBulkBar {...props} selectedIds={[]} view={view({ search: 'a', page: 4 }, 99)} />);
    expect(screen.getByTestId('DeleteOutlinedIcon')).toBeInTheDocument();
    rerender(<TelemetryBulkBar {...props} selectedIds={[]} view={view({ search: 'b' }, 7)} />);
    expect(screen.queryByTestId('DeleteOutlinedIcon')).toBeNull();
  });

  it('clearing resets the escalation and tells the table to drop its ticks', () => {
    const { props } = bar({ view: view({}, 80) });
    fireEvent.click(screen.getByRole('button', { name: /80/ }));
    fireEvent.click(screen.getAllByRole('button').find((b) => b !== binButton()) as HTMLElement);
    expect(props.onClear).toHaveBeenCalled();
  });

  it('resets the escalation and reports back after a successful delete', () => {
    const { props } = bar({ view: view({}, 80) });
    fireEvent.click(screen.getByRole('button', { name: /80/ }));
    m.onDeletedCb?.();
    expect(props.onDeleted).toHaveBeenCalled();
  });

  it('locks the actions while a delete is running', () => {
    m.running = true;
    bar();
    expect(binButton()).toBeDisabled();
  });
});

describe('TelemetryDeleteDialog', () => {
  const dialog = (over: Record<string, unknown> = {}) => {
    const props = {
      open: true,
      onClose: vi.fn(),
      target: 'LOGS' as const,
      view: view({ search: 'x' }),
      canDeleteEverything: true,
      onDeleted: vi.fn(),
      ...over,
    };
    render(<TelemetryDeleteDialog {...props} />);
    return props;
  };
  const deleteButton = () => screen.getByTestId('DeleteSweepIcon').closest('button') as HTMLButtonElement;
  const cancelButton = () =>
    screen.getAllByRole('button').find((b) => /cancel/i.test(b.textContent ?? '')) as HTMLButtonElement;

  it('runs the filtered delete once the server count is in and closes on success', () => {
    m.count = { count: 12, loading: false, error: undefined };
    const props = dialog();
    expect(deleteButton()).toBeEnabled();
    fireEvent.click(deleteButton());
    expect(m.run).toHaveBeenCalledTimes(1);
    expect(m.run.mock.calls[0][0].query).toMatchObject({ search: 'x' });
    m.onDeletedCb?.();
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onDeleted).toHaveBeenCalled();
  });

  it('skips the count request while closed', () => {
    m.count = { count: 0, loading: true, error: undefined };
    dialog({ open: false });
    expect(m.countArgs[0][2]).toBe(true);
  });

  it('keeps delete disabled while the count is loading', () => {
    m.count = { count: 0, loading: true, error: undefined };
    dialog();
    expect(deleteButton()).toBeDisabled();
  });

  it('disables delete when the count request failed', () => {
    m.count = { count: 5, loading: false, error: new Error('boom') };
    dialog();
    expect(deleteButton()).toBeDisabled();
  });

  it('disables delete when nothing matches', () => {
    m.count = { count: 0, loading: false, error: undefined };
    dialog();
    expect(deleteButton()).toBeDisabled();
  });

  it('warns on an unfiltered delete and blocks it for accounts without the role', () => {
    m.count = { count: 500, loading: false, error: undefined };
    dialog({ view: view({ search: '' }), canDeleteEverything: false });
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(deleteButton()).toBeDisabled();
  });

  it('lets a permitted account run an unfiltered delete behind the red warning', () => {
    m.count = { count: 500, loading: false, error: undefined };
    dialog({ view: view({ search: '' }), canDeleteEverything: true });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(deleteButton()).toBeEnabled();
  });

  it('narrows to the chosen window and refuses a crossed one', () => {
    m.count = { count: 3, loading: false, error: undefined };
    dialog({ view: view({ search: '' }) });
    fireEvent.click(screen.getByText('set-to'));
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(deleteButton()).toBeEnabled();
    fireEvent.click(deleteButton());
    expect(m.run.mock.calls[0][0].to).toBe('2026-01-01T00:00:00.000Z');
    fireEvent.click(screen.getByText('set-inverted'));
    expect(deleteButton()).toBeDisabled();
  });

  it('cancels through the Cancel button', () => {
    m.count = { count: 3, loading: false, error: undefined };
    const props = dialog();
    fireEvent.click(cancelButton());
    expect(props.onClose).toHaveBeenCalled();
  });

  it('locks Cancel and the window picker while the delete is running', () => {
    m.running = true;
    m.count = { count: 3, loading: false, error: undefined };
    dialog();
    expect(cancelButton()).toBeDisabled();
    expect(screen.getByText('set-to')).toBeDisabled();
  });
});

import '../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Button from '@mui/material/Button';
import type { TablePage, TableQueryState } from '@duncit/table';
import PodsTable, { type PodRowBase } from './PodsTable';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const pods: PodRowBase[] = [
  {
    id: 'pod-1',
    pod_title: 'Rooftop Mixer',
    club_id: 'club-1',
    venue_id: 'venue-1',
    pod_mode: 'PHYSICAL',
    pod_date_time: '2026-07-04T10:30:00',
    pod_amount: 899,
    pod_attendees: ['u1', 'u2', 'u3'],
    is_active: true,
    completed_at: null,
  },
  {
    id: 'pod-2',
    pod_title: 'Founder AMA',
    club_id: null,
    venue_id: null,
    pod_mode: 'VIRTUAL',
    pod_date_time: '2026-06-20T18:00:00',
    pod_amount: 0,
    pod_attendees: ['u9'],
    is_active: true,
    completed_at: '2026-06-21T09:00:00',
  },
  {
    id: 'pod-3',
    pod_title: 'Unscheduled Jam',
    club_id: 'club-1',
    venue_id: 'venue-2',
    pod_mode: 'PHYSICAL',
    pod_date_time: null,
    pod_amount: null,
    pod_attendees: null,
    is_active: false,
    completed_at: null,
  },
];

const venueName = (id?: string | null) => (id === 'venue-1' ? 'Vista Rooftop' : 'Basement Studio');
const clubName = () => 'Sunrise Club';

const makeFetch = (rows: PodRowBase[] = pods) =>
  vi.fn(async (_query: TableQueryState): Promise<TablePage<PodRowBase>> => ({
    rows,
    total: rows.length,
  }));

/** The grid row a given cell belongs to, so per-pod assertions stay scoped. */
const podRow = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

type Extra = Partial<Parameters<typeof PodsTable<PodRowBase>>[0]>;

const renderPodsTable = (fetchRows: ReturnType<typeof makeFetch>, extra: Extra = {}) =>
  render(
    <PodsTable<PodRowBase>
      tableId={`pods-${Math.random().toString(36).slice(2)}`}
      fetchRows={fetchRows}
      venueName={venueName}
      emptyText="No pods yet."
      {...extra}
    />,
  );

describe('PodsTable', () => {
  it('asks the server for the newest pods first', async () => {
    const fetchRows = makeFetch();
    renderPodsTable(fetchRows);

    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1));
    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'pod_date_time', sortDir: 'desc', page: 1 }),
    );
  });

  it('shows the place, date and attendee count of every pod', async () => {
    renderPodsTable(makeFetch());

    const physical = podRow(await screen.findByText('Rooftop Mixer'));
    expect(within(physical).getByText('Vista Rooftop')).toBeTruthy();
    expect(within(physical).getByText('04 Jul 2026, 10:30 AM')).toBeTruthy();
    expect(within(physical).getByText('3')).toBeTruthy();

    // A virtual pod never shows a venue name.
    const virtual = podRow(screen.getByText('Founder AMA'));
    expect(within(virtual).getByText('Virtual pod')).toBeTruthy();
    expect(within(virtual).queryByText('Basement Studio')).toBeNull();

    // An unscheduled pod says so instead of rendering an invalid date, and a pod
    // with no attendee list counts as zero rather than blank.
    const unscheduled = podRow(screen.getByText('Unscheduled Jam'));
    expect(within(unscheduled).getByText('Not scheduled')).toBeTruthy();
    expect(within(unscheduled).getByText('Basement Studio')).toBeTruthy();
    expect(within(unscheduled).getByText('0')).toBeTruthy();
  });

  it('labels a completed pod Completed, a live one Active and an inactive one Draft', async () => {
    renderPodsTable(makeFetch());

    expect(await screen.findByText('Active')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('captions the pod title with its club only when a clubName resolver is given', async () => {
    const { unmount } = renderPodsTable(makeFetch(), { clubName });
    expect(await screen.findAllByText('Sunrise Club')).toHaveLength(2);
    unmount();

    renderPodsTable(makeFetch());
    expect(await screen.findByText('Rooftop Mixer')).toBeTruthy();
    expect(screen.queryByText('Sunrise Club')).toBeNull();
  });

  it('reveals the amount and completion date from the columns menu', async () => {
    renderPodsTable(makeFetch());
    await screen.findByText('Rooftop Mixer');
    expect(screen.queryByText('899')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Amount' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Completed' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(await screen.findByText('899')).toBeTruthy();
    expect(screen.getByText('21 Jun 2026')).toBeTruthy();
    // Pods that were never completed show the em dash placeholder.
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('adds an Actions column that receives the clicked pod', async () => {
    const onManage = vi.fn();
    renderPodsTable(makeFetch(), {
      renderActions: (pod: PodRowBase) => (
        <Button size="small" onClick={() => onManage(pod.id)}>
          Manage
        </Button>
      ),
    });

    const buttons = await screen.findAllByRole('button', { name: 'Manage' });
    expect(buttons).toHaveLength(3);
    expect(screen.getByText('Actions')).toBeTruthy();

    fireEvent.click(buttons[1]);
    expect(onManage).toHaveBeenCalledWith('pod-2');
  });

  it('omits the Actions column when the caller renders none', async () => {
    renderPodsTable(makeFetch());
    await screen.findByText('Rooftop Mixer');
    expect(screen.queryByText('Actions')).toBeNull();
  });

  it('renders the caller toolbar actions and the empty message with no pods', async () => {
    renderPodsTable(makeFetch([]), {
      toolbarActions: <Button>Create pod</Button>,
    });

    expect(await screen.findByText('No pods yet.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create pod' })).toBeTruthy();
  });

  it('exposes a refetch handle to the parent', async () => {
    const fetchRows = makeFetch();
    const refetchRef: { current: (() => void) | null } = { current: null };
    renderPodsTable(fetchRows, { refetchRef });

    await screen.findByText('Rooftop Mixer');
    expect(refetchRef.current).not.toBeNull();
    refetchRef.current?.();
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));
  });
});

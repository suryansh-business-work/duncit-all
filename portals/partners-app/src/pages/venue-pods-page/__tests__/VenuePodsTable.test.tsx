import '../../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { TablePage, TableQueryState } from '@duncit/table';
import VenuePodsTable from '../VenuePodsTable';
import type { VenuePodRow } from '../queries';
import { makeVenuePodRow } from './fixtures';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const rows: VenuePodRow[] = [
  makeVenuePodRow({ id: 'p1', pod_title: 'Sunrise Yoga', bucket: 'UPCOMING' }),
  makeVenuePodRow({ id: 'p2', pod_title: 'Live Jam', bucket: 'ONGOING' }),
  makeVenuePodRow({
    id: 'p3',
    pod_title: 'Book Club',
    bucket: 'COMPLETED',
    completed_at: '2026-07-02T00:00:00.000Z',
  }),
  makeVenuePodRow({
    id: 'p4',
    pod_title: 'Called Off',
    bucket: 'CANCELLED',
    cancelled_at: '2026-07-03T00:00:00.000Z',
  }),
];

const makeFetch = (data: VenuePodRow[] = rows) =>
  vi.fn(
    async (_query: TableQueryState): Promise<TablePage<VenuePodRow>> => ({
      rows: data,
      total: data.length,
    }),
  );

/** The grid row a given cell belongs to, so per-pod assertions stay scoped. */
const podRow = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

const cancelButtonFor = (title: string): HTMLButtonElement =>
  within(podRow(screen.getByText(title))).getByRole('button', {
    name: 'Cancel pod',
  }) as HTMLButtonElement;

const renderTable = (data: VenuePodRow[] = rows) => {
  const onCancel = vi.fn();
  const onRowClick = vi.fn();
  render(
    <VenuePodsTable
      fetchRows={makeFetch(data)}
      externalFilters={[{ field: 'tab', op: 'eq', value: 'ALL' }]}
      refetchRef={{ current: null }}
      onRowClick={onRowClick}
      onCancel={onCancel}
    />,
  );
  return { onCancel, onRowClick };
};

describe('VenuePodsTable actions column', () => {
  it('offers Cancel pod on an upcoming pod only', async () => {
    renderTable();

    await screen.findByText('Sunrise Yoga');
    expect(screen.getByText('Actions')).toBeTruthy();

    expect(cancelButtonFor('Sunrise Yoga').disabled).toBe(false);
    expect(cancelButtonFor('Live Jam').disabled).toBe(true);
    expect(cancelButtonFor('Book Club').disabled).toBe(true);
    expect(cancelButtonFor('Called Off').disabled).toBe(true);
  });

  it('hands the clicked pod to the parent without opening the detail dialog', async () => {
    const { onCancel, onRowClick } = renderTable();

    await screen.findByText('Sunrise Yoga');
    fireEvent.click(cancelButtonFor('Sunrise Yoga'));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('still opens the detail dialog when the row itself is clicked', async () => {
    const { onCancel, onRowClick } = renderTable();

    fireEvent.click(await screen.findByText('Sunrise Yoga'));

    await waitFor(() => expect(onRowClick).toHaveBeenCalledTimes(1));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('explains why the action is unavailable through the button tooltip', async () => {
    renderTable();

    await screen.findByText('Live Jam');
    fireEvent.mouseOver(cancelButtonFor('Live Jam').parentElement as HTMLElement);

    expect(
      await screen.findByText('This pod has already started, so it can no longer be cancelled.'),
    ).toBeTruthy();
  });

  it('disables the action on an upcoming pod that is already cancelled', async () => {
    renderTable([
      makeVenuePodRow({
        id: 'p9',
        pod_title: 'Ghost Pod',
        bucket: 'UPCOMING',
        cancelled_at: '2026-07-05T00:00:00.000Z',
      }),
    ]);

    await screen.findByText('Ghost Pod');
    expect(cancelButtonFor('Ghost Pod').disabled).toBe(true);
  });
});

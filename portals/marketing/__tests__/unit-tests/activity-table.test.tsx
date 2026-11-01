import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import { makeRunDetail, makeRunRow, makeRunState, marketingRunMock, retryMarketingRunMock } from '../mocks';

// The stand-in grid, with the props a page pins the view through kept for assertion.
/** The stand-in grid's props, plus the one the real grid pins a page's view through. */
type TableProps = ComponentProps<typeof import('./table-mock').DuncitTable> & { externalFilters?: ReadonlyArray<unknown> };
const tableSpy = vi.hoisted(() => ({ props: null as TableProps | null }));
vi.mock('@duncit/table', async () => {
  const mock = await import('./table-mock');
  const DuncitTable = (props: TableProps) => {
    tableSpy.props = props;
    return <mock.DuncitTable {...props} />;
  };
  return { ...mock, DuncitTable };
});
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${d instanceof Date ? d.toISOString() : d}` }),
}));
const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

import RunsTable from '../../src/pages/activity-page/RunsTable';
import RunsBoard from '../../src/pages/activity-page/RunsBoard';

afterEach(() => {
  __setTableRows([]);
  tableSpy.props = null;
  vi.clearAllMocks();
});

describe('RunsTable', () => {
  it('lists the fetched runs under the default grid id, sorted newest first, and opens the clicked row', async () => {
    const row = makeRunRow();
    __setTableRows([row]);
    const onOpen = vi.fn();
    const refetchRef = { current: null };
    renderWithProviders(<RunsTable emptyText="Nothing" onOpen={onOpen} refetchRef={refetchRef} />);
    expect(screen.getByTestId('duncit-table')).toHaveAttribute('data-table-id', 'marketing-runs');
    const tableRow = await screen.findByTestId('table-row');
    expect(within(tableRow).getByTestId('cell-name')).toHaveTextContent('Publish: Diwali reel');
    fireEvent.click(within(tableRow).getByRole('button', { name: 'rowclick-0' }));
    expect(onOpen).toHaveBeenCalledWith(row);
    expect(tableSpy.props).toMatchObject({
      ariaLabel: 'Runs',
      searchPlaceholder: 'Search runs by name, error or who ran them',
      defaultSort: { field: 'created_at', dir: 'desc' },
      externalFilters: undefined,
    });
    // The grid hands back its reload, which the drawer's actions use.
    expect(refetchRef.current).toEqual(expect.any(Function));
  });

  it('pins the page’s filters into the grid under the page’s own id and says what empty means', async () => {
    const pins = [{ field: 'status', op: 'eq' as const, value: 'FAILED' }];
    renderWithProviders(
      <RunsTable tableId="marketing-tasks" extraFilters={pins} emptyText="Nothing waiting" onOpen={vi.fn()} refetchRef={{ current: null }} />,
    );
    expect(screen.getByTestId('duncit-table')).toHaveAttribute('data-table-id', 'marketing-tasks');
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('Nothing waiting');
    expect(tableSpy.props?.externalFilters).toBe(pins);
  });
});

describe('RunsBoard', () => {
  it('shows the legend, opens a row in the drawer and closes it again', async () => {
    const row = makeRunRow();
    __setTableRows([row]);
    renderWithProviders(<RunsBoard emptyText="Nothing" />, { mocks: [marketingRunMock(makeRunDetail())] });
    expect(screen.getByTestId('runs-legend')).toBeInTheDocument();
    expect(screen.getByTestId('runs-board')).toHaveAttribute('data-tour', 'runs-table');
    expect(screen.queryByTestId('marketing-run-drawer')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    const drawer = await screen.findByTestId('marketing-run-drawer');
    expect(await within(drawer).findByRole('heading', { level: 2, name: 'Publish: Diwali reel' })).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('marketing-run-drawer')).not.toBeInTheDocument(), { timeout: 3000 });
  });

  it('reloads the grid once an action in the drawer changes the run', async () => {
    const failed = makeRunDetail({ id: 'run9', status: 'FAILED', can_retry: true, error: 'Token expired' });
    __setTableRows([makeRunRow({ id: 'run9', status: 'FAILED' })]);
    renderWithProviders(<RunsBoard tableId="marketing-approvals" extraFilters={[]} emptyText="Nothing" />, {
      mocks: [marketingRunMock(failed, 2), retryMarketingRunMock(makeRunState({ id: 'run9', status: 'PENDING' }))],
    });
    expect(screen.getByTestId('duncit-table')).toHaveAttribute('data-table-id', 'marketing-approvals');
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    const retry = await screen.findByRole('button', { name: 'Retry' });

    // The server now has two rows; the grid only learns that when the drawer asks it to reload.
    __setTableRows([makeRunRow({ id: 'run9', status: 'PENDING' }), makeRunRow({ id: 'run10' })]);
    expect(screen.getAllByTestId('table-row')).toHaveLength(1);
    fireEvent.click(retry);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('The run is queued to try again.', 'success'));
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
  });
});

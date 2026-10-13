import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import BlockedAccountsTab from '../../src/pages/ugc-monitoring/blocked/BlockedAccountsTab';
import type { UserBlockRow } from '../../src/graphql/blocks';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * Legal's read-only record of who blocked whom. A lifted block keeps its row,
 * marked Unblocked, so the history survives it.
 */
const ACTIVE: UserBlockRow = {
  id: 'blk-1',
  blocker_id: 'u-1',
  blocker_name: 'Asha Rao',
  blocked_id: 'u-2',
  blocked_name: 'Rahul Mehta',
  active: true,
  blocked_at: '2026-03-04T09:30:00.000Z',
  unblocked_at: null,
};
const LIFTED: UserBlockRow = {
  ...ACTIVE,
  id: 'blk-2',
  blocker_name: 'Meera Nair',
  blocked_name: 'Kabir Singh',
  active: false,
  unblocked_at: '2026-03-10T12:00:00.000Z',
};

describe('BlockedAccountsTab', () => {
  it('says so when nobody has blocked anyone', async () => {
    __setTableRows([]);
    renderWithProviders(<BlockedAccountsTab />);
    expect(await screen.findByText('Nobody has blocked anyone yet.')).toBeInTheDocument();
  });

  it('lists who blocked whom and marks a lifted block as Unblocked', async () => {
    __setTableRows([ACTIVE, LIFTED]);
    renderWithProviders(<BlockedAccountsTab />);

    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    const [active, lifted] = screen.getAllByTestId('table-row');

    expect(within(active).getByText('Asha Rao')).toBeInTheDocument();
    expect(within(active).getByText('Rahul Mehta')).toBeInTheDocument();
    expect(within(active).getAllByText('Blocked').length).toBeGreaterThan(0);
    expect(within(active).queryByText('Unblocked')).not.toBeInTheDocument();

    expect(within(lifted).getByText('Meera Nair')).toBeInTheDocument();
    expect(within(lifted).getByText('Kabir Singh')).toBeInTheDocument();
    expect(within(lifted).getAllByText('Unblocked').length).toBeGreaterThan(0);
  });

  it('shows the column headings Legal reads the record by', async () => {
    __setTableRows([ACTIVE]);
    renderWithProviders(<BlockedAccountsTab />);
    expect(await screen.findByTestId('col-blocker_name')).toHaveTextContent('Blocked by');
    expect(screen.getByTestId('col-blocked_name')).toHaveTextContent('Blocked account');
    expect(screen.getByTestId('col-blocked_at')).toHaveTextContent('Blocked on');
    expect(screen.getByTestId('col-unblocked_at')).toHaveTextContent('Unblocked on');
  });
});

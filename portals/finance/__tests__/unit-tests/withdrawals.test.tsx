/**
 * Finance > Withdrawal Payments, level 1: the pods money has been withdrawn
 * against. The Mark Paid / Reject work moved one level down, onto the pod's own
 * page (see withdrawal-detail.test.tsx) — this list only has to say which pods
 * are waiting on a payment and who asked.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import WithdrawalsPage from '../../src/pages/finance/withdrawals-page';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import { makePodWithdrawalGroup } from '../mocks/withdrawals.mock';

beforeEach(() => {
  resetTableControls();
});

const mount = () =>
  renderWithProviders(<WithdrawalsPage />, {
    path: '/withdrawals',
    entry: '/withdrawals',
    extra: <Route path="/withdrawals/:podId" element={<div data-testid="pod-probe">pod</div>} />,
  });

describe('WithdrawalsPage', () => {
  it('lists each pod with who asked and whether every request is paid', async () => {
    tableControls.rowsByKey = {
      podWithdrawalGroupsTable: [
        makePodWithdrawalGroup(),
        makePodWithdrawalGroup({
          pod_id: 'DUN-POD-5102',
          // A credit whose release no longer resolved was stamped without a
          // title, and a leg whose kind maps to no partner names no role.
          pod_title: '',
          requested_from: [],
          status: 'APPROVED',
        }),
      ],
    };
    mount();

    expect(await screen.findByRole('heading', { name: 'Withdrawal Payments' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    const [pending, settled] = screen.getAllByTestId('table-row');

    expect(within(pending).getByText('Sunday Badminton')).toBeInTheDocument();
    const roles = within(pending).getByTestId('cell-requested_from');
    expect(within(roles).getByText('Host')).toBeInTheDocument();
    expect(within(roles).getByText('Venue Owner')).toBeInTheDocument();
    expect(within(pending).getByTestId('cell-status')).toHaveTextContent('Pending');

    expect(within(settled).getByTestId('cell-pod_title')).toHaveTextContent('—');
    expect(within(settled).getByTestId('cell-requested_from')).toHaveTextContent('—');
    expect(within(settled).getByTestId('cell-status')).toHaveTextContent('Approved');
  });

  it('opens a pod on its own page', async () => {
    tableControls.rowsByKey = { podWithdrawalGroupsTable: [makePodWithdrawalGroup()] };
    mount();
    fireEvent.click(await screen.findByTestId('row-open'));
    expect(screen.getByTestId('pod-probe')).toBeInTheDocument();
  });

  it('says why the list is empty, naming the role it is filtered to', async () => {
    mount();
    expect(
      await screen.findByText('No withdrawals have been requested against any pod yet.'),
    ).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Role' }));
    const options = within(screen.getByRole('listbox'));
    expect(options.getByRole('option', { name: 'All roles' })).toBeInTheDocument();
    expect(options.getByRole('option', { name: 'E-Commerce Brand' })).toBeInTheDocument();
    fireEvent.click(options.getByRole('option', { name: 'Club Admin' }));

    expect(
      await screen.findByText('No pod has a withdrawal request from a Club Admin yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('Club Admin');
  });
});

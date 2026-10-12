import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import type { E2eFlow, E2eFlowRow, E2eSubFlow } from '../../src/pages/e2e/flows/queries';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import E2eFlowsPage from '../../src/pages/e2e/flows';
import E2eFlowDetailPage from '../../src/pages/e2e/flows/detail';

const flowRow = (over: Partial<E2eFlowRow> = {}): E2eFlowRow => ({
  id: 'fl1',
  name: 'User Authentication',
  description: 'Sign up, login and logout',
  sub_flow_count: 2,
  looks_good_count: 1,
  created_by: 'ops@example.test',
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-02T10:00:00.000Z',
  ...over,
});

const subFlow = (over: Partial<E2eSubFlow> = {}): E2eSubFlow => ({
  id: 'sf1',
  name: 'User Login',
  description: 'Existing user signs in',
  steps: [{ action: 'Enter email and password', expected: 'Lands on home' }],
  review_status: 'NOT_REVIEWED',
  reviewed_by: '',
  reviewed_at: null,
  ...over,
});

const mountList = () =>
  renderWithProviders(<></>, {
    routes: (
      <>
        <Route path="/" element={<E2eFlowsPage />} />
        <Route path="/e2e/flows/:flowId" element={<p>flow detail page</p>} />
      </>
    ),
  });

const mountDetail = () =>
  renderWithProviders(<></>, {
    initialEntries: ['/e2e/flows/fl1'],
    routes: <Route path="/e2e/flows/:flowId" element={<E2eFlowDetailPage />} />,
  });

beforeEach(() => {
  resetOps();
  ops.tableRows = [flowRow()];
});

describe('E2E flows list', () => {
  it('shows each flow with its sub-flow and approval counts, and opens one', async () => {
    mountList();
    const row = (await screen.findByText('User Authentication')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('1 / 2')).toBeInTheDocument();
    fireEvent.click(row);
    expect(await screen.findByText('flow detail page')).toBeInTheDocument();
  });

  it('creates a flow and rejects a one-character name', async () => {
    mountList();
    await screen.findByText('User Authentication');
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'x' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter between 2 and 120 characters.')).toBeInTheDocument();
    expect(mutation('CreateE2eFlow')).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Checkout' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mutation('CreateE2eFlow')).toHaveBeenCalledWith({ variables: { input: { name: 'Checkout', description: '' } } }),
    );
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Flow saved.'));
  });

  it('edits a flow in place and reports a failed save', async () => {
    ops.mut.UpdateE2eFlow = vi.fn().mockRejectedValue(new Error('name taken'));
    mountList();
    const row = (await screen.findByText('User Authentication')).closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Edit User Authentication' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('User Authentication');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('name taken'));
    expect(mutation('UpdateE2eFlow').mock.calls[0][0].variables.id).toBe('fl1');
  });

  it('deletes only after confirmation', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mountList();
    const row = (await screen.findByText('User Authentication')).closest('[role="row"]') as HTMLElement;
    const del = within(row).getByRole('button', { name: 'Delete User Authentication' });
    fireEvent.click(del);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteE2eFlow')).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(mutation('DeleteE2eFlow')).toHaveBeenCalledWith({ variables: { id: 'fl1' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Flow deleted.');
  });

  it('reports a failed delete', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteE2eFlow = vi.fn().mockRejectedValue(new Error('flow in use'));
    mountList();
    const row = (await screen.findByText('User Authentication')).closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Delete User Authentication' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('flow in use'));
  });
});

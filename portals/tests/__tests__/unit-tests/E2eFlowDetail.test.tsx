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
  specs: [],
  run_stats: null,
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

describe('E2E flow detail', () => {
  const seed = (flow: Partial<E2eFlow> = {}) => {
    ops.q = {
      E2eFlow: {
        data: { e2eFlow: { ...flowRow(), sub_flows: [subFlow(), subFlow({ id: 'sf2', name: 'User Logout', review_status: 'LOOKS_GOOD', reviewed_by: 'qa', reviewed_at: '2026-01-02T00:00:00.000Z' })], ...flow } },
      },
    };
  };

  it('lists sub-flows with their review state', async () => {
    seed();
    mountDetail();
    expect(await screen.findByText('User Login')).toBeInTheDocument();
    expect(screen.getByText('Not reviewed')).toBeInTheDocument();
    expect(screen.getAllByText('Looks good').length).toBeGreaterThan(0);
    expect(screen.getByText('Sign up, login and logout')).toBeInTheDocument();
  });

  it('shows not-found for a deleted flow and a query error', async () => {
    ops.q = { E2eFlow: { data: { e2eFlow: null } } };
    mountDetail();
    expect(await screen.findByText('This flow does not exist. It may have been deleted.')).toBeInTheDocument();
  });

  it('shows the query error', async () => {
    ops.q = { E2eFlow: { error: new Error('flow unreadable') } };
    mountDetail();
    expect(await screen.findByText('flow unreadable')).toBeInTheDocument();
  });

  it('adds a sub-flow with steps, and blocks one without an action', async () => {
    seed();
    mountDetail();
    await screen.findByText('User Login');
    fireEvent.click(screen.getByRole('button', { name: 'Add sub flow' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Password reset' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Describe what the person does.')).toBeInTheDocument();
    expect(mutation('CreateE2eSubFlow')).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/^Action/), { target: { value: 'Request a reset link' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add step' }));
    expect(within(dialog).getByText('Step 2')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove step 2' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutation('CreateE2eSubFlow')).toHaveBeenCalled());
    expect(mutation('CreateE2eSubFlow').mock.calls[0][0].variables).toEqual({
      flow_id: 'fl1',
      input: { name: 'Password reset', description: '', steps: [{ action: 'Request a reset link', expected: '' }] },
    });
  });

  it('opens a sub-flow, marks it reviewed and reports a failed review', async () => {
    seed();
    mountDetail();
    fireEvent.click(await screen.findByText('User Login'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Check the steps, then mark Looks good/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Looks good' }));
    await waitFor(() =>
      expect(mutation('ReviewE2eSubFlow')).toHaveBeenCalledWith({
        variables: { flow_id: 'fl1', sub_flow_id: 'sf1', status: 'LOOKS_GOOD' },
      }),
    );
    expect(ops.notifySuccess).toHaveBeenCalledWith('Review saved.');
    mutation('ReviewE2eSubFlow').mockRejectedValueOnce(new Error('review locked'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Needs review again' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('review locked'));
  });

  it('disables the review button that matches the current state', async () => {
    seed();
    mountDetail();
    fireEvent.click(await screen.findByText('User Logout'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Reviewed by qa/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Looks good' })).toBeDisabled();
  });

  it('deletes a sub-flow after confirmation and edits the parent flow', async () => {
    seed();
    ops.confirm.mockResolvedValue(true);
    mountDetail();
    const row = (await screen.findByText('User Login')).closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Delete User Login' }));
    await waitFor(() =>
      expect(mutation('DeleteE2eSubFlow')).toHaveBeenCalledWith({ variables: { flow_id: 'fl1', sub_flow_id: 'sf1' } }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit flow' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('User Authentication');
  });

  it('reports a failed sub-flow delete', async () => {
    seed();
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteE2eSubFlow = vi.fn().mockRejectedValue(new Error('cannot delete'));
    mountDetail();
    const row = (await screen.findByText('User Login')).closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Delete User Login' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('cannot delete'));
  });
});

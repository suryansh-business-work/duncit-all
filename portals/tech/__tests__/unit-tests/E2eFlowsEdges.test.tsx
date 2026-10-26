import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import type { E2eFlow, E2eSubFlow } from '../../src/pages/e2e/flows/queries';
import { errorText } from '../../src/pages/e2e/flows/queries';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import E2eFlowDetailPage from '../../src/pages/e2e/flows/detail';

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

const seed = (subFlows: E2eSubFlow[] = [subFlow()], flow: Partial<E2eFlow> = {}) => {
  ops.q = {
    E2eFlow: {
      data: {
        e2eFlow: {
          id: 'fl1',
          name: 'User Authentication',
          description: 'Sign up, login and logout',
          sub_flow_count: subFlows.length,
          looks_good_count: 0,
          created_by: 'ops@example.test',
          created_at: '2026-01-01T10:00:00.000Z',
          updated_at: '2026-01-02T10:00:00.000Z',
          sub_flows: subFlows,
          ...flow,
        },
      },
    },
  };
};

const mount = () =>
  renderWithProviders(<></>, {
    initialEntries: ['/e2e/flows/fl1'],
    routes: <Route path="/e2e/flows/:flowId" element={<E2eFlowDetailPage />} />,
  });

beforeEach(() => {
  resetOps();
  seed();
});

describe('errorText', () => {
  it('uses an Error’s message and anything else as text', () => {
    expect(errorText(new Error('boom'))).toBe('boom');
    expect(errorText('plain')).toBe('plain');
    expect(errorText(42)).toBe('42');
  });
});

describe('E2E flow detail / edges', () => {
  it('waits for the first read of the flow, and keeps the table while it refreshes', async () => {
    ops.q = { E2eFlow: { loading: true } };
    const { unmount } = mount();
    expect(screen.queryByText('User Login')).not.toBeInTheDocument();
    unmount();

    seed();
    ops.q.E2eFlow = { ...ops.q.E2eFlow, loading: true };
    mount();
    expect(await screen.findByText('User Login')).toBeInTheDocument();
  });

  it('leaves a sub flow alone when the delete is declined', async () => {
    ops.confirm.mockResolvedValue(false);
    mount();
    const row = (await screen.findByText('User Login')).closest('[role="row"]') as HTMLElement;

    fireEvent.click(within(row).getByRole('button', { name: 'Delete User Login' }));

    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteE2eSubFlow')).not.toHaveBeenCalled();
  });

  it('finds a sub flow by the text of one of its steps', async () => {
    seed([
      subFlow(),
      subFlow({ id: 'sf2', name: 'User Logout', description: '', steps: [{ action: 'Press log out', expected: 'Signed out' }] }),
    ]);
    mount();
    await screen.findByText('User Login');

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'signed out' } });

    await waitFor(() => expect(screen.queryByText('User Login')).not.toBeInTheDocument());
    expect(screen.getByText('User Logout')).toBeInTheDocument();
  });

  it('saves changes to an existing sub flow by its id', async () => {
    mount();
    fireEvent.click(await screen.findByText('User Login'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'User Sign In' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mutation('UpdateE2eSubFlow')).toHaveBeenCalled());
    expect(mutation('UpdateE2eSubFlow').mock.calls[0][0].variables).toMatchObject({
      flow_id: 'fl1',
      sub_flow_id: 'sf1',
      input: { name: 'User Sign In' },
    });
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Sub flow saved.'));
  });

  it('keeps the dialog open and reports a refused save, even one made with text', async () => {
    ops.mut.CreateE2eSubFlow = vi.fn().mockRejectedValue('flow is locked');
    mount();
    await screen.findByText('User Login');
    fireEvent.click(screen.getByRole('button', { name: 'Add sub flow' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Password reset' } });
    fireEvent.change(within(dialog).getByLabelText(/^Action/), { target: { value: 'Request a link' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('flow is locked'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables Cancel and shows Saving while a sub flow is being saved', async () => {
    let finish: (value: unknown) => void = () => undefined;
    ops.mut.CreateE2eSubFlow = vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mount();
    await screen.findByText('User Login');
    fireEvent.click(screen.getByRole('button', { name: 'Add sub flow' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Password reset' } });
    fireEvent.change(within(dialog).getByLabelText(/^Action/), { target: { value: 'Request a link' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    finish({ data: {} });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the flow editor without saving', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit flow' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the sub flow dialog without saving', async () => {
    mount();
    fireEvent.click(await screen.findByText('User Login'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutation('UpdateE2eSubFlow')).not.toHaveBeenCalled();
  });

  it('asks for at least one step on a stored sub flow that has none', async () => {
    seed([subFlow({ steps: [] })]);
    mount();
    fireEvent.click(await screen.findByText('User Login'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/at least one step/i)).toBeInTheDocument();
    expect(mutation('UpdateE2eSubFlow')).not.toHaveBeenCalled();
  });
});

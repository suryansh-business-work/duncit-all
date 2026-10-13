import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { rateLimitOptions, rateLimitRule } from '../mocks/rate-limit.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import RateLimitRulesPage from '../../src/pages/rate-limiting/rules';

beforeEach(() => {
  resetOps();
  ops.tableRows = [rateLimitRule(), rateLimitRule({ id: 'rule2', name: 'Watch only', mode: 'MONITOR', enabled: false, app: '*', blocked_count: 0 })];
  ops.q = { RateLimitOptions: { data: { rateLimitOptions: rateLimitOptions() } } };
});

const mount = async () => {
  renderWithProviders(<RateLimitRulesPage />);
  await screen.findByText('Login ceiling');
};
const rowOf = (name: string) => screen.getByText(name).closest('[role="row"]') as HTMLElement;

describe('Rate limit rules page', () => {
  it('lists each rule with its mode, scope and allowance', async () => {
    await mount();
    const row = rowOf('Login ceiling');
    expect(within(row).getByText('20 / 60s')).toBeInTheDocument();
    expect(within(row).getByText('7')).toBeInTheDocument();
    expect(rowOf('Watch only')).toHaveTextContent(/Monitor/);
    expect(rowOf('Login ceiling')).toHaveTextContent(/mweb · GraphQL/);
  });

  it('shows the options query failure instead of the table', async () => {
    ops.q.RateLimitOptions = { error: new Error('options unavailable') };
    renderWithProviders(<RateLimitRulesPage />);
    expect(await screen.findByText('options unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Login ceiling')).not.toBeInTheDocument();
  });

  it('flips a rule on or off and reports a failed flip', async () => {
    await mount();
    const toggle = within(rowOf('Watch only')).getByTestId('rate-limit-rules-enabled-toggle');
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(mutation('SetRateLimitRuleEnabled')).toHaveBeenCalledWith({
        variables: { rule_id: 'rule2', enabled: true },
      }),
    );
    mutation('SetRateLimitRuleEnabled').mockRejectedValueOnce(new Error('flip refused'));
    fireEvent.click(within(rowOf('Login ceiling')).getByTestId('rate-limit-rules-enabled-toggle'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('flip refused'));
  });

  it('deletes only after confirmation', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await mount();
    const del = within(rowOf('Login ceiling')).getByRole('button', { name: 'Delete' });
    fireEvent.click(del);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteRateLimitRule')).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() =>
      expect(mutation('DeleteRateLimitRule')).toHaveBeenCalledWith({ variables: { rule_id: 'rule1' } }),
    );
  });

  it('reports a failed delete', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteRateLimitRule = vi.fn().mockRejectedValue(new Error('in use'));
    await mount();
    fireEvent.click(within(rowOf('Login ceiling')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('in use'));
  });

  it('creates a rule from the blank form with the typed values split into lists', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'New rule' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Search cap' } });
    fireEvent.change(within(dialog).getByLabelText('GraphQL fields'), { target: { value: 'search, suggest' } });
    fireEvent.change(within(dialog).getByLabelText('Paths'), { target: { value: '/a,\n/b' } });
    fireEvent.change(within(dialog).getByLabelText('Requests'), { target: { value: '5' } });
    expect(within(dialog).getByText(/Allows 5 requests every 60 seconds/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutation('CreateRateLimitRule')).toHaveBeenCalled());
    const input = mutation('CreateRateLimitRule').mock.calls[0][0].variables.input;
    expect(input).toMatchObject({
      name: 'Search cap',
      operations: ['search', 'suggest'],
      paths: ['/a', '/b'],
      limit: 5,
      mode: 'MONITOR',
      description: null,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('blocks a too-short name and a burst on a window algorithm', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'New rule' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'ab' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('At least 3 characters.')).toBeInTheDocument();
    expect(mutation('CreateRateLimitRule')).not.toHaveBeenCalled();
  });

  it('edits an existing rule through the update mutation and shows a server error', async () => {
    ops.mut.UpdateRateLimitRule = vi.fn().mockRejectedValue(new Error('name taken'));
    await mount();
    fireEvent.click(within(rowOf('Login ceiling')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Login ceiling');
    expect(within(dialog).getByLabelText('GraphQL fields')).toHaveValue('login, signup');
    fireEvent.change(within(dialog).getByLabelText('Priority'), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('name taken')).toBeInTheDocument();
    expect(ops.mut.UpdateRateLimitRule.mock.calls[0][0].variables).toMatchObject({
      rule_id: 'rule1',
      input: { priority: 5, operations: ['login', 'signup'] },
    });
  });

  it('uses the generic message when a flip, delete or save fails with a non-Error', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.SetRateLimitRuleEnabled = vi.fn().mockRejectedValue('boom');
    ops.mut.DeleteRateLimitRule = vi.fn().mockRejectedValue('boom');
    ops.mut.UpdateRateLimitRule = vi.fn().mockRejectedValue('boom');
    await mount();
    fireEvent.click(within(rowOf('Login ceiling')).getByTestId('rate-limit-rules-enabled-toggle'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    fireEvent.click(within(rowOf('Login ceiling')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(2));
    expect(ops.notifyError).toHaveBeenNthCalledWith(1, 'Could not save. Please try again.');
    expect(ops.notifyError).toHaveBeenNthCalledWith(2, 'Could not save. Please try again.');
    fireEvent.click(within(rowOf('Login ceiling')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Could not save. Please try again.')).toBeInTheDocument();
  });

  it('shows nothing but the loader on the first load', () => {
    ops.q.RateLimitOptions = { loading: true };
    renderWithProviders(<RateLimitRulesPage />);
    expect(screen.queryByRole('button', { name: 'New rule' })).not.toBeInTheDocument();
  });

  it('closes the dialog on Escape without saving', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'New rule' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutation('CreateRateLimitRule')).not.toHaveBeenCalled();
  });
});

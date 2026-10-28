import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { stressConfig, stressRun } from '../mocks/stress.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import StressRunsPage from '../../src/pages/stress-testing/runs';

const mount = () =>
  renderWithProviders(<></>, {
    routes: (
      <>
        <Route path="/" element={<StressRunsPage />} />
        <Route path="/stress-testing/runs/:id" element={<p>detail page</p>} />
      </>
    ),
  });

beforeEach(() => {
  resetOps();
  ops.tableRows = [
    stressRun(),
    stressRun({ id: 'run2', run_no: 'ST-0002', status: 'RUNNING', summary: null, workflow_run_url: '' }),
  ];
  ops.q = {
    ServerPulse: { data: { serverPulse: undefined } },
    StressTriggerConfig: { data: { stressTriggerConfig: stressConfig() } },
  };
});

const rowOf = (no: string) => screen.getByText(no).closest('[role="row"]') as HTMLElement;

describe('Stress runs page', () => {
  it('lists runs, hides Delete on a live run and links finished ones to GitHub', async () => {
    mount();
    await screen.findByText('ST-0001');
    expect(within(rowOf('ST-0001')).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(within(rowOf('ST-0001')).getByRole('link', { name: 'Open GitHub run' })).toHaveAttribute(
      'href',
      'https://github.example.test/runs/1',
    );
    expect(within(rowOf('ST-0002')).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('opens a run on row click', async () => {
    mount();
    await screen.findByText('ST-0001');
    fireEvent.click(rowOf('ST-0001'));
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('deletes after confirmation and reports success', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount();
    await screen.findByText('ST-0001');
    const del = within(rowOf('ST-0001')).getByRole('button', { name: 'Delete' });
    fireEvent.click(del);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteStressRun')).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(mutation('DeleteStressRun')).toHaveBeenCalledWith({ variables: { id: 'run1' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Run deleted');
  });

  it('reports a failed delete', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteStressRun = vi.fn().mockRejectedValue(new Error('run is locked'));
    mount();
    await screen.findByText('ST-0001');
    fireEvent.click(within(rowOf('ST-0001')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('run is locked'));
  });
});

describe('New stress run dialog', () => {
  const openDialog = async () => {
    mount();
    await screen.findByText('ST-0001');
    fireEvent.click(screen.getByRole('button', { name: 'New stress test' }));
    return screen.findByRole('dialog');
  };

  it('starts a smoke run with the preset values and opens its page', async () => {
    ops.mut.TriggerStressRun = vi
      .fn()
      .mockResolvedValue({ data: { triggerStressRun: { id: 'run9', run_no: 'ST-0009' } } });
    const dialog = await openDialog();
    expect(within(dialog).getByLabelText('Virtual users')).toHaveValue(10);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start run' }));
    await waitFor(() => expect(mutation('TriggerStressRun')).toHaveBeenCalled());
    const input = mutation('TriggerStressRun').mock.calls[0][0].variables.input;
    expect(input).toMatchObject({ virtual_users: 10, runners: 1, journeys: ['HOME', 'PODS'] });
    expect(input).not.toHaveProperty('confirm_text');
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('ST-0009 started — waiting for a runner'));
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('applies the Load preset from the server limits', async () => {
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Load' }));
    await waitFor(() => expect(within(dialog).getByLabelText('Virtual users')).toHaveValue(150));
  });

  it('refuses runners above users and an empty journey list', async () => {
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Virtual users'), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByLabelText('Runners'), { target: { value: '4' } });
    for (const box of within(dialog).getAllByRole('checkbox')) fireEvent.click(box);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start run' }));
    expect(await within(dialog).findByText('Every runner needs at least one virtual user.')).toBeInTheDocument();
    expect(within(dialog).getByText('Pick at least one journey.')).toBeInTheDocument();
    expect(mutation('TriggerStressRun')).not.toHaveBeenCalled();
  });

  it('requires the typed confirmation text on production', async () => {
    ops.q.StressTriggerConfig = {
      data: { stressTriggerConfig: stressConfig({ environment: 'production', requires_confirmation: true }) },
    };
    const dialog = await openDialog();
    expect(within(dialog).getByText(/send real load to PRODUCTION/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start run' }));
    expect(await within(dialog).findByText('Type STRESS PRODUCTION exactly.')).toBeInTheDocument();
    expect(mutation('TriggerStressRun')).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Type STRESS PRODUCTION to confirm'), {
      target: { value: 'STRESS PRODUCTION' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start run' }));
    await waitFor(() => expect(mutation('TriggerStressRun')).toHaveBeenCalled());
    expect(mutation('TriggerStressRun').mock.calls[0][0].variables.input.confirm_text).toBe('STRESS PRODUCTION');
  });

  it.each([
    [{ blocked_reason: 'LOCAL' as const }, /cannot target a local server/],
    [{ blocked_reason: 'GITHUB' as const }, /GitHub is not configured/],
    [{ can_start: false }, /Only a Super Admin/],
    [{ live_run_no: 'ST-0003' }, /ST-0003 is still running/],
  ])('shows why a run cannot start (%j)', async (over, message) => {
    ops.q.StressTriggerConfig = { data: { stressTriggerConfig: stressConfig(over) } };
    const dialog = await openDialog();
    expect(within(dialog).getByText(message)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Start run' })).toBeDisabled();
  });

  it('shows a failed trigger and keeps the dialog open', async () => {
    ops.mut.TriggerStressRun = vi.fn().mockRejectedValue(new Error('github 500'));
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start run' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('github 500'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the config query error', async () => {
    ops.q.StressTriggerConfig = { error: new Error('config down') };
    const dialog = await openDialog();
    expect(within(dialog).getByText('config down')).toBeInTheDocument();
  });

});

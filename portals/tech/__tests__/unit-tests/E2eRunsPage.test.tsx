import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { e2eResult, e2eRun, e2eSuites } from '../mocks/e2e.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import E2eRunsPage from '../../src/pages/e2e';

beforeEach(() => {
  resetOps();
  ops.tableRows = [e2eRun()];
  ops.q = {
    E2eSuiteCatalogue: { data: { e2eSuiteCatalogue: e2eSuites() } },
    E2eTriggerConfig: {
      data: {
        e2eTriggerConfig: {
          configured: true,
          repository: 'org/repo',
          default_ref: 'main',
          reports_to: 'https://api.example.test',
        },
      },
    },
  };
});

const mount = async (first = 'E2E-0001') => {
  renderWithProviders(<E2eRunsPage />);
  return (await screen.findByText(first)).closest('[role="row"]') as HTMLElement;
};

describe('E2E runs table', () => {
  it('shows a passed run with its totals, identity and links', async () => {
    const row = await mount();
    expect(within(row).getByText('Passed')).toBeInTheDocument();
    expect(within(row).getByText('20 / 20')).toBeInTheDocument();
    expect(within(row).getByText('signup@example.test')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Open the GitHub run' })).toHaveAttribute(
      'href',
      'https://github.example.test/runs/5',
    );
  });

  it('names the failing suites, collapsing past three', async () => {
    ops.tableRows = [
      e2eRun({
        id: 'f',
        run_no: 'E2E-0002',
        status: 'FAILED',
        error_message: 'two suites failed',
        results: ['a', 'b', 'c', 'd', 'e'].map((key) => e2eResult({ key, status: 'FAILED' })),
        workflow_run_url: '',
        signup_email: '',
        slack_ts: null,
      }),
    ];
    const row = await mount('E2E-0002');
    expect(within(row).getByText('a')).toBeInTheDocument();
    expect(within(row).getByText('+2')).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: 'Open the GitHub run' })).not.toBeInTheDocument();
  });

  it('confirms before deleting a run and reports a failed delete', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const row = await mount();
    const del = within(row).getByRole('button', { name: /Delete/ });
    fireEvent.click(del);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteE2eRun')).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(mutation('DeleteE2eRun')).toHaveBeenCalledWith({ variables: { id: 'e1' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Run deleted.');
    mutation('DeleteE2eRun').mockRejectedValueOnce(new Error('run busy'));
    fireEvent.click(del);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('run busy'));
  });
});

describe('E2E run details', () => {
  it('opens a run with suites, scenario clips and video error', async () => {
    ops.tableRows = [
      e2eRun({
        error_message: 'nightly sweep degraded',
        video_error: 'files.write scope missing',
        requested_suites: ['tech-portal', 'mweb'],
        results: [
          e2eResult({ key: 'mweb', status: 'FAILED', error: 'login timed out', video_permalink: 'https://slack.example.test/v' }),
          e2eResult({ key: 'tech-portal' }),
          e2eResult({ key: 'shared', status: 'SKIPPED', tests: null }),
        ],
        scenario_videos: [
          { suite: 'mweb', spec: 'login.cy.ts', title: 'logs in', state: 'failed', file_id: 'c1', permalink: 'https://slack.example.test/c1', seconds: 12, bytes: 1 },
          { suite: 'mweb', spec: 'home.cy.ts', title: 'opens home', state: 'weird', file_id: 'c2', permalink: '', seconds: null, bytes: null },
        ],
      }),
    ];
    const row = await mount();
    fireEvent.click(row);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('nightly sweep degraded')).toBeInTheDocument();
    expect(within(dialog).getByText('tech-portal, mweb')).toBeInTheDocument();
    expect(within(dialog).getByText('login timed out')).toBeInTheDocument();
    expect(within(dialog).getByText('Not selected for this run.')).toBeInTheDocument();
    expect(within(dialog).getByText('The recordings did not reach Slack: files.write scope missing')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Watch the recording' })).toHaveAttribute('href', 'https://slack.example.test/v');
    expect(within(dialog).getByRole('link', { name: 'Watch this scenario' })).toBeInTheDocument();
    expect(within(dialog).getByText('opens home')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says so when no suite has reported yet', async () => {
    ops.tableRows = [e2eRun({ status: 'QUEUED', results: [], workflow_run_url: '', requested_suites: [] })];
    const row = await mount();
    fireEvent.click(row);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('No suite has reported yet.')).toBeInTheDocument();
    expect(within(dialog).getByText('Every suite')).toBeInTheDocument();
  });
});

describe('Run tests dialog', () => {
  const open = async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Run tests' }));
    return screen.findByRole('dialog');
  };

  it('runs every suite as an empty list and the default branch', async () => {
    ops.mut.TriggerE2eRun = vi.fn().mockResolvedValue({ data: { triggerE2eRun: { run: { run_no: 'E2E-0003' } } } });
    const dialog = await open();
    expect(within(dialog).getByLabelText('Branch')).toHaveValue('main');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run tests' }));
    await waitFor(() => expect(mutation('TriggerE2eRun')).toHaveBeenCalled());
    expect(mutation('TriggerE2eRun').mock.calls[0][0].variables.input).toEqual({ suites: [], ref: 'main' });
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith(expect.stringContaining('E2E-0003')));
  });

  it('sends only the picked suites, in catalogue order', async () => {
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'None' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'mWeb' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Tech portal' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run tests' }));
    await waitFor(() => expect(mutation('TriggerE2eRun')).toHaveBeenCalled());
    expect(mutation('TriggerE2eRun').mock.calls[0][0].variables.input.suites).toEqual(['tech-portal', 'mweb']);
  });

  it('refuses an empty selection and a malformed branch', async () => {
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'None' }));
    fireEvent.change(within(dialog).getByLabelText('Branch'), { target: { value: 'a..b' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run tests' }));
    expect(await within(dialog).findByText('Pick at least one suite.')).toBeInTheDocument();
    expect(within(dialog).getByText('That is not a branch or tag name git would accept.')).toBeInTheDocument();
    expect(mutation('TriggerE2eRun')).not.toHaveBeenCalled();
  });

  it('warns when GitHub is not configured and reports a failed dispatch', async () => {
    ops.q.E2eTriggerConfig = {
      data: { e2eTriggerConfig: { configured: false, repository: '', default_ref: '', reports_to: '' } },
    };
    const dialog = await open();
    expect(within(dialog).getByRole('button', { name: 'Run tests' })).toBeDisabled();
    expect(within(dialog).getByRole('alert')).toBeInTheDocument();
  });

  it('reports a dispatch that was refused', async () => {
    ops.mut.TriggerE2eRun = vi.fn().mockRejectedValue(new Error('workflow disabled'));
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run tests' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('workflow disabled'));
  });
});

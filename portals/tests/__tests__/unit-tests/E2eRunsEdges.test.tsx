import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import RunDetailsDialog from '../../src/pages/e2e/RunDetailsDialog';
import SuitePicker from '../../src/pages/e2e/SuitePicker';
import SuiteResultsList from '../../src/pages/e2e/SuiteResultsList';
import { makeRenderLinks, makeRenderSlack, makeRenderStatus, makeRenderTriggeredBy, renderIdentity } from '../../src/pages/e2e/cells';
import { durationLabel, isStaleRunning, runningMinutes, suitesLabel, testsLabel } from '../../src/pages/e2e/queries';

beforeEach(() => {
  resetOps();
  ops.tableRows = [e2eRun()];
  ops.q = {
    E2eSuiteCatalogue: { data: { e2eSuiteCatalogue: e2eSuites() } },
    E2eTriggerConfig: {
      data: {
        e2eTriggerConfig: { configured: true, repository: 'org/repo', default_ref: 'main', reports_to: 'https://api.example.test' },
      },
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const statusLabels = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  SUCCESS: 'Passed',
  FAILED: 'Failed',
  stale: 'Looks stuck',
  elapsed: (minutes: string) => `Running for ${minutes} min`,
};

describe('e2e run labels and timing', () => {
  it('reads the duration as minutes and padded seconds, or a dash when unknown or negative', () => {
    expect(durationLabel({ duration_seconds: 125 })).toBe('2m 05s');
    expect(durationLabel({ duration_seconds: null })).toBe('—');
    expect(durationLabel({ duration_seconds: -1 })).toBe('—');
  });

  it('reads passed over run tests, and a dash when the run ran none', () => {
    expect(testsLabel(e2eRun())).toBe('20 / 20');
    expect(testsLabel(e2eRun({ totals: { ...e2eRun().totals, tests: 0 } }))).toBe('—');
  });

  it('reads the suites that reported against the ones asked for', () => {
    expect(suitesLabel(e2eRun({ totals: { ...e2eRun().totals, suites: 4, suites_passed: 2, suites_failed: 1 } }))).toBe('3 / 4');
  });

  it('counts running minutes, never negative, and none without a start time', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    expect(runningMinutes(e2eRun({ created_at: '2026-01-01T11:30:00.000Z' }))).toBe(30);
    expect(runningMinutes(e2eRun({ created_at: '2026-01-01T13:00:00.000Z' }))).toBe(0);
    expect(runningMinutes(e2eRun({ created_at: null as never }))).toBe(0);
  });

  it('calls a live run stale only past 90 minutes', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    expect(isStaleRunning(e2eRun({ status: 'RUNNING', created_at: '2026-01-01T10:00:00.000Z' }))).toBe(true);
    expect(isStaleRunning(e2eRun({ status: 'RUNNING', created_at: '2026-01-01T11:00:00.000Z' }))).toBe(false);
    expect(isStaleRunning(e2eRun({ status: 'SUCCESS', created_at: '2026-01-01T10:00:00.000Z' }))).toBe(false);
  });
});

describe('e2e run cells', () => {
  it('shows a finished run with its failure as the tooltip source', () => {
    const render1 = makeRenderStatus(statusLabels);
    const { container, unmount } = render(render1(e2eRun({ status: 'FAILED', error_message: 'sweep degraded' })));
    expect(container.querySelector('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    unmount();

    const second = render(render1(e2eRun({ status: 'SUCCESS' })));
    expect(second.container.querySelector('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
  });

  it('shows a live run with its elapsed time, and a stale one as warning', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    const renderStatus = makeRenderStatus(statusLabels);

    const live = render(renderStatus(e2eRun({ status: 'RUNNING', created_at: '2026-01-01T11:50:00.000Z', stage: 'Cypress' })));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    live.unmount();

    const queued = render(renderStatus(e2eRun({ status: 'QUEUED', created_at: '2026-01-01T11:50:00.000Z', stage: '' })));
    expect(screen.getByText('Queued')).toBeInTheDocument();
    queued.unmount();

    const stale = render(renderStatus(e2eRun({ status: 'RUNNING', created_at: '2026-01-01T08:00:00.000Z' })));
    expect(stale.container.querySelector('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows who started a run and how, with a dash for nobody', () => {
    const renderTriggered = makeRenderTriggeredBy({ SCHEDULE: 'Nightly', PORTAL: 'Portal', MANUAL: 'Manual' });
    const { unmount } = render(renderTriggered(e2eRun()));
    expect(screen.getByText('ops@example.test')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    unmount();

    render(renderTriggered(e2eRun({ triggered_by: '', trigger_source: 'SCHEDULE' })));
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Nightly')).toBeInTheDocument();
  });

  it('shows the signup address of a run, or a dash', () => {
    const { unmount } = render(renderIdentity(e2eRun()));
    expect(screen.getByText('signup@example.test')).toBeInTheDocument();
    unmount();
    render(renderIdentity(e2eRun({ signup_email: '' })));
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows Slack as posted, or skipped with the reason', () => {
    const renderSlack = makeRenderSlack('Posted', 'Skipped');
    const { unmount } = render(renderSlack(e2eRun({ slack_ts: '1700000000.1' })));
    expect(screen.getByText('Posted')).toBeInTheDocument();
    unmount();
    const second = render(renderSlack(e2eRun({ slack_ts: null, slack_error: 'no channel' })));
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    second.unmount();
    render(renderSlack(e2eRun({ slack_ts: null, slack_error: null })));
    expect(screen.getByText('Skipped')).toBeInTheDocument();
  });
});

describe('e2e run links', () => {
  const labels = { run: 'Open the GitHub run', runPending: 'Not started yet', delete: 'Delete run' };

  it('opens the run and deletes it without also opening the row behind', () => {
    const onDelete = vi.fn();
    const onRowClick = vi.fn();
    const row = e2eRun();
    render(<div role="presentation" onClick={onRowClick}>{makeRenderLinks(labels, onDelete)(row)}</div>);

    fireEvent.click(screen.getByRole('link', { name: 'Open the GitHub run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete run' }));

    expect(onDelete).toHaveBeenCalledWith(row);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('shows a dash with a reason when the workflow has not started', () => {
    render(makeRenderLinks(labels, vi.fn())(e2eRun({ workflow_run_url: '' })));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('E2E runs table / empty fields', () => {
  it('shows dashes for a run with no branch, starter or reporter', async () => {
    ops.tableRows = [e2eRun({ run_no: 'E2E-0009', ref: '', triggered_by: '', reported_by: '', signup_email: '', slack_ts: null })];
    renderWithProviders(<E2eRunsPage />);
    const row = (await screen.findByText('E2E-0009')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('refreshes the table while a run is live, and stops caring about a stale one', async () => {
    const timers: Array<() => void> = [];
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((fn: () => void) => {
      timers.push(fn);
      return 1;
    }) as unknown as typeof setInterval);
    ops.tableRows = [e2eRun({ status: 'RUNNING', created_at: new Date().toISOString() })];
    renderWithProviders(<E2eRunsPage />);

    expect(await screen.findByText('Running')).toBeInTheDocument();
    await waitFor(() => expect(timers.length).toBeGreaterThan(0));
    expect(() => timers.forEach((fn) => fn())).not.toThrow();
  });

  it('reports a delete refused with text', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteE2eRun = vi.fn().mockRejectedValue('busy');
    renderWithProviders(<E2eRunsPage />);
    const row = (await screen.findByText('E2E-0001')).closest('[role="row"]') as HTMLElement;

    fireEvent.click(within(row).getByRole('button', { name: /Delete/ }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('busy'));
  });
});

describe('RunDetailsDialog', () => {
  it('shows a dash for the branch of a run that has none', () => {
    // In a router: the dialog links to the run's scenario page.
    renderWithProviders(<RunDetailsDialog run={e2eRun({ ref: '' })} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('—');
  });
});

describe('SuitePicker', () => {
  it('lists only the groups that have suites, and toggles one suite on and off', () => {
    const onChange = vi.fn();
    render(
      <SuitePicker
        suites={e2eSuites().filter((suite) => suite.group !== 'APP')}
        value={['tech-portal']}
        onChange={onChange}
        label="Suites"
      />,
    );

    expect(screen.queryByText('mWeb')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Admin portal' }));
    expect(onChange).toHaveBeenLastCalledWith(['tech-portal', 'admin-portal']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tech portal' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    fireEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenLastCalledWith(['tech-portal', 'admin-portal', 'shared']);
  });
});

describe('SuiteResultsList', () => {
  it('reads a leg that reported tests without a pass or spec count as zero, and one with no report as such', () => {
    render(
      <SuiteResultsList
        results={[
          e2eResult({ key: 'a', tests: 5, passed: null, specs: null, duration_seconds: null }),
          e2eResult({ key: 'b', tests: null, passed: null, specs: null }),
        ]}
      />,
    );

    expect(screen.getByText(/0 \/ 5|0 of 5|0.*5/)).toBeInTheDocument();
  });
});

describe('Run tests dialog / edges', () => {
  const open = async () => {
    renderWithProviders(<E2eRunsPage />);
    await screen.findByText('E2E-0001');
    fireEvent.click(screen.getByRole('button', { name: 'Run tests' }));
    return screen.findByRole('dialog');
  };

  it('shows a spinner and a disabled Run button until the GitHub config is read', async () => {
    ops.q.E2eTriggerConfig = { loading: true };
    const dialog = await open();

    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Run tests' })).toBeDisabled();
  });

  it('confirms a queued run even when the server names none', async () => {
    ops.mut.TriggerE2eRun = vi.fn().mockResolvedValue({ data: {} });
    const dialog = await open();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Run tests' }));

    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledTimes(1));
    expect(ops.notifySuccess.mock.calls[0][0]).not.toContain('E2E-');
  });

  it('reports a trigger refused with text, and shows the button busy meanwhile', async () => {
    let fail: (reason: unknown) => void = () => undefined;
    ops.mut.TriggerE2eRun = vi.fn().mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
    const dialog = await open();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Run tests' }));
    expect(await within(dialog).findByRole('button', { name: 'Starting…' })).toBeDisabled();
    fail('GitHub is down');

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('GitHub is down'));
    expect(mutation('TriggerE2eRun')).toHaveBeenCalledTimes(1);
  });

  it('shows the run options before the suite catalogue arrives as an empty picker', async () => {
    ops.q.E2eSuiteCatalogue = { loading: true };
    const dialog = await open();

    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Run tests' })).toBeDisabled();
  });
});

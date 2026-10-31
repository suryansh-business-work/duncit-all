import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  makeRunApiEntry,
  makeRunApproval,
  makeRunDetail,
  makeRunState,
  makeRunStep,
  marketingRunErrorMock,
  marketingRunMock,
  retryMarketingRunMock,
} from '../mocks';

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

import RunDrawer from '../../src/pages/activity-page/RunDrawer';
import RunSummary from '../../src/pages/activity-page/RunSummary';
import RunApproval from '../../src/pages/activity-page/RunApproval';
import RunSteps from '../../src/pages/activity-page/RunSteps';
import RunApiLog from '../../src/pages/activity-page/RunApiLog';

afterEach(() => {
  vi.clearAllMocks();
});

describe('RunSummary', () => {
  it('states what the run was, who ran it and when, with how long it took', () => {
    renderWithProviders(<RunSummary run={makeRunDetail()} />);
    const summary = screen.getByTestId('marketing-run-summary');
    expect(within(summary).getByText('Social post')).toBeInTheDocument();
    expect(within(summary).getByText('A person')).toBeInTheDocument();
    expect(within(summary).getByText('Asha Rao')).toBeInTheDocument();
    expect(within(summary).getByText('asha@duncit.com')).toBeInTheDocument();
    expect(within(summary).getByText('fmt:2026-10-30T10:00:00.000Z')).toBeInTheDocument();
    expect(within(summary).getByText('fmt:2026-10-30T10:00:12.000Z')).toBeInTheDocument();
    expect(within(summary).getByText('12s')).toBeInTheDocument();
    expect(within(summary).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Retries')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Part of run')).not.toBeInTheDocument();
    expect(within(summary).queryByTestId('marketing-run-cost')).not.toBeInTheDocument();
  });

  it('leads with what went wrong, and notes a cancel that is still landing', () => {
    renderWithProviders(
      <RunSummary
        run={makeRunDetail({
          status: 'RUNNING',
          error: 'Instagram said no',
          cancel_requested: true,
          retries: 2,
          parent_run_id: 'orch-1',
          started_at: null,
          finished_at: null,
          actor: { kind: 'SYSTEM', id: '', name: '', email: '' },
        })}
      />,
    );
    const alerts = screen.getAllByRole('alert');
    expect(alerts[0]).toHaveTextContent('What went wrong');
    expect(alerts[0]).toHaveTextContent('Instagram said no');
    expect(alerts[1]).toHaveTextContent('Cancel requested. It stops after the step it is on.');
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Not started yet')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('Retries')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('orch-1')).toBeInTheDocument();
  });

  it('drops the cancel note once the run has ended, and prices the AI work it did', () => {
    renderWithProviders(
      <RunSummary
        run={makeRunDetail({ status: 'CANCELLED', cancel_requested: true, cost: { tokens_in: 1200, tokens_out: 300, amount: 0.0425, currency: 'USD' } })}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const cost = screen.getByTestId('marketing-run-cost');
    expect(cost).toHaveTextContent('1,200 tokens in, 300 out');
    expect(cost).toHaveTextContent('0.0425 USD');
  });

  it('counts tokens without a price when the model was free', () => {
    renderWithProviders(<RunSummary run={makeRunDetail({ cost: { tokens_in: 0, tokens_out: 40, amount: 0, currency: 'USD' } })} />);
    const cost = screen.getByTestId('marketing-run-cost');
    expect(cost).toHaveTextContent('0 tokens in, 40 out');
    expect(cost).not.toHaveTextContent('USD');
  });
});

describe('RunApproval', () => {
  it('renders nothing for a run nobody had to approve', () => {
    renderWithProviders(<RunApproval approval={makeRunApproval()} />);
    expect(screen.queryByTestId('marketing-run-approval')).not.toBeInTheDocument();
  });

  it('says it is waiting while nobody has decided', () => {
    renderWithProviders(<RunApproval approval={makeRunApproval({ required: true, requested_at: '2026-10-30T09:00:00.000Z' })} />);
    const block = screen.getByTestId('marketing-run-approval');
    expect(within(block).getByRole('heading', { level: 3, name: 'Approval' })).toBeInTheDocument();
    expect(within(block).getByText('fmt:2026-10-30T09:00:00.000Z')).toBeInTheDocument();
    expect(within(block).getByText('Waiting for a decision')).toBeInTheDocument();
    expect(within(block).queryByText('Decided by')).not.toBeInTheDocument();
    expect(within(block).queryByText('Note')).not.toBeInTheDocument();
  });

  it('shows who decided what, when, and why', () => {
    renderWithProviders(
      <RunApproval
        approval={makeRunApproval({
          required: true,
          decision: 'CHANGES_REQUESTED',
          decided_by: 'u2',
          decided_by_name: 'Meera',
          decided_at: '2026-10-30T11:00:00.000Z',
          note: 'Shorter caption please',
        })}
      />,
    );
    const block = screen.getByTestId('marketing-run-approval');
    expect(within(block).getByText('Changes requested').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    expect(within(block).getByText('Meera')).toBeInTheDocument();
    expect(within(block).getByText('fmt:2026-10-30T11:00:00.000Z')).toBeInTheDocument();
    expect(within(block).getByText('Shorter caption please')).toBeInTheDocument();
  });

  it('falls back to the decider’s id, then a dash, when no name was kept', () => {
    const { unmount } = renderWithProviders(
      <RunApproval approval={makeRunApproval({ required: true, decision: 'APPROVED', decided_by: 'u2' })} />,
    );
    expect(screen.getByText('u2')).toBeInTheDocument();
    expect(screen.getByText('Approved').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    unmount();
    renderWithProviders(<RunApproval approval={makeRunApproval({ required: true, decision: 'REJECTED' })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Rejected').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });
});

describe('RunSteps', () => {
  it('lists each step with its status, tool, what went in and out, and how long it took', () => {
    renderWithProviders(
      <RunSteps
        steps={[
          makeRunStep(),
          makeRunStep({ key: 'publish', label: '', status: 'FAILED', tool: '', input_summary: '', output_summary: '', error: 'Rate limited', ms: 0 }),
        ]}
      />,
    );
    const items = screen.getAllByTestId('marketing-run-step');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Done').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(within(items[0]).getByText('Render the reel')).toBeInTheDocument();
    expect(within(items[0]).getByText('Tool: reel.render')).toBeInTheDocument();
    expect(within(items[0]).getByText('8s')).toBeInTheDocument();
    expect(within(items[0]).getByText(/3 clips, 15s/)).toBeInTheDocument();
    expect(within(items[0]).getByText(/reel-42\.mp4/)).toBeInTheDocument();
    // A step with no label falls back to its key; one that recorded nothing shows only its status and error.
    expect(within(items[1]).getByText('Failed').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    expect(within(items[1]).getByText('publish')).toBeInTheDocument();
    expect(within(items[1]).getByText('Rate limited')).toBeInTheDocument();
    expect(within(items[1]).queryByText(/^Tool:/)).not.toBeInTheDocument();
    expect(within(items[1]).queryByText('In:')).not.toBeInTheDocument();
  });

  it('says so when no step has been recorded', () => {
    renderWithProviders(<RunSteps steps={[]} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Steps' })).toBeInTheDocument();
    expect(screen.getByText('No steps recorded yet.')).toBeInTheDocument();
  });
});

describe('RunApiLog', () => {
  it('lists every call with its service, status, timing and what came back', () => {
    renderWithProviders(
      <RunApiLog
        entries={[
          makeRunApiEntry(),
          makeRunApiEntry({ status: 429, ms: 0, summary: '', at: '2026-10-30T10:00:10.000Z' }),
          makeRunApiEntry({ at: null, summary: 'retrying' }),
          makeRunApiEntry({ at: null, summary: '' }),
        ]}
      />,
    );
    const items = screen.getAllByTestId('marketing-run-api-entry');
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('instagram')).toBeInTheDocument();
    expect(within(items[0]).getByText('POST /v21.0/me/media')).toBeInTheDocument();
    expect(within(items[0]).getByText('200')).toHaveAttribute('data-outcome', 'ok');
    expect(within(items[0]).getByText('640 ms')).toBeInTheDocument();
    expect(within(items[0]).getByText('fmt:2026-10-30T10:00:09.000Z · container created')).toBeInTheDocument();
    expect(within(items[1]).getByText('429')).toHaveAttribute('data-outcome', 'error');
    expect(within(items[1]).queryByText(/ms$/)).not.toBeInTheDocument();
    expect(within(items[1]).getByText('fmt:2026-10-30T10:00:10.000Z')).toBeInTheDocument();
    expect(within(items[2]).getByText('retrying')).toBeInTheDocument();
    expect(within(items[3]).queryByText(/fmt:|·/)).not.toBeInTheDocument();
  });

  it('says so when the run called nothing', () => {
    renderWithProviders(<RunApiLog entries={[]} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Calls to other services' })).toBeInTheDocument();
    expect(screen.getByText('No calls to other services.')).toBeInTheDocument();
  });
});

describe('RunDrawer', () => {
  it('stays closed and asks for nothing without a run', () => {
    const resultFn = vi.fn();
    renderWithProviders(<RunDrawer runId={null} onClose={vi.fn()} onChanged={vi.fn()} />, {
      mocks: [{ ...marketingRunMock(makeRunDetail({ id: '' })), result: resultFn }],
    });
    expect(screen.queryByTestId('marketing-run-drawer')).not.toBeInTheDocument();
    expect(resultFn).not.toHaveBeenCalled();
  });

  it('shows progress under a generic title while the run loads', () => {
    renderWithProviders(<RunDrawer runId="run1" onClose={vi.fn()} onChanged={vi.fn()} />, {
      mocks: [{ ...marketingRunMock(makeRunDetail()), delay: 10_000 }],
    });
    const drawer = screen.getByTestId('marketing-run-drawer');
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Run' })).toBeInTheDocument();
    expect(within(drawer).getByRole('progressbar')).toBeInTheDocument();
    expect(within(drawer).queryByTestId('marketing-run-summary')).not.toBeInTheDocument();
  });

  it('opens the run with its status, facts, approval, steps and calls, titled by name', async () => {
    const onClose = vi.fn();
    renderWithProviders(<RunDrawer runId="run1" onClose={onClose} onChanged={vi.fn()} />, {
      mocks: [marketingRunMock(makeRunDetail({ approval: makeRunApproval({ required: true, decision: 'APPROVED', decided_by_name: 'Meera' }) }))],
    });
    const heading = await screen.findByRole('heading', { level: 2, name: 'Publish: Diwali reel' });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', heading.id);
    const drawer = screen.getByTestId('marketing-run-drawer');
    expect(within(drawer).queryByRole('progressbar')).not.toBeInTheDocument();
    // The run's own chip comes first; the step below it is also "Done".
    expect(within(drawer).getAllByText('Done')[0].closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(within(drawer).getByTestId('marketing-run-summary')).toBeInTheDocument();
    expect(within(drawer).getByTestId('marketing-run-approval')).toHaveTextContent('Meera');
    // A finished run that cannot be retried offers no actions.
    expect(within(drawer).queryByTestId('marketing-run-actions')).not.toBeInTheDocument();
    expect(within(drawer).getByText('Render the reel')).toBeInTheDocument();
    expect(within(drawer).getByText('POST /v21.0/me/media')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reads the run again, and tells the grid, after an action changes it', async () => {
    const onChanged = vi.fn();
    const failed = makeRunDetail({ status: 'FAILED', can_retry: true, error: 'Token expired' });
    const queued = { ...failed, status: 'PENDING' as const, can_retry: false, error: '' };
    const second = marketingRunMock(queued);
    const secondResult = vi.fn(() => second.result as { data: Record<string, unknown> });
    renderWithProviders(<RunDrawer runId="run1" onClose={vi.fn()} onChanged={onChanged} />, {
      mocks: [marketingRunMock(failed), retryMarketingRunMock(makeRunState(queued)), { ...second, result: secondResult }],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(secondResult).toHaveBeenCalledTimes(1));
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith('The run is queued to try again.', 'success');
    expect(await screen.findByText('Queued')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('reports a re-read that fails after an action, rather than keeping the stale run quietly', async () => {
    const failed = makeRunDetail({ status: 'FAILED', can_retry: true });
    renderWithProviders(<RunDrawer runId="run1" onClose={vi.fn()} onChanged={vi.fn()} />, {
      mocks: [marketingRunMock(failed), retryMarketingRunMock(makeRunState({ status: 'PENDING' })), marketingRunErrorMock('run1', 'Run is gone')],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Run is gone', 'error'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Run is gone');
  });

  it('explains a run that could not be loaded', async () => {
    renderWithProviders(<RunDrawer runId="run404" onClose={vi.fn()} onChanged={vi.fn()} />, {
      mocks: [marketingRunErrorMock('run404', 'Run not found')],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Run not found');
    expect(screen.getByRole('heading', { level: 2, name: 'Run' })).toBeInTheDocument();
    expect(screen.queryByTestId('marketing-run-summary')).not.toBeInTheDocument();
  });
});

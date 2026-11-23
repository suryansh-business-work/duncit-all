import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CANCEL_LEAD_DISCOVERY, RETRY_LEAD_DISCOVERY } from '@/api/leadResearch.gql';
import DiscoveriesPanel from '@/pages/lead-research/DiscoveriesPanel';
import LeadResearchPage from '@/pages/lead-research';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { job, jobsMock, tableMock } from './fixtures';

const forbidden = { errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }] };

beforeEach(() => {
  window.localStorage.clear();
});

describe('Lead Research › discoveries', () => {
  it('shows each discovery’s progress, counts, request, plan and failed searches', async () => {
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [jobsMock([job()])]);

    const card = await screen.findByTestId('discovery-job-job1');
    expect(within(card).getByRole('heading', { name: 'Discover 20 venue leads in Bandra, Mumbai', level: 3 })).toBeInTheDocument();
    expect(within(card).getByText('Completed')).toBeInTheDocument();
    expect(card).toHaveTextContent('12 of 20 qualifying leads found');
    expect(within(card).getByRole('progressbar', { name: 'Discovery progress' })).toHaveAttribute('aria-valuenow', '60');
    expect(card).toHaveTextContent('Found30');
    expect(card).toHaveTextContent('Already queued5');
    expect(card).toHaveTextContent('Searches2 of 2');
    expect(card).toHaveTextContent('Score 60+');
    expect(card).toHaveTextContent('Cafes first, then Instagram pages.');
    expect(card).toHaveTextContent('2 planned searches');
    const failures = within(card).getByTestId('job-failures-job1');
    expect(failures).toHaveTextContent('1 search failed');
    expect(failures).toHaveTextContent('Serper rate limit reached');
    // A finished discovery can be run again, not cancelled.
    expect(within(card).queryByTestId('job-cancel-job1')).toBeNull();
    expect(within(card).getByTestId('job-retry-job1')).toBeInTheDocument();
  });

  it('says so when there are no discoveries yet', async () => {
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [jobsMock([])]);
    expect(await screen.findByTestId('discoveries-empty')).toHaveTextContent('No discoveries yet');
  });

  it('cancels a running discovery, and shows why when the server refuses', async () => {
    const running = job({ status: 'RUNNING', finished_at: null, failures: [] });
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [
      jobsMock([running]),
      { request: { query: CANCEL_LEAD_DISCOVERY, variables: { id: 'job1' } }, result: forbidden },
    ]);

    fireEvent.click(await screen.findByTestId('job-cancel-job1'));

    expect(await screen.findByText('Only the person who started this discovery can cancel it.')).toBeInTheDocument();
    expect(screen.queryByTestId('job-retry-job1')).toBeNull();
  });

  it('cancels a running discovery the person started', async () => {
    const running = job({ status: 'RUNNING', finished_at: null, failures: [] });
    const cancelled = job({ status: 'CANCELLED', failures: [] });
    const variables = vi.fn(() => true);
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [
      jobsMock([running]),
      { request: { query: CANCEL_LEAD_DISCOVERY, variables }, result: { data: { cancelCrmLeadDiscovery: cancelled } } },
    ]);

    fireEvent.click(await screen.findByTestId('job-cancel-job1'));

    // The answer replaces the job in the list (same id), so it now offers Run again.
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(variables).toHaveBeenCalledWith({ id: 'job1' });
    expect(screen.getByTestId('job-retry-job1')).toBeInTheDocument();
  });

  it('runs a finished discovery again and lists the new one', async () => {
    const rerun = job({ id: 'job2', status: 'RUNNING', succeeded: 0, finished_at: null, failures: [] });
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [
      jobsMock([job()]),
      { request: { query: RETRY_LEAD_DISCOVERY, variables: { id: 'job1' } }, result: { data: { retryCrmLeadDiscovery: rerun } } },
      jobsMock([rerun, job()]),
    ]);

    fireEvent.click(await screen.findByTestId('job-retry-job1'));

    const card = await screen.findByTestId('discovery-job-job2');
    expect(within(card).getByText('Running')).toBeInTheDocument();
    expect(within(card).getByTestId('job-cancel-job2')).toBeInTheDocument();
  });

  it('reloads the list every 10 seconds while a discovery is running', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const running = job({ status: 'RUNNING', succeeded: 3, finished_at: null, failures: [] });
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [jobsMock([running]), jobsMock([job({ failures: [] })])]);

    expect(await screen.findByText('3 of 20 qualifying leads found')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await screen.findByText('12 of 20 qualifying leads found')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('narrows the review queue to a discovery’s candidates', async () => {
    renderWithApollo(<LeadResearchPage />, [jobsMock([job()]), tableMock([])], { route: '/lead-research?selectedtab=discoveries' });

    fireEvent.click(await screen.findByTestId('job-show-job1'));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('job=job1'));
    expect(screen.getByTestId('location')).toHaveTextContent('selectedtab=queue');
    expect(screen.getByTestId('lead-research-tab-queue')).toHaveAttribute('aria-selected', 'true');
  });
});

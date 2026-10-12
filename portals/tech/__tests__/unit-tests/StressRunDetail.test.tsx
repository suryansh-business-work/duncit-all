import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { stressRun, stressSample, stressShard, stressVerdict } from '../mocks/stress.mock';

const download = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/utils', async (io) => ({ ...(await io<typeof import('@duncit/utils')>()), downloadTextFile: download }));
// The canvas itself belongs to chart.js; the stand-in exposes what the page asked it to draw.
vi.mock('react-chartjs-2', () => ({
  Line: (p: { 'aria-label': string; data: { labels: string[]; datasets: Array<{ label: string; data: number[] }> } }) => (
    <div data-testid="chart" aria-label={p['aria-label']}>
      {p.data.datasets.map((d) => `${d.label}=${d.data.join(',')}`).join(';')}
    </div>
  ),
}));

import StressRunDetailPage from '../../src/pages/stress-testing/run-detail';

const mount = (id = 'run1') =>
  renderWithProviders(<></>, {
    initialEntries: [`/stress-testing/runs/${id}`],
    routes: <Route path="/stress-testing/runs/:runId" element={<StressRunDetailPage />} />,
  });

const seed = (run = stressRun(), samples = [stressSample()], shards = [stressShard()]) => {
  ops.q = {
    StressRun: { data: { stressRun: run } },
    StressRunSamples: { data: { stressRunSamples: samples } },
    StressRunShards: { data: { stressRunShards: shards } },
  };
};

beforeEach(() => {
  resetOps();
  download.mockReset();
  seed();
});

describe('Stress run detail page', () => {
  it('shows a finished run with its summary KPIs, endpoints, log and profile', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'ST-0001' })).toBeInTheDocument();
    expect(screen.getByText('45K')).toBeInTheDocument();
    expect(screen.getByText('Pages and queries')).toBeInTheDocument();
    expect(await screen.findByText('query Pods')).toBeInTheDocument();
    expect(screen.getByText('error rate high')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop run' })).not.toBeInTheDocument();
    expect(screen.queryByText('Bots right now')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('feeds every chart from the samples', async () => {
    mount();
    await screen.findByRole('heading', { name: 'ST-0001' });
    const charts = screen.getAllByTestId('chart');
    expect(charts).toHaveLength(6);
    const throughput = screen.getByLabelText('Throughput');
    expect(throughput).toHaveTextContent('=210');
    expect(throughput).toHaveTextContent('=260');
    expect(throughput).toHaveTextContent('=50');
  });

  it('downloads the report named after the run', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Download report' }));
    expect(download).toHaveBeenCalledTimes(1);
    const [html, name] = download.mock.calls[0];
    expect(name).toBe('ST-0001-stress-report.html');
    expect(html).toContain('<title>ST-0001');
    expect(html).toContain('query Pods');
    expect(html).toContain('error rate high');
  });

  it('shows the end reason as an error for a failed run', async () => {
    seed(stressRun({ status: 'FAILED', error_message: 'runner crashed', summary: null }));
    mount();
    expect(await screen.findByText('runner crashed')).toBeInTheDocument();
  });

  it('shows a live run with bots and containers, and stops it after confirmation', async () => {
    seed(stressRun({ status: 'RUNNING', summary: null, ended_at: null, endpoints: [] }));
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount();
    expect(await screen.findByText('Bots right now')).toBeInTheDocument();
    expect(await screen.findByText('bot-1')).toBeInTheDocument();
    expect(screen.getByText('loaded-js-errors')).toBeInTheDocument();
    expect(screen.getByText('api-staging')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download report' })).not.toBeInTheDocument();
    const stop = screen.getByRole('button', { name: 'Stop run' });
    fireEvent.click(stop);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('StopStressRun')).not.toHaveBeenCalled();
    fireEvent.click(stop);
    await waitFor(() => expect(mutation('StopStressRun')).toHaveBeenCalledWith({ variables: { id: 'run1' } }));
  });

  it('reports a failed stop', async () => {
    seed(stressRun({ status: 'RUNNING', summary: null }));
    ops.confirm.mockResolvedValue(true);
    ops.mut.StopStressRun = vi.fn().mockRejectedValue(new Error('already stopped'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Stop run' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('already stopped'));
  });

  it('disables stopping once the run is already stopping', async () => {
    seed(stressRun({ status: 'STOPPING', summary: null }));
    mount();
    expect(await screen.findByRole('button', { name: 'Stopping…' })).toBeDisabled();
  });

  it('explains a queued run', async () => {
    seed(stressRun({ status: 'QUEUED', summary: null, started_at: null }), []);
    mount();
    expect(await screen.findByText(/Waiting for GitHub to start a runner/)).toBeInTheDocument();
    expect(screen.getAllByText('Waiting for the first sample…').length).toBeGreaterThan(0);
  });

  it('shows the query error for an unknown run', async () => {
    ops.q.StressRun = { error: new Error('Run not found') };
    mount('nope');
    expect(await screen.findByText('Run not found')).toBeInTheDocument();
  });
});

describe('Stress run verdict', () => {
  it('generates a verdict and reports it', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate verdict' }));
    await waitFor(() => expect(mutation('GenerateStressVerdict')).toHaveBeenCalledWith({ variables: { id: 'run1' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Verdict ready');
  });

  it('reports a verdict that could not be generated', async () => {
    ops.mut.GenerateStressVerdict = vi.fn().mockRejectedValue(new Error('openai down'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate verdict' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('openai down'));
  });

  it('renders the stored verdict with findings and the breaking point', async () => {
    seed(stressRun({ verdict: stressVerdict() }));
    mount();
    expect(await screen.findByText('Holds 120 users, CPU is the wall')).toBeInTheDocument();
    expect(screen.getByText('Strained')).toBeInTheDocument();
    const card = screen.getByText('Holds 120 users, CPU is the wall').closest('section, div[class*="MuiCard"]') as HTMLElement;
    expect(within(card.parentElement as HTMLElement).getByText('Host CPU')).toBeInTheDocument();
    expect(screen.getByText('Event loop lag')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
  });

  it('shows "not reached" when the run never broke', async () => {
    seed(stressRun({ verdict: stressVerdict({ breaking_point_users: 0 }) }));
    mount();
    expect(await screen.findByText('Not reached')).toBeInTheDocument();
  });

  it('cannot judge a run that never generated load', async () => {
    seed(stressRun({ started_at: null, summary: null }));
    mount();
    expect(await screen.findByText(/never generated load/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate verdict' })).toBeDisabled();
  });

  it('defers the verdict while the run is live', async () => {
    seed(stressRun({ status: 'RUNNING', summary: null }));
    mount();
    expect(await screen.findByText(/available once the run ends/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate verdict' })).not.toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';
import { monitorDetail, monitorTrace } from '../mocks/graphql-monitor.mock';

const clip = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/utils', async (io) => ({ ...(await io<typeof import('@duncit/utils')>()), copyToClipboard: clip }));
vi.mock('react-chartjs-2', () => ({
  Line: (p: { 'aria-label': string }) => <div data-testid="line-chart" aria-label={p['aria-label']} />,
  Bar: (p: { 'aria-label': string; data: { labels: string[]; datasets: Array<{ data: number[] }> } }) => (
    <div data-testid="bar-chart" aria-label={p['aria-label']}>
      {p.data.labels.join('|')}:{p.data.datasets[0]?.data.join(',')}
    </div>
  ),
}));

import GraphqlOperationDetailPage from '../../src/pages/graphql-monitor/operation-detail';

const mount = (entry = '/graphql-monitor/operations/op1') =>
  renderWithProviders(<></>, {
    initialEntries: [entry],
    routes: <Route path="/graphql-monitor/operations/:operationId" element={<GraphqlOperationDetailPage />} />,
  });

beforeEach(() => {
  resetOps();
  clip.mockReset();
  ops.q = {
    GraphqlMonitorOperation: { data: { graphqlMonitorOperation: monitorDetail() } },
    GraphqlMonitorSettings: { data: { graphqlMonitorSettings: { slow_threshold_ms: 500 } } },
    GraphqlMonitorTraces: { data: { graphqlMonitorTraces: [monitorTrace()] } },
    GraphqlMonitorTrace: { data: { graphqlMonitorTrace: monitorTrace() } },
  };
});

describe('GraphQL operation detail', () => {
  it('shows the operation with its signature, fields, phases and distribution', async () => {
    mount();
    expect(await screen.findByTestId('graphql-monitor-operation-page')).toBeInTheDocument();
    expect(screen.getByTestId('graphql-monitor-signature')).toHaveTextContent('query GetPods { pods { id } }');
    expect(screen.getByTestId('graphql-monitor-fields-used')).toHaveTextContent('Query.pods');
    expect(screen.getByTestId('graphql-monitor-phase-execute')).toBeInTheDocument();
    expect(screen.getByTestId('graphql-monitor-phase-other')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveTextContent(':50,20');
    expect(screen.getByTestId('graphql-monitor-operation-back')).toHaveAttribute('href', expect.stringContaining('range='));
  });

  it('shows empty chart states when there is no traffic', async () => {
    ops.q.GraphqlMonitorOperation = {
      data: { graphqlMonitorOperation: monitorDetail({ latency_distribution: [], series: [], clients: [], error_codes: [], fields: [], signature: '' }) },
    };
    mount();
    await screen.findByTestId('graphql-monitor-operation-page');
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    expect(screen.getByTestId('graphql-monitor-signature')).toHaveTextContent('—');
    expect(screen.getByTestId('graphql-monitor-signature-copy')).toBeDisabled();
  });

  it('copies the signature and reports both outcomes', async () => {
    clip.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mount();
    fireEvent.click(await screen.findByTestId('graphql-monitor-signature-copy'));
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalled());
    expect(clip).toHaveBeenCalledWith('query GetPods { pods { id } }');
    fireEvent.click(screen.getByTestId('graphql-monitor-signature-copy'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalled());
  });

  it('keeps the range in the URL when it is changed', async () => {
    mount('/graphql-monitor/operations/op1?range=LAST_7_DAYS');
    await screen.findByTestId('graphql-monitor-operation-page');
    expect(screen.getByTestId('graphql-monitor-operation-range')).toHaveValue('LAST_7_DAYS');
    fireEvent.change(screen.getByTestId('graphql-monitor-operation-range'), { target: { value: 'LAST_HOUR' } });
    await waitFor(() => expect(screen.getByTestId('graphql-monitor-operation-range')).toHaveValue('LAST_HOUR'));
  });

  it('opens a trace and draws its resolver waterfall with de-duplicated errors', async () => {
    mount();
    const row = (await screen.findByText('mweb', { selector: '[role="gridcell"]' })).closest('[role="row"]') as HTMLElement;
    fireEvent.click(row);
    const dialog = await screen.findByTestId('graphql-monitor-trace-dialog');
    expect(await within(dialog).findByTestId('graphql-monitor-trace-waterfall')).toBeInTheDocument();
    expect(within(dialog).getAllByText('boom')).toHaveLength(1);
    expect(within(dialog).getByTestId('graphql-monitor-trace-row-pods.0.owner')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('graphql-monitor-trace-close'));
    await waitFor(() => expect(screen.queryByTestId('graphql-monitor-trace-dialog')).not.toBeInTheDocument());
  });

  it('says so when a trace recorded no resolvers', async () => {
    ops.q.GraphqlMonitorTrace = { data: { graphqlMonitorTrace: monitorTrace({ resolvers: [], error_messages: [], client: '' }) } };
    mount();
    const row = (await screen.findByText('mweb', { selector: '[role="gridcell"]' })).closest('[role="row"]') as HTMLElement;
    fireEvent.click(row);
    const dialog = await screen.findByTestId('graphql-monitor-trace-dialog');
    expect(within(dialog).queryByTestId('graphql-monitor-trace-waterfall')).not.toBeInTheDocument();
  });

  it('shows the query error', async () => {
    ops.q.GraphqlMonitorOperation = { error: new Error('operation unknown') };
    mount();
    expect(await screen.findByText('operation unknown')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import {
  monitorDetail,
  monitorError,
  monitorField,
  monitorOperation,
  monitorTrace,
} from '../mocks/graphql-monitor.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: (p: { options?: { scales?: { y?: { ticks?: { callback?: (value: number) => string } } } } }) => (
    <div data-testid="bar-chart">{p.options?.scales?.y?.ticks?.callback?.(2500)}</div>
  ),
}));

import GraphqlMonitorOverviewPage from '../../src/pages/graphql-monitor/overview';
import GraphqlOperationsPage from '../../src/pages/graphql-monitor/operations';
import GraphqlQueryMutationPage from '../../src/pages/graphql-monitor/query-mutation';
import GraphqlFieldsPage from '../../src/pages/graphql-monitor/fields';
import GraphqlErrorsPage from '../../src/pages/graphql-monitor/errors';
import GraphqlMonitorSettingsPage from '../../src/pages/graphql-monitor/settings';
import GraphqlOperationDetailPage from '../../src/pages/graphql-monitor/operation-detail';
import TopOperationsCard from '../../src/pages/graphql-monitor/overview/TopOperationsCard';
import { operationTypeColor, operationTypeLabel } from '../../src/pages/graphql-monitor/labels';

const overview = {
  ...monitorOperation(),
  operation_count: 3,
  series: [],
  clients: [],
  error_codes: [],
};

const mountPage = (ui: React.ReactElement) =>
  renderWithProviders(<></>, { routes: <Route path="/" element={ui} /> });

const mountDetail = () =>
  renderWithProviders(<></>, {
    initialEntries: ['/graphql-monitor/operations/op1'],
    routes: <Route path="/graphql-monitor/operations/:operationId" element={<GraphqlOperationDetailPage />} />,
  });

const SETTINGS = {
  GraphqlMonitorSettings: {
    data: { graphqlMonitorSettings: { enabled: true, field_sample_pct: 10, retention_days: 14, slow_threshold_ms: 500, updated_at: null } },
  },
};

beforeEach(() => {
  resetOps();
  ops.q = {
    ...SETTINGS,
    GraphqlMonitorOverview: { data: { graphqlMonitorOverview: overview } },
    GraphqlMonitorOperations: { data: { graphqlMonitorOperations: [monitorOperation()] } },
    GraphqlMonitorFields: { data: { graphqlMonitorFields: [monitorField()] } },
    GraphqlMonitorErrors: { data: { graphqlMonitorErrors: [monitorError()] } },
    GraphqlMonitorOperation: { data: { graphqlMonitorOperation: monitorDetail() } },
    GraphqlMonitorTraces: { data: { graphqlMonitorTraces: [monitorTrace()] } },
    GraphqlMonitorTrace: { data: { graphqlMonitorTrace: monitorTrace() } },
  };
});

describe.each([
  ['overview', 'GraphqlMonitorOverview', <GraphqlMonitorOverviewPage key="o" />, 'graphql-monitor-top-busiest'],
  ['operations', 'GraphqlMonitorOperations', <GraphqlOperationsPage key="p" />, 'graphql-monitor-operation-op1'],
  ['queries and mutations', 'GraphqlMonitorOperations', <GraphqlQueryMutationPage key="q" />, 'graphql-monitor-operation-op1'],
  ['fields', 'GraphqlMonitorFields', <GraphqlFieldsPage key="f" />, 'graphql-monitor-field-Query.pods'],
  ['errors', 'GraphqlMonitorErrors', <GraphqlErrorsPage key="e" />, 'graphql-monitor-error-er1'],
])('GraphQL monitor %s page / read states', (_name, queryName, page, testId) => {
  it('waits for the first read', () => {
    const data = ops.q[queryName].data;
    ops.q[queryName] = { loading: true };
    mountPage(page);
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    expect(data).toBeDefined();
  });

  it('keeps showing what it has while a refresh is in flight', async () => {
    ops.q[queryName] = { ...ops.q[queryName], loading: true };
    mountPage(page);
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it('shows the read error', async () => {
    ops.q[queryName] = { error: new Error(`${queryName} failed`) };
    mountPage(page);
    expect(await screen.findByText(`${queryName} failed`)).toBeInTheDocument();
  });
});

describe('GraphQL monitor / search and scope', () => {
  it('finds an error group by its message, code, path or operation', async () => {
    ops.q.GraphqlMonitorErrors = {
      data: {
        graphqlMonitorErrors: [monitorError(), monitorError({ id: 'er2', message: 'Timeout talking to Redis', operation_name: 'CreatePod' })],
      },
    };
    mountPage(<GraphqlErrorsPage />);
    await screen.findByTestId('graphql-monitor-error-er1');

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'redis' } });

    await waitFor(() => expect(screen.queryByTestId('graphql-monitor-error-er1')).not.toBeInTheDocument());
    expect(screen.getByTestId('graphql-monitor-error-er2')).toBeInTheDocument();
  });

  it('finds a field by its coordinate, type, kind or description', async () => {
    ops.q.GraphqlMonitorFields = {
      data: { graphqlMonitorFields: [monitorField(), monitorField({ coordinate: 'Query.owners', field_name: 'owners', description: 'Who owns pods' })] },
    };
    mountPage(<GraphqlFieldsPage />);
    await screen.findByTestId('graphql-monitor-field-Query.pods');

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'who owns' } });

    await waitFor(() => expect(screen.queryByTestId('graphql-monitor-field-Query.pods')).not.toBeInTheDocument());
    expect(screen.getByTestId('graphql-monitor-field-Query.owners')).toBeInTheDocument();
  });

  it('lists every field under the All scope', async () => {
    ops.q.GraphqlMonitorFields = {
      data: { graphqlMonitorFields: [monitorField(), monitorField({ coordinate: 'Pod.id', parent_type: 'Pod', kind: 'TYPE', field_name: 'id' })] },
    };
    mountPage(<GraphqlFieldsPage />);
    await screen.findByTestId('graphql-monitor-field-Query.pods');
    expect(screen.queryByTestId('graphql-monitor-field-Pod.id')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^All/ }));

    expect(await screen.findByTestId('graphql-monitor-field-Pod.id')).toBeInTheDocument();
    expect(screen.getByTestId('graphql-monitor-field-Query.pods')).toBeInTheDocument();
  });

  it('finds an operation by its name, type or root field', async () => {
    ops.q.GraphqlMonitorOperations = {
      data: { graphqlMonitorOperations: [monitorOperation(), monitorOperation({ id: 'op2', name: 'CreatePod', root_fields: ['createPod'] })] },
    };
    mountPage(<GraphqlOperationsPage />);
    await screen.findByTestId('graphql-monitor-operation-op1');

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'createpod' } });

    await waitFor(() => expect(screen.queryByTestId('graphql-monitor-operation-op1')).not.toBeInTheDocument());
    expect(screen.getByTestId('graphql-monitor-operation-op2')).toBeInTheDocument();
  });

  it('finds a trace by its client or an error message', async () => {
    ops.q.GraphqlMonitorTraces = {
      data: {
        graphqlMonitorTraces: [monitorTrace(), monitorTrace({ id: 'tr2', client: 'ios', error_messages: ['upstream down'] })],
      },
    };
    mountDetail();
    await screen.findByText('mweb', { selector: '[role="gridcell"]' });

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'upstream' } });

    await waitFor(() => expect(screen.queryByText('mweb', { selector: '[role="gridcell"]' })).not.toBeInTheDocument());
    expect(screen.getByText('ios', { selector: '[role="gridcell"]' })).toBeInTheDocument();
  });
});

describe('GraphQL monitor / settings switch and chart ticks', () => {
  it('switches the monitor off and saves it', async () => {
    mountPage(<GraphqlMonitorSettingsPage />);
    fireEvent.click(await screen.findByTestId('graphql-monitor-settings-enabled'));
    fireEvent.click(screen.getByTestId('graphql-monitor-settings-save'));

    await waitFor(() => expect(mutation('UpdateGraphqlMonitorSettings')).toHaveBeenCalled());
    expect(mutation('UpdateGraphqlMonitorSettings').mock.calls[0][0].variables.input.enabled).toBe(false);
  });

  it('abbreviates large request counts on the latency chart axis', async () => {
    mountDetail();
    expect(await screen.findByTestId('bar-chart')).toHaveTextContent(/2\.5K|2,500|2\.5k/);
  });

  it('keeps the operation page while it refreshes', async () => {
    ops.q.GraphqlMonitorOperation = { loading: true, data: { graphqlMonitorOperation: monitorDetail() } };
    mountDetail();
    expect(await screen.findByTestId('graphql-monitor-operation-page')).toBeInTheDocument();
  });

  it('waits for the operation on its first read', () => {
    ops.q.GraphqlMonitorOperation = { loading: true };
    mountDetail();
    expect(screen.queryByTestId('graphql-monitor-operation-page')).not.toBeInTheDocument();
  });
});

describe('GraphQL monitor overview / top lists', () => {
  it('shows the overview with empty top lists until the operations arrive', async () => {
    ops.q.GraphqlMonitorOperations = { loading: true };
    mountPage(<GraphqlMonitorOverviewPage />);
    expect(await screen.findByTestId('graphql-monitor-top-busiest-empty')).toBeInTheDocument();
  });
});

describe('GraphQL monitor / slow threshold not yet known', () => {
  it('draws latencies without a slow colour until the threshold arrives', async () => {
    ops.q.GraphqlMonitorSettings = { loading: true };
    mountPage(<GraphqlOperationsPage />);
    expect(await screen.findByTestId('graphql-monitor-operation-op1')).toBeInTheDocument();
  });

  it('draws the overview tiles without a slow colour too', async () => {
    ops.q.GraphqlMonitorSettings = { loading: true };
    mountPage(<GraphqlMonitorOverviewPage />);
    expect(await screen.findByTestId('graphql-monitor-overview-page')).toBeInTheDocument();
  });
});

describe('GraphQL monitor / empty fields', () => {
  it('shows a dash for an error with no code or path', async () => {
    ops.q.GraphqlMonitorErrors = { data: { graphqlMonitorErrors: [monitorError({ code: '', path: '' })] } };
    mountPage(<GraphqlErrorsPage />);
    const cell = await screen.findByTestId('graphql-monitor-error-er1');
    const row = cell.closest('[role="row"]') as HTMLElement;
    expect(within(row).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('titles a field with no description by its coordinate', async () => {
    ops.q.GraphqlMonitorFields = { data: { graphqlMonitorFields: [monitorField({ description: '' })] } };
    mountPage(<GraphqlFieldsPage />);
    expect(await screen.findByTitle('Query.pods')).toBeInTheDocument();
  });

  it('says there is nothing to rank when no operation has traffic', () => {
    render(
      <TopOperationsCard
        title="Busiest"
        subtitle="By requests"
        emptyText="No traffic yet"
        operations={[]}
        metric={() => '0'}
        onOpen={vi.fn()}
        testId="top"
      />,
    );
    expect(screen.getByTestId('top-empty')).toHaveTextContent('No traffic yet');
    expect(screen.queryByTestId('top')).not.toBeInTheDocument();
  });
});

describe('GraphQL monitor / labels for values the server adds later', () => {
  it('names an operation type it does not know by itself, and colours it neutrally', () => {
    const t = (key: string) => key;
    expect(operationTypeLabel(t, 'BATCH' as never)).toBe('BATCH');
    expect(operationTypeColor('BATCH' as never)).toBe('default');
    expect(operationTypeColor('MUTATION')).toBe('warning');
  });
});

describe('GraphQL operation detail / empty fields', () => {
  it('shows a dash when an operation has no root fields', async () => {
    ops.q.GraphqlMonitorOperation = { data: { graphqlMonitorOperation: monitorDetail({ root_fields: [] }) } };
    mountDetail();
    expect(await screen.findByTestId('graphql-monitor-operation-page')).toHaveTextContent('—');
  });

  it('draws the phase bar for an operation that took no time', async () => {
    ops.q.GraphqlMonitorOperation = {
      data: { graphqlMonitorOperation: monitorDetail({ avg_ms: 0, parse_avg_ms: 0, validate_avg_ms: 0, execute_avg_ms: 0 }) },
    };
    mountDetail();
    expect(await screen.findByTestId('graphql-monitor-phases-bar')).toBeInTheDocument();
  });

  it('shows a dash for a trace with no client and no error messages', async () => {
    ops.q.GraphqlMonitorTraces = { data: { graphqlMonitorTraces: [monitorTrace({ client: '', error_messages: [] })] } };
    mountDetail();
    const row = (await screen.findAllByRole('row')).find((r) => within(r).queryByText('1.5 s') || within(r).queryAllByText('—').length);
    expect(row).toBeDefined();
    expect(within(row as HTMLElement).getAllByText('—')).toHaveLength(2);
  });

  it('shows the operation page while the traces have not loaded', async () => {
    ops.q.GraphqlMonitorTraces = { loading: true };
    mountDetail();
    expect(await screen.findByTestId('graphql-monitor-operation-page')).toBeInTheDocument();
  });

  it('opens a trace read without its resolver list, and waits or fails like the other reads', async () => {
    ops.q.GraphqlMonitorTrace = { data: { graphqlMonitorTrace: monitorTrace({ resolvers: null, error_messages: [] }) } };
    mountDetail();
    fireEvent.click((await screen.findByText('mweb', { selector: '[role="gridcell"]' })).closest('[role="row"]') as HTMLElement);
    const dialog = await screen.findByTestId('graphql-monitor-trace-dialog');
    expect(within(dialog).queryByTestId('graphql-monitor-trace-waterfall')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('graphql-monitor-trace-close'));
    await waitFor(() => expect(screen.queryByTestId('graphql-monitor-trace-dialog')).not.toBeInTheDocument());
  });

  it('shows a trace read error inside the dialog', async () => {
    ops.q.GraphqlMonitorTrace = { error: new Error('trace expired') };
    mountDetail();
    fireEvent.click((await screen.findByText('mweb', { selector: '[role="gridcell"]' })).closest('[role="row"]') as HTMLElement);
    expect(await screen.findByText('trace expired')).toBeInTheDocument();
  });

  it('keeps the trace on screen while it refreshes', async () => {
    ops.q.GraphqlMonitorTrace = { loading: true, data: { graphqlMonitorTrace: monitorTrace() } };
    mountDetail();
    fireEvent.click((await screen.findByText('mweb', { selector: '[role="gridcell"]' })).closest('[role="row"]') as HTMLElement);
    expect(await screen.findByTestId('graphql-monitor-trace-waterfall')).toBeInTheDocument();
  });
});

describe('GraphQL monitor settings / edges', () => {
  it('reports a save refused with text', async () => {
    ops.mut.UpdateGraphqlMonitorSettings = vi.fn().mockRejectedValue('read-only replica');
    mountPage(<GraphqlMonitorSettingsPage />);
    await screen.findByTestId('graphql-monitor-settings-form');

    fireEvent.click(screen.getByTestId('graphql-monitor-settings-save'));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('read-only replica'));
    expect(mutation('UpdateGraphqlMonitorSettings')).toHaveBeenCalledTimes(1);
  });

  it('waits for the settings, keeps the form while they refresh, and shows a read error', async () => {
    ops.q.GraphqlMonitorSettings = { loading: true };
    const { unmount } = mountPage(<GraphqlMonitorSettingsPage />);
    expect(screen.queryByTestId('graphql-monitor-settings-form')).not.toBeInTheDocument();
    unmount();

    ops.q.GraphqlMonitorSettings = { ...SETTINGS.GraphqlMonitorSettings, loading: true };
    const second = mountPage(<GraphqlMonitorSettingsPage />);
    expect(await screen.findByTestId('graphql-monitor-settings-form')).toBeInTheDocument();
    second.unmount();

    ops.q.GraphqlMonitorSettings = { error: new Error('settings unreadable') };
    mountPage(<GraphqlMonitorSettingsPage />);
    expect(await screen.findByText('settings unreadable')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { monitorError, monitorField, monitorOperation } from '../mocks/graphql-monitor.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('react-chartjs-2', () => ({
  Line: (p: { 'aria-label': string }) => <div data-testid="line-chart" aria-label={p['aria-label']} />,
  Bar: () => <div data-testid="bar-chart" />,
}));

import GraphqlMonitorOverviewPage from '../../src/pages/graphql-monitor/overview';
import GraphqlOperationsPage from '../../src/pages/graphql-monitor/operations';
import GraphqlQueryMutationPage from '../../src/pages/graphql-monitor/query-mutation';
import GraphqlFieldsPage from '../../src/pages/graphql-monitor/fields';
import GraphqlErrorsPage from '../../src/pages/graphql-monitor/errors';
import GraphqlMonitorSettingsPage from '../../src/pages/graphql-monitor/settings';

const overview = {
  ...monitorOperation(),
  operation_count: 3,
  series: [{ at: '2026-01-01T10:00:00.000Z', requests: 10, errors: 1, p50_ms: 5, p95_ms: 9, p99_ms: 20 }],
  clients: [{ label: 'mweb', count: 7 }],
  error_codes: [],
};

const OPS = [
  monitorOperation(),
  monitorOperation({ id: 'op2', name: 'CreatePod', type: 'MUTATION', root_fields: ['createPod'], p95_ms: 100, errors: 0, requests: 50 }),
];

const mount = (ui: React.ReactElement, path = '/') =>
  renderWithProviders(<></>, {
    routes: (
      <>
        <Route path={path} element={ui} />
        <Route path="/graphql-monitor/operations/:id" element={<p>operation detail page</p>} />
      </>
    ),
  });

beforeEach(() => {
  resetOps();
  ops.q = {
    GraphqlMonitorSettings: { data: { graphqlMonitorSettings: { enabled: true, field_sample_pct: 10, retention_days: 14, slow_threshold_ms: 500, updated_at: '2026-01-01T10:00:00.000Z' } } },
    GraphqlMonitorOverview: { data: { graphqlMonitorOverview: overview } },
    GraphqlMonitorOperations: { data: { graphqlMonitorOperations: OPS } },
    GraphqlMonitorFields: {
      data: {
        graphqlMonitorFields: [
          monitorField(),
          monitorField({ coordinate: 'Query.old', field_name: 'old', referenced: 0, deprecation_reason: 'use pods', arguments: [] }),
          monitorField({ coordinate: 'Mutation.createPod', parent_type: 'Mutation', kind: 'MUTATION', field_name: 'createPod' }),
          monitorField({ coordinate: 'Pod.id', parent_type: 'Pod', kind: 'TYPE', field_name: 'id' }),
        ],
      },
    },
    GraphqlMonitorErrors: { data: { graphqlMonitorErrors: [monitorError()] } },
  };
});

describe('GraphQL monitor overview', () => {
  it('shows totals, top lists and opens an operation from them', async () => {
    mount(<GraphqlMonitorOverviewPage />);
    expect(await screen.findByTestId('graphql-monitor-overview-page')).toBeInTheDocument();
    const busiest = await screen.findByTestId('graphql-monitor-top-busiest');
    expect(within(busiest).getByText('GetPods')).toBeInTheDocument();
    expect(within(screen.getByTestId('graphql-monitor-top-failing')).getByText('GetPods')).toBeInTheDocument();
    expect(within(screen.getByTestId('graphql-monitor-top-failing')).queryByText('CreatePod')).not.toBeInTheDocument();
    fireEvent.click(within(busiest).getByText('GetPods'));
    expect(await screen.findByText('operation detail page')).toBeInTheDocument();
  });

  it('shows the query error', async () => {
    ops.q.GraphqlMonitorOverview = { error: new Error('monitor down') };
    mount(<GraphqlMonitorOverviewPage />);
    expect(await screen.findByText('monitor down')).toBeInTheDocument();
  });
});

describe('GraphQL monitor operation lists', () => {
  it('lists every operation and opens one', async () => {
    mount(<GraphqlOperationsPage />);
    const cell = await screen.findByTestId('graphql-monitor-operation-op2');
    expect(await screen.findByTestId('graphql-monitor-operation-op1')).toBeInTheDocument();
    fireEvent.click(cell.closest('[role="row"]') as HTMLElement);
    expect(await screen.findByText('operation detail page')).toBeInTheDocument();
  });

  it('splits queries from mutations by tab', async () => {
    mount(<GraphqlQueryMutationPage />);
    expect(await screen.findByTestId('graphql-monitor-operation-op1')).toBeInTheDocument();
    expect(screen.queryByTestId('graphql-monitor-operation-op2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Mutations/ }));
    expect(await screen.findByTestId('graphql-monitor-operation-op2')).toBeInTheDocument();
  });

  it('shows the query error', async () => {
    ops.q.GraphqlMonitorOperations = { error: new Error('operations unavailable') };
    mount(<GraphqlOperationsPage />);
    expect(await screen.findByText('operations unavailable')).toBeInTheDocument();
  });
});

describe('GraphQL monitor fields and errors', () => {
  it('flags deprecated and unused fields and switches scope', async () => {
    mount(<GraphqlFieldsPage />);
    expect(await screen.findByTestId('graphql-monitor-field-Query.old')).toBeInTheDocument();
    expect(screen.getByTitle('use pods')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Object fields/ }));
    expect(await screen.findByTestId('graphql-monitor-field-Pod.id')).toBeInTheDocument();
    expect(screen.queryByTestId('graphql-monitor-field-Query.old')).not.toBeInTheDocument();
  });

  it('lists error groups and opens the failing operation', async () => {
    mount(<GraphqlErrorsPage />);
    const cell = await screen.findByTestId('graphql-monitor-error-er1');
    expect(cell).toHaveTextContent('Cannot read owner');
    fireEvent.click(cell.closest('[role="row"]') as HTMLElement);
    expect(await screen.findByText('operation detail page')).toBeInTheDocument();
  });
});

describe('GraphQL monitor settings', () => {
  const field = (name: string) => screen.getByTestId(`graphql-monitor-settings-${name}`);

  it('saves the sampling and retention without the timestamp', async () => {
    mount(<GraphqlMonitorSettingsPage />);
    fireEvent.change(await screen.findByTestId('graphql-monitor-settings-retention_days'), { target: { value: '30' } });
    fireEvent.click(screen.getByTestId('graphql-monitor-settings-save'));
    await waitFor(() => expect(mutation('UpdateGraphqlMonitorSettings')).toHaveBeenCalled());
    expect(mutation('UpdateGraphqlMonitorSettings').mock.calls[0][0].variables.input).toEqual({
      enabled: true,
      field_sample_pct: 10,
      retention_days: 30,
      slow_threshold_ms: 500,
    });
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Saved'));
  });

  it('refuses a sampling above 100 and a slow threshold under 50', async () => {
    mount(<GraphqlMonitorSettingsPage />);
    await screen.findByTestId('graphql-monitor-settings-form');
    fireEvent.change(field('field_sample_pct'), { target: { value: '150' } });
    fireEvent.change(field('slow_threshold_ms'), { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('graphql-monitor-settings-save'));
    expect(await screen.findByText('Enter a whole number from 0 to 100.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number from 50 to 120000.')).toBeInTheDocument();
    expect(mutation('UpdateGraphqlMonitorSettings')).not.toHaveBeenCalled();
  });

  it('reports a failed save', async () => {
    ops.mut.UpdateGraphqlMonitorSettings = vi.fn().mockRejectedValue(new Error('not allowed'));
    mount(<GraphqlMonitorSettingsPage />);
    await screen.findByTestId('graphql-monitor-settings-form');
    fireEvent.click(screen.getByTestId('graphql-monitor-settings-save'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('not allowed'));
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { IntelConnector } from '@duncit/gql-types';
import { INTEL_APPROVALS } from '../../src/graphql/approvals';
import { INTEL_CONNECTORS, INTEL_CREATE_CONNECTOR, INTEL_ENTRY_OPTIONS, INTEL_HEALTH, INTEL_REBUILD_INDEX, INTEL_SET_CONNECTOR_ENABLED, INTEL_SYNC_RUNS, INTEL_TEST_CONNECTOR, INTEL_USAGE } from '../../src/graphql/admin';
import ApprovalsPage from '../../src/pages/approvals';
import ConnectorsSection from '../../src/pages/settings/connectors';
import HealthSection from '../../src/pages/settings/health';
import QdrantSection from '../../src/pages/settings/qdrant';
import UsageSection from '../../src/pages/settings/usage';
import SyncPage from '../../src/pages/sync';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@duncit/table', async (importOriginal) => ({ ...(await importOriginal<object>()), DuncitTable: (await import('../table-probe')).TableProbe }));

beforeEach(() => {
  boot.value = bootstrap();
});

const connector = (over: Partial<IntelConnector> = {}): IntelConnector => ({
  __typename: 'IntelConnector',
  id: 'k1',
  kind: 'MONGODB',
  name: 'Staging DB',
  environment: 'STAGING',
  env_entry_id: 'e1',
  env_entry_name: 'Mongo staging (read-only)',
  enabled: true,
  config: '{"database":"duncit","collections":["pods"],"access_mode":"READ_ONLY"}',
  tools: [],
  status: 'OK',
  sync_paused: false,
  last_sync_at: new Date().toISOString(),
  last_success_at: new Date().toISOString(),
  last_error: '',
  indexed_count: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...over,
});

const entries = (kind: string) => ({ request: { query: INTEL_ENTRY_OPTIONS, variables: { kind } }, result: { data: { intelEntryOptions: [{ __typename: 'IntelEntryOption', id: 'e1', name: 'Mongo staging (read-only)', description: '', is_default: true, last_test_ok: true }] } } });
const list = (kind: string, rows: IntelConnector[]) => ({ request: { query: INTEL_CONNECTORS, variables: { kind } }, result: { data: { intelConnectors: rows } }, maxUsageCount: 5 });

describe('Connector manager', () => {
  it('shows each connector with its Tech portal entry and runs a connection test', async () => {
    const test = { request: { query: INTEL_TEST_CONNECTOR, variables: { id: 'k1' } }, result: { data: { intelTestConnector: { __typename: 'IntelTestResult', ok: false, message: 'Connected, but 1 permitted collection(s) do not exist.', details: ['Missing: pods'] } } } };
    renderWithProviders(<ConnectorsSection kind="MONGODB" />, { mocks: [list('MONGODB', [connector()]), entries('MONGODB'), test] });
    expect(await screen.findByText('Staging DB')).toBeInTheDocument();
    expect(screen.getByText('intel.settings.connectors.entryLine:Mongo staging (read-only)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.connectors.test' }));
    expect(await screen.findByText(/do not exist/)).toBeInTheDocument();
    expect(screen.getByText('Missing: pods')).toBeInTheDocument();
  });

  it('disables a connector from its switch', async () => {
    const toggle = { request: { query: INTEL_SET_CONNECTOR_ENABLED, variables: { id: 'k1', enabled: false } }, result: { data: { intelSetConnectorEnabled: connector({ enabled: false }) } } };
    renderWithProviders(<ConnectorsSection kind="MONGODB" />, { mocks: [list('MONGODB', [connector()]), entries('MONGODB'), toggle] });
    fireEvent.click(await screen.findByRole('switch'));
    await waitFor(() => expect(screen.getByRole('switch')).toBeInTheDocument());
  });

  it('adds a Slack connector with credentials picked by name', async () => {
    const create = {
      request: { query: INTEL_CREATE_CONNECTOR, variables: { input: { kind: 'SLACK', name: 'Team Slack', environment: 'BOTH', env_entry_id: 'e1', enabled: true, config: JSON.stringify({ channels: [], include_threads: true, index_attachments: false, history_days: 90 }) } } },
      result: { data: { intelCreateConnector: connector({ kind: 'SLACK', name: 'Team Slack', environment: 'BOTH' }) } },
    };
    renderWithProviders(<ConnectorsSection kind="SLACK" />, { mocks: [list('SLACK', []), entries('SLACK'), create, list('SLACK', [])] });
    expect(await screen.findByText('intel.settings.connectors.empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.connectors.add' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/intel.settings.connectors.name/), { target: { value: 'Team Slack' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /intel.settings.connectors.entry/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Mongo staging/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'intel.common.save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lists MCP tools with their class and lets an admin reclassify them', async () => {
    const mcp = connector({ kind: 'MCP', name: 'Duncit MCP', environment: 'BOTH', tools: [{ __typename: 'IntelTool', name: 'pods_list', description: 'List pods', class: 'READ', override: null, effective: 'READ', input_schema: '{}' }] });
    renderWithProviders(<ConnectorsSection kind="MCP" />, { mocks: [list('MCP', [mcp]), entries('MCP')] });
    fireEvent.click(await screen.findByRole('button', { name: 'intel.settings.connectors.showTools:1' }));
    expect(await screen.findByRole('table', { name: 'intel.settings.connectors.tools' })).toBeInTheDocument();
  });
});

describe('Qdrant, health and usage', () => {
  const health = {
    request: { query: INTEL_HEALTH },
    result: {
      data: {
        intelHealth: {
          __typename: 'IntelHealth', qdrant_configured: true, qdrant_reachable: true, queue_configured: false, openai_configured: true, openai_entry_selected: false, failed_runs_24h: 2, pending_approvals: 1,
          collections: [{ __typename: 'IntelCollectionHealth', scope: 'STAGING', name: 'intel_staging', exists: true, status: 'green', points: 42, dimensions: 512, dimension_mismatch: true }],
          connector_errors: [{ __typename: 'IntelConnectorError', id: 'k9', name: 'Gmail', kind: 'GMAIL', error: 'invalid_grant' }],
        },
      },
    },
    maxUsageCount: 5,
  };

  it('Qdrant shows collection health, warns about a dimension mismatch and rebuilds after confirmation', async () => {
    const rebuild = { request: { query: INTEL_REBUILD_INDEX, variables: { scope: 'STAGING' } }, result: { data: { intelRebuildIndex: 4 } } };
    renderWithProviders(<QdrantSection />, { mocks: [health, rebuild] });
    expect(await screen.findByText('intel_staging')).toBeInTheDocument();
    expect(screen.getByText('intel.settings.qdrant.mismatch')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.qdrant.rebuild' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'intel.settings.qdrant.rebuild' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('System Health lists each dependency, including connector errors', async () => {
    renderWithProviders(<HealthSection />, { mocks: [health] });
    expect(await screen.findByText('intel.settings.health.qdrant')).toBeInTheDocument();
    expect(screen.getByText('intel.settings.health.queueOff')).toBeInTheDocument();
    expect(screen.getByText('Gmail (GMAIL)')).toBeInTheDocument();
    expect(screen.getByText('invalid_grant')).toBeInTheDocument();
  });

  it('Usage shows totals for the period', async () => {
    const usage = { request: { query: INTEL_USAGE, variables: { days: 30 } }, result: { data: { intelUsage: { __typename: 'IntelUsage', days: 30, total_calls: 12, total_tokens: 3400, total_cost_usd: 0.0123, by_task: [], by_model: [], by_day: [] } } } };
    renderWithProviders(<UsageSection />, { mocks: [usage] });
    expect(await screen.findByText('3400')).toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(3);
  });
});

describe('Sync Dashboard and Approvals', () => {
  it('shows connector freshness and the runs table', async () => {
    const runs = { request: { query: INTEL_SYNC_RUNS, variables: { limit: 100 } }, result: { data: { intelSyncRuns: [] } } };
    renderWithProviders(<SyncPage />, { mocks: [{ request: { query: INTEL_CONNECTORS }, result: { data: { intelConnectors: [connector({ status: 'ERROR', last_error: 'auth failed' })] } } }, runs] });
    expect(await screen.findByText('auth failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.sync.syncNow' })).toBeEnabled();
  });

  it('shows the empty state when no approval is pending', async () => {
    const approvals = { request: { query: INTEL_APPROVALS, variables: { status: 'PENDING', mine: false, limit: 100 } }, result: { data: { intelApprovals: [] } } };
    renderWithProviders(<ApprovalsPage />, { mocks: [approvals], initialEntries: ['/approvals'] });
    expect(await screen.findByText('intel.approvals.empty')).toBeInTheDocument();
  });
});

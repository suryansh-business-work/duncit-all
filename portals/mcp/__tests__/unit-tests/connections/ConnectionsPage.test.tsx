import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MCP_CONNECTORS } from '../../../src/lib/queries';
import { MCP_CONNECTIONS_TABLE, REVOKE_MCP_CONNECTION } from '../../../src/pages/connections/queries';
import { resetTableProbe, tableProbe } from '../../mocks/table-stub';
import { CONNECTORS, connection } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

const m = vi.hoisted(() => ({
  manager: false,
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  revokes: 0,
}));
vi.mock('../../../src/lib/roles', () => ({ useIsMcpManager: () => m.manager }));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../../mocks/table-stub')).StubTable,
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  useConfirm: () => m.confirm,
  notifySuccess: m.success,
  notifyError: m.error,
}));

import ConnectionsPage from '../../../src/pages/connections/ConnectionsPage';

const ROW_FIELDS = ['id', 'user_email', 'client_name', 'scopes', 'resource', 'status', 'created_at', 'last_used_at', 'last_ip'] as const;
const asRow = (row: ReturnType<typeof connection>) =>
  Object.fromEntries([['__typename', 'McpConnection'], ...ROW_FIELDS.map((field) => [field, row[field]])]);

const tableMock = (rows: Array<ReturnType<typeof connection>>): MockedResponse => ({
  request: { query: MCP_CONNECTIONS_TABLE, variables: () => true },
  result: {
    data: { mcpConnectionsTable: { __typename: 'McpConnectionTablePage', total: rows.length, page: 1, page_size: 100, rows: rows.map(asRow) } },
  },
  maxUsageCount: 10,
});

const revokeOk: MockedResponse = {
  request: { query: REVOKE_MCP_CONNECTION, variables: { id: 'conn-1' } },
  result: () => {
    m.revokes += 1;
    return { data: { revokeMcpConnection: { __typename: 'McpConnection', id: 'conn-1', status: 'REVOKED' } } };
  },
};

const MOCKS = (extra: MockedResponse[] = []): MockedResponse[] => [
  { request: { query: MCP_CONNECTORS }, result: { data: { mcpConnectors: CONNECTORS } } },
  tableMock([connection()]),
  ...extra,
];

beforeEach(() => {
  m.manager = false;
  m.revokes = 0;
  m.confirm.mockReset();
  m.success.mockReset();
  m.error.mockReset();
  resetTableProbe();
});

const revokeButton = () => screen.findByRole('button', { name: 'Revoke Claude' });

describe('ConnectionsPage', () => {
  it('lists the person’s own connections, naming each connector rather than its URL', async () => {
    renderWithProviders(<ConnectionsPage />, { mocks: MOCKS() });
    expect(screen.getByText(/The AI apps you approved/)).toBeInTheDocument();
    const row = await screen.findByTestId('row-conn-1');
    await waitFor(() => expect(within(row).getByText('Pods console')).toBeInTheDocument());
    expect(within(row).getByText('Read & write')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(within(row).queryByText('asha@duncit.com')).not.toBeInTheDocument();
  });

  it('shows a manager everyone’s connections, with the person on each row', async () => {
    m.manager = true;
    renderWithProviders(<ConnectionsPage />, { mocks: MOCKS() });
    expect(screen.getByText(/Every AI app approved on Duncit/)).toBeInTheDocument();
    expect(within(await screen.findByTestId('row-conn-1')).getByText('asha@duncit.com')).toBeInTheDocument();
  });

  it('revokes after the person confirms, says so, and reloads the list', async () => {
    m.confirm.mockResolvedValue(true);
    renderWithProviders(<ConnectionsPage />, { mocks: MOCKS([revokeOk]) });
    fireEvent.click(await revokeButton());
    await waitFor(() => expect(m.success).toHaveBeenCalledWith('Connection revoked'));
    expect(m.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Revoke this connection?',
        message: 'Claude stops working in Duncit at its next call. Connecting it again needs a new approval.',
        confirmLabel: 'Revoke',
        destructive: true,
      }),
    );
    expect(m.revokes).toBe(1);
    await waitFor(() => expect(tableProbe.fetches).toBeGreaterThan(1));
  });

  it('does nothing when the person cancels', async () => {
    m.confirm.mockResolvedValue(false);
    renderWithProviders(<ConnectionsPage />, { mocks: MOCKS([revokeOk]) });
    fireEvent.click(await revokeButton());
    await waitFor(() => expect(m.confirm).toHaveBeenCalledTimes(1));
    expect(m.revokes).toBe(0);
    expect(m.success).not.toHaveBeenCalled();
    expect(m.error).not.toHaveBeenCalled();
  });

  it('shows the server’s reason when the revoke fails', async () => {
    m.confirm.mockResolvedValue(true);
    renderWithProviders(<ConnectionsPage />, {
      mocks: MOCKS([
        {
          request: { query: REVOKE_MCP_CONNECTION, variables: { id: 'conn-1' } },
          result: { errors: [{ message: 'Connection not found', extensions: { code: 'NOT_FOUND' } }] },
        },
      ]),
    });
    fireEvent.click(await revokeButton());
    await waitFor(() => expect(m.error).toHaveBeenCalledWith('Connection not found'));
    expect(m.success).not.toHaveBeenCalled();
  });

  it('says so when nobody has connected an app yet', async () => {
    renderWithProviders(<ConnectionsPage />, {
      mocks: [{ request: { query: MCP_CONNECTORS }, result: { data: { mcpConnectors: CONNECTORS } } }, tableMock([])],
    });
    expect(await screen.findByText('No AI apps connected yet.')).toBeInTheDocument();
  });
});

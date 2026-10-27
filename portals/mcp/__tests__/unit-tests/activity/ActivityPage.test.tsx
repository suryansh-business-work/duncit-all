import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MCP_TOOL_CALL, MCP_TOOL_CALLS_TABLE } from '../../../src/pages/activity/queries';
import { resetTableProbe } from '../../mocks/table-stub';
import { toolCall } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

const m = vi.hoisted(() => ({ manager: false, tableVars: [] as unknown[] }));
vi.mock('../../../src/lib/roles', () => ({ useIsMcpManager: () => m.manager }));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../../mocks/table-stub')).StubTable,
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

import ActivityPage from '../../../src/pages/activity/ActivityPage';

const ROW_FIELDS = [
  'id',
  'created_at',
  'user_email',
  'client_name',
  'endpoint',
  'tool',
  'category',
  'risk',
  'status',
  'reason',
  'duration_ms',
  'input_tokens',
  'output_tokens',
  'cost',
  'currency',
] as const;

const asRow = (call: ReturnType<typeof toolCall>) =>
  Object.fromEntries([['__typename', 'McpToolCall'], ...ROW_FIELDS.map((field) => [field, call[field]])]);

const tableMock = (calls: Array<ReturnType<typeof toolCall>>): MockedResponse => ({
  request: {
    query: MCP_TOOL_CALLS_TABLE,
    variables: (vars: unknown) => {
      m.tableVars.push(vars);
      return true;
    },
  },
  result: {
    data: {
      mcpToolCallsTable: { __typename: 'McpToolCallTablePage', total: calls.length, page: 1, page_size: 100, rows: calls.map(asRow) },
    },
  },
  maxUsageCount: 5,
});

const detailMock: MockedResponse = {
  request: { query: MCP_TOOL_CALL, variables: { id: 'call-1' } },
  result: {
    data: {
      mcpToolCall: {
        __typename: 'McpToolCall',
        id: 'call-1',
        kind: 'MUTATION',
        args_preview: '{"spots":8}',
        error_code: null,
        error_message: null,
        injection_flags: [],
        guard_mode: 'block',
        user_agent: 'Claude-User/1.0',
        ip: '203.0.113.7',
        connection_id: 'conn-1',
      },
    },
  },
};

beforeEach(() => {
  m.manager = false;
  m.tableVars = [];
  resetTableProbe();
});

describe('ActivityPage', () => {
  it('lists the person’s own calls from the server table, newest first', async () => {
    renderWithProviders(<ActivityPage />, { mocks: [tableMock([toolCall(), toolCall({ id: 'call-2', status: 'ERROR' })])] });
    expect(screen.getByRole('heading', { level: 1, name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByText(/Every tool call your AI apps made/)).toBeInTheDocument();
    const row = await screen.findByTestId('row-call-2');
    expect(within(row).getByText('Error')).toBeInTheDocument();
    expect(m.tableVars[0]).toMatchObject({ query: { page: 1, sort_by: 'created_at', sort_dir: 'desc' } });
    expect(within(screen.getByTestId('row-call-1')).queryByText('asha@duncit.com')).not.toBeInTheDocument();
  });

  it('shows a manager everyone’s calls, with the person on each row', async () => {
    m.manager = true;
    renderWithProviders(<ActivityPage />, { mocks: [tableMock([toolCall()])] });
    expect(screen.getByText(/Every MCP tool call across Duncit/)).toBeInTheDocument();
    const row = await screen.findByTestId('row-call-1');
    expect(within(row).getByText('asha@duncit.com')).toBeInTheDocument();
  });

  it('says so when there are no calls yet', async () => {
    renderWithProviders(<ActivityPage />, { mocks: [tableMock([])] });
    expect(await screen.findByText('No tool calls yet.')).toBeInTheDocument();
  });

  it('opens a call’s details from its row, and closes them again', async () => {
    renderWithProviders(<ActivityPage />, { mocks: [tableMock([toolCall()]), detailMock] });
    fireEvent.click(await screen.findByRole('button', { name: 'open-call-1' }));
    expect(screen.getByRole('dialog', { name: 'pods_create_pod' })).toBeInTheDocument();
    expect(await screen.findByText('{\n  "spots": 8\n}', { normalizer: (text) => text })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    await screen.findByTestId('row-call-1');
  });
});

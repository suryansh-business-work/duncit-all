import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MCP_CONNECTORS } from '../../../src/lib/queries';
import { MCP_TOOL_DETAIL, MCP_TOOLS_CATALOG } from '../../../src/pages/tools/queries';
import { resetTableProbe } from '../../mocks/table-stub';
import { CONNECTORS, categoryCount, toolInfo } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../../mocks/table-stub')).StubTable,
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

import ToolsPage from '../../../src/pages/tools/ToolsPage';

const ROW_FIELDS = ['name', 'title', 'category', 'category_label', 'risk', 'needs_confirmation', 'available', 'unavailable_reason'] as const;
const asRow = (tool: ReturnType<typeof toolInfo>) =>
  Object.fromEntries([['__typename', 'McpToolInfo'], ...ROW_FIELDS.map((field) => [field, tool[field]])]);

const GATEWAY_TOOLS = [
  toolInfo({ name: 'pods_pods_table', title: 'List pods' }),
  toolInfo({ name: 'finance_payouts', title: 'List payouts', category: 'finance', category_label: 'Finance', available: false, unavailable_reason: 'No access to Finance' }),
];

const catalogMock = (endpoint: string, tools: Array<ReturnType<typeof toolInfo>>): MockedResponse => {
  const counts = new Map<string, { label: string; tools: number }>();
  for (const tool of tools) counts.set(tool.category, { label: tool.category_label, tools: (counts.get(tool.category)?.tools ?? 0) + 1 });
  return {
    request: { query: MCP_TOOLS_CATALOG, variables: { endpoint } },
    result: {
      data: {
        mcpCatalog: {
          __typename: 'McpCatalog',
          total: tools.length,
          categories: [...counts].map(([category, entry]) => categoryCount({ category, label: entry.label, tools: entry.tools })),
          tools: tools.map(asRow),
        },
      },
    },
  };
};

const MOCKS = (): MockedResponse[] => [
  { request: { query: MCP_CONNECTORS }, result: { data: { mcpConnectors: CONNECTORS } } },
  catalogMock('gateway', GATEWAY_TOOLS),
  catalogMock('pods', [GATEWAY_TOOLS[0]]),
];

beforeEach(() => resetTableProbe());

describe('ToolsPage', () => {
  it('lists the gateway’s tools first, with the total and each category’s count', async () => {
    renderWithProviders(<ToolsPage />, { mocks: MOCKS() });
    expect(await screen.findByTestId('row-pods_pods_table')).toBeInTheDocument();
    expect(screen.getByTestId('row-finance_payouts')).toHaveTextContent('No access to Finance');
    expect(screen.getByTestId('mcp-tools-total')).toHaveTextContent('2 tools');
    expect(screen.getByRole('button', { name: 'Pods (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finance (1)' })).toBeInTheDocument();
  });

  it('narrows the rows already loaded to one category', async () => {
    renderWithProviders(<ToolsPage />, { mocks: MOCKS() });
    await screen.findByTestId('row-finance_payouts');
    fireEvent.click(screen.getByRole('button', { name: 'Finance (1)' }));
    await waitFor(() => expect(screen.queryByTestId('row-pods_pods_table')).not.toBeInTheDocument());
    expect(screen.getByTestId('row-finance_payouts')).toBeInTheDocument();
  });

  it('asks the server for one connector’s tools when the connector changes', async () => {
    renderWithProviders(<ToolsPage />, { mocks: MOCKS() });
    await screen.findByTestId('row-finance_payouts');
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Pods console' }));
    await waitFor(() => expect(screen.getByTestId('mcp-tools-total')).toHaveTextContent('1 tool'));
    expect(await screen.findByTestId('row-pods_pods_table')).toBeInTheDocument();
    expect(screen.queryByTestId('row-finance_payouts')).not.toBeInTheDocument();
  });

  it('opens a tool’s details from its row', async () => {
    renderWithProviders(<ToolsPage />, {
      mocks: [
        ...MOCKS(),
        {
          request: { query: MCP_TOOL_DETAIL, variables: { search: 'pods_pods_table' } },
          result: {
            data: {
              mcpCatalog: {
                __typename: 'McpCatalog',
                tools: [
                  {
                    __typename: 'McpToolInfo',
                    name: 'pods_pods_table',
                    description: 'Every pod, paged.',
                    kind: 'QUERY',
                    endpoints: ['pods'],
                    reaches_outside: false,
                    input_schema: '{}',
                  },
                ],
              },
            },
          },
        },
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'open-pods_pods_table' }));
    expect(screen.getByRole('dialog', { name: 'List pods' })).toBeInTheDocument();
    expect(await screen.findByText('Every pod, paged.')).toBeInTheDocument();
  });

  it('says so when the catalog cannot be loaded', async () => {
    renderWithProviders(<ToolsPage />, {
      mocks: [
        { request: { query: MCP_CONNECTORS }, result: { data: { mcpConnectors: CONNECTORS } } },
        { request: { query: MCP_TOOLS_CATALOG, variables: { endpoint: 'gateway' } }, error: new Error('Failed to fetch') },
      ],
    });
    expect(await screen.findByText('We could not load this. Please try again.')).toBeInTheDocument();
  });
});

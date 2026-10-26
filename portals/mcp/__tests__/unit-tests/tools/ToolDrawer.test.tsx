import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MCP_TOOL_DETAIL, type ToolRow } from '../../../src/pages/tools/queries';
import { toolInfo } from '../../mocks/fixtures';
import { renderWithProviders, stubClipboard } from '../../testkit';

const m = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: m.success,
  notifyError: vi.fn(),
}));

import ToolDrawer from '../../../src/pages/tools/ToolDrawer';

const row = (over: Partial<ToolRow> = {}): ToolRow => {
  const tool = toolInfo(over);
  return {
    name: tool.name,
    title: tool.title,
    category: tool.category,
    category_label: tool.category_label,
    risk: tool.risk,
    needs_confirmation: tool.needs_confirmation,
    available: tool.available,
    unavailable_reason: tool.unavailable_reason,
  };
};

const detail = (name: string, over: Record<string, unknown> = {}) => ({
  __typename: 'McpToolInfo',
  name,
  description: 'Every pod, paged.\nFilter by status or club.',
  kind: 'QUERY',
  endpoints: ['pods', 'gateway'],
  reaches_outside: false,
  input_schema: '{"type":"object","properties":{"page":{"type":"integer"}}}',
  ...over,
});

const detailMock = (tools: unknown[]): MockedResponse => ({
  request: { query: MCP_TOOL_DETAIL, variables: { search: 'pods_pods_table' } },
  result: { data: { mcpCatalog: { __typename: 'McpCatalog', tools } } },
});

afterEach(() => m.success.mockReset());

describe('ToolDrawer', () => {
  it('shows the tool’s full description, where it is offered and its input schema pretty-printed', async () => {
    renderWithProviders(<ToolDrawer tool={row()} onClose={vi.fn()} />, {
      mocks: [detailMock([detail('pods_pods_table_export', { description: 'Not this one' }), detail('pods_pods_table')])],
    });
    expect(screen.getByRole('dialog', { name: 'List pods' })).toBeInTheDocument();
    expect(await screen.findByText(/Every pod, paged\./)).toBeInTheDocument();
    expect(screen.queryByText('Not this one')).not.toBeInTheDocument();
    expect(screen.getByText('pods, gateway')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
    const schema = Array.from(screen.getByRole('dialog').querySelectorAll('pre')).at(-1);
    expect(schema?.textContent).toBe(
      '{\n  "type": "object",\n  "properties": {\n    "page": {\n      "type": "integer"\n    }\n  }\n}',
    );
  });

  it('copies the exact tool name', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderWithProviders(<ToolDrawer tool={row()} onClose={vi.fn()} />, { mocks: [detailMock([detail('pods_pods_table')])] });
    fireEvent.click(screen.getByRole('button', { name: 'Copy the tool name' }));
    await waitFor(() => expect(m.success).toHaveBeenCalledWith('Tool name copied'));
    expect(writeText).toHaveBeenCalledWith('pods_pods_table');
  });

  it('says why a tool cannot be used, before anything else', async () => {
    renderWithProviders(
      <ToolDrawer tool={row({ available: false, unavailable_reason: 'Write tools are switched off in Settings' })} onClose={vi.fn()} />,
      { mocks: [detailMock([detail('pods_pods_table')])] },
    );
    expect(screen.getByText('Write tools are switched off in Settings')).toBeInTheDocument();
    await screen.findByText(/Every pod, paged\./);
  });

  it('still says a tool is out of reach when the server gives no reason', async () => {
    renderWithProviders(<ToolDrawer tool={row({ available: false, unavailable_reason: null })} onClose={vi.fn()} />, {
      mocks: [detailMock([detail('pods_pods_table')])],
    });
    expect(screen.getByText('You cannot use this tool right now.')).toBeInTheDocument();
    await screen.findByText(/Every pod, paged\./);
  });

  it('says it is no longer in the catalog when the search finds no exact match', async () => {
    renderWithProviders(<ToolDrawer tool={row()} onClose={vi.fn()} />, {
      mocks: [detailMock([detail('pods_pods_table_export')])],
    });
    expect(await screen.findByText('This tool is no longer in the catalog.')).toBeInTheDocument();
  });

  it('says so when the details cannot be loaded', async () => {
    renderWithProviders(<ToolDrawer tool={row()} onClose={vi.fn()} />, {
      mocks: [{ request: { query: MCP_TOOL_DETAIL, variables: { search: 'pods_pods_table' } }, error: new Error('Failed to fetch') }],
    });
    expect(await screen.findByText('We could not load this tool. Please try again.')).toBeInTheDocument();
  });
});

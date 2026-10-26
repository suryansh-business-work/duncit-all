import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MCP_CONNECTORS } from '../../../src/lib/queries';
import { CONNECTORS, connector, MCP_URL } from '../../mocks/fixtures';
import { renderWithProviders, stubClipboard } from '../../testkit';

const m = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: m.success,
  notifyError: m.error,
}));

import ConnectorsPanel from '../../../src/pages/connect/ConnectorsPanel';

const connectorsMock = (rows = CONNECTORS): MockedResponse => ({
  request: { query: MCP_CONNECTORS },
  result: { data: { mcpConnectors: rows } },
});

afterEach(() => {
  m.success.mockReset();
  m.error.mockReset();
});

describe('ConnectorsPanel', () => {
  it('lists every connector the server reports, the gateway first, with its URL and tool count', async () => {
    renderWithProviders(<ConnectorsPanel />, { mocks: [connectorsMock()] });
    const gateway = await screen.findByTestId('mcp-connector-gateway');
    expect(gateway).toHaveTextContent(`${MCP_URL}/mcp`);
    expect(gateway).toHaveTextContent('1,240 tools');
    expect(screen.getByTestId('mcp-connector-pods')).toHaveTextContent('1 tool');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toBe(gateway);
  });

  it('shows a console the account cannot open, but as no access and without a copy button', async () => {
    renderWithProviders(<ConnectorsPanel />, { mocks: [connectorsMock()] });
    const finance = await screen.findByTestId('mcp-connector-finance');
    expect(finance).toHaveTextContent('No access');
    expect(screen.getByRole('button', { name: 'Copy the Finance console URL' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy the Pods console URL' })).toBeEnabled();
  });

  it('copies a connector URL and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderWithProviders(<ConnectorsPanel />, { mocks: [connectorsMock()] });
    fireEvent.click(await screen.findByRole('button', { name: 'Copy the Pods console URL' }));
    await waitFor(() => expect(m.success).toHaveBeenCalledWith('URL copied'));
    expect(writeText).toHaveBeenCalledWith(`${MCP_URL}/pods/mcp`);
  });

  it('sets up each AI app with the gateway URL the server reported, never a typed-in one', async () => {
    renderWithProviders(<ConnectorsPanel />, { mocks: [connectorsMock()] });
    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText(`${MCP_URL}/mcp`)).toBeInTheDocument();
  });

  it('leaves the setup guide out if the server reports no gateway', async () => {
    renderWithProviders(<ConnectorsPanel />, {
      mocks: [connectorsMock([connector({ key: 'pods', label: 'Pods console', url: `${MCP_URL}/pods/mcp` })])],
    });
    await screen.findByTestId('mcp-connector-pods');
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  });

  it('says so when the connectors cannot be loaded', async () => {
    renderWithProviders(<ConnectorsPanel />, {
      mocks: [{ request: { query: MCP_CONNECTORS }, error: new Error('Failed to fetch') }],
    });
    expect(await screen.findByText('We could not load this. Please try again.')).toBeInTheDocument();
  });
});

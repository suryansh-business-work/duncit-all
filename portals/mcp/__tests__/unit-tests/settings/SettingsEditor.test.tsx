import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import {
  MCP_SETTINGS,
  MCP_SETTINGS_EDITOR,
  MCP_SETTINGS_OPTIONS,
  UPDATE_MCP_SETTINGS,
} from '../../../src/pages/settings/queries';
import { settings } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

const m = vi.hoisted(() => ({ success: vi.fn(), inputs: [] as unknown[] }));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: m.success,
  notifyError: vi.fn(),
}));

import SettingsEditor from '../../../src/pages/settings/SettingsEditor';

const settingsMock = (over: Parameters<typeof settings>[0] = {}): MockedResponse => ({
  request: { query: MCP_SETTINGS },
  result: { data: { mcpSettings: settings(over) } },
});

const optionsMock: MockedResponse = {
  request: { query: MCP_SETTINGS_OPTIONS },
  result: {
    data: {
      mcpCatalog: {
        __typename: 'McpCatalog',
        categories: [
          { __typename: 'McpCategoryCount', category: 'pods', label: 'Pods' },
          { __typename: 'McpCategoryCount', category: 'finance', label: 'Finance' },
        ],
        tools: [
          { __typename: 'McpToolInfo', name: 'pods_delete_pod' },
          { __typename: 'McpToolInfo', name: 'pods_pods_table' },
        ],
      },
    },
  },
};

const editorMock = (fullName: string | null, username = 'ravi-k'): MockedResponse => ({
  request: { query: MCP_SETTINGS_EDITOR, variables: { ids: ['user-9'] } },
  result: { data: { publicUsersByIds: [{ __typename: 'PublicProfile', user_id: 'user-9', full_name: fullName, username }] } },
});

const updateMock = (result: MockedResponse['result']): MockedResponse => ({
  request: {
    query: UPDATE_MCP_SETTINGS,
    variables: (vars: { input: unknown }) => {
      m.inputs.push(vars.input);
      return true;
    },
  },
  result,
});

afterEach(() => {
  m.success.mockReset();
  m.inputs = [];
});

const save = async () => fireEvent.click(await screen.findByTestId('mcp-settings-save'));

describe('SettingsEditor', () => {
  it('says who saved the settings last, by name', async () => {
    renderWithProviders(<SettingsEditor />, { mocks: [settingsMock(), optionsMock, editorMock('Ravi Kumar')] });
    await waitFor(() => expect(screen.getByTestId('mcp-settings-last-saved')).toHaveTextContent(/^Last saved .+ by Ravi Kumar$/));
  });

  it('falls back to the editor’s handle when they have no name on file', async () => {
    renderWithProviders(<SettingsEditor />, { mocks: [settingsMock(), optionsMock, editorMock(null)] });
    await waitFor(() => expect(screen.getByTestId('mcp-settings-last-saved')).toHaveTextContent(/by ravi-k$/));
  });

  it('says the defaults are in force when nobody has saved yet', async () => {
    renderWithProviders(<SettingsEditor />, { mocks: [settingsMock({ updated_by: null }), optionsMock] });
    expect(await screen.findByTestId('mcp-settings-last-saved')).toHaveTextContent(
      'Using the defaults. Nobody has saved these settings yet.',
    );
  });

  it('saves the whole page and confirms it', async () => {
    renderWithProviders(<SettingsEditor />, {
      mocks: [
        settingsMock(),
        optionsMock,
        editorMock('Ravi Kumar'),
        updateMock({ data: { updateMcpSettings: settings({ updated_at: '2026-10-26T11:00:00.000Z' }) } }),
        editorMock('Ravi Kumar'),
      ],
    });
    await save();
    await waitFor(() => expect(m.success).toHaveBeenCalledWith('MCP settings saved'));
    expect(m.inputs[0]).toEqual({
      write_tools_enabled: true,
      default_injection_guard: 'block',
      disabled_categories: ['finance'],
      disabled_tools: ['pods_delete_pod'],
      token_price_input_per_million: 3,
      token_price_output_per_million: 15,
      currency: 'USD',
      trusted_redirect_hosts: ['claude.ai', 'localhost', '[::1]'],
      allow_untrusted_clients: false,
    });
  });

  it('shows the server’s refusal in the form and does not claim success', async () => {
    renderWithProviders(<SettingsEditor />, {
      mocks: [
        settingsMock(),
        optionsMock,
        editorMock('Ravi Kumar'),
        updateMock({ errors: [{ message: 'Keep at least one trusted host', extensions: { code: 'BAD_USER_INPUT' } }] }),
      ],
    });
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Keep at least one trusted host');
    expect(m.success).not.toHaveBeenCalled();
  });

  it('says so when the settings cannot be loaded', async () => {
    renderWithProviders(<SettingsEditor />, {
      mocks: [{ request: { query: MCP_SETTINGS }, error: new Error('Failed to fetch') }, optionsMock],
    });
    expect(await screen.findByText('We could not load the MCP settings. Please refresh.')).toBeInTheDocument();
  });

  it('still opens the form when the tool list fails, and says only saved values can be picked', async () => {
    renderWithProviders(<SettingsEditor />, {
      mocks: [settingsMock({ updated_by: null }), { request: { query: MCP_SETTINGS_OPTIONS }, error: new Error('Failed to fetch') }],
    });
    expect(
      await screen.findByText('We could not load the tool list, so only the values already saved can be picked.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('mcp-settings-save')).toBeInTheDocument();
  });
});

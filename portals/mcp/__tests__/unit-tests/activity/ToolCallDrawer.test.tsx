import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MCP_TOOL_CALL } from '../../../src/pages/activity/queries';
import ToolCallDrawer from '../../../src/pages/activity/ToolCallDrawer';
import { toolCall } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const detailMock = (detail: Record<string, unknown> | null): MockedResponse => ({
  request: { query: MCP_TOOL_CALL, variables: { id: 'call-1' } },
  result: { data: { mcpToolCall: detail } },
});

const detail = (over: Record<string, unknown> = {}) => {
  const call = toolCall();
  return {
    __typename: 'McpToolCall',
    id: call.id,
    kind: call.kind,
    args_preview: call.args_preview,
    error_code: null,
    error_message: null,
    injection_flags: [],
    guard_mode: 'block',
    user_agent: call.user_agent,
    ip: call.ip,
    connection_id: call.connection_id,
    ...over,
  };
};

const renderDrawer = (mocks: MockedResponse[], onClose = vi.fn()) => {
  renderWithProviders(<ToolCallDrawer row={toolCall()} onClose={onClose} />, { mocks });
  return onClose;
};

describe('ToolCallDrawer', () => {
  it('is titled by the tool, with the reason the AI gave under it', async () => {
    renderDrawer([detailMock(detail())]);
    expect(screen.getByRole('dialog', { name: 'pods_create_pod' })).toHaveTextContent(
      'Create the Sunday pottery pod the host asked for',
    );
    await screen.findByText('Arguments');
  });

  it('pretty-prints the arguments the call was sent', async () => {
    renderDrawer([detailMock(detail())]);
    await screen.findByText('Arguments');
    const pre = screen.getByRole('dialog').querySelector('pre');
    expect(pre?.textContent).toBe('{\n  "title": "Sunday Pottery",\n  "spots": 8\n}');
  });

  it('shows where the call came from and how it was guarded', async () => {
    renderDrawer([detailMock(detail())]);
    await screen.findByText('Arguments');
    expect(screen.getByText('Mutation')).toBeInTheDocument();
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.7')).toBeInTheDocument();
    expect(screen.getByText('Claude-User/1.0')).toBeInTheDocument();
    expect(screen.getByText('conn-1')).toBeInTheDocument();
    expect(screen.getByText('Nothing suspicious was found in the arguments.')).toBeInTheDocument();
  });

  it('lists every injection flag and the failure of a refused call', async () => {
    renderDrawer([
      detailMock(
        detail({
          guard_mode: 'warn',
          injection_flags: ['ignore-previous', 'role-override'],
          error_code: 'BLOCKED_INJECTION',
          error_message: 'Arguments look like injected instructions',
        }),
      ),
    ]);
    expect(await screen.findByText('ignore-previous')).toBeInTheDocument();
    expect(screen.getByText('role-override')).toBeInTheDocument();
    expect(screen.getByText('BLOCKED_INJECTION')).toBeInTheDocument();
    expect(screen.getByText('Arguments look like injected instructions')).toBeInTheDocument();
    expect(screen.getByText('Warn')).toBeInTheDocument();
    expect(screen.queryByText('Nothing suspicious was found in the arguments.')).not.toBeInTheDocument();
  });

  it('says so when the call is no longer there', async () => {
    renderDrawer([detailMock(null)]);
    expect(await screen.findByText('This call is no longer available.')).toBeInTheDocument();
  });

  it('says so when the call cannot be loaded', async () => {
    renderDrawer([{ request: { query: MCP_TOOL_CALL, variables: { id: 'call-1' } }, error: new Error('Failed to fetch') }]);
    expect(await screen.findByText('We could not load this call. Please try again.')).toBeInTheDocument();
  });

  it('closes from its close button', async () => {
    const onClose = renderDrawer([detailMock(detail())]);
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

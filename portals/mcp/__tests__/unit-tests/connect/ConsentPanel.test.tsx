import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ConsentPanel from '../../../src/pages/connect/ConsentPanel';
import {
  APPROVE_MCP_AUTHORIZATION,
  DENY_MCP_AUTHORIZATION,
  MCP_AUTHORIZATION_REQUEST,
} from '../../../src/pages/connect/queries';
import { authRequest } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

const APPROVED_URL = 'https://claude.ai/api/mcp/auth_callback?code=c0de&state=s1';
const DENIED_URL = 'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=s1';

const requestMock = (over: Parameters<typeof authRequest>[0] = {}): MockedResponse => ({
  request: { query: MCP_AUTHORIZATION_REQUEST, variables: { id: 'req-1' } },
  result: { data: { mcpAuthorizationRequest: authRequest(over) } },
});

const requestError = (code: string): MockedResponse => ({
  request: { query: MCP_AUTHORIZATION_REQUEST, variables: { id: 'req-1' } },
  result: { errors: [{ message: 'refused', extensions: { code } }] },
});

const approveMock = (allowWrite: boolean, result: MockedResponse['result']): MockedResponse => ({
  request: { query: APPROVE_MCP_AUTHORIZATION, variables: { id: 'req-1', allow_write: allowWrite } },
  result,
});

const approved = { data: { approveMcpAuthorization: { __typename: 'McpAuthorizationDecision', redirect_url: APPROVED_URL } } };
const denied = { data: { denyMcpAuthorization: { __typename: 'McpAuthorizationDecision', redirect_url: DENIED_URL } } };

const assign = vi.fn();
beforeEach(() => {
  vi.stubGlobal('location', { ...globalThis.location, assign });
});
afterEach(() => {
  assign.mockReset();
});

const renderPanel = (mocks: MockedResponse[]) => renderWithProviders(<ConsentPanel requestId="req-1" />, { mocks });
const heading = () => screen.findByRole('heading', { level: 1, name: 'Connect Claude to Duncit' });

describe('ConsentPanel', () => {
  it('says it is loading the request before the server answers', () => {
    renderPanel([requestMock()]);
    expect(screen.getByRole('status', { name: 'Loading the connection request…' })).toBeInTheDocument();
  });

  it('shows which app is asking, where it sends you back and which connector it wants', async () => {
    renderPanel([requestMock()]);
    await heading();
    expect(screen.getByText('claude.ai')).toBeInTheDocument();
    expect(screen.getByText('Gateway — every console you have')).toBeInTheDocument();
    expect(screen.getByText('Trusted')).toBeInTheDocument();
    expect(screen.queryByTestId('mcp-consent-untrusted')).not.toBeInTheDocument();
  });

  it('offers write tools only off, and only when the app asks for them', async () => {
    renderPanel([requestMock()]);
    await heading();
    expect(screen.getByRole('switch', { name: 'Allow changes (write tools)' })).not.toBeChecked();
  });

  it('does not offer write tools to an app that only asked to read', async () => {
    renderPanel([requestMock({ requests_write: false })]);
    await heading();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('approves read-only by default and sends the browser back to the app', async () => {
    renderPanel([requestMock(), approveMock(false, approved)]);
    await heading();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(APPROVED_URL));
    expect(screen.getByText('Done. Taking you back to Claude…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeDisabled();
  });

  it('grants write tools only when the switch was turned on', async () => {
    renderPanel([requestMock(), approveMock(true, approved)]);
    await heading();
    fireEvent.click(screen.getByRole('switch', { name: 'Allow changes (write tools)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(APPROVED_URL));
  });

  it('denies and sends the browser back with the refusal', async () => {
    renderPanel([
      requestMock(),
      { request: { query: DENY_MCP_AUTHORIZATION, variables: { id: 'req-1' } }, result: denied },
    ]);
    await heading();
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(DENIED_URL));
  });

  it('lets an account without MCP access only decline, and says why', async () => {
    renderPanel([requestMock({ can_approve: false })]);
    await heading();
    expect(screen.getByText(/Your account has no MCP access, so you can only decline/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
  });

  it('warns before approving an app that sends people to a host Duncit does not trust', async () => {
    renderPanel([requestMock({ trusted: false, redirect_host: 'evil.example' })]);
    await heading();
    expect(screen.getByTestId('mcp-consent-untrusted')).toHaveTextContent(
      'Duncit does not know evil.example. Approve only if you started connecting this app yourself, just now.',
    );
    expect(screen.getByText('Not trusted')).toBeInTheDocument();
  });

  it('says a request that ran out has expired', async () => {
    renderPanel([requestError('NOT_FOUND')]);
    expect(await screen.findByTestId('mcp-consent-unavailable')).toHaveTextContent(
      'This connection request has expired. Start connecting again from your AI app.',
    );
  });

  it('says a request that was already answered cannot be answered again', async () => {
    renderPanel([requestError('CONFLICT')]);
    expect(await screen.findByTestId('mcp-consent-unavailable')).toHaveTextContent(
      'This connection request was already answered.',
    );
  });

  it('falls back to a plain "could not load" for any other failure', async () => {
    renderPanel([requestError('INTERNAL_SERVER_ERROR')]);
    expect(await screen.findByTestId('mcp-consent-unavailable')).toHaveTextContent(
      'We could not load this connection request. Please start again from your AI app.',
    );
  });

  it('stays on the page and explains when someone answered the request first', async () => {
    renderPanel([requestMock(), approveMock(false, { errors: [{ message: 'answered', extensions: { code: 'CONFLICT' } }] })]);
    await heading();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText(/This connection request was already answered/)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('reports a dropped connection in words the person can act on', async () => {
    renderPanel([
      requestMock(),
      {
        request: { query: APPROVE_MCP_AUTHORIZATION, variables: { id: 'req-1', allow_write: false } },
        error: new Error('Failed to fetch'),
      },
    ]);
    await heading();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText(/Unable to connect to server/)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});

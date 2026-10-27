import type { JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import GuideRoute from '../../../src/pages/guide/GuideRoute';
import { META_PARAMS, PROMPTS } from '../../../src/pages/guide/guideContent';

vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const authed = vi.fn((element: JSX.Element) => <div data-testid="console-chrome">{element}</div>);

const renderGuide = (token: string | null) =>
  render(
    <MemoryRouter initialEntries={['/guide']}>
      <GuideRoute authed={authed} getToken={() => token} />
    </MemoryRouter>,
  );

beforeEach(() => {
  authed.mockClear();
  vi.stubEnv('VITE_MCP_URL', 'https://mcp.example.test');
});

describe('GuideRoute', () => {
  it('stands alone for a visitor who is not signed in, with a way to sign in', () => {
    renderGuide(null);
    expect(authed).not.toHaveBeenCalled();
    expect(screen.queryByTestId('console-chrome')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Duncit MCP');
    expect(screen.getByRole('link', { name: 'Sign in to connect' })).toHaveAttribute('href', '/login?redirect=%2Fconnect');
  });

  it('is a normal console page for a signed-in reader, pointing to Connect', () => {
    renderGuide('tok-1');
    expect(authed).toHaveBeenCalledTimes(1);
    const chrome = screen.getByTestId('console-chrome');
    expect(within(chrome).getByRole('link', { name: 'Get your connector URLs' })).toHaveAttribute('href', '/connect');
  });
});

describe('GuidePage content', () => {
  beforeEach(() => renderGuide(null));

  it('explains what MCP is for in Duncit', () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Connect your AI app to Duncit' })).toBeInTheDocument();
    expect(screen.getByText(/The Model Context Protocol \(MCP\) lets an AI app use tools/)).toBeInTheDocument();
  });

  it('gives the connector URL pattern from the MCP address, gateway and per console', () => {
    // Once in the URL section and once as the Claude tab's paste-in.
    expect(screen.getAllByText('https://mcp.example.test/mcp')).toHaveLength(2);
    expect(screen.getByText('https://mcp.example.test/<console>/mcp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy the gateway URL' })).toBeInTheDocument();
  });

  it('walks through connecting each AI app with the gateway URL', () => {
    expect(screen.getByRole('tab', { name: 'Claude', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ChatGPT' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Gemini CLI' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Claude Code' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'VS Code' })).toBeInTheDocument();
  });

  it('documents the three parameters every tool takes', () => {
    expect(META_PARAMS.map((term) => term.name)).toEqual(['mcp_reason', 'mcp_guard', 'mcp_confirm']);
    for (const term of META_PARAMS) expect(screen.getByText(term.name)).toBeInTheDocument();
    expect(screen.getByText(/Why the call is made, in one sentence \(3 to 500 characters\)/)).toBeInTheDocument();
  });

  it('lists every ready-made prompt the server offers, each with what it does', () => {
    expect(PROMPTS.map((term) => term.name)).toEqual([
      'audit_tools',
      'list_all_tools',
      'audit_pod_timings',
      'create_pod',
      'join_free_pod',
      'my_activity',
      'run_self_test',
      'find_tool',
    ]);
    for (const term of PROMPTS) expect(screen.getByText(term.name)).toBeInTheDocument();
    expect(screen.getByText('Every tool you can use, grouped by category.')).toBeInTheDocument();
  });

  it('suggests things to ask, and why connecting is safe', () => {
    expect(screen.getByText('“Run the MCP self-test.”')).toBeInTheDocument();
    expect(screen.getByText('“Audit all pod timings for the next month.”')).toBeInTheDocument();
    expect(screen.getByText(/End a connection any time from Connections/)).toBeInTheDocument();
  });
});

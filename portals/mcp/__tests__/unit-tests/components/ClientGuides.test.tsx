import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ClientGuides from '../../../src/components/client-guides/ClientGuides';
import { CLIENT_GUIDES } from '../../../src/components/client-guides/clients';

vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const GATEWAY = 'https://mcp.example.test/mcp';

const renderGuides = (entry = '/connect') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ClientGuides url={GATEWAY} />
    </MemoryRouter>,
  );

const snippet = () => screen.getByRole('tabpanel').querySelector('pre')?.textContent ?? '';

describe('client guides', () => {
  it('build each app’s snippet around the URL it is given', () => {
    const byKey = Object.fromEntries(CLIENT_GUIDES.map((guide) => [guide.key, guide.snippet(GATEWAY)]));
    expect(byKey.claude).toBe(GATEWAY);
    expect(byKey.chatgpt).toBe(GATEWAY);
    expect(byKey.claudeCode).toBe(`claude mcp add --transport http duncit ${GATEWAY}`);
    expect(JSON.parse(byKey.gemini)).toEqual({ mcpServers: { duncit: { httpUrl: GATEWAY } } });
    expect(JSON.parse(byKey.vscode)).toEqual({ servers: { duncit: { type: 'http', url: GATEWAY } } });
  });
});

describe('ClientGuides', () => {
  it('opens on Claude, with its steps and the URL to paste', () => {
    renderGuides();
    expect(screen.getByRole('tab', { name: 'Claude', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('open Settings, then Connectors');
    expect(snippet()).toBe(GATEWAY);
    expect(screen.getByRole('button', { name: 'Copy the URL' })).toBeInTheDocument();
  });

  it('switches to Claude Code’s command when that tab is picked', () => {
    renderGuides();
    fireEvent.click(screen.getByRole('tab', { name: 'Claude Code' }));
    expect(screen.getByRole('tab', { name: 'Claude Code', selected: true })).toBeInTheDocument();
    expect(snippet()).toBe(`claude mcp add --transport http duncit ${GATEWAY}`);
    expect(screen.getByRole('button', { name: 'Copy the command' })).toBeInTheDocument();
  });

  it('shows the settings block Gemini CLI reads, and says it finds the sign-in itself', () => {
    renderGuides();
    fireEvent.click(screen.getByRole('tab', { name: 'Gemini CLI' }));
    expect(JSON.parse(snippet())).toEqual({ mcpServers: { duncit: { httpUrl: GATEWAY } } });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('~/.gemini/settings.json');
    expect(screen.getByRole('button', { name: 'Copy the settings' })).toBeInTheDocument();
  });

  it('opens on the app a shared link names', () => {
    renderGuides('/connect?selectedtab=vscode');
    expect(screen.getByRole('tab', { name: 'VS Code', selected: true })).toBeInTheDocument();
    expect(JSON.parse(snippet())).toEqual({ servers: { duncit: { type: 'http', url: GATEWAY } } });
  });

  it('falls back to Claude for an app it does not know', () => {
    renderGuides('/connect?selectedtab=cursor');
    expect(screen.getByRole('tab', { name: 'Claude', selected: true })).toBeInTheDocument();
  });
});

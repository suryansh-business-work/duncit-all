import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EnvEntry } from '../../src/pages/environment/queries';
import { makeEnvEntry } from '../mocks/env-entry.mock';

type Attempts = {
  used: number;
  max: number;
  left: number | null;
  window_hours: number;
  resets_at: string | null;
};
const h = vi.hoisted(() => ({
  run: vi.fn(),
  loading: false,
  attempts: null as Attempts | null,
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useMutation: () => [h.run, { loading: h.loading }] as const,
  useQuery: () => ({
    data: h.attempts ? { envTestAttempts: h.attempts } : undefined,
    refetch: vi.fn(async () => undefined),
  }),
}));

vi.mock('@duncit/dialogs', () => ({ useConfirm: () => vi.fn(), notify: vi.fn() }));

import ConnectionTestPanel from '../../src/pages/environment/test-panels/ConnectionTestPanel';
import TestDrawer from '../../src/pages/environment/test-panels';

const entry = (category: string, over: Partial<EnvEntry> = {}): EnvEntry =>
  makeEnvEntry({ id: 'e1', name: 'Entry One', category: category as EnvEntry['category'], ...over });

beforeEach(() => {
  h.run.mockReset();
  h.loading = false;
  h.attempts = null;
});

describe('ConnectionTestPanel', () => {
  it('explains what the provider test does before it is pressed', () => {
    render(<ConnectionTestPanel entry={entry('RAZORPAY')} />);
    expect(screen.getByText(/Nothing is created and no money moves/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('falls back to a generic line for a category it has no explanation for', () => {
    render(<ConnectionTestPanel entry={entry('SOMETHING_NEW')} />);
    expect(screen.getByText('Checks these credentials against the provider.')).toBeInTheDocument();
  });

  it('shows the description a specific panel supplies instead of the category line', () => {
    render(<ConnectionTestPanel entry={entry('SLACK')} description="Custom hint" />);
    expect(screen.getByText('Custom hint')).toBeInTheDocument();
    expect(screen.queryByText(/auth\.test/)).not.toBeInTheDocument();
  });

  it('runs the test with no destination and shows a passing result with its findings', async () => {
    h.run.mockResolvedValue({
      data: { testEnvConnection: { ok: true, message: 'Workspace Duncit', details: ['chat:write granted'] } },
    });
    render(<ConnectionTestPanel entry={entry('SLACK')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));

    expect(await screen.findByText('Workspace Duncit')).toBeInTheDocument();
    expect(screen.getByText('chat:write granted')).toBeInTheDocument();
    expect(h.run).toHaveBeenCalledWith({ variables: { id: 'e1', input: null } });
  });

  it('shows a failing result from the server', async () => {
    h.run.mockResolvedValue({
      data: { testEnvConnection: { ok: false, message: 'invalid_auth', details: [] } },
    });
    render(<ConnectionTestPanel entry={entry('SLACK')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('invalid_auth')).toBeInTheDocument();
  });

  it('turns a rejected call into an inline failure instead of throwing', async () => {
    h.run.mockRejectedValue(new Error('network is down'));
    render(<ConnectionTestPanel entry={entry('GITHUB')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('network is down')).toBeInTheDocument();
  });

  it('shows no result when the server answers with nothing', async () => {
    h.run.mockResolvedValue({ data: null });
    render(<ConnectionTestPanel entry={entry('GITHUB')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(h.run).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the previous result when the test is run again', async () => {
    h.run.mockResolvedValueOnce({ data: { testEnvConnection: { ok: true, message: 'first', details: [] } } });
    render(<ConnectionTestPanel entry={entry('GITHUB')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('first')).toBeInTheDocument();

    h.run.mockReturnValueOnce(new Promise(() => undefined));
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(screen.queryByText('first')).not.toBeInTheDocument());
  });

  it('warns that AiSensy sends a real message and passes the trimmed destination', async () => {
    h.run.mockResolvedValue({ data: { testEnvConnection: { ok: true, message: 'Sent', details: [] } } });
    render(<ConnectionTestPanel entry={entry('AISENSY')} />);
    expect(screen.getByText(/sends a real WhatsApp message/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/WhatsApp number/i), { target: { value: ' 919999999999 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await screen.findByText('Sent');
    expect(h.run).toHaveBeenCalledWith({ variables: { id: 'e1', input: { to: '919999999999' } } });
  });

  it('disables the button and says Testing while a call is in flight', () => {
    h.loading = true;
    render(<ConnectionTestPanel entry={entry('GITHUB')} />);
    expect(screen.getByRole('button', { name: 'Testing…' })).toBeDisabled();
  });
});

describe('TestDrawer routing to the connection panel', () => {
  it.each(['SLACK', 'SHIPROCKET', 'RAZORPAY', 'AISENSY', 'GITHUB', 'GOOGLE_PLAY', 'SONARQUBE', 'SOCIAL_APPS'])(
    'opens the connection panel for %s',
    (category) => {
      render(<TestDrawer entry={entry(category)} onClose={vi.fn()} onTested={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Test connection' })).toBeInTheDocument();
    },
  );

  it.each([
    ['APPLE_SIGNIN', /Apple/i],
    ['APP_STORE_CONNECT', /App Store|certificate/i],
    ['GODADDY', /GoDaddy|domain/i],
    ['CLOUDFLARE', /Cloudflare|zone/i],
    ['GOOGLE_DRIVE', /Drive/i],
  ])('opens the connection panel with its own hint for %s', (category, hint) => {
    render(<TestDrawer entry={entry(category)} onClose={vi.fn()} onTested={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Test connection' })).toBeInTheDocument();
    expect(screen.getAllByText(hint).length).toBeGreaterThan(0);
  });

  it('opens the MSG91 panel for MSG91', () => {
    render(<TestDrawer entry={entry('MSG91')} onClose={vi.fn()} onTested={vi.fn()} />);
    expect(screen.getByText('Test Entry One')).toBeInTheDocument();
    expect(screen.queryByText('Checks these credentials against the provider.')).not.toBeInTheDocument();
  });

  it('shows zero left, without the no-attempts warning, when a limited allowance reports no remaining figure', () => {
    h.attempts = { used: 3, max: 3, left: null, window_hours: 6, resets_at: null };
    render(<TestDrawer entry={entry('SLACK')} onClose={vi.fn()} onTested={vi.fn()} />);
    const note = screen.getByTestId('env-test-attempts');
    expect(note).toHaveTextContent('Left: 0.');
    expect(note).not.toHaveTextContent(/No attempts are left/);
    expect(note).not.toHaveTextContent(/starts again/);
  });

  it('does not add a reset time for an unlimited category even if one is supplied', () => {
    h.attempts = { used: 1, max: 0, left: null, window_hours: 6, resets_at: '2030-01-02T03:04:05.000Z' };
    render(<TestDrawer entry={entry('SLACK')} onClose={vi.fn()} onTested={vi.fn()} />);
    expect(screen.getByTestId('env-test-attempts')).not.toHaveTextContent(/starts again/);
  });
});

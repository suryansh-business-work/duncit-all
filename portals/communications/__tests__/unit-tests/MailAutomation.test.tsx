import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MailAutomationAccount } from '../../src/pages/mail-automation/queries';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  configured: undefined as unknown,
  configuredLoading: false,
  accounts: undefined as unknown,
  accountsError: undefined as unknown,
  refetch: vi.fn(),
  connect: vi.fn(),
  connectLoading: false,
  disconnect: vi.fn(),
  confirm: vi.fn(),
  notify: vi.fn(),
  assign: vi.fn(),
}));
const opName = (doc: { definitions: Array<{ name?: { value: string } }> }) =>
  doc.definitions[0].name?.value ?? '';
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (doc: Parameters<typeof opName>[0]) =>
    opName(doc) === 'MailAutomationConfigured'
      ? {
          data: m.configured === undefined ? undefined : { mailAutomationConfigured: m.configured },
          loading: m.configuredLoading,
        }
      : {
          data: m.accounts ? { mailAutomationAccounts: m.accounts } : undefined,
          error: m.accountsError,
          refetch: m.refetch,
        },
  useMutation: (doc: Parameters<typeof opName>[0]) =>
    opName(doc) === 'MailAutomationConnectUrl'
      ? [m.connect, { loading: m.connectLoading }]
      : [m.disconnect, { loading: false }],
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notify: m.notify,
  useConfirm: () => m.confirm,
}));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-stub')).StubTable,
}));

import MailAutomationPage from '../../src/pages/mail-automation';

const account = (over: Partial<MailAutomationAccount> = {}): MailAutomationAccount => ({
  id: 'a1',
  email: 'help@example.test',
  display_name: 'Help',
  is_active: true,
  ticket_type: 'SUPPORT',
  sla_label: '4h',
  ai_enabled: true,
  is_connected: true,
  last_polled_at: '2026-08-06T10:00:00.000Z',
  last_error: '',
  connected_at: '2026-08-01T10:00:00.000Z',
  ...over,
});

const mount = (url = '/') => renderWithProviders(<MailAutomationPage />, { initialEntries: [url] });

beforeEach(() => {
  m.configured = true;
  m.configuredLoading = false;
  m.accounts = [account()];
  m.accountsError = undefined;
  m.refetch.mockReset().mockResolvedValue({});
  m.connect.mockReset().mockResolvedValue({ data: { mailAutomationConnectUrl: 'https://accounts.example.test/o' } });
  m.connectLoading = false;
  m.disconnect.mockReset().mockResolvedValue({});
  m.confirm.mockReset();
  m.notify.mockReset();
  m.assign.mockReset();
  vi.stubGlobal('location', { ...globalThis.location, assign: m.assign });
});

describe('MailAutomationPage - states', () => {
  it('shows a spinner while the configuration is unknown', () => {
    m.configured = undefined;
    m.configuredLoading = true;
    mount();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('explains the missing configuration instead of the table', () => {
    m.configured = false;
    mount();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Gmail' })).not.toBeInTheDocument();
  });

  it('lists mailboxes with their state, queue and last check', async () => {
    mount();
    const row = await screen.findByTestId('row-a1');
    expect(within(row).getAllByText('help@example.test').length).toBeGreaterThan(0);
    expect(within(row).getByText('4h')).toBeInTheDocument();
  });

  it('shows the server error for a list that could not be read', () => {
    m.accountsError = new Error('Accounts unavailable');
    mount();
    expect(screen.getByText('Accounts unavailable')).toBeInTheDocument();
  });

  it('shows a lost grant, a paused mailbox, a poll error and a never-polled mailbox', async () => {
    m.accounts = [
      account({ id: 'lost', email: 'lost@example.test', is_connected: false }),
      account({ id: 'paused', email: 'paused@example.test', is_active: false }),
      account({ id: 'bad', email: 'bad@example.test', last_error: 'Gmail API disabled' }),
      account({ id: 'new', email: 'new@example.test', last_polled_at: null, ai_enabled: false }),
    ];
    mount();
    expect(await screen.findByText('Gmail API disabled')).toBeInTheDocument();
    expect(screen.getByTestId('row-lost')).toBeInTheDocument();
    expect(screen.getByTestId('row-new')).toBeInTheDocument();
  });
});

describe('MailAutomationPage - actions', () => {
  it('sends the browser to Google with the URL the server returned', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Connect Gmail' }));
    await waitFor(() => expect(m.assign).toHaveBeenCalledWith('https://accounts.example.test/o'));
  });

  it('does not navigate when the server returned no URL, and reports a failure', async () => {
    m.connect.mockResolvedValueOnce({ data: { mailAutomationConnectUrl: '' } });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Connect Gmail' }));
    await waitFor(() => expect(m.connect).toHaveBeenCalled());
    expect(m.assign).not.toHaveBeenCalled();

    m.connect.mockRejectedValueOnce(new Error('Google unreachable'));
    fireEvent.click(screen.getByRole('button', { name: 'Connect Gmail' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Google unreachable', 'error'));
  });

  it('disconnects only after the operator confirms', async () => {
    m.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount();
    const row = await screen.findByTestId('row-a1');
    fireEvent.click(within(row).getByRole('button', { name: /disconnect/i }));
    await waitFor(() => expect(m.confirm).toHaveBeenCalledTimes(1));
    expect(m.disconnect).not.toHaveBeenCalled();
    expect(m.confirm.mock.calls[0][0]).toMatchObject({ destructive: true });

    fireEvent.click(within(row).getByRole('button', { name: /disconnect/i }));
    await waitFor(() => expect(m.disconnect).toHaveBeenCalledWith({ variables: { id: 'a1' } }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith(expect.any(String), 'success'));
  });

  it('reports a refused disconnect', async () => {
    m.confirm.mockResolvedValue(true);
    m.disconnect.mockRejectedValue(new Error('Not allowed'));
    mount();
    const row = await screen.findByTestId('row-a1');
    fireEvent.click(within(row).getByRole('button', { name: /disconnect/i }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Not allowed', 'error'));
  });

  it('shows the busy label while the connect request is in flight', () => {
    m.connectLoading = true;
    mount();
    expect(screen.getByRole('button', { name: 'Opening Google…' })).toBeDisabled();
  });
});

describe('MailAutomationPage - OAuth return', () => {
  it('toasts a first connection and refreshes the list', async () => {
    mount('/?connected=help@example.test');
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith(expect.stringContaining('help@example.test'), 'success')
    );
    expect(m.refetch).toHaveBeenCalled();
  });

  it('holds a reconnect warning on the page instead of toasting it', async () => {
    mount('/?connected=help@example.test&reconnected=1');
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('help@example.test'))).toBe(true);
    expect(m.notify).not.toHaveBeenCalled();
  });

  it('says a cancelled consent was cancelled', async () => {
    mount('/?error=access_denied');
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith(expect.any(String), 'info'));
  });

  it('holds Googles own words for any other failure and lets it be dismissed', async () => {
    mount('/?error=Gmail%20API%20has%20not%20been%20used');
    const alert = await screen.findByText(/Gmail API has not been used/);
    expect(alert).toBeInTheDocument();
    expect(m.notify).not.toHaveBeenCalled();
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button'));
    await waitFor(() => expect(screen.queryByText(/Gmail API has not been used/)).not.toBeInTheDocument());
  });
});

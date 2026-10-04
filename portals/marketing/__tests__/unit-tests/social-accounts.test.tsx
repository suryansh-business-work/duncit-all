import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  disconnectSocialAccountErrorMock,
  disconnectSocialAccountMock,
  makeSocialAccount,
  socialConnectUrlErrorMock,
  socialConnectUrlMock,
  syncSocialAccountErrorMock,
  syncSocialAccountMock,
} from '../mocks';

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({
    formatDateTime: (d: Date | string) => `fmt:${String(d)}`,
    formatDate: (d: Date | string) => `day:${String(d)}`,
  }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import AccountRow from '../../src/pages/social-accounts-page/accounts/AccountRow';
import ProviderCard from '../../src/pages/social-accounts-page/accounts/ProviderCard';
import AccountsTab from '../../src/pages/social-accounts-page/accounts/AccountsTab';
import AiPoints from '../../src/pages/social-accounts-page/AiPoints';
import type { SocialAccount, SocialProviderStatus } from '../../src/pages/social-accounts-page/queries';

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const rowHandlers = () => ({
  onSync: vi.fn().mockResolvedValue(undefined),
  onReconnect: vi.fn().mockResolvedValue(undefined),
  onDisconnect: vi.fn(),
});

describe('AccountRow', () => {
  it('lists the handle, follower count and a not-yet-synced note for a fresh account', () => {
    renderWithProviders(<AccountRow account={makeSocialAccount()} {...rowHandlers()} />);
    const row = screen.getByTestId('social-account-sa1');
    expect(within(row).getByText('Duncit Pages')).toBeInTheDocument();
    expect(within(row).getByText('Connected')).toBeInTheDocument();
    expect(within(row).getByText('@duncit · Followers: 1,200 · Not synced yet')).toBeInTheDocument();
    expect(within(row).queryByRole('status')).not.toBeInTheDocument();
    expect(within(row).queryByText(/to review/)).not.toBeInTheDocument();
  });

  it('drops a missing handle and names when the account last synced', () => {
    renderWithProviders(
      <AccountRow
        account={makeSocialAccount({ handle: null, last_synced_at: '2026-09-01T10:00:00.000Z' })}
        {...rowHandlers()}
      />,
    );
    expect(screen.getByText('Followers: 1,200 · Last synced fmt:2026-09-01T10:00:00.000Z')).toBeInTheDocument();
  });

  it('counts the comments waiting for review', () => {
    renderWithProviders(<AccountRow account={makeSocialAccount({ flagged_open: 3 })} {...rowHandlers()} />);
    expect(screen.getByText('3 comments to review')).toBeInTheDocument();
  });

  it('shows the last error of an account that is not connected', () => {
    renderWithProviders(
      <AccountRow account={makeSocialAccount({ status: 'ERROR', last_error: 'Rate limited' })} {...rowHandlers()} />,
    );
    expect(screen.getByText('Sync failed')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Rate limited');
  });

  it('hides a stale error once the account is connected again', () => {
    renderWithProviders(
      <AccountRow account={makeSocialAccount({ status: 'CONNECTED', last_error: 'Old failure' })} {...rowHandlers()} />,
    );
    expect(screen.queryByText('Old failure')).not.toBeInTheDocument();
  });

  it('syncs the account it belongs to', () => {
    const handlers = rowHandlers();
    const account = makeSocialAccount();
    renderWithProviders(<AccountRow account={account} {...handlers} />);
    fireEvent.click(screen.getByTestId('social-sync-sa1'));
    expect(screen.getByTestId('social-sync-sa1')).toHaveTextContent('Sync now');
    expect(handlers.onSync).toHaveBeenCalledWith(account);
    expect(screen.queryByTestId('social-reconnect-sa1')).not.toBeInTheDocument();
  });

  it('offers Reconnect instead of Sync once the token expired', () => {
    const handlers = rowHandlers();
    renderWithProviders(<AccountRow account={makeSocialAccount({ status: 'EXPIRED' })} {...handlers} />);
    expect(screen.getByText('Reconnect needed')).toBeInTheDocument();
    expect(screen.queryByTestId('social-sync-sa1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-reconnect-sa1'));
    expect(screen.getByTestId('social-reconnect-sa1')).toHaveTextContent('Reconnect');
    expect(handlers.onReconnect).toHaveBeenCalledTimes(1);
    expect(handlers.onSync).not.toHaveBeenCalled();
  });

  it('links out to the profile in a new tab, named after the account', () => {
    renderWithProviders(
      <AccountRow account={makeSocialAccount({ profile_url: 'https://linkedin.com/company/duncit' })} {...rowHandlers()} />,
    );
    const link = screen.getByRole('link', { name: 'Open Duncit Pages on the network' });
    expect(link).toHaveAttribute('href', 'https://linkedin.com/company/duncit');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('has no profile link when the network gave none', () => {
    renderWithProviders(<AccountRow account={makeSocialAccount()} {...rowHandlers()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('asks to disconnect the account it belongs to', () => {
    const handlers = rowHandlers();
    const account = makeSocialAccount();
    renderWithProviders(<AccountRow account={account} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Duncit Pages' }));
    expect(handlers.onDisconnect).toHaveBeenCalledWith(account);
  });

  it('shows the account avatar when there is one', () => {
    const { container } = renderWithProviders(
      <AccountRow account={makeSocialAccount({ avatar_url: 'https://cdn.example/a.png' })} {...rowHandlers()} />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/a.png');
  });
});

const cardHandlers = () => ({
  onConnect: vi.fn().mockResolvedValue(undefined),
  onSync: vi.fn().mockResolvedValue(undefined),
  onDisconnect: vi.fn(),
});

describe('ProviderCard', () => {
  it('explains who sets a network up instead of offering a button that would fail', () => {
    renderWithProviders(<ProviderCard provider="LINKEDIN" configured={false} accounts={[]} {...cardHandlers()} />);
    expect(screen.getByRole('region', { name: 'LinkedIn' })).toBeInTheDocument();
    expect(screen.getByText('Adds: LinkedIn Pages')).toBeInTheDocument();
    expect(screen.getByTestId('social-not-set-up-linkedin')).toHaveTextContent(
      'Not set up yet — Tech adds it under Environment Variables › Social apps.',
    );
    expect(screen.queryByTestId('social-connect-linkedin')).not.toBeInTheDocument();
    expect(screen.queryByText('No account connected yet.')).not.toBeInTheDocument();
  });

  it('invites the first connection of a configured network', () => {
    const handlers = cardHandlers();
    renderWithProviders(<ProviderCard provider="META" configured accounts={[]} {...handlers} />);
    const card = screen.getByTestId('social-provider-meta');
    expect(within(card).getByTestId('FacebookIcon')).toBeInTheDocument();
    expect(within(card).getByTestId('InstagramIcon')).toBeInTheDocument();
    expect(screen.getByText('No account connected yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('social-not-set-up-meta')).not.toBeInTheDocument();
    const connect = screen.getByTestId('social-connect-meta');
    expect(connect).toHaveTextContent(/^Connect$/);
    expect(connect).toHaveClass('MuiButton-contained');
    fireEvent.click(connect);
    expect(handlers.onConnect).toHaveBeenCalledWith('META');
  });

  it('lists connected accounts and reconnects through the same provider', () => {
    const handlers = cardHandlers();
    const live = makeSocialAccount({ id: 'x1', provider: 'X', platform: 'X', name: 'Duncit X' });
    const expired = makeSocialAccount({ id: 'x2', provider: 'X', platform: 'X', name: 'Old X', status: 'EXPIRED' });
    renderWithProviders(<ProviderCard provider="X" configured accounts={[live, expired]} {...handlers} />);
    const connect = screen.getByTestId('social-connect-x');
    expect(connect).toHaveTextContent('Connect another');
    expect(connect).toHaveClass('MuiButton-outlined');
    expect(screen.queryByText('No account connected yet.')).not.toBeInTheDocument();
    expect(screen.getByTestId('social-account-x1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-reconnect-x2'));
    expect(handlers.onConnect).toHaveBeenCalledWith('X');
    fireEvent.click(screen.getByTestId('social-sync-x1'));
    expect(handlers.onSync).toHaveBeenCalledWith(live);
    fireEvent.click(screen.getByTestId('social-disconnect-x2'));
    expect(handlers.onDisconnect).toHaveBeenCalledWith(expired);
  });

  it('still lists accounts a network brought in before its app was removed', () => {
    renderWithProviders(
      <ProviderCard provider="LINKEDIN" configured={false} accounts={[makeSocialAccount()]} {...cardHandlers()} />,
    );
    expect(screen.getByTestId('social-not-set-up-linkedin')).toBeInTheDocument();
    expect(screen.getByTestId('social-account-sa1')).toBeInTheDocument();
  });
});

const PROVIDER_STATUS: SocialProviderStatus[] = [
  { provider: 'LINKEDIN', configured: true },
  { provider: 'META', configured: false },
  { provider: 'X', configured: true },
  { provider: 'YOUTUBE', configured: false },
];

const renderTab = (accounts: SocialAccount[], mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  renderWithProviders(
    <AccountsTab providers={PROVIDER_STATUS} accounts={accounts} onChanged={onChanged} returnTo="ACCOUNTS" />,
    { mocks },
  );
  return onChanged;
};

describe('AccountsTab', () => {
  it('draws one card per network in a fixed order, each with only its own accounts', () => {
    renderTab([
      makeSocialAccount({ id: 'y1', provider: 'YOUTUBE', platform: 'YOUTUBE', name: 'Duncit TV' }),
      makeSocialAccount({ id: 'l1', name: 'Duncit Pages' }),
    ]);
    const cards = screen.getAllByTestId(/^social-provider-/);
    expect(cards.map((card) => card.dataset.testid)).toEqual([
      'social-provider-linkedin',
      'social-provider-meta',
      'social-provider-x',
      'social-provider-youtube',
    ]);
    expect(within(cards[0]).getByText('Duncit Pages')).toBeInTheDocument();
    expect(within(cards[0]).queryByText('Duncit TV')).not.toBeInTheDocument();
    expect(within(cards[3]).getByText('Duncit TV')).toBeInTheDocument();
    expect(screen.getByTestId('social-connect-linkedin')).toBeInTheDocument();
    expect(screen.getByTestId('social-not-set-up-meta')).toBeInTheDocument();
    expect(screen.getByTestId('social-connect-x')).toBeInTheDocument();
    expect(screen.getByTestId('social-not-set-up-youtube')).toBeInTheDocument();
  });

  it('treats every network as not set up when the provider list is empty', () => {
    renderWithProviders(<AccountsTab providers={[]} accounts={[]} onChanged={vi.fn()} returnTo="CALENDAR" narrow />);
    expect(screen.getAllByText('Not set up yet — Tech adds it under Environment Variables › Social apps.')).toHaveLength(4);
    expect(screen.queryByTestId(/^social-connect-/)).not.toBeInTheDocument();
  });

  describe('connect', () => {
    it('sends the marketer to the consent screen the server returns', async () => {
      const assign = vi.fn();
      vi.spyOn(globalThis, 'location', 'get').mockReturnValue({ assign } as unknown as Location);
      renderTab([], [socialConnectUrlMock('LINKEDIN', 'ACCOUNTS', 'https://www.linkedin.com/oauth/v2/authorization?x=1')]);
      fireEvent.click(screen.getByTestId('social-connect-linkedin'));
      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://www.linkedin.com/oauth/v2/authorization?x=1'));
      expect(dialogsMock.notify).not.toHaveBeenCalled();
    });

    it('stays put when the server returns no URL', async () => {
      const assign = vi.fn();
      vi.spyOn(globalThis, 'location', 'get').mockReturnValue({ assign } as unknown as Location);
      const mock = socialConnectUrlMock('X', 'ACCOUNTS', null);
      const resultFn = vi.fn(() => ({ data: { socialConnectUrl: null } }));
      renderTab([], [{ ...mock, result: resultFn }]);
      fireEvent.click(screen.getByTestId('social-connect-x'));
      await waitFor(() => expect(resultFn).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(assign).not.toHaveBeenCalled();
      expect(dialogsMock.notify).not.toHaveBeenCalled();
    });

    it('reports a refused connection', async () => {
      renderTab([], [socialConnectUrlErrorMock('LINKEDIN', 'ACCOUNTS', 'LinkedIn app is misconfigured')]);
      fireEvent.click(screen.getByTestId('social-connect-linkedin'));
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('LinkedIn app is misconfigured', 'error'));
    });
  });

  describe('sync', () => {
    const account = makeSocialAccount();

    it('confirms a clean sync and refreshes the list', async () => {
      const onChanged = renderTab([account], [syncSocialAccountMock(account)]);
      fireEvent.click(screen.getByTestId('social-sync-sa1'));
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Duncit Pages synced', 'success'));
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it('reports the network’s own reason when the sync came back failed', async () => {
      const onChanged = renderTab(
        [account],
        [syncSocialAccountMock({ ...account, status: 'ERROR', last_error: 'Token revoked by LinkedIn' })],
      );
      fireEvent.click(screen.getByTestId('social-sync-sa1'));
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Token revoked by LinkedIn', 'error'));
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it('falls back to a generic failure when the network gave no reason', async () => {
      const onChanged = renderTab([account], [syncSocialAccountMock({ ...account, status: 'EXPIRED', last_error: null })]);
      fireEvent.click(screen.getByTestId('social-sync-sa1'));
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sync failed', 'error'));
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it('reports a request that failed outright and leaves the list alone', async () => {
      const onChanged = renderTab([account], [syncSocialAccountErrorMock('sa1', 'Account not found')]);
      fireEvent.click(screen.getByTestId('social-sync-sa1'));
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Account not found', 'error'));
      expect(onChanged).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    const account = makeSocialAccount();

    it('asks first, then disconnects, refreshes and closes the dialog', async () => {
      const onChanged = renderTab([account], [{ ...disconnectSocialAccountMock('sa1'), delay: 500 }]);
      fireEvent.click(screen.getByTestId('social-disconnect-sa1'));
      const dialog = screen.getByRole('dialog', { name: 'Disconnect this account?' });
      expect(dialog).toHaveTextContent(
        'Duncit Pages stops syncing, and its posts, comments and history are removed from Duncit. Nothing changes on the network itself.',
      );
      fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
      expect(await within(dialog).findByText('Disconnecting…')).toBeInTheDocument();
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Duncit Pages disconnected', 'success'), { timeout: 3000 });
      expect(onChanged).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('keeps the dialog open when the disconnect fails', async () => {
      const onChanged = renderTab([account], [disconnectSocialAccountErrorMock('sa1', 'Could not revoke token')]);
      fireEvent.click(screen.getByTestId('social-disconnect-sa1'));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('confirm-dialog-confirm')).toHaveTextContent('Disconnect');
      fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Could not revoke token', 'error'));
      expect(onChanged).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('cancels without calling the server', async () => {
      const onChanged = renderTab([account]);
      fireEvent.click(screen.getByTestId('social-disconnect-sa1'));
      fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(onChanged).not.toHaveBeenCalled();
      expect(dialogsMock.notify).not.toHaveBeenCalled();
    });
  });
});

describe('AiPoints', () => {
  it('renders a headed list of the points', () => {
    renderWithProviders(<AiPoints title="What works" points={['Short reels', 'Weekend posts']} />);
    expect(screen.getByRole('heading', { level: 4, name: 'What works' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Short reels', 'Weekend posts']);
  });

  it('renders nothing for an empty list', () => {
    const { container } = renderWithProviders(<AiPoints title="What works" points={[]} />);
    expect(screen.queryByText('What works')).not.toBeInTheDocument();
    expect(container.querySelector('ul')).toBeNull();
  });
});

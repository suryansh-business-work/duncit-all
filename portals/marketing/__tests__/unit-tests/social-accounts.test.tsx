import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  audienceListOwnersMock,
  disconnectSocialAccountErrorMock,
  disconnectSocialAccountMock,
  makeSocialAccount,
  setSocialAccountOwnerMock,
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
  onSetOwner: vi.fn(),
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
    // Never health-checked, no owner, a token that does not expire: nothing more to say.
    expect(within(row).getByTestId('social-owner-line-sa1')).toHaveTextContent('No owner');
    expect(within(row).queryByTestId('social-health-line')).not.toBeInTheDocument();
    expect(within(row).queryByTestId('social-expiry-chip')).not.toBeInTheDocument();
  });

  it('names the owner', () => {
    renderWithProviders(<AccountRow account={makeSocialAccount({ owner_user_id: 'u1', owner_name: 'Asha Rao' })} {...rowHandlers()} />);
    expect(screen.getByTestId('social-owner-line-sa1')).toHaveTextContent('Owner: Asha Rao');
  });

  it('says there is no owner when the owner id points at nobody with a name', () => {
    renderWithProviders(<AccountRow account={makeSocialAccount({ owner_user_id: 'gone', owner_name: null })} {...rowHandlers()} />);
    expect(screen.getByTestId('social-owner-line-sa1')).toHaveTextContent('No owner');
  });

  it('opens the owner picker for the account it belongs to', () => {
    const handlers = rowHandlers();
    const account = makeSocialAccount();
    renderWithProviders(<AccountRow account={account} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set owner for Duncit Pages' }));
    expect(handlers.onSetOwner).toHaveBeenCalledWith(account);
    expect(screen.getByTestId('social-owner-sa1')).toBeInTheDocument();
  });

  it.each([
    [8, null],
    [30, null],
    [7, 'Expires in 7 days'],
    [2, 'Expires in 2 days'],
    [1, 'Expires in 1 day'],
  ])('with %s days left, the expiry chip reads %s', (days, label) => {
    renderWithProviders(<AccountRow account={makeSocialAccount({ token_expires_in_days: days })} {...rowHandlers()} />);
    const chip = screen.queryByTestId('social-expiry-chip');
    if (label === null) {
      expect(chip).not.toBeInTheDocument();
    } else {
      expect(chip).toHaveTextContent(label);
      expect(chip).toHaveClass('MuiChip-colorWarning');
    }
  });

  it.each([0, -3])('with %s days left, the chip says the token has expired', (days) => {
    renderWithProviders(<AccountRow account={makeSocialAccount({ token_expires_in_days: days })} {...rowHandlers()} />);
    const chip = screen.getByTestId('social-expiry-chip');
    expect(chip).toHaveTextContent('Token expired');
    expect(chip).toHaveClass('MuiChip-colorError');
  });

  it('says when the health check last ran, and what the network said when it was not happy', () => {
    const { rerender } = renderWithProviders(
      <AccountRow
        account={makeSocialAccount({ health_checked_at: '2026-10-30T09:00:00.000Z', health_ok: true, health_message: '' })}
        {...rowHandlers()}
      />,
    );
    expect(screen.getByTestId('social-health-line')).toHaveTextContent(/^Checked fmt:2026-10-30T09:00:00.000Z$/);

    rerender(
      <AccountRow
        account={makeSocialAccount({ health_checked_at: '2026-10-30T09:00:00.000Z', health_ok: false, health_message: 'X: rate limited' })}
        {...rowHandlers()}
      />,
    );
    expect(screen.getByTestId('social-health-line')).toHaveTextContent('Checked fmt:2026-10-30T09:00:00.000Z · X: rate limited');

    // A failed check with no words from the network still says when it ran.
    rerender(
      <AccountRow
        account={makeSocialAccount({ health_checked_at: '2026-10-30T09:00:00.000Z', health_ok: false, health_message: null })}
        {...rowHandlers()}
      />,
    );
    expect(screen.getByTestId('social-health-line')).toHaveTextContent(/^Checked fmt:2026-10-30T09:00:00.000Z$/);
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
  onSetOwner: vi.fn(),
  onDisconnect: vi.fn(),
});

describe('ProviderCard', () => {
  it('explains where a network is set up, with a link there, instead of offering a button that would fail', () => {
    renderWithProviders(
      <ProviderCard
        provider="LINKEDIN"
        configured={false}
        accounts={[]}
        settingsTo="/settings/integrations?selectedtab=SOCIAL_LINKEDIN"
        {...cardHandlers()}
      />,
    );
    expect(screen.getByRole('region', { name: 'LinkedIn' })).toBeInTheDocument();
    expect(screen.getByText('Adds: LinkedIn Pages')).toBeInTheDocument();
    expect(screen.getByTestId('social-not-set-up-linkedin')).toHaveTextContent(
      'Not set up yet — add this network’s app under Settings › Integrations. Open Integrations',
    );
    expect(screen.getByTestId('social-open-settings-linkedin')).toHaveAttribute(
      'href',
      '/settings/integrations?selectedtab=SOCIAL_LINKEDIN',
    );
    expect(screen.queryByTestId('social-connect-linkedin')).not.toBeInTheDocument();
    expect(screen.queryByText('No account connected yet.')).not.toBeInTheDocument();
  });

  it('leaves the link out when no settings tab is known for the network', () => {
    renderWithProviders(<ProviderCard provider="THREADS" configured={false} accounts={[]} {...cardHandlers()} />);
    expect(screen.getByTestId('social-not-set-up-threads')).toHaveTextContent(
      'Not set up yet — add this network’s app under Settings › Integrations.',
    );
    expect(screen.queryByTestId('social-open-settings-threads')).not.toBeInTheDocument();
  });

  it('invites the first connection of a configured network', () => {
    const handlers = cardHandlers();
    renderWithProviders(<ProviderCard provider="INSTAGRAM" configured accounts={[]} {...handlers} />);
    const card = screen.getByTestId('social-provider-instagram');
    expect(within(card).getByTestId('InstagramIcon')).toBeInTheDocument();
    expect(within(card).queryByTestId('FacebookIcon')).not.toBeInTheDocument();
    expect(screen.getByText('Adds: Instagram professional account (business or creator)')).toBeInTheDocument();
    expect(screen.getByText('No account connected yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('social-not-set-up-instagram')).not.toBeInTheDocument();
    const connect = screen.getByTestId('social-connect-instagram');
    expect(connect).toHaveTextContent(/^Connect$/);
    expect(connect).toHaveClass('MuiButton-contained');
    fireEvent.click(connect);
    expect(handlers.onConnect).toHaveBeenCalledWith('INSTAGRAM');
  });

  it('draws the Threads mark for a Threads profile', () => {
    renderWithProviders(<ProviderCard provider="THREADS" configured accounts={[]} {...cardHandlers()} />);
    expect(within(screen.getByTestId('social-provider-threads')).getByTestId('AlternateEmailIcon')).toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId('social-owner-x1'));
    expect(handlers.onSetOwner).toHaveBeenCalledWith(live);
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
  { provider: 'INSTAGRAM', configured: false, category: 'SOCIAL_INSTAGRAM' },
  { provider: 'FACEBOOK', configured: false, category: 'SOCIAL_FACEBOOK' },
  { provider: 'THREADS', configured: false, category: 'SOCIAL_THREADS' },
  { provider: 'YOUTUBE', configured: false, category: 'SOCIAL_YOUTUBE' },
  { provider: 'LINKEDIN', configured: true, category: 'SOCIAL_LINKEDIN' },
  { provider: 'X', configured: true, category: 'SOCIAL_X' },
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
      'social-provider-instagram',
      'social-provider-facebook',
      'social-provider-threads',
      'social-provider-youtube',
      'social-provider-linkedin',
      'social-provider-x',
    ]);
    expect(within(cards[4]).getByText('Duncit Pages')).toBeInTheDocument();
    expect(within(cards[4]).queryByText('Duncit TV')).not.toBeInTheDocument();
    expect(within(cards[3]).getByText('Duncit TV')).toBeInTheDocument();
    expect(screen.getByTestId('social-connect-linkedin')).toBeInTheDocument();
    expect(screen.getByTestId('social-not-set-up-instagram')).toBeInTheDocument();
    expect(screen.getByTestId('social-connect-x')).toBeInTheDocument();
    expect(screen.getByTestId('social-not-set-up-youtube')).toBeInTheDocument();
    // Each card links to its own network's tab on the Integrations page.
    expect(screen.getByTestId('social-open-settings-youtube')).toHaveAttribute(
      'href',
      '/settings/integrations?selectedtab=SOCIAL_YOUTUBE',
    );
  });

  it('treats every network as not set up when the provider list is empty, linking to Integrations as a whole', () => {
    renderWithProviders(<AccountsTab providers={[]} accounts={[]} onChanged={vi.fn()} returnTo="CALENDAR" narrow />);
    expect(screen.getAllByText(/^Not set up yet — add this network’s app under Settings › Integrations\./)).toHaveLength(6);
    expect(screen.getByTestId('social-open-settings-threads')).toHaveAttribute('href', '/settings/integrations');
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

  describe('set owner', () => {
    const account = makeSocialAccount();

    it('opens the owner picker for the account, refreshes the list once saved, and closes', async () => {
      const saved = { ...account, owner_user_id: 'boss', owner_name: 'Ravi Boss' };
      const onChanged = renderTab(
        [account],
        [audienceListOwnersMock, setSocialAccountOwnerMock({ id: 'sa1', owner_user_id: 'boss', team_user_ids: [] }, saved)],
      );
      fireEvent.click(screen.getByTestId('social-owner-sa1'));
      const dialog = await screen.findByRole('dialog', { name: 'Set owner for Duncit Pages' });
      fireEvent.mouseDown(within(dialog).getByLabelText('Owner'));
      fireEvent.click(await screen.findByText('Ravi Boss'));
      fireEvent.click(within(dialog).getByTestId('social-owner-save'));
      await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Owner updated for Duncit Pages', 'success'));
      expect(onChanged).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('closes the picker without saving', async () => {
      const onChanged = renderTab([account], [audienceListOwnersMock]);
      fireEvent.click(screen.getByTestId('social-owner-sa1'));
      fireEvent.click(await screen.findByTestId('social-owner-cancel'));
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

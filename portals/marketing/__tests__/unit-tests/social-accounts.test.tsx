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
import PlatformCard from '../../src/pages/social-accounts-page/accounts/PlatformCard';
import AccountsTab from '../../src/pages/social-accounts-page/accounts/AccountsTab';
import AiPoints from '../../src/pages/social-accounts-page/AiPoints';
import type { SocialAccount, SocialApp, SocialProvider, SocialProviderStatus } from '../../src/pages/social-accounts-page/queries';

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

  it('names the app it posts through only when told to, and warns when that app is gone', () => {
    const { rerender } = renderWithProviders(<AccountRow account={makeSocialAccount()} {...rowHandlers()} />);
    expect(screen.queryByTestId('social-app-line-sa1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('social-app-missing-sa1')).not.toBeInTheDocument();

    rerender(<AccountRow account={makeSocialAccount()} app={{ name: 'Brand two', missing: false }} {...rowHandlers()} />);
    expect(screen.getByTestId('social-app-line-sa1')).toHaveTextContent('App: Brand two');

    rerender(<AccountRow account={makeSocialAccount()} app={{ name: '', missing: true }} {...rowHandlers()} />);
    expect(screen.queryByTestId('social-app-line-sa1')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The app this account was connected through was removed or switched off.');
  });

  it('shows the account avatar when there is one', () => {
    const { container } = renderWithProviders(
      <AccountRow account={makeSocialAccount({ avatar_url: 'https://cdn.example/a.png' })} {...rowHandlers()} />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/a.png');
  });
});

const MAIN_APP: SocialApp = { id: 'main-app', name: 'Duncit', is_default: true };
const BRAND_APP: SocialApp = { id: 'brand-app', name: 'Brand two', is_default: false };

const cardHandlers = () => ({
  onConnect: vi.fn().mockResolvedValue(undefined),
  onSync: vi.fn().mockResolvedValue(undefined),
  onSetOwner: vi.fn(),
  onDisconnect: vi.fn(),
});

describe('PlatformCard', () => {
  const only = (provider: SocialProvider, apps: SocialApp[]) => new Map<SocialProvider, SocialApp[]>([[provider, apps]]);
  const options = (provider: SocialProvider, apps: SocialApp[]) => apps.map((app) => ({ provider, app }));

  it('explains where a platform is set up, with a link there, instead of offering a button that would fail', () => {
    renderWithProviders(
      <PlatformCard
        platform="LINKEDIN"
        options={[]}
        appsByProvider={new Map()}
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
    expect(screen.getByTestId('social-open-settings-linkedin')).toHaveAttribute('href', '/settings/integrations?selectedtab=SOCIAL_LINKEDIN');
    expect(screen.queryByTestId('social-connect-linkedin')).not.toBeInTheDocument();
    expect(screen.queryByText('No account connected yet.')).not.toBeInTheDocument();
  });

  it('leaves the link out when no settings tab is known for the platform', () => {
    renderWithProviders(<PlatformCard platform="THREADS" options={[]} appsByProvider={new Map()} accounts={[]} {...cardHandlers()} />);
    expect(screen.getByTestId('social-not-set-up-threads')).toHaveTextContent('Not set up yet — add this network’s app under Settings › Integrations.');
    expect(screen.queryByTestId('social-open-settings-threads')).not.toBeInTheDocument();
  });

  it('invites the first connection of a platform an app can bring', () => {
    const handlers = cardHandlers();
    renderWithProviders(
      <PlatformCard platform="INSTAGRAM" options={options('INSTAGRAM', [MAIN_APP])} appsByProvider={only('INSTAGRAM', [MAIN_APP])} accounts={[]} {...handlers} />,
    );
    const card = screen.getByTestId('social-provider-instagram');
    expect(within(card).getByTestId('InstagramIcon')).toBeInTheDocument();
    expect(screen.getByText('Adds: Instagram professional account (business or creator)')).toBeInTheDocument();
    expect(screen.getByTestId('social-no-account-instagram')).toHaveTextContent('No account connected yet.');
    const connect = screen.getByTestId('social-connect-instagram');
    expect(connect).toHaveTextContent(/^Connect$/);
    expect(connect).toHaveClass('MuiButton-contained');
    // One app: straight to the consent screen through it, no menu to pick from.
    expect(connect).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(connect);
    expect(handlers.onConnect).toHaveBeenCalledWith('INSTAGRAM', 'main-app');
  });

  it('draws the Threads mark for a Threads profile', () => {
    renderWithProviders(<PlatformCard platform="THREADS" options={options('THREADS', [MAIN_APP])} appsByProvider={new Map()} accounts={[]} {...cardHandlers()} />);
    expect(within(screen.getByTestId('social-provider-threads')).getByTestId('AlternateEmailIcon')).toBeInTheDocument();
  });

  it('lists every account of the platform with Connect another, and reconnects through the account’s own app asking again for permissions', () => {
    const handlers = cardHandlers();
    const live = makeSocialAccount({ id: 'x1', provider: 'X', platform: 'X', name: 'Duncit X' });
    const expired = makeSocialAccount({ id: 'x2', provider: 'X', platform: 'X', name: 'Old X', status: 'EXPIRED' });
    renderWithProviders(<PlatformCard platform="X" options={options('X', [MAIN_APP])} appsByProvider={only('X', [MAIN_APP])} accounts={[live, expired]} {...handlers} />);
    const connect = screen.getByTestId('social-connect-x');
    expect(connect).toHaveTextContent('Connect another');
    expect(connect).toHaveClass('MuiButton-outlined');
    expect(screen.queryByText('No account connected yet.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-reconnect-x2'));
    // Connected through the default before apps could be chosen: no app, so the default answers.
    expect(handlers.onConnect).toHaveBeenCalledWith('X', null, true);
    expect(screen.queryByTestId('social-app-line-x1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-sync-x1'));
    expect(handlers.onSync).toHaveBeenCalledWith(live);
    fireEvent.click(screen.getByTestId('social-owner-x1'));
    expect(handlers.onSetOwner).toHaveBeenCalledWith(live);
    fireEvent.click(screen.getByTestId('social-disconnect-x2'));
    expect(handlers.onDisconnect).toHaveBeenCalledWith(expired);
  });

  it('still lists accounts brought in before the app was removed', () => {
    renderWithProviders(<PlatformCard platform="LINKEDIN" options={[]} appsByProvider={new Map()} accounts={[makeSocialAccount()]} {...cardHandlers()} />);
    expect(screen.getByTestId('social-not-set-up-linkedin')).toBeInTheDocument();
    expect(screen.getByTestId('social-account-sa1')).toBeInTheDocument();
  });

  it('asks which app to connect through when several can bring the platform, marking the default', () => {
    const handlers = cardHandlers();
    const both = [...options('INSTAGRAM', [MAIN_APP]), ...options('FACEBOOK', [BRAND_APP])];
    renderWithProviders(<PlatformCard platform="INSTAGRAM" options={both} appsByProvider={new Map()} accounts={[]} {...handlers} />);
    const connect = screen.getByTestId('social-connect-instagram');
    expect(connect).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.click(connect);
    expect(handlers.onConnect).not.toHaveBeenCalled();
    const items = within(screen.getByRole('menu', { name: 'Connect through which app' })).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Connect via DuncitDefault', 'Connect via Brand two']);
    fireEvent.click(screen.getByTestId('social-connect-instagram-app-brand-app'));
    expect(handlers.onConnect).toHaveBeenCalledWith('FACEBOOK', 'brand-app');
  });

  it('names each account’s app once its provider has several, and reconnects through the account’s own app', () => {
    const handlers = cardHandlers();
    const onBrand = makeSocialAccount({ id: 'f1', provider: 'FACEBOOK', platform: 'FACEBOOK', app_id: 'brand-app', status: 'EXPIRED' });
    const onDefault = makeSocialAccount({ id: 'f2', provider: 'FACEBOOK', platform: 'FACEBOOK', app_id: null });
    const apps = [MAIN_APP, BRAND_APP];
    renderWithProviders(
      <PlatformCard platform="FACEBOOK" options={options('FACEBOOK', apps)} appsByProvider={only('FACEBOOK', apps)} accounts={[onBrand, onDefault]} {...handlers} />,
    );
    expect(screen.getByTestId('social-app-line-f1')).toHaveTextContent('App: Brand two');
    expect(screen.getByTestId('social-app-line-f2')).toHaveTextContent('App: Duncit');
    fireEvent.click(screen.getByTestId('social-reconnect-f1'));
    expect(handlers.onConnect).toHaveBeenCalledWith('FACEBOOK', 'brand-app', true);
  });

  it('warns on an account whose app was removed, even with one app left', () => {
    const gone = makeSocialAccount({ id: 'g1', app_id: 'deleted-app' });
    renderWithProviders(<PlatformCard platform="LINKEDIN" options={options('LINKEDIN', [MAIN_APP])} appsByProvider={only('LINKEDIN', [MAIN_APP])} accounts={[gone]} {...cardHandlers()} />);
    expect(screen.getByTestId('social-app-missing-g1')).toBeInTheDocument();
    expect(screen.queryByTestId('social-app-line-g1')).not.toBeInTheDocument();
  });
});

const PROVIDER_STATUS: SocialProviderStatus[] = [
  { provider: 'INSTAGRAM', configured: false, category: 'SOCIAL_INSTAGRAM', apps: [] },
  { provider: 'FACEBOOK', configured: false, category: 'SOCIAL_FACEBOOK', apps: [] },
  { provider: 'THREADS', configured: false, category: 'SOCIAL_THREADS', apps: [] },
  { provider: 'YOUTUBE', configured: false, category: 'SOCIAL_YOUTUBE', apps: [] },
  { provider: 'LINKEDIN', configured: true, category: 'SOCIAL_LINKEDIN', apps: [{ id: 'li-app', name: 'Duncit LinkedIn', is_default: true }] },
  { provider: 'X', configured: true, category: 'SOCIAL_X', apps: [{ id: 'x-app', name: 'Duncit X', is_default: true }] },
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
      renderTab([], [socialConnectUrlMock('LINKEDIN', 'ACCOUNTS', 'https://www.linkedin.com/oauth/v2/authorization?x=1', 'li-app')]);
      fireEvent.click(screen.getByTestId('social-connect-linkedin'));
      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://www.linkedin.com/oauth/v2/authorization?x=1'));
      expect(dialogsMock.notify).not.toHaveBeenCalled();
    });

    it('stays put when the server returns no URL', async () => {
      const assign = vi.fn();
      vi.spyOn(globalThis, 'location', 'get').mockReturnValue({ assign } as unknown as Location);
      const mock = socialConnectUrlMock('X', 'ACCOUNTS', null, 'x-app');
      const resultFn = vi.fn(() => ({ data: { socialConnectUrl: null } }));
      renderTab([], [{ ...mock, result: resultFn }]);
      fireEvent.click(screen.getByTestId('social-connect-x'));
      await waitFor(() => expect(resultFn).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(assign).not.toHaveBeenCalled();
      expect(dialogsMock.notify).not.toHaveBeenCalled();
    });

    it('reports a refused connection', async () => {
      renderTab([], [socialConnectUrlErrorMock('LINKEDIN', 'ACCOUNTS', 'LinkedIn app is misconfigured', 'li-app')]);
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

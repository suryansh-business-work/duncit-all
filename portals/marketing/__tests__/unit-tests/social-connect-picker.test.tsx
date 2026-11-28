import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { Route, useLocation } from 'react-router';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import AccountsTab from '../../src/pages/social-accounts-page/accounts/AccountsTab';
import ConnectPicker from '../../src/pages/social-accounts-page/accounts/ConnectPicker';
import { byPlatform, connectPickerSchema, defaultPickerValues, savedCount } from '../../src/pages/social-accounts-page/connect-picker-form';
import {
  COMPLETE_SOCIAL_CONNECTION,
  SOCIAL_PENDING_CONNECTION,
  type SocialPendingAccount,
  type SocialPendingConnection,
  type SocialProviderStatus,
} from '../../src/pages/social-accounts-page/queries';

afterEach(() => vi.clearAllMocks());

const META_APP = { id: 'meta-app', name: 'Duncit Social', is_default: true };
const PROVIDERS: SocialProviderStatus[] = [
  { provider: 'INSTAGRAM', configured: false, category: 'SOCIAL_INSTAGRAM', apps: [] },
  { provider: 'FACEBOOK', configured: true, category: 'SOCIAL_FACEBOOK', apps: [META_APP] },
  { provider: 'THREADS', configured: false, category: 'SOCIAL_THREADS', apps: [] },
  { provider: 'YOUTUBE', configured: false, category: 'SOCIAL_YOUTUBE', apps: [] },
  { provider: 'LINKEDIN', configured: false, category: 'SOCIAL_LINKEDIN', apps: [] },
  { provider: 'X', configured: false, category: 'SOCIAL_X', apps: [] },
];

describe('AccountsTab grouped by platform', () => {
  // As production holds them: both came in through the Facebook (Meta) app.
  const page = makeSocialAccount({ id: 'fb1', provider: 'FACEBOOK', platform: 'FACEBOOK', name: 'Duncit', handle: 'duncitapp' });
  const ig = makeSocialAccount({ id: 'ig1', provider: 'FACEBOOK', platform: 'INSTAGRAM', name: 'Duncit', handle: 'duncit._' });

  it('puts the Instagram account under Instagram and only the Page under Facebook, each saying it came via Meta', () => {
    renderWithProviders(<AccountsTab providers={PROVIDERS} accounts={[page, ig]} onChanged={vi.fn()} returnTo="ACCOUNTS" />);
    const instagram = screen.getByTestId('social-provider-instagram');
    const facebook = screen.getByTestId('social-provider-facebook');
    expect(within(instagram).getByTestId('social-account-ig1')).toBeInTheDocument();
    expect(within(instagram).queryByTestId('social-account-fb1')).not.toBeInTheDocument();
    expect(within(facebook).getByTestId('social-account-fb1')).toBeInTheDocument();
    expect(within(facebook).queryByTestId('social-account-ig1')).not.toBeInTheDocument();
    expect(screen.getByTestId('social-via-ig1')).toHaveTextContent('via Meta');
    expect(screen.getByTestId('social-via-fb1')).toHaveTextContent('via Meta');
    // The Instagram card is reachable through the Meta app even with no Instagram app of its own.
    expect(within(instagram).queryByText('No account connected yet.')).not.toBeInTheDocument();
    expect(within(instagram).getByTestId('social-connect-instagram')).toHaveTextContent('Connect another');
    expect(within(facebook).getByTestId('social-connect-facebook')).toHaveTextContent('Connect another');
  });

  it('says no account yet only on a platform with none', () => {
    renderWithProviders(<AccountsTab providers={PROVIDERS} accounts={[page]} onChanged={vi.fn()} returnTo="ACCOUNTS" />);
    expect(screen.getByTestId('social-no-account-instagram')).toHaveTextContent('No account connected yet.');
    expect(screen.queryByTestId('social-no-account-facebook')).not.toBeInTheDocument();
  });
});

const account = (over: Partial<SocialPendingAccount>): SocialPendingAccount => ({
  key: 'FACEBOOK:p1',
  platform: 'FACEBOOK',
  external_id: 'p1',
  name: 'Duncit',
  handle: 'duncitapp',
  avatar_url: '',
  connected: false,
  ...over,
});
const connection = (over: Partial<SocialPendingConnection> = {}): SocialPendingConnection => ({
  id: 'pc1',
  provider: 'FACEBOOK',
  reconnect: false,
  pages_found: 1,
  instagram_found: 2,
  found: 3,
  accounts: [
    account({}),
    account({ key: 'INSTAGRAM:i1', platform: 'INSTAGRAM', external_id: 'i1', handle: 'duncit._', connected: true }),
    account({ key: 'INSTAGRAM:i2', platform: 'INSTAGRAM', external_id: 'i2', name: 'Brand', handle: 'brand.ig' }),
  ],
  ...over,
});

const typed = (c: SocialPendingConnection) => ({
  __typename: 'SocialPendingConnection',
  ...c,
  accounts: c.accounts.map((a) => ({ __typename: 'SocialPendingAccount', ...a })),
});
const pendingMock = (c: SocialPendingConnection): MockedResponse => ({
  request: { query: SOCIAL_PENDING_CONNECTION, variables: { id: c.id } },
  result: { data: { socialPendingConnection: typed(c) } },
});
const completeMock = (keys: string[], count: number): MockedResponse => ({
  request: { query: COMPLETE_SOCIAL_CONNECTION, variables: { id: 'pc1', account_keys: keys } },
  result: { data: { completeSocialConnection: { __typename: 'SocialConnectionResult', provider: 'FACEBOOK', count } } },
});

function Search() {
  return <span data-testid="search">{useLocation().search}</span>;
}
const renderPicker = (mocks: MockedResponse[], onDone = vi.fn(), search = '?pick=pc1&connected=FACEBOOK') => {
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/social/accounts${search}`],
    routes: (
      <Route
        path="/social/accounts"
        element={
          <>
            <ConnectPicker onDone={onDone} />
            <Search />
          </>
        }
      />
    ),
  });
  return onDone;
};

describe('ConnectPicker', () => {
  it('lists everything found by platform, new ones ticked, connected ones fixed, and creates only the ticked', async () => {
    const onDone = renderPicker([pendingMock(connection()), completeMock(['FACEBOOK:p1'], 1)]);
    const dialog = await screen.findByRole('dialog', { name: 'Choose the accounts to connect' });
    expect(within(dialog).getByTestId('connect-picker-intro')).toHaveTextContent('everything Facebook gave Duncit access to');
    expect(within(dialog).getByTestId('connect-picker-group-instagram')).toHaveTextContent('Instagram — Duncit (duncit._)');
    expect(within(dialog).getByTestId('connect-picker-group-facebook')).toHaveTextContent('Facebook — Duncit (duncitapp)');
    const connected = within(dialog).getByTestId('connect-picker-INSTAGRAM:i1');
    expect(connected.querySelector('input')).toBeChecked();
    expect(connected.querySelector('input')).toBeDisabled();
    expect(within(dialog).getByText('Connected')).toBeInTheDocument();
    expect(within(dialog).getByTestId('connect-picker-submit')).toHaveTextContent('Connect 2 accounts');

    fireEvent.click(within(dialog).getByTestId('connect-picker-INSTAGRAM:i2').querySelector('input') as HTMLInputElement);
    expect(within(dialog).getByTestId('connect-picker-submit')).toHaveTextContent('Connect 1 account');
    fireEvent.click(within(dialog).getByTestId('connect-picker-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Facebook connected — 1 account added.', 'success'));
    expect(onDone).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('search')).not.toHaveTextContent('pick=');
  });

  it('refuses to submit with nothing ticked on a plain connect, saying why', async () => {
    renderPicker([pendingMock(connection({ accounts: [account({})], found: 1 }))]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByTestId('connect-picker-FACEBOOK:p1').querySelector('input') as HTMLInputElement);
    fireEvent.click(within(dialog).getByTestId('connect-picker-submit'));
    expect(await within(dialog).findByText('Tick at least one account to connect.')).toBeInTheDocument();
  });

  it('says what was found and the real causes when the grant reached nothing', async () => {
    renderPicker([pendingMock(connection({ found: 0, pages_found: 0, instagram_found: 0, accounts: [] }))]);
    const nothing = await screen.findByTestId('connect-picker-nothing');
    expect(nothing).toHaveTextContent('Meta gave Duncit access to 0 Facebook Pages and 0 Instagram accounts.');
    expect(nothing).toHaveTextContent('personal account');
    expect(nothing).toHaveTextContent('not linked to a Facebook Page');
    expect(nothing).toHaveTextContent('No Page was ticked');
    fireEvent.click(screen.getByTestId('connect-picker-close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('gives a non-Meta network its own reason', async () => {
    renderPicker([pendingMock(connection({ provider: 'X', found: 0, pages_found: 0, instagram_found: 0, accounts: [] }))]);
    expect(await screen.findByTestId('connect-picker-nothing')).toHaveTextContent('X gave Duncit access to no account.');
  });

  it('shows an expired grant’s reason', async () => {
    renderPicker([{ request: { query: SOCIAL_PENDING_CONNECTION, variables: { id: 'pc1' } }, result: { errors: [new GraphQLError('This connection has expired or was already finished. Press Connect again.')] } }]);
    expect(await screen.findByText(/This connection has expired/)).toBeInTheDocument();
  });

  it('renders nothing when there is no held grant', () => {
    renderPicker([], vi.fn(), '');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and says why when finishing is refused', async () => {
    const onDone = renderPicker([
      pendingMock(connection()),
      { request: { query: COMPLETE_SOCIAL_CONNECTION, variables: { id: 'pc1', account_keys: ['FACEBOOK:p1', 'INSTAGRAM:i2'] } }, result: { errors: [new GraphQLError('This connection was already finished.')] } },
    ]);
    fireEvent.click(await screen.findByTestId('connect-picker-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('This connection was already finished.', 'error'));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('the picker’s values', () => {
  const t = (key: string) => key;

  it('ticks only what is not connected yet, and groups by platform in page order', () => {
    expect(defaultPickerValues(connection())).toEqual({ keys: ['FACEBOOK:p1', 'INSTAGRAM:i2'] });
    expect(byPlatform(connection().accounts).map((g) => [g.platform, g.accounts.length])).toEqual([
      ['INSTAGRAM', 2],
      ['FACEBOOK', 1],
    ]);
  });

  it('counts the connected accounts in only on a Reconnect, which may then go with nothing new ticked', () => {
    expect(savedCount(connection(), ['FACEBOOK:p1'])).toBe(1);
    expect(savedCount(connection({ reconnect: true }), ['FACEBOOK:p1'])).toBe(2);
    expect(connectPickerSchema(t, connection({ reconnect: true })).safeParse({ keys: [] }).success).toBe(true);
    expect(connectPickerSchema(t, connection()).safeParse({ keys: [] }).success).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ShellUser } from '../src/chrome/user-display';

const apollo = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

const userCtx = vi.hoisted(() => ({
  user: null as ShellUser,
  refetch: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('@duncit/user-context', () => ({ useUserData: () => userCtx }));

const branding = vi.hoisted(() => ({ appName: 'Acme' }));
vi.mock('../src/hooks/useBranding', () => ({
  useBranding: () => ({ appName: branding.appName, logoUrl: '', loading: false }),
}));

// The language switcher has its own suite; here the flag is off so the
// Profile tab renders only what this page owns.
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useFeatureFlag: () => false,
  useDateFormat: () => ({ formatDateTime: (iso: string) => `at ${iso}` }),
}));

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => confirm,
}));

import { ProfilePage } from '../src/chrome/ProfilePage';
import { MY_CONNECTED_ACCOUNTS, SIGN_OUT_EVERYWHERE } from '../src/chrome/ProfilePage/queries';
import { MY_MAIL_PREFERENCES } from '../src/chrome/ProfilePage/notifications/queries';

const signOut = vi.fn();
const queryData = new Map<unknown, unknown>();

function renderPage(path = '/profile') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProfilePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  branding.appName = 'Acme';
  userCtx.user = null;
  userCtx.refetch = vi.fn().mockResolvedValue(null);
  userCtx.logout = vi.fn();
  queryData.clear();
  signOut.mockReset().mockResolvedValue({ data: { signOutEverywhere: true } });
  confirm.mockReset().mockResolvedValue(true);
  apollo.useQuery.mockReset().mockImplementation((doc: unknown) => ({
    data: queryData.get(doc),
    loading: false,
    error: undefined,
    refetch: vi.fn().mockResolvedValue({}),
  }));
  apollo.useMutation.mockReset().mockImplementation((doc: unknown) => [
    doc === SIGN_OUT_EVERYWHERE ? signOut : vi.fn().mockResolvedValue({}),
    { loading: false },
  ]);
});

describe('ProfilePage', () => {
  it('opens on the Profile tab and shows who is signed in, their photo and roles', () => {
    userCtx.user = {
      user_id: 'u1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      full_name: 'Ada Lovelace',
      email: 'ada@x.test',
      profile_photo: 'https://ik.imagekit.io/ada.png',
      roles: ['CLUB_ADMIN'],
    };
    const { container } = renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('ada@x.test')).toBeInTheDocument();
    expect(screen.getByText('Signed in to Acme')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://ik.imagekit.io/ada.png');

    expect(screen.getByTestId('profile-tab-profile')).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', screen.getByTestId('profile-tab-profile').id);
    expect(within(panel).getByTestId('profile-about')).toBeInTheDocument();
    // CLUB_ADMIN is humanised for the chip.
    expect(within(panel).getByTestId('profile-role-CLUB_ADMIN')).toHaveTextContent('Club Admin');
    expect(screen.queryByTestId('profile-password')).not.toBeInTheDocument();
  });

  it('falls back to a placeholder name, initials and no-email line when no user is loaded', () => {
    const { container } = renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'User' })).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText('No email on this account')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    // A missing user has no roles rather than crashing the roles card.
    expect(screen.getByText('No roles assigned.')).toBeInTheDocument();
  });

  it('names the Duncit brand when branding carries no app name', () => {
    branding.appName = '';
    renderPage();
    expect(screen.getByText('Signed in to Duncit')).toBeInTheDocument();
  });

  it('logs out from the identity card', async () => {
    const u = userEvent.setup();
    userCtx.user = { user_id: 'u1', first_name: 'Ada', roles: [] };
    renderPage();

    await u.click(screen.getByTestId('profile-logout'));
    expect(userCtx.logout).toHaveBeenCalledTimes(1);
  });

  it('opens the Security tab straight from the URL and signs out everywhere through logout', async () => {
    const u = userEvent.setup();
    userCtx.user = { user_id: 'u1', first_name: 'Ada', roles: [] };
    queryData.set(MY_CONNECTED_ACCOUNTS, {
      myConnectedAccounts: {
        has_password: true,
        password_changed_at: null,
        last_login_at: null,
        last_login_provider: null,
        google: null,
      },
    });
    renderPage('/profile?selectedtab=security');

    expect(screen.getByTestId('profile-tab-security')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-password')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-about')).not.toBeInTheDocument();

    await u.click(screen.getByTestId('profile-sign-out-all'));
    // The page's own logout is what runs once every session is sealed.
    await waitFor(() => expect(userCtx.logout).toHaveBeenCalledTimes(1));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('opens the Notifications tab from the URL', () => {
    queryData.set(MY_MAIL_PREFERENCES, { myMailPreferences: { email: 'ada@x.test', categories: [] } });
    renderPage('/profile?selectedtab=notifications');

    expect(screen.getByTestId('profile-tab-notifications')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-mail-preferences')).toBeInTheDocument();
    expect(screen.getByTestId('profile-whatsapp-preferences')).toBeInTheDocument();
    expect(screen.getByTestId('profile-otp-channels')).toBeInTheDocument();
  });

  it('falls back to the Profile tab for an unknown tab in the URL', () => {
    renderPage('/profile?selectedtab=billing');
    expect(screen.getByTestId('profile-tab-profile')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-about')).toBeInTheDocument();
  });

  it('switches panels when another tab is clicked', async () => {
    const u = userEvent.setup();
    renderPage();

    await u.click(screen.getByTestId('profile-tab-notifications'));
    expect(screen.getByTestId('profile-tab-notifications')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-otp-channels')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-about')).not.toBeInTheDocument();
  });
});

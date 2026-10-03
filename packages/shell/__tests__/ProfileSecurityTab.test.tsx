import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apollo = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (iso: string) => `on ${iso}` }),
}));

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => confirm,
}));

const warn = vi.hoisted(() => vi.fn());
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}));

import { SecurityTab } from '../src/chrome/ProfilePage/security/SecurityTab';
import {
  CHANGE_PASSWORD_WITH_OTP,
  MY_CONNECTED_ACCOUNTS,
  REQUEST_PASSWORD_CHANGE_OTP,
  SIGN_OUT_EVERYWHERE,
  type ConnectedAccounts,
} from '../src/chrome/ProfilePage/queries';

interface QueryState {
  data: { myConnectedAccounts: ConnectedAccounts } | undefined;
  loading: boolean;
  error: Error | undefined;
}

const query: QueryState = { data: undefined, loading: false, error: undefined };
const refetch = vi.fn();
const requestOtp = vi.fn();
const changePassword = vi.fn();
const signOut = vi.fn();
const signOutLoading = { value: false };

const ACCOUNTS: ConnectedAccounts = {
  has_password: true,
  password_changed_at: '2026-09-01T10:00:00Z',
  last_login_at: '2026-10-02T08:30:00Z',
  last_login_provider: 'EMAIL',
  google: { google_email: 'ada@gmail.test', linked_at: '2026-01-01T00:00:00Z' },
};

beforeEach(() => {
  query.data = { myConnectedAccounts: ACCOUNTS };
  query.loading = false;
  query.error = undefined;
  signOutLoading.value = false;
  refetch.mockReset().mockResolvedValue({});
  requestOtp.mockReset().mockResolvedValue({ data: { requestPasswordChangeOtp: { ok: true } } });
  changePassword.mockReset().mockResolvedValue({ data: { changePasswordWithOtp: true } });
  signOut.mockReset().mockResolvedValue({ data: { signOutEverywhere: true } });
  confirm.mockReset().mockResolvedValue(true);
  warn.mockReset();
  apollo.useQuery.mockReset().mockImplementation((doc: unknown) =>
    doc === MY_CONNECTED_ACCOUNTS ? { ...query, refetch } : { data: undefined, loading: false },
  );
  apollo.useMutation.mockReset().mockImplementation((doc: unknown) => {
    if (doc === REQUEST_PASSWORD_CHANGE_OTP) return [requestOtp, { loading: false }];
    if (doc === CHANGE_PASSWORD_WITH_OTP) return [changePassword, { loading: false }];
    if (doc === SIGN_OUT_EVERYWHERE) return [signOut, { loading: signOutLoading.value }];
    return [vi.fn(), { loading: false }];
  });
});

const withAccounts = (patch: Partial<ConnectedAccounts>) => {
  query.data = { myConnectedAccounts: { ...ACCOUNTS, ...patch } };
};

describe('SecurityTab — loading and failure', () => {
  it('shows a placeholder while the first load is in flight', () => {
    query.data = undefined;
    query.loading = true;
    const { container } = render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-security-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-password')).not.toBeInTheDocument();
  });

  it('says the security settings could not load when the query failed', () => {
    query.data = undefined;
    query.error = new Error('offline');
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-security-error')).toHaveTextContent('Could not load your security settings.');
  });

  it('falls back to the generic message when the query settled with no data and no error', () => {
    query.data = undefined;
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-security-error')).toHaveTextContent('Something went wrong. Please try again.');
  });
});

describe('PasswordSection', () => {
  it('says when a password was last changed and offers to change it', () => {
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-password-status')).toHaveTextContent('Last changed on 2026-09-01T10:00:00Z');
    expect(screen.getByTestId('profile-change-password')).toHaveTextContent('Change password');
  });

  it('says a password that was never changed', () => {
    withAccounts({ password_changed_at: null });
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-password-status')).toHaveTextContent('Password set, never changed.');
  });

  it('offers to create a password for an account that has none', () => {
    withAccounts({ has_password: false, password_changed_at: null });
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-password-status')).toHaveTextContent(
      'No password set — you sign in with Google or an emailed code.',
    );
    expect(screen.getByTestId('profile-change-password')).toHaveTextContent('Create password');
  });

  it('changes the password end to end, confirms and reloads the sign-in facts', async () => {
    const u = userEvent.setup();
    render(<SecurityTab onSignedOut={vi.fn()} />);

    await u.click(screen.getByTestId('profile-change-password'));
    const dialog = await screen.findByTestId('change-password-dialog');
    await u.type(within(dialog).getByLabelText(/Current password/), 'old-secret');
    await u.click(within(dialog).getByTestId('current-password-submit'));
    await u.type(await within(dialog).findByLabelText(/6-digit code/), '123456');
    await u.type(within(dialog).getByLabelText(/^New password/), 'new-secret-1');
    await u.type(within(dialog).getByLabelText(/Confirm new password/), 'new-secret-1');
    await u.click(within(dialog).getByTestId('new-password-submit'));

    expect(await screen.findByTestId('profile-password-changed')).toHaveTextContent('Your password has been changed.');
    expect(changePassword).toHaveBeenCalledWith({ variables: { input: { otp: '123456', new_password: 'new-secret-1' } } });
    expect(refetch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('change-password-dialog')).not.toBeInTheDocument());
    expect(warn).not.toHaveBeenCalled();

    await u.click(within(screen.getByTestId('profile-password-changed')).getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('profile-password-changed')).not.toBeInTheDocument();
  });

  it('logs, rather than surfaces, a reload that fails after a successful change', async () => {
    const u = userEvent.setup();
    const failure = new Error('reload failed');
    refetch.mockRejectedValue(failure);
    withAccounts({ has_password: false, password_changed_at: null });
    render(<SecurityTab onSignedOut={vi.fn()} />);

    await u.click(screen.getByTestId('profile-change-password'));
    await u.click(await screen.findByTestId('change-password-send-code'));
    await u.type(await screen.findByLabelText(/6-digit code/), '654321');
    await u.type(screen.getByLabelText(/^New password/), 'brand-new-1');
    await u.type(screen.getByLabelText(/Confirm new password/), 'brand-new-1');
    await u.click(screen.getByTestId('new-password-submit'));

    expect(await screen.findByTestId('profile-password-changed')).toBeInTheDocument();
    await waitFor(() => expect(warn).toHaveBeenCalledWith('profile', 'securityRefetch', { error: failure }));
  });

  it('hides the last confirmation when the dialog is opened again', async () => {
    const u = userEvent.setup();
    withAccounts({ has_password: false, password_changed_at: null });
    render(<SecurityTab onSignedOut={vi.fn()} />);

    await u.click(screen.getByTestId('profile-change-password'));
    await u.click(await screen.findByTestId('change-password-send-code'));
    await u.type(await screen.findByLabelText(/6-digit code/), '654321');
    await u.type(screen.getByLabelText(/^New password/), 'brand-new-1');
    await u.type(screen.getByLabelText(/Confirm new password/), 'brand-new-1');
    await u.click(screen.getByTestId('new-password-submit'));
    expect(await screen.findByTestId('profile-password-changed')).toBeInTheDocument();

    await u.click(screen.getByTestId('profile-change-password'));
    expect(screen.queryByTestId('profile-password-changed')).not.toBeInTheDocument();
    expect(await screen.findByTestId('change-password-dialog')).toBeInTheDocument();
  });

  it('closes the dialog on Escape without changing anything', async () => {
    const u = userEvent.setup();
    render(<SecurityTab onSignedOut={vi.fn()} />);

    await u.click(screen.getByTestId('profile-change-password'));
    expect(await screen.findByTestId('change-password-dialog')).toBeInTheDocument();
    await u.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByTestId('change-password-dialog')).not.toBeInTheDocument());
    expect(requestOtp).not.toHaveBeenCalled();
    expect(screen.queryByTestId('profile-password-changed')).not.toBeInTheDocument();
  });
});

describe('SignInActivitySection', () => {
  it.each([
    ['EMAIL', 'with password'],
    ['OTP', 'with a one-time code'],
    ['GOOGLE', 'with Google'],
    ['APPLE', 'with Apple'],
  ])('names a %s sign-in', (provider, words) => {
    withAccounts({ last_login_provider: provider });
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-last-sign-in')).toHaveTextContent(
      `Last signed in on 2026-10-02T08:30:00Z · ${words}`,
    );
  });

  it('leaves the method off for a provider it has no words for', () => {
    withAccounts({ last_login_provider: 'SAML' });
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-last-sign-in').textContent).toBe('Last signed in on 2026-10-02T08:30:00Z');
  });

  it('says no sign-in is recorded, without a method, when there is no date', () => {
    withAccounts({ last_login_at: null, last_login_provider: 'EMAIL' });
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-last-sign-in').textContent).toBe('No sign-in recorded yet.');
  });

  it('shows the linked Gmail, or that none is linked', () => {
    const { unmount } = render(<SecurityTab onSignedOut={vi.fn()} />);
    expect(screen.getByTestId('profile-google-link')).toHaveTextContent('Google account linked: ada@gmail.test');
    unmount();

    withAccounts({ google: null });
    render(<SecurityTab onSignedOut={vi.fn()} />);
    expect(screen.getByTestId('profile-google-link')).toHaveTextContent(
      'No Google account linked. You can link one from the Duncit app.',
    );
  });
});

describe('SignOutEverywhereSection', () => {
  it('asks first, as a destructive action, and signs out once every session is ended', async () => {
    const u = userEvent.setup();
    const onSignedOut = vi.fn();
    render(<SecurityTab onSignedOut={onSignedOut} />);

    await u.click(screen.getByTestId('profile-sign-out-all'));

    expect(confirm).toHaveBeenCalledWith({
      title: 'Sign out of all devices?',
      message:
        'Every browser and app signed in to your account, including this one, will be signed out. You will need to sign in again.',
      confirmLabel: 'Sign out of all devices',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    await waitFor(() => expect(onSignedOut).toHaveBeenCalledTimes(1));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the confirmation is declined', async () => {
    const u = userEvent.setup();
    const onSignedOut = vi.fn();
    confirm.mockResolvedValue(false);
    render(<SecurityTab onSignedOut={onSignedOut} />);

    await u.click(screen.getByTestId('profile-sign-out-all'));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(signOut).not.toHaveBeenCalled();
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it('stays signed in and shows the error when the server refuses', async () => {
    const u = userEvent.setup();
    const onSignedOut = vi.fn();
    signOut.mockRejectedValue(new Error('Session store unavailable'));
    render(<SecurityTab onSignedOut={onSignedOut} />);

    await u.click(screen.getByTestId('profile-sign-out-all'));

    const section = screen.getByTestId('profile-sessions');
    expect(await within(section).findByText('Session store unavailable')).toBeInTheDocument();
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it('disables the button while the sign-out is running', () => {
    signOutLoading.value = true;
    render(<SecurityTab onSignedOut={vi.fn()} />);

    expect(screen.getByTestId('profile-sign-out-all')).toBeDisabled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apollo = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

import { fallbackT } from '../src/i18n/fallback';
import { ChangePasswordDialog } from '../src/chrome/ProfilePage/security/ChangePasswordDialog';
import { CHANGE_PASSWORD_WITH_OTP, REQUEST_PASSWORD_CHANGE_OTP } from '../src/chrome/ProfilePage/queries';

const requestOtp = vi.fn();
const changePassword = vi.fn();
const loading = { requesting: false, changing: false };

beforeEach(() => {
  loading.requesting = false;
  loading.changing = false;
  requestOtp.mockReset().mockResolvedValue({ data: { requestPasswordChangeOtp: { ok: true } } });
  changePassword.mockReset().mockResolvedValue({ data: { changePasswordWithOtp: true } });
  apollo.useMutation.mockReset().mockImplementation((doc: unknown) => {
    if (doc === REQUEST_PASSWORD_CHANGE_OTP) return [requestOtp, { loading: loading.requesting }];
    if (doc === CHANGE_PASSWORD_WITH_OTP) return [changePassword, { loading: loading.changing }];
    return [vi.fn(), { loading: false }];
  });
});

function renderDialog(hasPassword: boolean) {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  const view = render(
    <ChangePasswordDialog open hasPassword={hasPassword} onClose={onClose} onChanged={onChanged} />,
  );
  return { ...view, onClose, onChanged };
}

const CODE_SENT = 'We have emailed you a 6-digit code.';

async function proveCurrentPassword(u: ReturnType<typeof userEvent.setup>, password = 'old-secret') {
  await u.type(screen.getByLabelText(/Current password/), password);
  await u.click(screen.getByTestId('current-password-submit'));
  await screen.findByTestId('new-password-submit');
}

async function fillNewPassword(u: ReturnType<typeof userEvent.setup>, otp: string, password: string, confirm = password) {
  await u.type(screen.getByLabelText(/6-digit code/), otp);
  await u.type(screen.getByLabelText(/^New password/), password);
  await u.type(screen.getByLabelText(/Confirm new password/), confirm);
  await u.click(screen.getByTestId('new-password-submit'));
}

describe('ChangePasswordDialog — with a password', () => {
  it('asks for the current password first', () => {
    renderDialog(true);

    expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument();
    expect(
      screen.getByText('Enter your current password. We will email you a 6-digit code to confirm the change.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('current-password-submit')).toHaveTextContent('Send code');
    expect(screen.queryByTestId('change-password-notice')).not.toBeInTheDocument();
  });

  it('refuses an empty current password without calling the server', async () => {
    const u = userEvent.setup();
    renderDialog(true);

    await u.click(screen.getByTestId('current-password-submit'));
    expect(await screen.findByText(fallbackT('mweb.changePassword.enterYourCurrentPassword'))).toBeInTheDocument();
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it('emails a code for the proven password and moves to the second step', async () => {
    const u = userEvent.setup();
    renderDialog(true);

    await proveCurrentPassword(u);

    expect(requestOtp).toHaveBeenCalledWith({ variables: { input: { current_password: 'old-secret' } } });
    expect(screen.getByTestId('change-password-notice')).toHaveTextContent(CODE_SENT);
    expect(screen.queryByTestId('current-password-submit')).not.toBeInTheDocument();
  });

  it('keeps the first step with the server message when the current password is wrong', async () => {
    const u = userEvent.setup();
    requestOtp.mockRejectedValue(new Error('Current password is incorrect'));
    renderDialog(true);

    await u.type(screen.getByLabelText(/Current password/), 'wrong');
    await u.click(screen.getByTestId('current-password-submit'));

    expect(await screen.findByTestId('current-password-error')).toHaveTextContent('Current password is incorrect');
    expect(screen.queryByTestId('new-password-submit')).not.toBeInTheDocument();
  });

  it('says Sending code… and disables the step while the code is requested', () => {
    loading.requesting = true;
    renderDialog(true);

    expect(screen.getByTestId('current-password-submit')).toHaveTextContent('Sending code…');
    expect(screen.getByTestId('current-password-submit')).toBeDisabled();
  });

  it('refuses a new password identical to the current one', async () => {
    const u = userEvent.setup();
    renderDialog(true);
    await proveCurrentPassword(u, 'same-secret');

    await fillNewPassword(u, '123456', 'same-secret');

    expect(await screen.findByTestId('new-password-error')).toHaveTextContent(
      'Your new password must be different from your current one.',
    );
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('shows the server message when the code is refused', async () => {
    const u = userEvent.setup();
    changePassword.mockRejectedValue(new Error('Code expired'));
    const { onChanged, onClose } = renderDialog(true);
    await proveCurrentPassword(u);

    await fillNewPassword(u, '123456', 'new-secret-1');

    expect(await screen.findByTestId('new-password-error')).toHaveTextContent('Code expired');
    expect(onChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('changes the password, reports it and closes back to the first step', async () => {
    const u = userEvent.setup();
    const { onChanged, onClose, rerender } = renderDialog(true);
    await proveCurrentPassword(u);

    await fillNewPassword(u, '123456', 'new-secret-1');

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(changePassword).toHaveBeenCalledWith({ variables: { input: { otp: '123456', new_password: 'new-secret-1' } } });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Opened again, it starts over — no stale notice, back on step one.
    rerender(<ChangePasswordDialog open hasPassword onClose={onClose} onChanged={onChanged} />);
    expect(screen.getByTestId('current-password-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('change-password-notice')).not.toBeInTheDocument();
  });

  it('resends the code for the same current password', async () => {
    const u = userEvent.setup();
    renderDialog(true);
    await proveCurrentPassword(u);

    await u.click(screen.getByTestId('change-password-resend'));

    await waitFor(() => expect(requestOtp).toHaveBeenCalledTimes(2));
    expect(requestOtp).toHaveBeenLastCalledWith({ variables: { input: { current_password: 'old-secret' } } });
    expect(screen.getByTestId('change-password-notice')).toHaveTextContent(CODE_SENT);
  });

  it('turns a failed resend into an error notice', async () => {
    const u = userEvent.setup();
    renderDialog(true);
    await proveCurrentPassword(u);
    requestOtp.mockRejectedValue(new Error('Too many codes requested'));

    await u.click(screen.getByTestId('change-password-resend'));

    await waitFor(() =>
      expect(screen.getByTestId('change-password-notice')).toHaveTextContent('Too many codes requested'),
    );
    expect(screen.getByTestId('change-password-notice')).toHaveClass('MuiAlert-colorError');
  });

  it('says Saving… and disables the second step while the change is running', async () => {
    const u = userEvent.setup();
    loading.changing = true;
    renderDialog(true);
    await proveCurrentPassword(u);

    expect(screen.getByTestId('new-password-submit')).toHaveTextContent('Saving…');
    expect(screen.getByTestId('new-password-submit')).toBeDisabled();
  });

  it('closes on Escape and forgets the step it was on', async () => {
    const u = userEvent.setup();
    const { onClose, onChanged, rerender } = renderDialog(true);
    await proveCurrentPassword(u);

    await u.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ChangePasswordDialog open hasPassword onClose={onClose} onChanged={onChanged} />);
    expect(screen.getByTestId('current-password-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('change-password-notice')).not.toBeInTheDocument();
  });
});

describe('ChangePasswordDialog — without a password', () => {
  it('creates a password: a code is emailed with no current password sent', async () => {
    const u = userEvent.setup();
    renderDialog(false);

    expect(screen.getByRole('heading', { name: 'Create password' })).toBeInTheDocument();
    expect(
      screen.getByText('We will email you a 6-digit code to confirm it is you, then you can set a password.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('current-password-submit')).not.toBeInTheDocument();

    await u.click(screen.getByTestId('change-password-send-code'));

    await screen.findByTestId('new-password-submit');
    expect(requestOtp).toHaveBeenCalledWith({ variables: { input: {} } });
    expect(screen.getByTestId('change-password-notice')).toHaveTextContent(CODE_SENT);
    expect(screen.getByTestId('change-password-notice')).toHaveClass('MuiAlert-colorSuccess');
  });

  it('resends with no current password either', async () => {
    const u = userEvent.setup();
    renderDialog(false);
    await u.click(screen.getByTestId('change-password-send-code'));
    await screen.findByTestId('new-password-submit');

    await u.click(screen.getByTestId('change-password-resend'));
    await waitFor(() => expect(requestOtp).toHaveBeenCalledTimes(2));
    expect(requestOtp).toHaveBeenLastCalledWith({ variables: { input: {} } });
  });

  it('shows an error notice and stays on the first step when the code cannot be sent', async () => {
    const u = userEvent.setup();
    requestOtp.mockRejectedValue(new Error('Mail service down'));
    renderDialog(false);

    await u.click(screen.getByTestId('change-password-send-code'));

    await waitFor(() => expect(screen.getByTestId('change-password-notice')).toHaveTextContent('Mail service down'));
    expect(screen.getByTestId('change-password-send-code')).toBeInTheDocument();
  });

  it('says Sending code… and disables the button while the code is requested', () => {
    loading.requesting = true;
    renderDialog(false);

    expect(screen.getByTestId('change-password-send-code')).toHaveTextContent('Sending code…');
    expect(screen.getByTestId('change-password-send-code')).toBeDisabled();
  });

  it('sets the first password: any new password is accepted since there is none to differ from', async () => {
    const u = userEvent.setup();
    const { onChanged } = renderDialog(false);
    await u.click(screen.getByTestId('change-password-send-code'));
    await screen.findByTestId('new-password-submit');

    await fillNewPassword(u, '000111', 'first-secret');

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(changePassword).toHaveBeenCalledWith({ variables: { input: { otp: '000111', new_password: 'first-secret' } } });
  });
});

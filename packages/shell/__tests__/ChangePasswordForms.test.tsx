import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fallbackT } from '../src/i18n/fallback';
import { CurrentPasswordForm, NewPasswordForm } from '../src/chrome/ProfilePage/security/change-password';

describe('CurrentPasswordForm', () => {
  it('shows and hides the password with the eye button', async () => {
    const u = userEvent.setup();
    render(<CurrentPasswordForm loading={false} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText(/Current password/);

    expect(input).toHaveAttribute('type', 'password');
    await u.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    await u.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('submits the typed password', async () => {
    const u = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CurrentPasswordForm loading={false} onSubmit={onSubmit} />);

    await u.type(screen.getByLabelText(/Current password/), 'old-secret');
    await u.click(screen.getByTestId('current-password-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ current_password: 'old-secret' }));
    expect(screen.queryByTestId('current-password-error')).not.toBeInTheDocument();
  });

  it('falls back to the generic message when the step throws something other than an Error', async () => {
    const u = userEvent.setup();
    render(<CurrentPasswordForm loading={false} onSubmit={vi.fn().mockRejectedValue('nope')} />);

    await u.type(screen.getByLabelText(/Current password/), 'old-secret');
    await u.click(screen.getByTestId('current-password-submit'));

    expect(await screen.findByTestId('current-password-error')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });
});

describe('NewPasswordForm', () => {
  it('validates the code, the length and that both passwords match', async () => {
    const u = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NewPasswordForm loading={false} onSubmit={onSubmit} />);

    await u.type(screen.getByLabelText(/6-digit code/), '12a');
    await u.type(screen.getByLabelText(/^New password/), 'short');
    await u.type(screen.getByLabelText(/Confirm new password/), 'different-1');
    await u.click(screen.getByTestId('new-password-submit'));

    expect(await screen.findByText(fallbackT('mweb.resetPassword.validation.otpInvalid'))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.auth.validation.passwordMin'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await u.clear(screen.getByLabelText(/6-digit code/));
    await u.type(screen.getByLabelText(/6-digit code/), '123456');
    await u.clear(screen.getByLabelText(/^New password/));
    await u.type(screen.getByLabelText(/^New password/), 'long-enough-1');
    await u.click(screen.getByTestId('new-password-submit'));
    expect(await screen.findByText(fallbackT('mweb.auth.validation.passwordsMismatch'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reveals the new and the confirm boxes independently', async () => {
    const u = userEvent.setup();
    render(<NewPasswordForm loading={false} onSubmit={vi.fn()} />);
    const next = screen.getByLabelText(/^New password/);
    const confirm = screen.getByLabelText(/Confirm new password/);

    await u.click(screen.getByTestId('new-password-toggle'));
    expect(next).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'password');

    await u.click(screen.getByTestId('confirm-password-toggle'));
    expect(confirm).toHaveAttribute('type', 'text');
    expect(screen.getByTestId('confirm-password-toggle')).toHaveAccessibleName('Hide password');
  });

  it('submits a valid code and matching passwords', async () => {
    const u = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NewPasswordForm loading={false} onSubmit={onSubmit} />);

    await u.type(screen.getByLabelText(/6-digit code/), '123456');
    await u.type(screen.getByLabelText(/^New password/), 'long-enough-1');
    await u.type(screen.getByLabelText(/Confirm new password/), 'long-enough-1');
    await u.click(screen.getByTestId('new-password-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        otp: '123456',
        new_password: 'long-enough-1',
        confirm_password: 'long-enough-1',
      }),
    );
  });

  it('falls back to the generic message when the step throws something other than an Error', async () => {
    const u = userEvent.setup();
    render(<NewPasswordForm loading={false} onSubmit={vi.fn().mockRejectedValue(42)} />);

    await u.type(screen.getByLabelText(/6-digit code/), '123456');
    await u.type(screen.getByLabelText(/^New password/), 'long-enough-1');
    await u.type(screen.getByLabelText(/Confirm new password/), 'long-enough-1');
    await u.click(screen.getByTestId('new-password-submit'));

    expect(await screen.findByTestId('new-password-error')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });
});

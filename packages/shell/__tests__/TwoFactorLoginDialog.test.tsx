/**
 * The second step of a console sign-in: the authenticator code (or a recovery
 * code), a refusal shown under the box, and no way to dismiss it mid-check.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TwoFactorLoginDialog from '../src/portal-login/TwoFactorLoginDialog';

const mount = (over: Partial<Parameters<typeof TwoFactorLoginDialog>[0]> = {}) => {
  const props = {
    open: true,
    busy: false,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...over,
  };
  return { ...render(<TwoFactorLoginDialog {...props} />), props };
};

describe('TwoFactorLoginDialog', () => {
  it('renders nothing while there is no challenge', () => {
    mount({ open: false });
    expect(screen.queryByTestId('two-factor-login-dialog')).not.toBeInTheDocument();
  });

  it('asks for the code from the app, described by the hint, and accepts a recovery code', async () => {
    const u = userEvent.setup();
    const { props } = mount();
    const dialog = screen.getByRole('dialog', { name: 'Two-step verification' });

    expect(dialog).toHaveAccessibleDescription(
      'Open your authenticator app and enter the 6-digit code for this account.',
    );
    await u.type(within(dialog).getByLabelText(/^Code/), 'WXYZ-1234');
    await u.click(within(dialog).getByTestId('two-factor-login-submit'));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith('WXYZ-1234'));
    expect(within(dialog).getByTestId('two-factor-login-submit')).toHaveTextContent('Verify');
  });

  it("shows the step's refusal under the code box", async () => {
    const u = userEvent.setup();
    mount({ onSubmit: vi.fn().mockRejectedValue(new Error('That code is not right')) });

    await u.type(screen.getByLabelText(/^Code/), '123456');
    await u.click(screen.getByTestId('two-factor-login-submit'));

    expect(await screen.findByTestId('two-factor-login-error')).toHaveTextContent('That code is not right');
  });

  it('cancels with the button or Escape', async () => {
    const u = userEvent.setup();
    const { props } = mount();

    await u.click(screen.getByTestId('two-factor-login-cancel'));
    expect(props.onCancel).toHaveBeenCalledTimes(1);

    await u.keyboard('{Escape}');
    expect(props.onCancel).toHaveBeenCalledTimes(2);
  });

  it('cannot be dismissed while the code is being checked', async () => {
    const u = userEvent.setup();
    const { props } = mount({ busy: true });

    expect(screen.getByTestId('two-factor-login-cancel')).toBeDisabled();
    expect(screen.getByTestId('two-factor-login-submit')).toHaveTextContent('Checking…');
    await u.keyboard('{Escape}');
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('starts a fresh challenge with an empty box and no old error', async () => {
    const u = userEvent.setup();
    const { props, rerender } = mount({ onSubmit: vi.fn().mockRejectedValue(new Error('Expired')) });
    await u.type(screen.getByLabelText(/^Code/), '123456');
    await u.click(screen.getByTestId('two-factor-login-submit'));
    expect(await screen.findByTestId('two-factor-login-error')).toBeInTheDocument();

    rerender(<TwoFactorLoginDialog {...props} open={false} />);
    rerender(<TwoFactorLoginDialog {...props} open />);

    expect(screen.getByLabelText(/^Code/)).toHaveValue('');
    expect(screen.queryByTestId('two-factor-login-error')).not.toBeInTheDocument();
  });
});

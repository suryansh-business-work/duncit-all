/**
 * The one code box every authenticator step asks through. Setting up accepts
 * only the app's 6 digits (only the app proves the scan); signing in and
 * turning it off also accept a recovery code. A refused step shows its reason
 * under the form and clears on the next try.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorCodeForm } from '../src/two-factor/two-factor-code';
import type { TwoFactorCodeFormProps } from '../src/two-factor/two-factor-code';

const mount = (over: Partial<TwoFactorCodeFormProps> = {}) => {
  const onSubmit = over.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  render(
    <TwoFactorCodeForm allowRecovery={false} loading={false} submitLabel="Turn on" testId="tf" {...over} onSubmit={onSubmit} />,
  );
  return onSubmit;
};

describe('TwoFactorCodeForm — app code only', () => {
  it('asks for the 6-digit code with a numeric keypad capped at six characters', () => {
    mount();
    const input = screen.getByLabelText(/6-digit code/);

    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '6');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByText('From your authenticator app')).toBeInTheDocument();
    expect(screen.getByTestId('tf-submit')).toHaveTextContent('Turn on');
  });

  it('refuses an empty or short code, and a recovery code, without calling the step', async () => {
    const u = userEvent.setup();
    const onSubmit = mount();

    await u.click(screen.getByTestId('tf-submit'));
    expect(await screen.findByText('Enter the 6-digit code from your app')).toBeInTheDocument();

    await u.type(screen.getByLabelText(/6-digit code/), 'ABCD-EFGH');
    await u.click(screen.getByTestId('tf-submit'));
    expect(screen.getByText('Enter the 6-digit code from your app')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid code', async () => {
    const u = userEvent.setup();
    const onSubmit = mount();

    await u.type(screen.getByLabelText(/6-digit code/), '123456');
    await u.click(screen.getByTestId('tf-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('123456'));
    expect(screen.queryByTestId('tf-error')).not.toBeInTheDocument();
  });

  it('says it is checking, and cannot be pressed again, while the step runs', () => {
    mount({ loading: true });
    const button = screen.getByTestId('tf-submit');

    expect(button).toHaveTextContent('Checking…');
    expect(button).toBeDisabled();
  });
});

describe('TwoFactorCodeForm — app code or recovery code', () => {
  it('labels the box for either kind of code and lifts the keypad and length limits', () => {
    mount({ allowRecovery: true });
    const input = screen.getByLabelText(/^Code/);

    expect(input).not.toHaveAttribute('inputmode');
    expect(input).toHaveAttribute('maxlength', '20');
    expect(screen.getByText('The 6-digit code from your app, or one of your recovery codes')).toBeInTheDocument();
  });

  it('accepts a recovery code as typed, dash included', async () => {
    const u = userEvent.setup();
    const onSubmit = mount({ allowRecovery: true });

    await u.type(screen.getByLabelText(/^Code/), 'ABCD-EFGH');
    await u.click(screen.getByTestId('tf-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('ABCD-EFGH'));
  });

  it('trims the spaces a pasted code brings with it', async () => {
    const u = userEvent.setup();
    const onSubmit = mount({ allowRecovery: true });

    await u.type(screen.getByLabelText(/^Code/), '  654321  ');
    await u.click(screen.getByTestId('tf-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('654321'));
  });

  it('refuses something that is neither kind of code', async () => {
    const u = userEvent.setup();
    const onSubmit = mount({ allowRecovery: true });

    await u.type(screen.getByLabelText(/^Code/), 'ABC');
    await u.click(screen.getByTestId('tf-submit'));

    expect(
      await screen.findByText('Enter the 6-digit code from your app, or a recovery code'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('TwoFactorCodeForm — a refused step', () => {
  it("shows the thrown Error's message, then clears it when the next try succeeds", async () => {
    const u = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('That code is not right')).mockResolvedValueOnce(undefined);
    mount({ onSubmit });

    await u.type(screen.getByLabelText(/6-digit code/), '111111');
    await u.click(screen.getByTestId('tf-submit'));
    expect(await screen.findByTestId('tf-error')).toHaveTextContent('That code is not right');
    expect(screen.getByRole('alert')).toHaveTextContent('That code is not right');

    await u.click(screen.getByTestId('tf-submit'));
    await waitFor(() => expect(screen.queryByTestId('tf-error')).not.toBeInTheDocument());
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('falls back to the generic message when the step throws something other than an Error', async () => {
    const u = userEvent.setup();
    mount({ onSubmit: vi.fn().mockRejectedValue('nope') });

    await u.type(screen.getByLabelText(/6-digit code/), '222222');
    await u.click(screen.getByTestId('tf-submit'));

    expect(await screen.findByTestId('tf-error')).toHaveTextContent('Something went wrong. Please try again.');
  });
});

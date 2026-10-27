import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SignInRequest } from '../../../../pages/login/sign-in';
import { CodeStep } from '../../../../pages/login/sign-in/CodeStep';

type Submit = (code: string) => Promise<void>;

const request = (over: Partial<SignInRequest> = {}): SignInRequest => ({ ok: true, via: 'LITE', expires_in_minutes: 10, resend_after_seconds: 0, test_code: null, ...over });

interface Options {
  req?: SignInRequest;
  busy?: boolean;
  resending?: boolean;
  onSubmit?: Submit;
  onResend?: () => Promise<void>;
  onChangeEmail?: () => void;
}

const step = ({ req = request(), busy = false, resending = false, onSubmit = vi.fn<Submit>(() => Promise.resolve()), onResend = vi.fn(() => Promise.resolve()), onChangeEmail = vi.fn() }: Options = {}) => (
  <CodeStep email="asha@lite.example" request={req} busy={busy} resending={resending} onSubmit={onSubmit} onResend={onResend} onChangeEmail={onChangeEmail} />
);

describe('CodeStep', () => {
  it('says a Lite code was emailed and for how long', () => {
    render(step());
    expect(screen.getByTestId('sign-in-code-sent')).toHaveTextContent('We emailed a 6-digit code to asha@lite.example. It works for 10 minutes.');
    expect(screen.queryByTestId('sign-in-test-code')).not.toBeInTheDocument();
  });

  it('says the Duncit account sent the code when it came from Duncit', () => {
    render(step({ req: request({ via: 'DUNCIT', expires_in_minutes: 5 }) }));
    expect(screen.getByTestId('sign-in-code-sent')).toHaveTextContent('Your Duncit account emailed you a 6-digit code for asha@lite.example. It works for 5 minutes.');
  });

  it('shows the test code when no mailbox is configured', () => {
    render(step({ req: request({ test_code: '424242' }) }));
    expect(screen.getByTestId('sign-in-test-code')).toHaveTextContent('No mailbox is configured yet, so use this code: 424242');
  });

  it('submits a six-digit code and refuses anything else', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(step({ onSubmit }));
    const box = screen.getByTestId('sign-in-code');
    expect(box).toHaveAttribute('inputmode', 'numeric');
    expect(box).toHaveAttribute('maxlength', '6');
    expect(box).toHaveAttribute('autocomplete', 'one-time-code');
    await user.type(box, '12345');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter the 6-digit code from your email')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.type(box, '6');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('123456'));
  });

  it('holds the resend button through the cool-down, showing the seconds left', () => {
    render(step({ req: request({ resend_after_seconds: 30 }) }));
    const resend = screen.getByTestId('sign-in-resend');
    expect(resend).toHaveTextContent('Send a new code in 30s');
    expect(resend).toBeDisabled();
  });

  it('resends and changes the email once the cool-down is over', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn(() => Promise.resolve());
    const onChangeEmail = vi.fn();
    render(step({ onResend, onChangeEmail }));
    await user.click(screen.getByRole('button', { name: 'Send a new code' }));
    await user.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(onChangeEmail).toHaveBeenCalledTimes(1);
  });

  it('blocks a second resend while one is on its way', () => {
    render(step({ resending: true }));
    expect(screen.getByTestId('sign-in-resend')).toBeDisabled();
    expect(screen.getByTestId('sign-in-change-email')).toBeEnabled();
  });

  it('reads Checking… and locks everything while the code is verified', () => {
    render(step({ busy: true }));
    expect(screen.getByTestId('sign-in-verify')).toHaveTextContent('Checking…');
    expect(screen.getByTestId('sign-in-code')).toBeDisabled();
    expect(screen.getByTestId('sign-in-resend')).toBeDisabled();
    expect(screen.getByTestId('sign-in-change-email')).toBeDisabled();
  });
});

/**
 * Signing in with a code instead of a password.
 *
 * The behaviour worth holding is what the panel does NOT say. After the address
 * step it never confirms an account exists — the server answers the same way
 * for an unknown address, an inactive one and one with no role for this console,
 * and copy here saying "sent!" rather than "no such user" would hand back
 * exactly what that silence protects.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import OtpLoginPanel from '../src/portal-login/OtpLoginPanel';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = (over: Partial<Parameters<typeof OtpLoginPanel>[0]> = {}) => {
  const onRequestCode = vi.fn().mockResolvedValue(undefined);
  const onSubmitCode = vi.fn().mockResolvedValue(undefined);
  const result = render(
    <OtpLoginPanel onRequestCode={onRequestCode} onSubmitCode={onSubmitCode} busy={false} {...over} />
  );
  return { ...result, onRequestCode, onSubmitCode };
};

const emailField = () => document.body.querySelector('input[type="email"]') as HTMLInputElement;
const codeField = () => screen.getByLabelText('One-time code');

/** Open the panel and get as far as the code step. */
const reachCodeStep = async (over: Partial<Parameters<typeof OtpLoginPanel>[0]> = {}) => {
  const rendered = mount(over);
  fireEvent.click(screen.getByRole('button', { name: /Login with OTP/i }));
  fireEvent.change(emailField(), { target: { value: 'asha@duncit.com' } });
  fireEvent.click(screen.getByRole('button', { name: /Email me a code/i }));
  await settle();
  return rendered;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('OtpLoginPanel', () => {
  it('stays collapsed, because the password field above is still the usual way in', () => {
    mount();

    expect(screen.getByRole('button', { name: /Login with OTP/i })).toBeInTheDocument();
    expect(document.body.querySelector('input[type="email"]')).toBeNull();
  });

  it('opens on request', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: /Login with OTP/i }));

    expect(emailField()).not.toBeNull();
  });

  it('will not send to something that is not an address', () => {
    const { onRequestCode } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Login with OTP/i }));

    for (const value of ['', 'asha', 'asha@', 'asha@duncit']) {
      fireEvent.change(emailField(), { target: { value } });
      expect(screen.getByRole('button', { name: /Email me a code/i })).toBeDisabled();
    }

    expect(onRequestCode).not.toHaveBeenCalled();
  });

  it('sends the trimmed address once it looks like one', async () => {
    const { onRequestCode } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Login with OTP/i }));
    fireEvent.change(emailField(), { target: { value: '  asha@duncit.com  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Email me a code/i }));
    await settle();

    expect(onRequestCode).toHaveBeenCalledWith('asha@duncit.com');
  });

  it('never confirms the address can sign in — only that a code is on its way IF it can', async () => {
    await reachCodeStep();

    expect(document.body.textContent).toContain('If that address can sign in here');
    expect(document.body.textContent).not.toMatch(/no such user|not found|unknown address/i);
  });

  it('locks the address once a code has been sent, so the two steps cannot disagree', async () => {
    await reachCodeStep();

    expect(emailField()).toBeDisabled();
  });

  it('keeps only digits, and no more than six of them', async () => {
    await reachCodeStep();

    fireEvent.change(codeField(), { target: { value: 'a1b2c3d4e5f6g7' } });

    expect((codeField() as HTMLInputElement).value).toBe('123456');
  });

  it('will not sign in on a partial code', async () => {
    const { onSubmitCode } = await reachCodeStep();

    fireEvent.change(codeField(), { target: { value: '123' } });
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeDisabled();

    expect(onSubmitCode).not.toHaveBeenCalled();
  });

  it('trades a complete code for a session', async () => {
    const { onSubmitCode } = await reachCodeStep();

    fireEvent.change(codeField(), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await settle();

    expect(onSubmitCode).toHaveBeenCalledWith('asha@duncit.com', '123456');
  });

  it('shows the signing-in state on the code step once busy takes over', async () => {
    const { rerender } = await reachCodeStep();
    fireEvent.change(codeField(), { target: { value: '123456' } });

    rerender(<OtpLoginPanel onRequestCode={vi.fn()} onSubmitCode={vi.fn()} busy />);

    const button = screen.getByRole('button', { name: /Signing in…/i });
    expect(button).toBeDisabled();
    expect(document.body.querySelector('.MuiCircularProgress-root')).not.toBeNull();
  });

  it('lets a typo in the address be corrected, and forgets the code when it is', async () => {
    await reachCodeStep();
    fireEvent.change(codeField(), { target: { value: '123456' } });

    fireEvent.click(screen.getByRole('button', { name: /Use a different address/i }));

    expect(emailField()).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Email me a code/i })).toBeInTheDocument();
  });

  it('shows the caller’s failure message', async () => {
    await reachCodeStep({ errorMessage: 'That code has expired.' });

    expect(document.body.textContent).toContain('That code has expired.');
  });

  it('says what it is doing while it is busy, and offers nothing to press', () => {
    mount({ busy: true });
    fireEvent.click(screen.getByRole('button', { name: /Login with OTP/i }));
    fireEvent.change(emailField(), { target: { value: 'asha@duncit.com' } });

    expect(screen.getByRole('button', { name: /Sending…/i })).toBeDisabled();
  });

  it('collapses again, forgetting both steps', async () => {
    await reachCodeStep();

    fireEvent.click(screen.getByRole('button', { name: /Use my password instead/i }));

    expect(screen.getByRole('button', { name: /Login with OTP/i })).toBeInTheDocument();
  });
});

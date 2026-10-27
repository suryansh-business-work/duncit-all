import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EnvAccessForm from '../../src/pages/environment/access-gate/env-access.form';
import { cleanCode, envAccessSchema, type PendingCode } from '../../src/pages/environment/access-gate/env-access.types';

const NOW = new Date('2026-10-20T10:00:00.000Z');

const pending = (over: Partial<PendingCode> = {}): PendingCode => ({
  challengeId: 'ch-1',
  expiresAt: '2026-10-20T10:10:00.000Z',
  sentTo: 'root@example.test',
  resendAt: NOW.getTime() - 1,
  ...over,
});

const mount = (props: Partial<Parameters<typeof EnvAccessForm>[0]> = {}) => {
  const onSend = vi.fn();
  const onVerify = vi.fn();
  const view = render(
    <EnvAccessForm pending={null} sending={false} verifying={false} onSend={onSend} onVerify={onVerify} {...props} />,
  );
  return { onSend, onVerify, ...view };
};

const codeInput = () => screen.getByTestId('env-access-code') as HTMLInputElement;

afterEach(() => vi.useRealTimers());

describe('EnvAccessForm / before a code is sent', () => {
  it('offers only the send button, which asks for a code', () => {
    const { onSend } = mount();

    expect(screen.queryByTestId('env-access-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('env-access-send'));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('shows the send button as busy while the code is being sent', () => {
    mount({ sending: true });
    expect(screen.getByTestId('env-access-send')).toBeDisabled();
  });
});

describe('EnvAccessForm / entering the code', () => {
  it('says where the code went and when it expires, and verifies the six digits', async () => {
    const { onVerify } = mount({ pending: pending() });

    expect(screen.getByText(/root@example\.test/)).toBeInTheDocument();
    fireEvent.change(codeInput(), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('env-access-verify'));

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('123456'));
  });

  it('cleans a pasted code down to its digits and cuts it at six', () => {
    mount({ pending: pending() });

    fireEvent.change(codeInput(), { target: { value: 'Code: 123 456 789' } });

    expect(codeInput().value).toBe('123456');
  });

  it('refuses a short code with the form message and does not verify', async () => {
    const { onVerify } = mount({ pending: pending() });

    fireEvent.change(codeInput(), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('env-access-verify'));

    expect(await screen.findByText('Enter the 6-digit code from the email.')).toBeInTheDocument();
    expect(onVerify).not.toHaveBeenCalled();
  });

  it('shows the verify button as busy while checking', () => {
    mount({ pending: pending(), verifying: true });
    expect(screen.getByTestId('env-access-verify')).toBeDisabled();
  });

  it('clears the typed code when a new challenge replaces the old one', () => {
    const { rerender } = mount({ pending: pending() });
    fireEvent.change(codeInput(), { target: { value: '123456' } });
    expect(codeInput().value).toBe('123456');

    rerender(
      <EnvAccessForm
        pending={pending({ challengeId: 'ch-2' })}
        sending={false}
        verifying={false}
        onSend={vi.fn()}
        onVerify={vi.fn()}
      />,
    );

    expect(codeInput().value).toBe('');
  });
});

describe('EnvAccessForm / resending', () => {
  it('lets the admin resend once the wait is over', () => {
    const { onSend } = mount({ pending: pending() });

    const resend = screen.getByRole('button', { name: 'Resend code' });
    expect(resend).toBeEnabled();
    fireEvent.click(resend);

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('counts the wait down each second, then enables the resend', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(NOW);
    mount({ pending: pending({ resendAt: NOW.getTime() + 2_000 }) });

    expect(screen.getByRole('button', { name: 'Resend in 2s' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(screen.getByRole('button', { name: 'Resend in 1s' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
  });

  it('stops ticking when the form goes away', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(NOW);
    const { unmount } = mount({ pending: pending({ resendAt: NOW.getTime() + 5_000 }) });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('env access code schema', () => {
  const schema = envAccessSchema('invalid code');

  it('accepts exactly six digits, trimming the edges', () => {
    expect(schema.parse({ code: ' 123456 ' })).toEqual({ code: '123456' });
  });

  it.each(['12345', '1234567', '12345a', ''])('rejects %j', (code) => {
    const result = schema.safeParse({ code });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('invalid code');
  });

  it('cleanCode keeps digits only, at most six', () => {
    expect(cleanCode('12-34 56 78')).toBe('123456');
    expect(cleanCode('abc')).toBe('');
  });
});

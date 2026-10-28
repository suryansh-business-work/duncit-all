import { act, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../../../shared/env';
import { LITE_REQUEST_SIGN_IN_CODE, LITE_VERIFY_SIGN_IN_CODE } from '../../../../../shared/graphql/documents';
import { CodeStep } from '../../../../components/auth/sign-in/CodeStep';
import type { CodeSent } from '../../../../components/auth/sign-in';
import { renderWithProviders } from '../../../test-utils';
import { afterSignInMocks, emailRequestMock, emailVerifyMock, phoneVerifyMock, refusedMock } from './sign-in-mocks';

const sentByEmail = (over: Partial<CodeSent> = {}): CodeSent => ({
  channel: 'EMAIL',
  contact: 'asha@example.com',
  via: 'LITE',
  minutes: 10,
  resendAfter: 0,
  testCode: null,
  ...over,
});

const renderStep = (sent: CodeSent, mocks: MockedResponse[] = []) => {
  const onBack = vi.fn();
  const view = renderWithProviders(<CodeStep sent={sent} onBack={onBack} />, { mocks });
  return { ...view, onBack };
};

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('CodeStep — what was sent', () => {
  it('says a Lite code was emailed and how long it works, and asks a new account for a name', () => {
    renderStep(sentByEmail());
    expect(screen.getByText('We emailed a 6-digit code to asha@example.com. It works for 10 minutes.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '6-digit code' })).toHaveAttribute('maxlength', '6');
    expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveAccessibleDescription('Shown to hosts and on your tickets');
  });

  it('says a Duncit member’s own account sent the code, and asks for no name', () => {
    renderStep(sentByEmail({ via: 'DUNCIT', minutes: 15 }));
    expect(screen.getByText('Your Duncit account emailed you a 6-digit code for asha@example.com. It works for 15 minutes.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Your name' })).not.toBeInTheDocument();
  });

  it('says the code was texted for an SMS sign-in, and offers a different number', () => {
    renderStep(sentByEmail({ channel: 'PHONE', contact: '+91 98765 43210', via: 'SMS', minutes: 5 }));
    expect(screen.getByText('We texted a 6-digit code to +91 98765 43210. It works for 5 minutes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use a different number' })).toBeInTheDocument();
  });

  it('shows the test code while no mailbox is configured', () => {
    renderStep(sentByEmail({ testCode: '424242' }));
    expect(screen.getByTestId('sign-in-test-code')).toHaveTextContent('No mailbox is configured yet, so use this code: 424242');
  });

  it('goes back to the address step on request', async () => {
    const { user, onBack } = renderStep(sentByEmail());
    await user.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('CodeStep — resend', () => {
  it('counts down before a new code can be asked for', () => {
    vi.useFakeTimers();
    renderStep(sentByEmail({ resendAfter: 3 }));
    expect(screen.getByRole('button', { name: 'Send a new code in 3s' })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Send a new code in 2s' })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled();
  });

  it('sends a new code and restarts the wait from the API’s figure', async () => {
    const request = emailRequestMock('asha@example.com', { resend_after_seconds: 60, expires_in_minutes: 5, test_code: '222222' });
    const { user } = renderStep(sentByEmail(), [request.mock]);
    await user.click(screen.getByRole('button', { name: 'Send a new code' }));

    expect(await screen.findByText('We emailed a 6-digit code to asha@example.com. It works for 5 minutes.')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-test-code')).toHaveTextContent('222222');
    expect(screen.getByRole('button', { name: /^Send a new code in \d+s$/ })).toBeDisabled();
    expect(request.result).toHaveBeenCalledTimes(1);
  });

  it('shows why a new code could not be sent', async () => {
    const { user } = renderStep(sentByEmail(), [refusedMock(LITE_REQUEST_SIGN_IN_CODE, { email: 'asha@example.com' }, 'Too many codes, wait a minute')]);
    await user.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many codes, wait a minute');
  });
});

describe('CodeStep — verify', () => {
  it('refuses a code that is not six digits, without asking the API', async () => {
    const verify = emailVerifyMock({ email: 'asha@example.com', code: '12345' });
    const { user } = renderStep(sentByEmail(), [verify.mock]);
    await user.type(screen.getByRole('textbox', { name: '6-digit code' }), '12345');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Enter the 6-digit code')).toBeInTheDocument();
    expect(verify.result).not.toHaveBeenCalled();
  });

  it('signs in with the code and the new account’s name, keeping the session token', async () => {
    const verify = emailVerifyMock({ email: 'asha@example.com', code: '123456', name: 'Asha Rao' }, 'email-token');
    const { user } = renderStep(sentByEmail(), [verify.mock, ...afterSignInMocks()]);
    await user.type(screen.getByRole('textbox', { name: '6-digit code' }), '123456');
    await user.type(screen.getByRole('textbox', { name: 'Your name' }), 'Asha Rao');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('email-token'));
    expect(verify.result).toHaveBeenCalledTimes(1);
  });

  it('signs a phone in through the phone mutation, sending no name when none was typed', async () => {
    const verify = phoneVerifyMock({ phone: '+91 98765 43210', code: '654321' }, 'phone-token');
    const { user } = renderStep(sentByEmail({ channel: 'PHONE', contact: '+91 98765 43210', via: 'SMS' }), [verify.mock, ...afterSignInMocks()]);
    await user.type(screen.getByRole('textbox', { name: '6-digit code' }), '654321');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('phone-token'));
  });

  it('shows the API’s reason when the code is refused, and stays signed out', async () => {
    const refused = refusedMock(LITE_VERIFY_SIGN_IN_CODE, { email: 'asha@example.com', code: '999999' }, 'That code has expired');
    const { user } = renderStep(sentByEmail({ via: 'DUNCIT' }), [refused]);
    await user.type(screen.getByRole('textbox', { name: '6-digit code' }), '999999');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That code has expired');
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
  });
});

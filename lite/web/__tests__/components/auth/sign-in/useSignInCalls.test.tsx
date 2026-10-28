import { act } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import { parseApiError } from '@duncit/utils';
import { LITE_REQUEST_SIGN_IN_CODE } from '../../../../../shared/graphql/documents';
import { useSignInCalls } from '../../../../components/auth/sign-in/useSignInCalls';
import { renderHookWithProviders } from '../../../test-utils';
import { emailRequestMock, emailVerifyMock, phoneRequestMock, phoneVerifyMock, refusedMock } from './sign-in-mocks';

const hook = (mocks: MockedResponse[]) => renderHookWithProviders(() => useSignInCalls(), { mocks }).result;

describe('useSignInCalls', () => {
  it('asks for an email code through the email mutation only', async () => {
    const email = emailRequestMock('asha@example.com', { via: 'DUNCIT', expires_in_minutes: 15, resend_after_seconds: 30 });
    const phone = phoneRequestMock('+919876543210');
    const result = hook([email.mock, phone.mock]);

    let answer: Awaited<ReturnType<typeof result.current.request>> = null;
    await act(async () => {
      answer = await result.current.request('EMAIL', 'asha@example.com');
    });
    expect(answer).toMatchObject({ ok: true, via: 'DUNCIT', expires_in_minutes: 15, resend_after_seconds: 30, test_code: null });
    expect(email.result).toHaveBeenCalledTimes(1);
    expect(phone.result).not.toHaveBeenCalled();
  });

  it('asks for an SMS code through the phone mutation only', async () => {
    const email = emailRequestMock('asha@example.com');
    const phone = phoneRequestMock('+919876543210', { test_code: '424242' });
    const result = hook([email.mock, phone.mock]);

    let answer: Awaited<ReturnType<typeof result.current.request>> = null;
    await act(async () => {
      answer = await result.current.request('PHONE', '+919876543210');
    });
    expect(answer).toMatchObject({ via: 'SMS', test_code: '424242' });
    expect(phone.result).toHaveBeenCalledTimes(1);
    expect(email.result).not.toHaveBeenCalled();
  });

  it('trades an email code (and a new account’s name) for the session token', async () => {
    const verify = emailVerifyMock({ email: 'asha@example.com', code: '123456', name: 'Asha' }, 'email-token');
    const result = hook([verify.mock]);
    let token: string | null = null;
    await act(async () => {
      token = await result.current.verify('EMAIL', 'asha@example.com', '123456', 'Asha');
    });
    expect(token).toBe('email-token');
  });

  it('trades a phone code for the session token', async () => {
    const verify = phoneVerifyMock({ phone: '+919876543210', code: '654321' }, 'phone-token');
    const result = hook([verify.mock]);
    let token: string | null = null;
    await act(async () => {
      token = await result.current.verify('PHONE', '+919876543210', '654321');
    });
    expect(token).toBe('phone-token');
    expect(verify.result).toHaveBeenCalledTimes(1);
  });

  it('passes the API’s refusal on to the step that asked', async () => {
    const result = hook([refusedMock(LITE_REQUEST_SIGN_IN_CODE, { email: 'blocked@example.com' }, 'This account is blocked')]);
    let failure: unknown = null;
    await act(async () => {
      try {
        await result.current.request('EMAIL', 'blocked@example.com');
      } catch (error) {
        failure = error;
      }
    });
    expect(parseApiError(failure)).toBe('This account is blocked');
  });

  it('is not busy before anything is sent', () => {
    expect(hook([]).current.requesting).toBe(false);
  });
});

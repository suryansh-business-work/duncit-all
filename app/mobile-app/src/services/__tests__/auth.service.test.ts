import { graphqlRequest } from '@/services/graphql.client';
import { clearAuthToken, setAuthToken } from '@/services/auth-token';
import {
  dobToIso,
  login,
  loginWithGoogle,
  logout,
  register,
  completePasswordReset,
  requestPasswordResetCode,
  verifyPasswordResetCode,
  signupWithGoogle,
  splitName,
} from '@/services/auth.service';

jest.mock('@/services/graphql.client');
jest.mock('@/services/auth-token');

const mockedRequest = jest.mocked(graphqlRequest);
const mockedSetToken = jest.mocked(setAuthToken);
const mockedClearToken = jest.mocked(clearAuthToken);

describe('auth.service helpers', () => {
  it('splits a two-part name into first and last', () => {
    expect(splitName('Riya Sharma')).toEqual({ first_name: 'Riya', last_name: 'Sharma' });
  });

  it('treats a single-word name as first name with no surname', () => {
    expect(splitName('Madonna')).toEqual({ first_name: 'Madonna', last_name: undefined });
  });

  it('joins extra name parts into the surname and trims whitespace', () => {
    expect(splitName('  Mary  Jane  Watson ')).toEqual({
      first_name: 'Mary',
      last_name: 'Jane Watson',
    });
  });

  it('handles a blank name without throwing', () => {
    expect(splitName('   ')).toEqual({ first_name: '', last_name: undefined });
  });

  it('converts a birth year to a Jan 1 ISO date', () => {
    expect(dobToIso('1995-06-15')).toBe('1995-06-15T00:00:00.000Z');
  });
});

describe('auth.service mutations', () => {
  afterEach(() => jest.clearAllMocks());

  it('register maps Name/Date of Birth and persists the token', async () => {
    mockedRequest.mockResolvedValue({
      register: { token: 'tok-1', user: { onboarding_survey_completed: false } },
    } as never);

    const result = await register({
      name: 'Riya Sharma',
      dob: '1995-01-01',
      email: 'Riya@Duncit.com',
      phoneNumber: '9845012345',
      phoneExtension: '+91',
      whatsappIsMobile: true,
      password: 'StrongPass123',
      acceptedPolicyIds: ['pol-1'],
    }, 'wa-proof-1');

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    const variables = mockedRequest.mock.calls[0]?.[1];
    expect(variables).toEqual({
      input: {
        first_name: 'Riya',
        last_name: 'Sharma',
        email: 'riya@duncit.com',
        phone_number: '9845012345',
        phone_extension: '+91',
        whatsapp_is_mobile: true,
        whatsapp_token: 'wa-proof-1',
        password: 'StrongPass123',
        dob: '1995-01-01T00:00:00.000Z',
        accepted_policy_ids: ['pol-1'],
        accepted_policy_surface: 'APP',
      },
    });
    expect(mockedSetToken).toHaveBeenCalledWith('tok-1');
    expect(result).toEqual({ token: 'tok-1', surveyCompleted: false });
  });

  it('login lowercases the email and persists the token', async () => {
    mockedRequest.mockResolvedValue({
      login: { token: 'tok-2', user: { onboarding_survey_completed: true } },
    } as never);

    const result = await login({ email: 'Hello@Duncit.com', password: 'StrongPass123' });

    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({
      input: { email: 'hello@duncit.com', password: 'StrongPass123' },
    });
    expect(mockedSetToken).toHaveBeenCalledWith('tok-2');
    expect(result).toEqual({ token: 'tok-2', surveyCompleted: true });
  });

  it('signupWithGoogle sends the id_token with the accepted policies', async () => {
    mockedRequest.mockResolvedValue({
      signupWithGoogle: { token: 'tok-3', user: { onboarding_survey_completed: false } },
    } as never);

    const result = await signupWithGoogle('google-id-token', ['pol-1'], {
      extension: '+91',
      number: '9845012345',
      alsoMobile: true,
      whatsappToken: 'wa-proof-2',
    });

    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({
      input: {
        id_token: 'google-id-token',
        phone_number: '9845012345',
        phone_extension: '+91',
        whatsapp_is_mobile: true,
        whatsapp_token: 'wa-proof-2',
        accepted_policy_ids: ['pol-1'],
        accepted_policy_surface: 'APP',
      },
    });
    expect(mockedSetToken).toHaveBeenCalledWith('tok-3');
    expect(result).toEqual({ token: 'tok-3', surveyCompleted: false });
  });

  it('loginWithGoogle sends only the id_token and returns the survey gate', async () => {
    mockedRequest.mockResolvedValue({
      loginWithGoogle: { token: 'tok-4', user: { onboarding_survey_completed: true } },
    } as never);

    const result = await loginWithGoogle('google-id-token');

    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({ input: { id_token: 'google-id-token' } });
    expect(mockedSetToken).toHaveBeenCalledWith('tok-4');
    expect(result).toEqual({ token: 'tok-4', surveyCompleted: true });
  });

  it('logout clears the token', async () => {
    await logout();
    expect(mockedClearToken).toHaveBeenCalledTimes(1);
  });

  it('requestPasswordResetCode sends the email lookup and unpacks the result', async () => {
    mockedRequest.mockResolvedValue({
      requestPasswordResetCode: {
        ok: true,
        registered: true,
        channel: 'EMAIL',
        expires_at: '2026-08-31T10:00:00.000Z',
        resend_after_seconds: 30,
        expires_in_minutes: 10,
        sent: true,
        test_code: null,
      },
    } as never);
    const res = await requestPasswordResetCode({ channel: 'EMAIL', email: 'hello@duncit.com' });
    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({
      input: { channel: 'EMAIL', email: 'hello@duncit.com' },
    });
    expect(res).toEqual({
      registered: true,
      sent: true,
      resendAfterSeconds: 30,
      expiresInMinutes: 10,
      testCode: null,
    });
    expect(mockedSetToken).not.toHaveBeenCalled();
  });

  it('requestPasswordResetCode reports an unregistered destination', async () => {
    mockedRequest.mockResolvedValue({
      requestPasswordResetCode: {
        ok: false,
        registered: false,
        channel: 'PHONE',
        expires_at: null,
        resend_after_seconds: 30,
        expires_in_minutes: 10,
        test_code: null,
      },
    } as never);
    const res = await requestPasswordResetCode({
      channel: 'PHONE',
      phone_extension: '+91',
      phone_number: '9876543210',
    });
    expect(res.registered).toBe(false);
  });

  it('verifyPasswordResetCode trims the code and returns the grant', async () => {
    mockedRequest.mockResolvedValue({
      verifyPasswordResetCode: { ok: true, reset_token: 'challenge.secret' },
    } as never);
    const token = await verifyPasswordResetCode(
      { channel: 'EMAIL', email: 'hello@duncit.com' },
      ' 123456 ',
    );
    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({
      input: { channel: 'EMAIL', email: 'hello@duncit.com', otp: '123456' },
    });
    expect(token).toBe('challenge.secret');
  });

  it('completePasswordReset spends the grant and returns the boolean result', async () => {
    mockedRequest.mockResolvedValue({ completePasswordReset: true } as never);
    const ok = await completePasswordReset('challenge.secret', 'BrandNew123');
    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({
      input: { reset_token: 'challenge.secret', new_password: 'BrandNew123' },
    });
    expect(ok).toBe(true);
  });
});

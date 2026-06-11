import { graphqlRequest } from '@/services/graphql.client';
import { clearAuthToken, setAuthToken } from '@/services/auth-token';
import {
  birthYearToDob,
  login,
  loginWithGoogle,
  logout,
  register,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
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
    expect(birthYearToDob('1995')).toBe('1995-01-01T00:00:00.000Z');
  });
});

describe('auth.service mutations', () => {
  afterEach(() => jest.clearAllMocks());

  it('register maps Name/Birth Year and persists the token', async () => {
    mockedRequest.mockResolvedValue({
      register: { token: 'tok-1', user: { onboarding_survey_completed: false } },
    } as never);

    const result = await register({
      name: 'Riya Sharma',
      birthYear: '1995',
      email: 'Riya@Duncit.com',
      password: 'StrongPass123',
    });

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    const variables = mockedRequest.mock.calls[0]?.[1];
    expect(variables).toEqual({
      input: {
        first_name: 'Riya',
        last_name: 'Sharma',
        email: 'riya@duncit.com',
        password: 'StrongPass123',
        dob: '1995-01-01T00:00:00.000Z',
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

  it('signupWithGoogle sends only the id_token and lands on the survey', async () => {
    mockedRequest.mockResolvedValue({
      signupWithGoogle: { token: 'tok-3', user: { onboarding_survey_completed: false } },
    } as never);

    const result = await signupWithGoogle('google-id-token');

    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({ input: { id_token: 'google-id-token' } });
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

  it('requestPasswordResetOtp lowercases the email (no token persisted)', async () => {
    mockedRequest.mockResolvedValue({
      requestPasswordResetOtp: { ok: true, dev_otp: null },
    } as never);
    await requestPasswordResetOtp('  Hello@Duncit.com ');
    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({ email: 'hello@duncit.com' });
    expect(mockedSetToken).not.toHaveBeenCalled();
  });

  it('resetPasswordWithOtp maps the input and returns the boolean result', async () => {
    mockedRequest.mockResolvedValue({ resetPasswordWithOtp: true } as never);
    const ok = await resetPasswordWithOtp({
      email: 'Hello@Duncit.com',
      otp: ' 123456 ',
      new_password: 'BrandNew123',
    });
    expect(mockedRequest.mock.calls[0]?.[1]).toEqual({
      input: { email: 'hello@duncit.com', otp: '123456', new_password: 'BrandNew123' },
    });
    expect(ok).toBe(true);
  });
});

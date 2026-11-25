import * as SecureStore from 'expo-secure-store';
import { gqlRequest } from '@/services/graphql.client';
import { getToken, resetTokenCache } from '@/services/session';
import { ApiError } from '@/utils/errors';
import { NoCrmAccessError, useAuthStore } from '../auth.store';

const mockPhone = { clearAll: jest.fn() };
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhone;
  },
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/background-sync', () => ({ unregisterBackgroundSync: jest.fn() }));

/** Signing in: the CRM portal's steps, and its role gate, on the phone. */

const request = gqlRequest as jest.Mock;
const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
const VERIFIED = jwt({ id: 'u1', psv: { portal: 'crm', verified: true } });
const PENDING = jwt({ id: 'u1', psv: { portal: 'crm', verified: false } });
const crmUser = { user_id: 'u1', first_name: 'Asha', roles: ['CRM_MANAGER'] };

beforeEach(() => {
  store.clear();
  resetTokenCache();
  jest.clearAllMocks();
  useAuthStore.setState({ status: 'loading', user: null, challengeToken: null });
});

describe('signIn', () => {
  it('signs in with the CRM portal key and lets a CRM manager in', async () => {
    request
      .mockResolvedValueOnce({ login: { token: VERIFIED } })
      .mockResolvedValueOnce({ me: crmUser });
    await useAuthStore.getState().signIn('asha@duncit.com', 'longenough');
    expect(request.mock.calls[0][1]).toEqual({
      input: {
        channel: 'EMAIL',
        email: 'asha@duncit.com',
        password: 'longenough',
        portal_key: 'crm',
      },
    });
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user: crmUser });
    expect(await getToken()).toBe(VERIFIED);
  });

  it('sends a fresh console sign-in to Security Verification first', async () => {
    request.mockResolvedValueOnce({ login: { token: PENDING } });
    await useAuthStore.getState().signIn('asha@duncit.com', 'longenough');
    expect(useAuthStore.getState().status).toBe('security');
  });

  it('asks a 2FA account for its code, holding the challenge', async () => {
    request.mockRejectedValueOnce(
      new ApiError('2FA', 401, { code: 'TWO_FACTOR_REQUIRED', challenge_token: 'ch-1' }),
    );
    await useAuthStore.getState().signIn('asha@duncit.com', 'longenough');
    expect(useAuthStore.getState()).toMatchObject({ status: 'twoFactor', challengeToken: 'ch-1' });
  });

  it('refuses an account without CRM access, as the portal does, and leaves nothing behind', async () => {
    request
      .mockResolvedValueOnce({ login: { token: VERIFIED } })
      .mockResolvedValueOnce({ me: { ...crmUser, roles: ['USER'] } });
    await expect(useAuthStore.getState().signIn('a@b.co', 'longenough')).rejects.toBeInstanceOf(
      NoCrmAccessError,
    );
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(await getToken()).toBeNull();
    expect(mockPhone.clearAll).toHaveBeenCalled();
  });

  it('maps the server’s portal refusal to no-access and passes other errors on', async () => {
    request.mockRejectedValueOnce(new ApiError('no', 403, { code: 'FORBIDDEN' }));
    await expect(useAuthStore.getState().signIn('a@b.co', 'longenough')).rejects.toBeInstanceOf(
      NoCrmAccessError,
    );
    request.mockRejectedValueOnce(
      new ApiError('Invalid credentials', 401, { code: 'UNAUTHENTICATED' }),
    );
    await expect(useAuthStore.getState().signIn('a@b.co', 'longenough')).rejects.toThrow(
      'Invalid credentials',
    );
  });
});

describe('completeTwoFactor', () => {
  it('trades the challenge and code for a session', async () => {
    useAuthStore.setState({ status: 'twoFactor', challengeToken: 'ch-1' });
    request
      .mockResolvedValueOnce({ completeTwoFactorLogin: { token: VERIFIED } })
      .mockResolvedValueOnce({ me: crmUser });
    await useAuthStore.getState().completeTwoFactor('123456');
    expect(request.mock.calls[0][1]).toEqual({
      input: { challenge_token: 'ch-1', code: '123456' },
    });
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('goes back to sign-in when there is no challenge to answer', async () => {
    await useAuthStore.getState().completeTwoFactor('123456');
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});

describe('bootstrap', () => {
  it('opens signed out with no token, and on the security step with a pending one', async () => {
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('signedOut');
    store.set('duncit_crm_token', PENDING);
    resetTokenCache();
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('security');
  });

  it('re-checks the role on launch, signing out an account that lost CRM access', async () => {
    store.set('duncit_crm_token', VERIFIED);
    request.mockResolvedValueOnce({ me: { ...crmUser, roles: [] } });
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('signs out a revoked session but opens offline on a good one', async () => {
    store.set('duncit_crm_token', VERIFIED);
    request.mockRejectedValueOnce(new ApiError('gone', 401, { code: 'UNAUTHENTICATED' }));
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('signedOut');

    store.set('duncit_crm_token', VERIFIED);
    resetTokenCache();
    request.mockRejectedValueOnce(new ApiError('Network error.'));
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});

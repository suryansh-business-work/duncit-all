import { verifyGoogleIdToken } from '../../user.google';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));

const mockEnv = getRuntimeEnvValue as jest.Mock;
const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const okTokenInfo = {
  email: 'User@Example.com',
  email_verified: true,
  sub: 'g-sub-1',
  aud: CLIENT_ID,
};
const mockFetch = () => (global as { fetch: jest.Mock }).fetch;

describe('verifyGoogleIdToken', () => {
  beforeEach(() => {
    mockEnv.mockResolvedValue(CLIENT_ID);
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
  });
  afterEach(() => {
    delete (global as unknown as { fetch?: jest.Mock }).fetch;
  });

  it('requires an id token', async () => {
    await expect(verifyGoogleIdToken('')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('fails when the Google client id is not configured', async () => {
    mockEnv.mockResolvedValue('');
    await expect(verifyGoogleIdToken('tok')).rejects.toMatchObject({
      extensions: { code: 'NOT_CONFIGURED' },
    });
  });

  it('returns token info on success without retrying', async () => {
    mockFetch().mockResolvedValue({ ok: true, json: async () => okTokenInfo });
    const info = await verifyGoogleIdToken('tok');
    expect(info.sub).toBe('g-sub-1');
    expect(mockFetch()).toHaveBeenCalledTimes(1);
  });

  it('retries once on a transient network failure then succeeds', async () => {
    mockFetch()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce({ ok: true, json: async () => okTokenInfo });
    const info = await verifyGoogleIdToken('tok');
    expect(info.email).toBe('User@Example.com');
    expect(mockFetch()).toHaveBeenCalledTimes(2);
  });

  it('throws a retryable error when Google is unreachable after the retry', async () => {
    mockFetch().mockRejectedValue(new TypeError('fetch failed'));
    await expect(verifyGoogleIdToken('tok')).rejects.toMatchObject({
      extensions: { code: 'UPSTREAM_UNAVAILABLE' },
    });
    expect(mockFetch()).toHaveBeenCalledTimes(2);
  });

  it('handles a non-Error network rejection', async () => {
    mockFetch().mockRejectedValue('boom');
    await expect(verifyGoogleIdToken('tok')).rejects.toMatchObject({
      extensions: { code: 'UPSTREAM_UNAVAILABLE' },
    });
  });

  it('rejects an invalid credential when tokeninfo returns non-ok', async () => {
    mockFetch().mockResolvedValue({ ok: false });
    await expect(verifyGoogleIdToken('tok')).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('rejects an audience mismatch', async () => {
    mockFetch().mockResolvedValue({ ok: true, json: async () => ({ ...okTokenInfo, aud: 'other' }) });
    await expect(verifyGoogleIdToken('tok')).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('rejects an unverified email', async () => {
    mockFetch().mockResolvedValue({
      ok: true,
      json: async () => ({ ...okTokenInfo, email_verified: false }),
    });
    await expect(verifyGoogleIdToken('tok')).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('accepts the string "true" for email_verified', async () => {
    mockFetch().mockResolvedValue({
      ok: true,
      json: async () => ({ ...okTokenInfo, email_verified: 'true' }),
    });
    const info = await verifyGoogleIdToken('tok');
    expect(info.sub).toBe('g-sub-1');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { duncitBridge } from '../../services/duncit.bridge';
import { settingsService } from '../../services/settings.service';
import { log } from '../../utils/log';

const MAIN_API = 'https://server.duncit.test/graphql';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.spyOn(settingsService, 'duncitGraphqlUrl').mockResolvedValue(MAIN_API);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('duncitBridge.requestCode', () => {
  it("asks the main API's public mutation to email its own code to a registered account", async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ data: { requestLoginOtp: { ok: true, registered: true, expires_in_minutes: 15, resend_after_seconds: 30 } } }),
    );

    await expect(duncitBridge.requestCode('priya@duncit.com')).resolves.toEqual({ registered: true, expires_in_minutes: 15, resend_after_seconds: 30 });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe(MAIN_API);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'content-type': 'application/json', 'x-duncit-surface': 'WEBSITE', 'x-duncit-app': 'lite' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(init?.body)) as { query: string; variables: unknown };
    expect(body.query).toContain('requestLoginOtp(input: $input)');
    expect(body.variables).toEqual({ input: { channel: 'EMAIL', email: 'priya@duncit.com' } });
  });

  it('answers null for an email the main API does not know', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: { requestLoginOtp: { ok: true, registered: false, expires_in_minutes: 10, resend_after_seconds: 30 } } }));
    await expect(duncitBridge.requestCode('new@lite.test')).resolves.toBeNull();
  });

  it('answers null when the main API errors, fails or cannot be reached', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ data: null, errors: [{ message: 'Too many requests' }] }))
      .mockResolvedValueOnce(json({ errors: [{ message: 'down' }] }, 503))
      .mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(duncitBridge.requestCode('priya@duncit.com')).resolves.toBeNull();
    await expect(duncitBridge.requestCode('priya@duncit.com')).resolves.toBeNull();
    await expect(duncitBridge.requestCode('priya@duncit.com')).resolves.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('auth', 'duncitBridge', expect.objectContaining({ msg: 'main API unreachable', error: expect.any(TypeError) }));
  });
});

describe('duncitBridge.verifyCode', () => {
  const login = (user: Record<string, unknown> | null) => json({ data: { loginWithOtp: user ? { token: 'main-token', user } : null } });

  it('answers what the account says about itself, never the main token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      login({ user_id: 'dun-42', first_name: 'Priya', last_name: 'Sharma', email: 'Priya@Duncit.com', username: 'priya.s' }),
    );

    const account = await duncitBridge.verifyCode('priya@duncit.com', '424242');

    expect(account).toEqual({ user_id: 'dun-42', name: 'Priya Sharma', email: 'priya@duncit.com', username: 'priya.s' });
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)) as { query: string; variables: unknown };
    expect(body.query).toContain('loginWithOtp(input: $input)');
    expect(body.variables).toEqual({ input: { channel: 'EMAIL', email: 'priya@duncit.com', otp: '424242' } });
  });

  it('fills in a missing last name, email and username', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(login({ user_id: 'dun-7', first_name: 'Asha', last_name: null, email: null, username: null }));
    await expect(duncitBridge.verifyCode('asha@duncit.com', '111111')).resolves.toEqual({ user_id: 'dun-7', name: 'Asha', email: 'asha@duncit.com', username: '' });
  });

  it('names an account with no name "Duncit member"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(login({ user_id: 'dun-8', first_name: '', last_name: '' }));
    await expect(duncitBridge.verifyCode('x@duncit.com', '111111')).resolves.toMatchObject({ name: 'Duncit member' });
  });

  it('answers null for a wrong code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(login(null));
    await expect(duncitBridge.verifyCode('priya@duncit.com', '000000')).resolves.toBeNull();
  });
});

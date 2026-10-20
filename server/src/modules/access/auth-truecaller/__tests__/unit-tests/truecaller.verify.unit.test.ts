import crypto from 'node:crypto';

// Stable references: isolateModules re-runs these factories, and every copy must share them.
const mockEnv = jest.fn();
const mockLogError = jest.fn();
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: (key: string) => mockEnv(key) }));
jest.mock('@observability/log', () => ({
  logs: { server: { error: (...args: unknown[]) => mockLogError(...args), warn: jest.fn() } },
}));

type Verify = typeof import('../../truecaller.verify');

/** A fresh module per test, so the cached Truecaller key never leaks between tests. */
function load(): Verify {
  let mod: Verify | undefined;
  jest.isolateModules(() => {
    mod = require('../../truecaller.verify');
  });
  return mod as Verify;
}

const env = () => mockEnv;
const log = () => mockLogError;

const answer = (status: number, body: unknown) => ({
  status,
  json: body instanceof Error ? () => Promise.reject(body) : () => Promise.resolve(body),
});

let fetchMock: jest.Mock;
const rejected = (reason: string | RegExp) =>
  expect.objectContaining({
    extensions: expect.objectContaining({ code: 'TRUECALLER_REJECTED', reason: expect.stringMatching(reason) }),
  });

beforeEach(() => {
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  env().mockImplementation(async (key: string) => (key === 'TRUECALLER_ANDROID_CLIENT_ID' ? 'cid' : ''));
});

afterEach(() => {
  delete (global as unknown as { fetch?: jest.Mock }).fetch;
  jest.restoreAllMocks();
});

describe('verifyAndroidCode', () => {
  const userinfo = {
    sub: 'tc-1',
    phone_number: '919845012345',
    phone_number_country_code: 'IN',
    given_name: 'Riya',
    family_name: 'Sharma',
    email: 'riya@example.com',
  };

  it('trades the code and verifier for the person Truecaller names', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, { access_token: 'at-1' }))
      .mockResolvedValueOnce(answer(200, userinfo));
    const identity = await load().verifyAndroidCode('code-1', 'verifier-1');

    expect(identity).toMatchObject({ phone_extension: '+91', phone_number: '9845012345', first_name: 'Riya' });
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe('https://oauth-account-noneu.truecaller.com/v1/token');
    const body = new URLSearchParams(String(tokenInit.body));
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'authorization_code',
      client_id: 'cid',
      code: 'code-1',
      code_verifier: 'verifier-1',
    });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer at-1' });
  });

  it('is not configured without a client ID, and asks Truecaller nothing', async () => {
    env().mockResolvedValue('');
    await expect(load().verifyAndroidCode('c', 'v')).rejects.toMatchObject({
      extensions: { code: 'NOT_CONFIGURED' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a code Truecaller would not exchange, naming its error or the status', async () => {
    fetchMock.mockResolvedValueOnce(answer(400, { error: 'invalid_grant' }));
    await expect(load().verifyAndroidCode('c', 'v')).rejects.toEqual(rejected('invalid_grant'));
    fetchMock.mockResolvedValueOnce(answer(502, new Error('not json')));
    await expect(load().verifyAndroidCode('c', 'v')).rejects.toEqual(rejected('502'));
  });

  it('refuses when the profile behind the token cannot be read', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, { access_token: 'at-1' }))
      .mockResolvedValueOnce(answer(401, {}));
    await expect(load().verifyAndroidCode('c', 'v')).rejects.toEqual(rejected('userinfo 401'));
  });

  it('says Truecaller is unreachable, and logs why, when the request never completes', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    await expect(load().verifyAndroidCode('c', 'v')).rejects.toMatchObject({
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    });
    expect(log()).toHaveBeenCalledWith('auth-truecaller', 'truecaller-unreachable', {
      host: 'oauth-account-noneu.truecaller.com',
      reason: 'Error: boom',
    });
  });
});

describe('verifyIosProfile', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const published = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const keysAnswer = () => answer(200, [{ keyType: 'RSA', key: published }]);

  const signedProfile = (claims: Record<string, unknown>) => {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64');
    const signature = crypto.sign('sha512', Buffer.from(payload), privateKey).toString('base64');
    return { payload, signature };
  };
  const fresh = (extra: Record<string, unknown> = {}) => ({
    phoneNumber: '+919845012345',
    countryCode: 'IN',
    firstName: 'Riya',
    lastName: 'Sharma',
    requestTime: Math.floor(Date.now() / 1000),
    ...extra,
  });

  it('accepts a fresh profile signed by Truecaller, and keeps the key for the next one', async () => {
    fetchMock.mockResolvedValueOnce(keysAnswer());
    const verify = load();
    const first = signedProfile(fresh());
    expect(await verify.verifyIosProfile(first.payload, first.signature, 'SHA512withRSA')).toMatchObject({
      phone_extension: '+91',
      phone_number: '9845012345',
      last_name: 'Sharma',
    });
    const second = signedProfile(fresh({ requestTime: Date.now() }));
    await verify.verifyIosProfile(second.payload, second.signature, 'sha512withrsa');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api4.truecaller.com/v1/key');
  });

  it('fetches the key again once the cached one is a day old', async () => {
    fetchMock.mockResolvedValue(keysAnswer());
    const verify = load();
    const profile = signedProfile(fresh());
    await verify.verifyIosProfile(profile.payload, profile.signature, 'SHA512withRSA');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 25 * 60 * 60 * 1000);
    const later = signedProfile(fresh({ requestTime: now + 25 * 60 * 60 * 1000 }));
    await verify.verifyIosProfile(later.payload, later.signature, 'SHA512withRSA');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refuses an algorithm it does not check, before fetching anything', async () => {
    await expect(load().verifyIosProfile('p', 's', 'SHA1withRSA')).rejects.toEqual(rejected('algorithm'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a profile whose signature is not Truecaller’s', async () => {
    fetchMock.mockResolvedValueOnce(keysAnswer());
    const { payload } = signedProfile(fresh());
    const forged = signedProfile(fresh({ phoneNumber: '+919000000000' }));
    await expect(load().verifyIosProfile(payload, forged.signature, 'SHA512withRSA')).rejects.toEqual(
      rejected('signature')
    );
  });

  it('refuses when Truecaller publishes no usable key', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, [{ key: '' }, { key: 7 }, null]));
    const profile = signedProfile(fresh());
    await expect(load().verifyIosProfile(profile.payload, profile.signature, 'SHA512withRSA')).rejects.toEqual(
      rejected('no public key \\(HTTP 200\\)')
    );
    fetchMock.mockResolvedValueOnce(answer(500, { error: 'down' }));
    await expect(load().verifyIosProfile(profile.payload, profile.signature, 'SHA512withRSA')).rejects.toEqual(
      rejected('HTTP 500')
    );
  });

  it('refuses a signed payload that is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(keysAnswer());
    const payload = Buffer.from('not json').toString('base64');
    const signature = crypto.sign('sha512', Buffer.from(payload), privateKey).toString('base64');
    await expect(load().verifyIosProfile(payload, signature, 'SHA512withRSA')).rejects.toEqual(
      rejected('not JSON')
    );
  });

  it.each([
    ['older than ten minutes', -11 * 60],
    ['dated well in the future', 5 * 60],
  ])('refuses a profile %s', async (_label, offsetSeconds) => {
    fetchMock.mockResolvedValueOnce(keysAnswer());
    const profile = signedProfile(fresh({ requestTime: Math.floor(Date.now() / 1000) + offsetSeconds }));
    await expect(load().verifyIosProfile(profile.payload, profile.signature, 'SHA512withRSA')).rejects.toEqual(
      rejected('stale')
    );
  });
});

describe('fetchWebProfile', () => {
  const profile = {
    phoneNumbers: [919845012345],
    addresses: [{ countryCode: 'in' }],
    name: { first: 'Riya', last: 'Sharma' },
    onlineIdentities: { email: 'riya@example.com' },
  };

  it('reads the profile from the endpoint Truecaller named, with the token it posted', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, profile));
    const endpoint = 'https://profile4-noneu.truecaller.com/v1/default';
    expect(await load().fetchWebProfile('at-1', endpoint)).toEqual({
      phone_extension: '+91',
      phone_number: '9845012345',
      first_name: 'Riya',
      last_name: 'Sharma',
      email: 'riya@example.com',
    });
    expect(fetchMock).toHaveBeenCalledWith(endpoint, expect.objectContaining({
      headers: { Authorization: 'Bearer at-1', 'Cache-Control': 'no-cache' },
    }));
  });

  it('falls back to the top-level country when the profile carries no address', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, { phoneNumbers: ['919845012345'], countryCode: 'IN' }));
    const identity = await load().fetchWebProfile('at', 'https://profile4.truecaller.com/v1/default');
    expect(identity).toMatchObject({ phone_extension: '+91', first_name: '', email: '' });
  });

  it('never asks a host that is not Truecaller', async () => {
    await expect(load().fetchWebProfile('at', 'https://evil.example/profile')).rejects.toEqual(
      rejected('not Truecaller')
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a token Truecaller does not honour, or a profile with no number', async () => {
    fetchMock.mockResolvedValueOnce(answer(401, {}));
    await expect(load().fetchWebProfile('at', 'https://profile4.truecaller.com/v1')).rejects.toEqual(
      rejected('profile 401')
    );
    fetchMock.mockResolvedValueOnce(answer(200, { phoneNumbers: 'none', addresses: 'none' }));
    await expect(load().fetchWebProfile('at', 'https://profile4.truecaller.com/v1')).rejects.toEqual(
      rejected('does not match')
    );
  });
});

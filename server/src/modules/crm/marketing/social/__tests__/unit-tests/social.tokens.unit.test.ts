/**
 * Social tokens at rest: sealed with AES-256-GCM under SOCIAL_TOKEN_KEY, or a
 * key derived from JWT_SECRET when there is none; legacy plaintext passes
 * through; a tampered value refuses to open. The key is read once per process,
 * so each environment case loads the module afresh.
 */
// Each case loads the module in its own registry, which would also give it its
// own copy of a mocked module — so the spies are made once here and every
// registry's mock points at the same ones.
const mockLogs = { warn: jest.fn(), error: jest.fn(), info: jest.fn() };
const mockModel = { find: jest.fn(), updateOne: jest.fn() };
jest.mock('@observability/log', () => ({ logs: { server: mockLogs } }));
jest.mock('../../social.model', () => ({ SocialAccountModel: mockModel }));

type Tokens = typeof import('../../social.tokens');

const warn = mockLogs.warn;
const KEY_HEX = 'a'.repeat(64);
const KEY_BASE64 = Buffer.from('b'.repeat(32)).toString('base64');

/** The module with the given environment, loaded fresh so its cached key starts empty. */
function load(env: { SOCIAL_TOKEN_KEY?: string; JWT_SECRET?: string }): Tokens {
  delete process.env.SOCIAL_TOKEN_KEY;
  delete process.env.JWT_SECRET;
  Object.assign(process.env, env);
  let mod: Tokens | undefined;
  jest.isolateModules(() => {
    mod = jest.requireActual<Tokens>('../../social.tokens');
  });
  return mod as Tokens;
}

const SEALED = /^enc:v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

afterAll(() => {
  delete process.env.SOCIAL_TOKEN_KEY;
  delete process.env.JWT_SECRET;
});

describe('sealToken / openToken', () => {
  it('round-trips a token under a hex key, with a fresh iv each time', () => {
    const { sealToken, openToken, isSealed } = load({ SOCIAL_TOKEN_KEY: KEY_HEX });
    const a = sealToken('EAAB-secret-token');
    const b = sealToken('EAAB-secret-token');
    expect(a).toMatch(SEALED);
    expect(a).not.toBe(b);
    expect(a).not.toContain('EAAB-secret-token');
    expect(isSealed(a)).toBe(true);
    expect(openToken(a)).toBe('EAAB-secret-token');
    expect(openToken(b)).toBe('EAAB-secret-token');
    expect(warn).not.toHaveBeenCalled();
  });

  it('accepts the key in base64 too', () => {
    const { sealToken, openToken } = load({ SOCIAL_TOKEN_KEY: KEY_BASE64 });
    expect(openToken(sealToken('ya29.refresh'))).toBe('ya29.refresh');
  });

  it('keeps an empty token empty, and opens a legacy plaintext value as-is', () => {
    const { sealToken, openToken, isSealed } = load({ SOCIAL_TOKEN_KEY: KEY_HEX });
    expect(sealToken('')).toBe('');
    expect(openToken('')).toBe('');
    expect(openToken(null)).toBe('');
    expect(openToken(undefined)).toBe('');
    expect(openToken('plain-legacy-token')).toBe('plain-legacy-token');
    expect(isSealed('plain-legacy-token')).toBe(false);
    expect(isSealed(null)).toBe(false);
  });

  it('refuses a sealed value whose tag or ciphertext was altered', () => {
    const { sealToken, openToken } = load({ SOCIAL_TOKEN_KEY: KEY_HEX });
    const [prefix, version, iv, tag, ciphertext] = sealToken('token').split(':');
    const flipped = (part: string) => Buffer.from(part, 'base64').map((byte, i) => (i === 0 ? byte ^ 0xff : byte));
    const badTag = [prefix, version, iv, Buffer.from(flipped(tag)).toString('base64'), ciphertext].join(':');
    const badBody = [prefix, version, iv, tag, Buffer.from(flipped(ciphertext)).toString('base64')].join(':');
    expect(() => openToken(badTag)).toThrow('could not be opened');
    expect(() => openToken(badBody)).toThrow('could not be opened');
    expect(() => openToken('enc:v9:x:y:z')).toThrow('not in a form this server can open');
    expect(() => openToken('enc:v1:only')).toThrow('not in a form this server can open');
  });

  it('cannot open a token sealed under another key', () => {
    const sealedElsewhere = load({ SOCIAL_TOKEN_KEY: KEY_HEX }).sealToken('token');
    const { openToken } = load({ SOCIAL_TOKEN_KEY: KEY_BASE64 });
    expect(() => openToken(sealedElsewhere)).toThrow('sealed with another key or altered');
  });

  it('rejects a SOCIAL_TOKEN_KEY that is not 32 bytes', () => {
    const { sealToken } = load({ SOCIAL_TOKEN_KEY: 'too-short' });
    expect(() => sealToken('token')).toThrow('SOCIAL_TOKEN_KEY must be 32 bytes');
  });
});

describe('the derived key', () => {
  it('seals with a key derived from JWT_SECRET, warning once per process', () => {
    const { sealToken, openToken } = load({ JWT_SECRET: 'jwt-secret' });
    const sealed = sealToken('token-1');
    sealToken('token-2');
    expect(openToken(sealed)).toBe('token-1');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('social-accounts', 'tokenKey', {
      msg: 'SOCIAL_TOKEN_KEY is not set; social tokens are sealed with a key derived from JWT_SECRET',
    });
  });

  it('derives the same key from the same secret, and a different one from another', () => {
    const sealed = load({ JWT_SECRET: 'jwt-secret' }).sealToken('token');
    expect(load({ JWT_SECRET: 'jwt-secret' }).openToken(sealed)).toBe('token');
    expect(() => load({ JWT_SECRET: 'other-secret' }).openToken(sealed)).toThrow('sealed with another key');
  });

  it('prefers SOCIAL_TOKEN_KEY over JWT_SECRET without warning', () => {
    const { sealToken } = load({ SOCIAL_TOKEN_KEY: KEY_HEX, JWT_SECRET: 'jwt-secret' });
    const sealed = sealToken('token');
    expect(load({ SOCIAL_TOKEN_KEY: KEY_HEX }).openToken(sealed)).toBe('token');
    expect(warn).not.toHaveBeenCalled();
  });

  it('refuses to seal or open when neither key exists', () => {
    const { sealToken, openToken } = load({});
    expect(() => sealToken('token')).toThrow('set SOCIAL_TOKEN_KEY (32 bytes, base64 or hex) or JWT_SECRET');
    expect(() => openToken('enc:v1:aQ==:aQ==:aQ==')).toThrow('set SOCIAL_TOKEN_KEY');
    // Legacy plaintext never needs the key.
    expect(openToken('plain')).toBe('plain');
  });
});

describe('sealLegacyTokens', () => {
  const { find, updateOne } = mockModel;

  const stored = (docs: unknown[]) => find.mockReturnValue({ select: () => ({ lean: async () => docs }) });

  it('seals every plaintext token it finds and reports the count', async () => {
    const { sealLegacyTokens, openToken, isSealed } = load({ SOCIAL_TOKEN_KEY: KEY_HEX });
    const already = load({ SOCIAL_TOKEN_KEY: KEY_HEX }).sealToken('kept');
    stored([
      { _id: 'a', access_token: 'plain-a', refresh_token: '' },
      { _id: 'b', access_token: already, refresh_token: 'plain-rt' },
    ]);
    updateOne.mockResolvedValue({ matchedCount: 1 });

    expect(await sealLegacyTokens()).toBe(2);
    expect(find).toHaveBeenCalledWith({
      $or: [
        { access_token: { $nin: ['', null], $not: /^enc:/ } },
        { refresh_token: { $nin: ['', null], $not: /^enc:/ } },
      ],
    });
    expect(updateOne).toHaveBeenCalledTimes(2);
    const [, firstSet] = updateOne.mock.calls[0];
    expect(isSealed(firstSet.$set.access_token)).toBe(true);
    expect(openToken(firstSet.$set.access_token)).toBe('plain-a');
    expect(firstSet.$set.refresh_token).toBe('');
    const [, secondSet] = updateOne.mock.calls[1];
    // A token that was already sealed is left exactly as it was.
    expect(secondSet.$set.access_token).toBe(already);
    expect(openToken(secondSet.$set.refresh_token)).toBe('plain-rt');
    expect(mockLogs.info).toHaveBeenCalledWith('social-accounts', 'sealLegacyTokens', {
      accounts: 2,
      msg: 'sealed stored social tokens',
    });
  });

  it('does nothing, quietly, once every token is sealed', async () => {
    const { sealLegacyTokens } = load({ SOCIAL_TOKEN_KEY: KEY_HEX });
    stored([]);
    expect(await sealLegacyTokens()).toBe(0);
    expect(updateOne).not.toHaveBeenCalled();
    expect(mockLogs.info).not.toHaveBeenCalled();
  });
});

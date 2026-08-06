import crypto from 'node:crypto';

jest.mock('@modules/platform/envEntry/envEntry.model', () => ({
  ...jest.requireActual('@modules/platform/envEntry/envEntry.model'),
  EnvEntryModel: {
    find: () => ({ lean: async () => entries }),
    // getUrlConfigs reads SERVER_URL through the same model; null lets it fall
    // back to the built-in default rather than blowing up here.
    findOne: () => ({ lean: async () => null }),
  },
}));

let entries: { name: string; config: Record<string, string> }[] = [];

import { getImagekitAuth, signImagekitUpload } from '../../upload.service';

/**
 * The ImageKit client-upload contract, pinned.
 *
 * Browser uploads no longer sign anything — they go through the server on the
 * private key. This signer remains for the Tech portal ImageKit test, which
 * still exercises the signed path so an operator can tell a broken key pair
 * from a broken account. Its contract stays pinned because "invalid signature
 * parameter" is all ImageKit ever says about any part of it being wrong.
 */
describe('ImageKit credentials come from one entry', () => {
  it('refuses to sign when two entries are both active and default', async () => {
    // The failure this replaces: three independent lookups for three fields
    // could answer from two records, signing one account's public key with the
    // other's private key. ImageKit calls that an invalid signature and says
    // nothing else, so it has to be caught here.
    entries = [
      { name: 'ImageKit A', config: { public_key: 'public_a', private_key: 'private_a', url_endpoint: 'https://ik.imagekit.io/a' } },
      { name: 'ImageKit B', config: { public_key: 'public_b', private_key: 'private_b', url_endpoint: 'https://ik.imagekit.io/b' } },
    ];
    await expect(getImagekitAuth()).rejects.toThrow(/ImageKit A, ImageKit B/);
  });

  it('hands out a pass from the single default entry', async () => {
    entries = [
      { name: 'ImageKit', config: { public_key: 'public_one', private_key: 'private_one', url_endpoint: 'https://ik.imagekit.io/one' } },
    ];
    const auth = await getImagekitAuth('u1', '/avatars');
    expect(auth.urlEndpoint).toBe('https://ik.imagekit.io/one');
    expect(auth.ticket).toBeTruthy();
  });
});

describe('ImageKit upload signature', () => {
  it('is HMAC-SHA1 of token + expire, hex, keyed by the private key', () => {
    const key = 'private_test_key';
    const { token, expire, signature } = signImagekitUpload(key);

    const expected = crypto.createHmac('sha1', key).update(`${token}${expire}`).digest('hex');
    expect(signature).toBe(expected);
    // Hex digest, 40 chars — not base64, which ImageKit rejects.
    expect(signature).toMatch(/^[0-9a-f]{40}$/);
  });

  it('sends a UUID token, which is the shape ImageKit SDKs send', () => {
    const { token } = signImagekitUpload('private_test_key');
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('gives every upload its own token, because ImageKit refuses a reused one', () => {
    const seen = new Set(
      Array.from({ length: 50 }, () => signImagekitUpload('private_test_key').token)
    );
    expect(seen.size).toBe(50);
  });

  it('expires in the future and inside ImageKit’s one-hour ceiling', () => {
    const now = Math.floor(Date.now() / 1000);
    const { expire } = signImagekitUpload('private_test_key');
    expect(expire).toBeGreaterThan(now);
    expect(expire).toBeLessThanOrEqual(now + 3600);
  });

  it('never exceeds the ceiling even when asked to', () => {
    // A caller asking for two hours would get a token ImageKit refuses, and the
    // refusal would read as an invalid signature rather than a bad expiry.
    const now = Math.floor(Date.now() / 1000);
    const { expire } = signImagekitUpload('private_test_key', 2 * 60 * 60);
    expect(expire).toBeLessThanOrEqual(now + 3600);
  });
});

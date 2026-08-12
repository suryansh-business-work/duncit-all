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

import { getImagekitAuth } from '../../upload.service';

/**
 * Where the ImageKit credentials come from, pinned.
 *
 * Nothing signs an upload any more — browser, native, CI and the Tech portal's
 * test all go through the server on the private key alone. That deleted the
 * entire "invalid signature parameter" failure class, which was worth pinning
 * because a mismatched key pair is all ImageKit will ever tell you about it.
 *
 * What still matters is that ONE record answers for the credentials: two entries
 * left active and default is a configuration mistake that must be named, not
 * silently resolved to whichever document Mongo happened to return.
 */
describe('ImageKit credentials come from one entry', () => {
  it('refuses to hand out a pass when two entries are both active and default', async () => {
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

  it('needs only the private key — a missing public key blocks nothing', async () => {
    // The public key is read by no upload path. Requiring one here is how the
    // Tech portal's ImageKit test used to fail an account that worked.
    entries = [
      { name: 'ImageKit', config: { private_key: 'private_one', url_endpoint: 'https://ik.imagekit.io/one' } },
    ];
    await expect(getImagekitAuth('u1')).resolves.toMatchObject({
      urlEndpoint: 'https://ik.imagekit.io/one',
    });
  });
});

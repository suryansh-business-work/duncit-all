/**
 * Payment evidence is a PRIVATE upload: filed only under the uploader, never in
 * someone else's folder, and opened only through a signed, expiring link made
 * exactly the way ImageKit verifies it.
 */
jest.mock('../../upload.service', () => ({ getImagekitConfig: jest.fn() }));

import crypto from 'node:crypto';
import { SERVER_ENV } from '@observability/log';
import { getImagekitConfig } from '../../upload.service';
import { isPrivateUploadFolder, privateEvidenceFolder, resolveUploadFolder } from '../../uploadFolder';
import { pathAfterEndpoint, signPrivatePath, signedPrivateUrl } from '../../privateMedia';

const USER = '65aa00000000000000000001';
const OTHER = '65aa00000000000000000002';
const root = `/${SERVER_ENV}`;

describe('private evidence folder', () => {
  it('files payment-evidence under the uploader, whatever entity id the client sends', () => {
    expect(resolveUploadFolder('payment-evidence', { userId: USER, entityId: OTHER })).toBe(
      `${root}/payment_evidence/${USER}/evidence`
    );
    expect(privateEvidenceFolder(USER)).toBe(`${root}/payment_evidence/${USER}/evidence`);
  });

  it('will not let a signed-in caller write into another account’s private folder', () => {
    expect(resolveUploadFolder(`${root}/payment_evidence/${OTHER}/evidence`, { userId: USER })).toBe(
      `${root}/payment_evidence/${USER}/evidence`
    );
  });

  it('keeps a pre-resolved private path on the server’s own second pass (no uploader named)', () => {
    const resolved = `${root}/payment_evidence/${USER}/evidence`;
    expect(resolveUploadFolder(resolved)).toBe(resolved);
  });

  it('marks only the private bucket as private', () => {
    expect(isPrivateUploadFolder(`${root}/payment_evidence/${USER}/evidence`)).toBe(true);
    expect(isPrivateUploadFolder(resolveUploadFolder('/support', { userId: USER }))).toBe(false);
    expect(isPrivateUploadFolder(null)).toBe(false);
  });
});

describe('signed links', () => {
  const endpoint = 'https://ik.imagekit.io/duncit';

  it('finds the path after the endpoint, or after the ImageKit id on the default host', () => {
    expect(pathAfterEndpoint(`${endpoint}/staging/payment_evidence/u/evidence/a.png?x=1`, endpoint)).toBe('staging/payment_evidence/u/evidence/a.png');
    expect(pathAfterEndpoint('https://ik.imagekit.io/duncit/p/a.png', 'https://media.duncit.com')).toBe('p/a.png');
    expect(pathAfterEndpoint('https://evil.example.com/p/a.png', endpoint)).toBeNull();
    expect(pathAfterEndpoint('not a url', 'https://media.duncit.com')).toBeNull();
  });

  it('signs HMAC-SHA1(private key, path + expiry) the way ImageKit checks it', () => {
    const url = signPrivatePath({ endpoint: `${endpoint}/`, path: 'p/a.png', privateKey: 'private_key', expiresAt: 1800000000 });
    const expected = crypto.createHmac('sha1', 'private_key').update('p/a.png1800000000').digest('hex');
    expect(url).toBe(`${endpoint}/p/a.png?ik-t=1800000000&ik-s=${expected}`);
  });

  it('expires the link after the requested seconds', async () => {
    jest.mocked(getImagekitConfig).mockResolvedValue({ publicKey: '', privateKey: 'k', urlEndpoint: endpoint });
    const before = Math.floor(Date.now() / 1000);
    const { url, expiresAt } = await signedPrivateUrl(`${endpoint}/p/a.png`, 600);
    const expiry = Number(new URL(url).searchParams.get('ik-t'));
    expect(expiry).toBeGreaterThanOrEqual(before + 600);
    expect(expiry).toBeLessThanOrEqual(before + 601);
    expect(expiresAt.getTime()).toBe(expiry * 1000);
  });

  it('refuses when ImageKit is not configured or the file is foreign', async () => {
    jest.mocked(getImagekitConfig).mockResolvedValue({ publicKey: '', privateKey: '', urlEndpoint: '' });
    await expect(signedPrivateUrl(`${endpoint}/p/a.png`, 600)).rejects.toMatchObject({ extensions: { code: 'CONFIG_ERROR' } });
    jest.mocked(getImagekitConfig).mockResolvedValue({ publicKey: '', privateKey: 'k', urlEndpoint: endpoint });
    await expect(signedPrivateUrl('https://evil.example.com/a.png', 600)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

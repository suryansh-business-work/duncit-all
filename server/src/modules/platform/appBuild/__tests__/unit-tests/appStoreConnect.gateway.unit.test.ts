import { generateKeyPairSync } from 'node:crypto';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import {
  AscError,
  asc,
  ascToken,
  assertCertificateAccess,
  createAppStoreProfile,
  createDistributionCertificate,
  ensureBundleId,
  ensureCapabilities,
  findApp,
  isTransientAscError,
  revokeCertificate,
} from '../../appStoreConnect.gateway';
import { outboundFetch } from '@utils/outboundFetch';

jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

const fetchMock = outboundFetch as jest.Mock;
const reply = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: body instanceof Error ? () => Promise.reject(body) : async () => body,
  });
const call = (n = 0) => fetchMock.mock.calls[n] as [string, string, RequestInit & { headers: Record<string, string> }];

describe('ascToken', () => {
  it('signs a ten-minute ES256 token that Apple can verify, from a key pasted as one line', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const pastedOneLine = pem.replaceAll('\n', ' ');
    const token = ascToken({ issuerId: 'issuer-1', keyId: 'KEY123', privateKey: pastedOneLine });
    const decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'], audience: 'appstoreconnect-v1', issuer: 'issuer-1', complete: true });
    expect(decoded.header.kid).toBe('KEY123');
    const payload = decoded.payload as jwt.JwtPayload;
    expect((payload.exp as number) - (payload.iat as number)).toBe(600);
  });

  it('throws when the pasted key cannot sign', () => {
    expect(() => ascToken({ issuerId: 'i', keyId: 'k', privateKey: 'not a key' })).toThrow();
  });
});

describe('AscError and isTransientAscError', () => {
  it('names the store, the status and the reason', () => {
    const err = new AscError(403, 'forbidden');
    expect(err.name).toBe('AscError');
    expect(err.status).toBe(403);
    expect(err.message).toContain('(HTTP 403): forbidden');
  });

  it.each([
    [new AscError(429, 'x'), true],
    [new AscError(500, 'x'), true],
    [new AscError(503, 'x'), true],
    [new AscError(404, 'x'), false],
    [new AscError(499, 'x'), false],
    [new GraphQLError('net', { extensions: { code: 'BAD_GATEWAY' } }), true],
    [new GraphQLError('other', { extensions: { code: 'FORBIDDEN' } }), false],
    [new GraphQLError('none'), false],
    [new Error('plain'), false],
    ['text', false],
  ])('classifies %p as transient=%p', (err, expected) => {
    expect(isTransientAscError(err)).toBe(expected);
  });
});

describe('asc verbs', () => {
  it('GET sends the bearer token and a timeout signal', async () => {
    reply(200, { data: [1] });
    await expect(asc.get('jwt', '/apps')).resolves.toEqual({ data: [1] });
    const [label, url, init] = call();
    expect(label).toContain('App Store Connect');
    expect(url).toBe('https://api.appstoreconnect.apple.com/v1/apps');
    expect(init.headers).toEqual({ Authorization: 'Bearer jwt', 'Content-Type': 'application/json' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('POST and PATCH wrap the payload in `data`; DELETE sends no body', async () => {
    reply(200, {});
    await asc.post('t', '/x', { a: 1 });
    expect(call(0)[2]).toMatchObject({ method: 'POST', body: JSON.stringify({ data: { a: 1 } }) });
    await asc.patch('t', '/x', { b: 2 });
    expect(call(1)[2]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ data: { b: 2 } }) });
    await asc.delete('t', '/x');
    expect(call(2)[2]).toMatchObject({ method: 'DELETE' });
    expect(call(2)[2].body).toBeUndefined();
  });

  it('treats 204 as an empty answer without reading a body', async () => {
    fetchMock.mockResolvedValue({ status: 204, ok: true, json: () => Promise.reject(new Error('no body')) });
    await expect(asc.delete('t', '/x')).resolves.toEqual({});
  });

  it('throws Apple’s own detail, then title, then a default, for a refusal', async () => {
    reply(403, { errors: [{ detail: 'Needs Admin', title: 'Forbidden' }] });
    await expect(asc.get('t', '/x')).rejects.toMatchObject({ status: 403, message: expect.stringContaining('Needs Admin') });
    reply(409, { errors: [{ title: 'Conflict' }] });
    await expect(asc.get('t', '/x')).rejects.toMatchObject({ message: expect.stringContaining('Conflict') });
    reply(400, { errors: [{}] });
    await expect(asc.get('t', '/x')).rejects.toMatchObject({ message: expect.stringContaining('no reason given') });
    reply(400, { errors: [] });
    await expect(asc.get('t', '/x')).rejects.toMatchObject({ message: expect.stringContaining('no reason given') });
    reply(500, new Error('not json'));
    await expect(asc.get('t', '/x')).rejects.toMatchObject({ status: 500, message: expect.stringContaining('no reason given') });
  });

  it('treats an unreadable success body as empty', async () => {
    reply(200, new Error('not json'));
    await expect(asc.get('t', '/x')).resolves.toEqual({});
  });
});

describe('findApp', () => {
  it('returns the app for the bundle id', async () => {
    reply(200, { data: [{ id: 12, attributes: { name: 'Duncit' } }] });
    await expect(findApp('t', 'com.duncit.app')).resolves.toEqual({ id: '12', name: 'Duncit' });
    expect(call()[1]).toContain('/apps?filter%5BbundleId%5D=com.duncit.app&limit=1');
  });

  it('names an app with no name as empty, and returns null when there is none', async () => {
    reply(200, { data: [{ id: 1 }] });
    await expect(findApp('t', 'b')).resolves.toEqual({ id: '1', name: '' });
    reply(200, { data: [] });
    await expect(findApp('t', 'b')).resolves.toBeNull();
    reply(200, {});
    await expect(findApp('t', 'b')).resolves.toBeNull();
  });
});

describe('certificates and App IDs', () => {
  it('checks certificate access with a one-row read', async () => {
    reply(200, {});
    await assertCertificateAccess('t');
    expect(call()[1]).toContain('/certificates?limit=1');
  });

  it('refuses a key that cannot manage certificates', async () => {
    reply(403, { errors: [{ detail: 'Insufficient role' }] });
    await expect(assertCertificateAccess('t')).rejects.toMatchObject({ status: 403 });
  });

  it('reuses the exact App ID, ignoring prefix matches', async () => {
    reply(200, { data: [{ id: 'wrong', attributes: { identifier: 'com.x.app.widget' } }, { id: 'right', attributes: { identifier: 'com.x.app' } }] });
    await expect(ensureBundleId('t', 'com.x.app')).resolves.toBe('right');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('registers an App ID Apple has never seen, with a name made of letters and spaces', async () => {
    fetchMock
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ data: [{ id: 'w', attributes: { identifier: 'com.x.app.widget' } }] }) })
      .mockResolvedValueOnce({ status: 201, ok: true, json: async () => ({ data: { id: 'new1' } }) });
    await expect(ensureBundleId('t', 'com.x.app')).resolves.toBe('new1');
    expect(JSON.parse(call(1)[2].body as string)).toEqual({
      data: { type: 'bundleIds', attributes: { identifier: 'com.x.app', name: 'com x app', platform: 'IOS' } },
    });
  });

  it('registers an App ID when Apple returns no list at all', async () => {
    fetchMock
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ status: 201, ok: true, json: async () => ({ data: { id: 7 } }) });
    await expect(ensureBundleId('t', 'com.y')).resolves.toBe('7');
  });

  it('switches on only the capabilities the App ID lacks', async () => {
    fetchMock.mockImplementation(async (_l: string, url: string, init: RequestInit) => ({
      status: 200, ok: true,
      json: async () => (init.method === 'POST' ? {} : { data: [{ attributes: { capabilityType: 'PUSH_NOTIFICATIONS' } }, { attributes: {} }] }),
    }));
    await ensureCapabilities('t', 'b1');
    const posts = fetchMock.mock.calls.filter((c) => c[2].method === 'POST').map((c) => JSON.parse(c[2].body).data);
    expect(posts.map((p) => p.attributes.capabilityType).sort()).toEqual(['APPLE_ID_AUTH', 'ASSOCIATED_DOMAINS']);
    expect(posts.find((p) => p.attributes.capabilityType === 'APPLE_ID_AUTH').attributes.settings).toEqual([
      { key: 'APPLE_ID_AUTH_APP_CONSENT', options: [{ key: 'PRIMARY_APP_CONSENT' }] },
    ]);
    expect(posts[0].relationships).toEqual({ bundleId: { data: { type: 'bundleIds', id: 'b1' } } });
  });

  it('adds every capability when none is listed, and none when all are present', async () => {
    fetchMock.mockImplementation(async (_l: string, _u: string, init: RequestInit) => ({ status: 200, ok: true, json: async () => (init.method === 'POST' ? {} : {}) }));
    await ensureCapabilities('t', 'b1');
    expect(fetchMock.mock.calls.filter((c) => c[2].method === 'POST')).toHaveLength(3);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ data: ['PUSH_NOTIFICATIONS', 'ASSOCIATED_DOMAINS', 'APPLE_ID_AUTH'].map((capabilityType) => ({ attributes: { capabilityType } })) }),
    });
    await ensureCapabilities('t', 'b1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('has Apple sign a CSR as a distribution certificate', async () => {
    reply(201, { data: { id: 9, attributes: { serialNumber: 'S1', certificateContent: 'Q0VSVA==', expirationDate: '2027-01-01' } } });
    await expect(createDistributionCertificate('t', 'CSR')).resolves.toEqual({
      id: '9', serialNumber: 'S1', contentBase64: 'Q0VSVA==', expiresAt: '2027-01-01',
    });
    expect(JSON.parse(call()[2].body as string)).toEqual({ data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent: 'CSR' } } });
  });

  it('defaults certificate fields Apple omitted', async () => {
    reply(201, { data: { id: 9 } });
    await expect(createDistributionCertificate('t', 'CSR')).resolves.toEqual({ id: '9', serialNumber: '', contentBase64: '', expiresAt: '' });
  });

  it('revokes a certificate', async () => {
    reply(204, {});
    await revokeCertificate('t', 'c1');
    expect(call()[1]).toBe('https://api.appstoreconnect.apple.com/v1/certificates/c1');
    expect(call()[2].method).toBe('DELETE');
  });

  it('creates an App Store profile tying the App ID to the certificate', async () => {
    reply(201, { data: { id: 3, attributes: { uuid: 'U-1', name: 'Profile X', profileContent: 'UFJPRg==' } } });
    await expect(createAppStoreProfile('t', 'b1', 'c1', 'Profile X')).resolves.toEqual({ id: '3', uuid: 'U-1', name: 'Profile X', contentBase64: 'UFJPRg==' });
    expect(JSON.parse(call()[2].body as string).data).toEqual({
      type: 'profiles',
      attributes: { name: 'Profile X', profileType: 'IOS_APP_STORE' },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: 'b1' } },
        certificates: { data: [{ type: 'certificates', id: 'c1' }] },
        devices: { data: [] },
      },
    });
  });

  it('falls back to the requested name and empty fields for a sparse profile answer', async () => {
    reply(201, { data: { id: 3 } });
    await expect(createAppStoreProfile('t', 'b1', 'c1', 'Asked Name')).resolves.toEqual({ id: '3', uuid: '', name: 'Asked Name', contentBase64: '' });
  });
});

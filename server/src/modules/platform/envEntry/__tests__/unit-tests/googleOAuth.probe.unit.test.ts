import { decodeAuthError, googleOAuthConnection } from '../../googleOAuth.probe';

/** Google's authError: length-prefixed string fields (tag byte, varint length, bytes). */
const field = (text: string) => {
  const body = Buffer.from(text, 'utf8');
  const len: number[] = [];
  let n = body.length;
  do {
    let byte = n & 0x7f;
    n >>= 7;
    if (n > 0) byte |= 0x80;
    len.push(byte);
  } while (n > 0);
  return Buffer.concat([Buffer.from([0x0a]), Buffer.from(len), body]);
};
const authError = (error: string, description = '') =>
  Buffer.concat([field(error), field(description)]).toString('base64').replaceAll('+', '-').replaceAll('/', '_');

const fetchMock = jest.fn();
beforeEach(() => {
  global.fetch = fetchMock as never;
});

/** Google's answer: moves on to sign-in (accepts), or to its error page with `authError`. */
const accepts = () => ({ headers: { get: () => 'https://accounts.google.com/v3/signin/identifier' } });
const refuses = (encoded: string) => ({
  headers: { get: () => `https://accounts.google.com/signin/oauth/error/v2?authError=${encoded}` },
});
const noRedirect = () => ({ headers: { get: () => null } });

describe('decodeAuthError', () => {
  it('reads the OAuth error and Google’s sentence out of the protobuf', () => {
    expect(decodeAuthError(authError('invalid_request', 'Custom URI scheme is not enabled'))).toEqual({
      error: 'invalid_request', description: 'Custom URI scheme is not enabled',
    });
  });

  it('reads a long field whose length takes two varint bytes', () => {
    const long = 'x'.repeat(200);
    expect(decodeAuthError(authError('invalid_client', long)).description).toBe(long);
  });

  it('gives an empty description when there is only one field, and unknown when there are none', () => {
    expect(decodeAuthError(field('deleted_client').toString('base64'))).toEqual({ error: 'deleted_client', description: '' });
    expect(decodeAuthError('')).toEqual({ error: 'unknown', description: '' });
  });

  it('stops at a field whose length runs past the data', () => {
    expect(decodeAuthError(Buffer.from([0x0a, 0x7f, 0x41]).toString('base64'))).toEqual({ error: 'unknown', description: '' });
  });

  it('reads a length that never ends as an empty field', () => {
    expect(decodeAuthError(Buffer.from([0x0a, 0x80, 0x80]).toString('base64'))).toEqual({ error: '', description: '' });
  });
});

describe('googleOAuthConnection', () => {
  const config = (values: Record<string, string>) => (key: string) => values[key] ?? '';

  it('says so when no client id is saved', async () => {
    await expect(googleOAuthConnection(config({ client_id: '  ' }))).resolves.toEqual({ ok: false, message: 'No OAuth client ID is saved', details: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens Google’s authorize step the way an app does and counts a known web client as found', async () => {
    fetchMock.mockResolvedValue(refuses(authError('redirect_uri_mismatch')));
    const out = await googleOAuthConnection(config({ client_id: 'abc.apps.googleusercontent.com' }));
    expect(out).toEqual({ ok: true, message: 'Google accepted all 1 client(s)', details: ['Web client: client found.'] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
    const params = new URL(String(url)).searchParams;
    expect(params.get('client_id')).toBe('abc.apps.googleusercontent.com');
    expect(params.get('redirect_uri')).toBe('https://probe.invalid/oauth');
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(init.redirect).toBe('manual');
  });

  it('accepts a client Google moves straight on for, and a response with no redirect at all', async () => {
    fetchMock.mockResolvedValueOnce(accepts()).mockResolvedValueOnce(noRedirect());
    const out = await googleOAuthConnection(config({ client_id: 'a', android_client_id: 'b', android_package: 'com.duncit.app' }));
    expect(out.details).toEqual(['Web client: accepted, redirect https://probe.invalid/oauth.', 'Android client: accepted, redirect com.duncit.app:/oauthredirect.']);
    expect(out.ok).toBe(true);
  });

  it('names a client Google does not know, for both refusal codes, and fails', async () => {
    fetchMock.mockResolvedValueOnce(refuses(authError('invalid_client'))).mockResolvedValueOnce(refuses(authError('deleted_client')));
    const out = await googleOAuthConnection(config({ client_id: 'a', ios_client_id: 'b', ios_bundle_id: 'com.duncit.app' }));
    expect(out.ok).toBe(false);
    expect(out.message).toBe('Google refused 2 of 2 check(s)');
    expect(out.details[0]).toContain('Web client: Google has no such client (invalid_client).');
    expect(out.details[1]).toContain('iOS client: Google has no such client (deleted_client).');
  });

  it('reports what Google said about an app client’s own redirect', async () => {
    fetchMock.mockResolvedValue(refuses(authError('invalid_request', 'Custom URI scheme is not enabled for your Android client')));
    const out = await googleOAuthConnection(config({ android_client_id: 'a', android_package: ' com.duncit.app ' }));
    expect(out.ok).toBe(false);
    expect(out.details).toEqual(['Android client: invalid_request — Custom URI scheme is not enabled for your Android client']);
  });

  it('treats an error page with no authError as an unknown refusal', async () => {
    fetchMock.mockResolvedValue({ headers: { get: () => 'https://accounts.google.com/signin/oauth/error/v2' } });
    const out = await googleOAuthConnection(config({ ios_client_id: 'a', ios_bundle_id: 'com.duncit.app' }));
    expect(out.details).toEqual(['iOS client: unknown — ']);
  });

  it('suggests adding the app id when only a client was found, naming which one', async () => {
    fetchMock.mockResolvedValue(refuses(authError('redirect_uri_mismatch')));
    const android = await googleOAuthConnection(config({ android_client_id: 'a' }));
    expect(android.ok).toBe(true);
    expect(android.details[0]).toBe(`Android client: client found. Add the Android Package Name to test the app's own redirect.`);
    const ios = await googleOAuthConnection(config({ ios_client_id: 'b' }));
    expect(ios.details[0]).toContain('Add the iOS Bundle ID');
  });

  it('warns about a value saved with https:// or a trailing slash, even when Google accepts it', async () => {
    fetchMock.mockResolvedValue(accepts());
    const out = await googleOAuthConnection(config({ client_id: 'https://abc.apps.googleusercontent.com/' }));
    expect(out.ok).toBe(true);
    expect(out.details[0]).toContain('Saved with https:// or a trailing slash');
    expect(String(fetchMock.mock.calls[0][0])).toContain('client_id=abc.apps.googleusercontent.com');
  });

  it('flags one client id pasted into both the Android and iOS fields', async () => {
    fetchMock.mockResolvedValue(accepts());
    const out = await googleOAuthConnection(config({ android_client_id: 'same', ios_client_id: 'same', ios_bundle_id: ' com.duncit.app ' }));
    expect(out.ok).toBe(false);
    expect(out.message).toBe('Google refused 1 of 3 check(s)');
    expect(out.details.at(-1)).toBe('The iOS field holds the Android client ID. Create an iOS client for com.duncit.app in Google Cloud and paste its ID.');
    const noBundle = await googleOAuthConnection(config({ android_client_id: 'same', ios_client_id: 'same' }));
    expect(noBundle.details.at(-1)).toContain('for the app in Google Cloud');
  });
});

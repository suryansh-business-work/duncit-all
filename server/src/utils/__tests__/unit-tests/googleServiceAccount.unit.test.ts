import jwt from 'jsonwebtoken';
import { parseServiceAccount, serviceAccountToken } from '../../googleServiceAccount';

jest.mock('jsonwebtoken', () => ({ __esModule: true, default: { sign: jest.fn() } }));

const mockSign = jwt.sign as jest.Mock;
const ACCOUNT = { client_email: 'reels@duncit-drive.iam.gserviceaccount.com', private_key: 'private-key' };
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('parseServiceAccount', () => {
  it('reads the two fields that sign in, trimmed', () => {
    const key = JSON.stringify({ client_email: ` ${ACCOUNT.client_email} `, private_key: ' private-key\n', type: 'service_account' });
    expect(parseServiceAccount(key)).toEqual(ACCOUNT);
  });

  it('refuses a key that is not JSON', () => {
    expect(() => parseServiceAccount('-----BEGIN')).toThrow('not valid JSON');
  });

  it.each([{}, { client_email: ACCOUNT.client_email }, { private_key: 'private-key' }])(
    'refuses a key missing its email or its private key: %p',
    (key) => {
      expect(() => parseServiceAccount(JSON.stringify(key))).toThrow('not a service account JSON key');
    }
  );
});

describe('serviceAccountToken', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    mockSign.mockReturnValue('signed-assertion');
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());

  it('exchanges a JWT signed by the account for an access token', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000);
    fetchMock.mockResolvedValue(json({ access_token: 'ya29.token' }));
    await expect(serviceAccountToken(ACCOUNT, SCOPE)).resolves.toBe('ya29.token');

    expect(mockSign).toHaveBeenCalledWith(
      {
        iss: ACCOUNT.client_email,
        scope: SCOPE,
        aud: 'https://oauth2.googleapis.com/token',
        iat: 1_790_000_000,
        exp: 1_790_003_600,
      },
      ACCOUNT.private_key,
      { algorithm: 'RS256' }
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');
    expect(init.body.get('assertion')).toBe('signed-assertion');
    expect(init.body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
  });

  it.each([
    [{ error: 'invalid_grant', error_description: 'Invalid JWT signature.' }, 'Invalid JWT signature.'],
    [{ error: 'invalid_grant' }, 'invalid_grant'],
    [{}, 'no reason given'],
  ])('repeats why Google refused the sign-in: %p', async (body, reason) => {
    fetchMock.mockResolvedValue(json(body, 400));
    await expect(serviceAccountToken(ACCOUNT, SCOPE)).rejects.toThrow(`(HTTP 400): ${reason}`);
  });

  it('reads a refusal that is not JSON as having no reason', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(serviceAccountToken(ACCOUNT, SCOPE)).rejects.toThrow('(HTTP 502): no reason given');
  });

  it('refuses an answer that carries no token', async () => {
    fetchMock.mockResolvedValue(json({ token_type: 'Bearer' }));
    await expect(serviceAccountToken(ACCOUNT, SCOPE)).rejects.toThrow('without an access token');
  });
});

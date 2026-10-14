import { checkEmailWithReacher, toCheckResult } from '../../emailVerification.client';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));

const envValue = getRuntimeEnvValue as jest.MockedFunction<typeof getRuntimeEnvValue>;
const fetchMock = jest.fn();

const reacherBody = {
  input: 'asha@example.com',
  is_reachable: 'safe',
  misc: { is_disposable: false, is_role_account: true },
  mx: { accepts_mail: true, records: ['mx.example.com.'] },
  smtp: { can_connect_smtp: true, has_full_inbox: false, is_catch_all: false, is_deliverable: true, is_disabled: false },
  syntax: { is_valid_syntax: true, suggestion: 'asha@example.co' },
};

const setEnv = (values: Record<string, string>) => {
  envValue.mockImplementation(async (key: string) => values[key] ?? '');
};

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

describe('toCheckResult', () => {
  it('maps a safe answer to VERIFIED and keeps every flag Reacher reported', () => {
    expect(toCheckResult(reacherBody)).toEqual({
      status: 'VERIFIED',
      is_valid_syntax: true,
      accepts_mail: true,
      can_connect_smtp: true,
      is_deliverable: true,
      is_catch_all: false,
      has_full_inbox: false,
      is_disabled: false,
      is_disposable: false,
      is_role_account: true,
      suggestion: 'asha@example.co',
    });
  });

  it.each([
    ['risky', 'RISKY'],
    ['invalid', 'INVALID'],
    ['unknown', 'UNKNOWN'],
    ['something-new', 'UNKNOWN'],
  ])('maps is_reachable "%s" to %s', (reachable, status) => {
    expect(toCheckResult({ ...reacherBody, is_reachable: reachable }).status).toBe(status);
  });

  it('reads an errored section (Reacher sends { type, message }) and absent sections as all-false', () => {
    const result = toCheckResult({
      is_reachable: 'unknown',
      smtp: { type: 'SmtpError', message: 'connection refused' },
      mx: 'not-an-object',
      syntax: { is_valid_syntax: true, suggestion: null },
    });
    expect(result).toMatchObject({
      status: 'UNKNOWN',
      is_valid_syntax: true,
      accepts_mail: false,
      can_connect_smtp: false,
      is_deliverable: false,
      is_disposable: false,
      suggestion: '',
    });
  });
});

describe('checkEmailWithReacher', () => {
  it('refuses to run when REACHER_INTERNAL_URL is not configured', async () => {
    setEnv({});
    await expect(checkEmailWithReacher('asha@example.com')).rejects.toMatchObject({
      message: expect.stringMatching(/not configured/),
      extensions: { code: 'BAD_GATEWAY' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the address to /v0/check_email with the shared secret and maps the answer', async () => {
    setEnv({ REACHER_INTERNAL_URL: 'http://reacher:8080/', REACHER_HEADER_SECRET: 's3cret' });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(reacherBody), { status: 200 }));

    const result = await checkEmailWithReacher('asha@example.com');

    expect(result.status).toBe('VERIFIED');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://reacher:8080/v0/check_email');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ to_email: 'asha@example.com' });
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'x-reacher-secret': 's3cret' });
  });

  it('sends no secret header when none is configured', async () => {
    setEnv({ REACHER_INTERNAL_URL: 'http://reacher:8080' });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(reacherBody), { status: 200 }));

    await checkEmailWithReacher('asha@example.com');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('reports a non-2xx answer with its status and body', async () => {
    setEnv({ REACHER_INTERNAL_URL: 'http://reacher:8080' });
    fetchMock.mockResolvedValue(new Response('Invalid secret', { status: 401 }));

    await expect(checkEmailWithReacher('asha@example.com')).rejects.toMatchObject({
      message: 'Email verifier answered 401: Invalid secret',
      extensions: { code: 'BAD_GATEWAY' },
    });
  });

  it('reports a non-2xx answer with no body as just its status', async () => {
    setEnv({ REACHER_INTERNAL_URL: 'http://reacher:8080' });
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(checkEmailWithReacher('asha@example.com')).rejects.toThrow('Email verifier answered 503');
  });

  it('still reports the status when the error body cannot be read', async () => {
    setEnv({ REACHER_INTERNAL_URL: 'http://reacher:8080' });
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.reject(new Error('stream closed')) });

    await expect(checkEmailWithReacher('asha@example.com')).rejects.toThrow('Email verifier answered 500');
  });
});

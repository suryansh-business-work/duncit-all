import { logs } from '@observability/log';
import { describeFetchError, isRetryableStatus, postJson, redact, UNREACHABLE_PREFIX } from '../../aisensy.transport';

jest.mock('@observability/log', () => ({ logs: { server: { debug: jest.fn(), warn: jest.fn() } } }));

const fetchMock = jest.fn();
const realFetch = global.fetch;
const answer = (status: number, body: unknown = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => jest.useRealTimers());
afterAll(() => {
  global.fetch = realFetch;
});

/** Run a postJson to the end, advancing the backoff timers it sleeps on. */
async function run(promise: Promise<unknown>) {
  const settled = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await jest.advanceTimersByTimeAsync(120_000);
  return settled as Promise<{ value?: any; error?: any }>;
}

describe('redact', () => {
  it('replaces secrets at any depth and in arrays, leaving everything else', () => {
    expect(redact({ apiKey: 'k', Authorization: 'a', nested: { token: 't', keep: 1 }, list: [{ password: 'p', ok: true }], n: null })).toEqual({
      apiKey: '[redacted]', Authorization: '[redacted]', nested: { token: '[redacted]', keep: 1 }, list: [{ password: '[redacted]', ok: true }], n: null,
    });
    expect(redact('text')).toBe('text');
    expect(redact(null)).toBeNull();
  });
});

describe('isRetryableStatus', () => {
  it.each([[408, true], [429, true], [500, true], [503, true], [400, false], [401, false], [404, false], [200, false]])('%s is %s', (status, expected) => {
    expect(isRetryableStatus(status)).toBe(expected);
  });
});

describe('describeFetchError', () => {
  it('names an abort as a timeout', () => {
    expect(describeFetchError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe('no answer within 15s');
  });

  it('reports the cause code with its message, the code alone, or the message alone', () => {
    expect(describeFetchError(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND host' } }))).toBe('ENOTFOUND (getaddrinfo ENOTFOUND host)');
    expect(describeFetchError(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }))).toBe('ECONNREFUSED');
    expect(describeFetchError(Object.assign(new TypeError('fetch failed'), { cause: { message: 'socket hang up' } }))).toBe('socket hang up');
  });

  it('walks an aggregate cause chain, then falls back to the error message and finally to its text', () => {
    const aggregate = new TypeError('fetch failed');
    (aggregate as { cause?: unknown }).cause = Object.assign(new AggregateError([Object.assign(new Error('inner'), { code: 'ETIMEDOUT' })], ''), {});
    expect(describeFetchError(aggregate)).toEqual(expect.any(String));
    expect(describeFetchError(new Error('plain failure'))).toBe('plain failure');
    expect(describeFetchError('just text')).toBe('just text');
    expect(describeFetchError(undefined)).toBe('undefined');
  });
});

describe('postJson', () => {
  it('returns a good answer on the first attempt and logs the body with the key redacted', async () => {
    fetchMock.mockResolvedValue(answer(200, { success: 'true' }));
    const out = await run(postJson('https://x.test/api', { apiKey: 'secret', n: 1 }));
    expect(out.value).toEqual({ status: 200, ok: true, data: { success: 'true' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ apiKey: 'secret', n: 1 });
    expect(logs.server.debug).toHaveBeenCalledWith('aisensy', 'transport', expect.objectContaining({ body: { apiKey: '[redacted]', n: 1 } }));
  });

  it('does not retry a 4xx, which would repeat identically', async () => {
    fetchMock.mockResolvedValue(answer(400, { error: 'bad' }));
    const out = await run(postJson('https://x.test/api', {}));
    expect(out.value.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 5xx and returns the first good answer', async () => {
    fetchMock.mockResolvedValueOnce(answer(503)).mockResolvedValueOnce(answer(200, { success: true }));
    const out = await run(postJson('https://x.test/api', {}));
    expect(out.value.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hands back the last answer when every attempt was a retryable status', async () => {
    fetchMock.mockResolvedValue(answer(502));
    const out = await run(postJson('https://x.test/api', {}));
    expect(out.value.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('survives an answer that is not JSON, keeping its status', async () => {
    fetchMock.mockResolvedValue({ status: 502, ok: false, json: async () => Promise.reject(new Error('html')) });
    const out = await run(postJson('https://x.test/api', {}));
    expect(out.value).toEqual({ status: 502, ok: false, data: {} });
  });

  it('retries a thrown request and recovers', async () => {
    fetchMock.mockRejectedValueOnce(new Error('reset')).mockResolvedValueOnce(answer(200));
    const out = await run(postJson('https://x.test/api', {}));
    expect(out.value.status).toBe(200);
    expect(logs.server.warn).toHaveBeenCalledWith('aisensy', 'transport', expect.objectContaining({ attempt: 1 }));
  });

  it('says which failure and how many times when every attempt threw, keeping the cause', async () => {
    const boom = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    fetchMock.mockRejectedValue(boom);
    const out = await run(postJson('https://x.test/api', {}));
    expect(out.error.message).toBe(`${UNREACHABLE_PREFIX} after 3 attempt(s): ECONNREFUSED`);
    expect(out.error.cause).toBe(boom);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('abandons an attempt the vendor never answers', async () => {
    fetchMock.mockImplementation((_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
    );
    const out = await run(postJson('https://x.test/api', {}));
    expect(out.error.message).toContain('no answer within 15s');
  });
});

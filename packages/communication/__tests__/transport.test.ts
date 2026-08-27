import { describe, expect, it, vi } from 'vitest';
import {
  CommunicationProviderError,
  HttpTransport,
  describeFetchError,
  isRetryableStatus,
  redact,
} from '../src/index';
import type { CommunicationLogEvent } from '../src/types';

const respond = (status: number, body: unknown = {}) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as unknown as Response;

describe('redact', () => {
  it('hides secrets wherever they are nested', () => {
    expect(
      redact({
        apiKey: 'secret',
        nested: { token: 't', keep: 1 },
        list: [{ password: 'p' }],
      }),
    ).toEqual({
      apiKey: '[redacted]',
      nested: { token: '[redacted]', keep: 1 },
      list: [{ password: '[redacted]' }],
    });
  });

  it('leaves primitives and null alone', () => {
    expect(redact('plain')).toBe('plain');
    expect(redact(null)).toBeNull();
  });
});

describe('isRetryableStatus', () => {
  it('retries the ones worth retrying, and nothing else', () => {
    expect([408, 429, 500, 503].map(isRetryableStatus)).toEqual([true, true, true, true]);
    expect([200, 400, 401, 404].map(isRetryableStatus)).toEqual([false, false, false, false]);
  });
});

describe('HttpTransport', () => {
  it('returns the response without judging it — that is the provider’s job', async () => {
    const fetchImpl = vi.fn(async () => respond(400, { message: 'nope' }));
    const transport = new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 1 },
    });

    const res = await transport.request({ url: 'https://x', body: { a: 1 } });

    // A stub with no Headers instance still yields an object, never undefined —
    // a provider reading `headers['retry-after']` must not crash on a mock.
    expect(res).toEqual({ status: 400, ok: false, data: { message: 'nope' }, headers: {} });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a 503 and succeeds on the next attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(respond(503))
      .mockResolvedValueOnce(respond(200, { success: 'true' }));
    const transport = new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 3, backoffMs: 1, maxBackoffMs: 2 },
    });

    const res = await transport.request({ url: 'https://x' });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(res.data).toEqual({ success: 'true' });
  });

  it('does NOT retry a 400 — the same request fails the same way', async () => {
    const fetchImpl = vi.fn(async () => respond(400));
    await new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 3, backoffMs: 1, maxBackoffMs: 2 },
    }).request({ url: 'https://x' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a thrown error and gives up as a retryable provider failure', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('socket hang up');
    });
    const transport = new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 2, backoffMs: 1, maxBackoffMs: 2 },
    });

    try {
      await transport.request({ url: 'https://x' });
      expect.unreachable('should have thrown');
    } catch (error) {
      const failure = error as CommunicationProviderError;
      expect(failure).toBeInstanceOf(CommunicationProviderError);
      expect(failure.retryable).toBe(true);
      expect(failure.message).toMatch(/2 attempt\(s\)/);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('survives a body that is not JSON', async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          status: 502,
          ok: false,
          json: async () => {
            throw new Error('<html>');
          },
        }) as unknown as Response,
    );
    const res = await new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 1 },
    }).request({ url: 'https://x' });
    expect(res.data).toEqual({});
  });

  it('logs request and response, with the key redacted', async () => {
    const events: CommunicationLogEvent[] = [];
    const fetchImpl = vi.fn(async () => respond(200, {}));
    await new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: (event) => events.push(event),
      retry: { attempts: 1 },
    }).request({
      url: 'https://x',
      body: { apiKey: 'secret', campaignName: 'c' },
    });

    expect(events.map((e) => e.phase)).toEqual(['request', 'response']);
    expect(events[0].detail?.body).toEqual({
      apiKey: '[redacted]',
      campaignName: 'c',
    });
    expect(events[1].detail?.status).toBe(200);
    expect(typeof events[1].durationMs).toBe('number');
  });

  it('logs the retry and the final failure', async () => {
    const events: CommunicationLogEvent[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(respond(500))
      .mockResolvedValueOnce(respond(200, {}));
    await new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: (event) => events.push(event),
      retry: { attempts: 2, backoffMs: 1, maxBackoffMs: 2 },
    }).request({ url: 'https://x' });

    const retryLog = events.find((e) => e.phase === 'error');
    expect(retryLog?.detail?.willRetry).toBe(true);
    expect(retryLog?.attempt).toBe(1);
  });

  it('never lets a broken logger take the send down', async () => {
    const fetchImpl = vi.fn(async () => respond(200, { ok: 1 }));
    const res = await new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: () => {
        throw new Error('logging is down');
      },
      retry: { attempts: 1 },
    }).request({ url: 'https://x' });
    expect(res.data).toEqual({ ok: 1 });
  });

  it('aborts an attempt that never answers', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(
      new HttpTransport({
        provider: 'p',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 5,
        retry: { attempts: 1 },
      }).request({ url: 'https://x' }),
    ).rejects.toBeInstanceOf(CommunicationProviderError);
  });

  it('sends a GET with no body when asked', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => respond(200, {}));
    await new HttpTransport({
      provider: 'p',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 1 },
    }).request({ url: 'https://x', method: 'GET' });
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});

describe('describeFetchError', () => {
  it('names an abort after the per-attempt timeout', () => {
    expect(describeFetchError({ name: 'AbortError' }, 5000)).toBe('no answer within 5s');
  });

  it('surfaces the cause code fetch hides behind "fetch failed"', () => {
    const error = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    expect(describeFetchError(error, 5000)).toBe('ENOTFOUND');
  });

  it('falls back to the cause message when the cause has no code', () => {
    const error = Object.assign(new TypeError('fetch failed'), { cause: { message: 'socket hang up' } });
    expect(describeFetchError(error, 5000)).toBe('socket hang up');
  });

  it('uses the error message when there is no cause at all', () => {
    expect(describeFetchError(new Error('boom'), 5000)).toBe('boom');
  });

  it('stringifies a throw that is not an Error shape at all', () => {
    expect(describeFetchError(null, 5000)).toBe('null');
    expect(describeFetchError({ message: '' }, 5000)).toBe('[object Object]');
  });
});

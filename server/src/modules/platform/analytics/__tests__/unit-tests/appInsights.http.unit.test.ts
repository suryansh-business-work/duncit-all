jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { GraphQLError } from 'graphql';
import { outboundFetch } from '@utils/outboundFetch';
import {
  errorReason,
  MAX_ATTEMPTS,
  MAX_REPORT_BYTES,
  newCounter,
  retryDelayMs,
  storeBytes,
  storeFetch,
  StoreHttpError,
  storeJson,
} from '../../appInsights/appInsights.http';

const fetchMock = outboundFetch as jest.Mock;
const sleep = jest.fn(() => Promise.resolve());

const reply = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

const req = (over: Record<string, unknown> = {}) => ({
  service: 'App Store Connect',
  url: 'https://api.example.test/v1/x',
  counter: newCounter(),
  sleep,
  ...over,
});

beforeEach(() => {
  fetchMock.mockReset();
  sleep.mockClear();
});

describe('retryDelayMs', () => {
  it('waits what the store asked for (Retry-After seconds), capped at 30 s', () => {
    expect(retryDelayMs(1, '3')).toBe(3000);
    expect(retryDelayMs(1, '600')).toBe(30_000);
  });

  it('doubles from one second when the store said nothing usable', () => {
    expect(retryDelayMs(1, null)).toBe(1000);
    expect(retryDelayMs(2, null)).toBe(2000);
    expect(retryDelayMs(3, 'Wed, 21 Oct 2026 07:28:00 GMT')).toBe(4000);
  });
});

describe('errorReason', () => {
  it("reads Apple's errors[0], Google's error.message, error_description, or error", () => {
    expect(errorReason({ errors: [{ detail: 'Key revoked', title: 'Forbidden' }] })).toBe('Key revoked');
    expect(errorReason({ errors: [{ title: 'Forbidden' }] })).toBe('Forbidden');
    expect(errorReason({ error: { message: 'Bucket not found' } })).toBe('Bucket not found');
    expect(errorReason({ error: 'invalid_grant', error_description: 'Bad JWT' })).toBe('Bad JWT');
    expect(errorReason({ error: 'invalid_grant' })).toBe('invalid_grant');
    expect(errorReason(null)).toBe('');
    expect(errorReason({ errors: [{ detail: '   ' }] })).toBe('');
  });
});

describe('storeFetch', () => {
  it('returns the first good answer and counts the call', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { ok: true }));
    const r = req();
    await expect(storeJson(r)).resolves.toEqual({ ok: true });
    expect(r.counter).toEqual({ calls: 1, retries: 0 });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a 429 after the time Retry-After names, then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(reply(429, {}, { 'retry-after': '2' })).mockResolvedValueOnce(reply(200, { n: 1 }));
    const r = req();
    await expect(storeJson(r)).resolves.toEqual({ n: 1 });
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(r.counter).toEqual({ calls: 2, retries: 1 });
  });

  it('gives up on a store that stays broken, with its words and the status', async () => {
    fetchMock.mockResolvedValue(reply(503, { errors: [{ detail: 'Service unavailable' }] }));
    const r = req();
    const failure = storeFetch(r);
    await expect(failure).rejects.toBeInstanceOf(StoreHttpError);
    await expect(failure).rejects.toMatchObject({
      status: 503,
      message: 'App Store Connect refused the request (HTTP 503): Service unavailable',
    });
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(r.counter.retries).toBe(MAX_ATTEMPTS - 1);
  });

  it('never retries a refusal that would be refused again (403, 404)', async () => {
    fetchMock.mockResolvedValue(reply(403, { error: { message: 'Forbidden' } }));
    await expect(storeFetch(req())).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the status text when the body says nothing', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 404, statusText: 'Not Found' }));
    await expect(storeFetch(req())).rejects.toThrow('(HTTP 404): Not Found');
  });

  it('retries a read whose connection dropped, but not a write', async () => {
    const dropped = new GraphQLError('App Store Connect closed the connection early.', { extensions: { code: 'BAD_GATEWAY' } });
    fetchMock.mockRejectedValueOnce(dropped).mockResolvedValueOnce(reply(200, {}));
    await expect(storeFetch(req())).resolves.toBeInstanceOf(Response);

    fetchMock.mockReset();
    fetchMock.mockRejectedValueOnce(dropped);
    await expect(storeFetch(req({ write: true }))).rejects.toBe(dropped);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry an error that is not a dropped connection', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    await expect(storeFetch(req())).rejects.toThrow('boom');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a write only on 429 — a 5xx may already have done it', async () => {
    fetchMock.mockResolvedValueOnce(reply(500));
    await expect(storeFetch(req({ write: true }))).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(reply(429)).mockResolvedValueOnce(reply(201, { id: 'r1' }));
    await expect(storeJson(req({ write: true }))).resolves.toEqual({ id: 'r1' });
  });
});

describe('storeBytes', () => {
  it('returns the body as bytes', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, 'Date\tCounts'));
    expect(Buffer.from(await storeBytes(req())).toString()).toBe('Date\tCounts');
  });

  it('refuses a report that declares itself larger than the limit, before reading it', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, 'x', { 'content-length': String(MAX_REPORT_BYTES + 1) }));
    await expect(storeBytes(req())).rejects.toThrow('too large');
  });
});

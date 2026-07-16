import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchBranding,
  fetchHealth,
  fetchHistory,
  fetchIncidents,
  fetchProbe,
  fetchServices,
  fetchSummary,
} from './api';
import { SERVER_BASE } from './config/server';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('status endpoint fetchers', () => {
  it('requests the service catalog with no-store', async () => {
    const payload = { generated_at: 't', environment: 'production', groups: [] };
    fetchMock.mockResolvedValue(jsonResponse(payload));
    const signal = new AbortController().signal;

    await expect(fetchServices(signal)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(`${SERVER_BASE}/status/services`, {
      cache: 'no-store',
      signal,
    });
  });

  it('requests the live summary', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await expect(fetchSummary()).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith(`${SERVER_BASE}/status/summary`, {
      cache: 'no-store',
      signal: undefined,
    });
  });

  it('requests the incidents feed', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ incidents: [] }));
    await expect(fetchIncidents()).resolves.toEqual({ incidents: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER_BASE}/status/incidents`,
      expect.anything(),
    );
  });

  it('encodes the service key and hours in the history query', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ service: 'api', points: [], daily: [] }));
    await fetchHistory('api server', 24);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`${SERVER_BASE}/status/history?`);
    expect(url).toContain('service=api+server');
    expect(url).toContain('hours=24');
  });

  it('url-encodes the probe target', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ url: 'x', ok: true }));
    await fetchProbe('https://a.test/path?q=1');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(
      `${SERVER_BASE}/status/probe?url=${encodeURIComponent('https://a.test/path?q=1')}`,
    );
  });

  it('fetches an arbitrary health url directly', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
    await expect(fetchHealth('https://server.test/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith('https://server.test/health', expect.anything());
  });

  it('throws with the status code when a request is not ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, false, 503));
    await expect(fetchServices()).rejects.toThrow('Request failed (503)');
  });
});

describe('fetchBranding', () => {
  it('posts the branding query and returns the branding node', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { branding: { app_name: 'Acme' } } }),
    );
    await expect(fetchBranding()).resolves.toEqual({ app_name: 'Acme' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${SERVER_BASE}/graphql`);
    expect(init.method).toBe('POST');
    expect(init.body).toContain('branding');
  });

  it('returns null when the graphql request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, false, 500));
    await expect(fetchBranding()).resolves.toBeNull();
  });

  it('returns null when the payload has no branding node', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await expect(fetchBranding()).resolves.toBeNull();
  });
});

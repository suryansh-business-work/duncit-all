import { afterEach, describe, expect, it, vi } from 'vitest';
import { envEntryService } from '../../services/envEntry.service';
import { activeMaps, probeMaps } from '../../services/maps.service';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test' } };
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('probeMaps', () => {
  it('needs a key before calling Google', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(probeMaps('')).resolves.toEqual({ ok: false, message: 'The browser API key is required' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Places autocomplete with the key and the site's own referrer, as a browser would", async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ suggestions: [] }));
    await expect(probeMaps('AIza-browser')).resolves.toEqual({ ok: true, message: 'Google accepted this key for place search' });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('https://places.googleapis.com/v1/places:autocomplete');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'X-Goog-Api-Key': 'AIza-browser', Referer: 'https://lite.duncit.test/' });
    expect(JSON.parse(String(init?.body))).toEqual({ input: 'New Delhi' });
  });

  it("reports Google's own reason for a refused key", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: { message: 'API key not valid. Please pass a valid API key.' } }, 400));
    await expect(probeMaps('AIza-wrong')).resolves.toEqual({ ok: false, message: 'Google refused the key: API key not valid. Please pass a valid API key.' });
  });

  it('falls back to the HTTP status when the refusal has no JSON reason', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Forbidden', { status: 403 }));
    await expect(probeMaps('AIza-wrong')).resolves.toEqual({ ok: false, message: 'Google refused the key: HTTP 403' });
  });

  it('reports a network failure instead of throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('getaddrinfo ENOTFOUND places.googleapis.com')).mockRejectedValueOnce('timeout');
    await expect(probeMaps('AIza')).resolves.toEqual({ ok: false, message: 'Google could not be reached: getaddrinfo ENOTFOUND places.googleapis.com' });
    await expect(probeMaps('AIza')).resolves.toEqual({ ok: false, message: 'Google could not be reached: timeout' });
  });
});

describe('activeMaps', () => {
  it('answers the key and map id of the active entry', async () => {
    const active = vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue({ api_key: ' AIza-browser ', map_id: 'dark-map' });
    await expect(activeMaps()).resolves.toEqual({ api_key: 'AIza-browser', map_id: 'dark-map' });
    expect(active).toHaveBeenCalledWith('GOOGLE_MAPS');
  });

  it('answers null when there is no entry or no key, so place search stays off', async () => {
    vi.spyOn(envEntryService, 'activeConfig').mockResolvedValueOnce(null).mockResolvedValueOnce({ map_id: 'dark-map' });
    await expect(activeMaps()).resolves.toBeNull();
    await expect(activeMaps()).resolves.toBeNull();
  });
});

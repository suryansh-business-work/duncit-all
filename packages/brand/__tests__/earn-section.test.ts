import { afterEach, describe, expect, it, vi } from 'vitest';
import { EARN_SECTION_DEFAULTS, fetchEarnSection, pick, safeHttpsUrl, tilePhotos } from '../src/earn-section';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const respond = (status: number, body: unknown) =>
  vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));

describe('safeHttpsUrl', () => {
  it('keeps an https link and drops anything else', () => {
    expect(safeHttpsUrl('https://earnwith.duncit.com/start')).toBe('https://earnwith.duncit.com/start');
    expect(safeHttpsUrl('http://earnwith.duncit.com')).toBe('');
    expect(safeHttpsUrl('javascript:alert(1)')).toBe('');
    expect(safeHttpsUrl('not a url')).toBe('');
    expect(safeHttpsUrl('')).toBe('');
  });
});

describe('pick', () => {
  it('uses the portal value, and keeps the page words when it is blank', () => {
    expect(pick('Earn more', 'Earn with Duncit')).toBe('Earn more');
    expect(pick('   ', 'Earn with Duncit')).toBe('Earn with Duncit');
    expect(pick('', 'Earn with Duncit')).toBe('Earn with Duncit');
  });
});

describe('tilePhotos', () => {
  it('fills every tile in order, repeating the valid images', () => {
    expect(tilePhotos(['https://i/1.jpg', 'http://i/bad.jpg', 'https://i/2.jpg'], 5)).toEqual([
      'https://i/1.jpg',
      'https://i/2.jpg',
      'https://i/1.jpg',
      'https://i/2.jpg',
      'https://i/1.jpg',
    ]);
  });

  it('answers nothing when there are no valid images or no tiles, so the bundled wall stays', () => {
    expect(tilePhotos([], 4)).toEqual([]);
    expect(tilePhotos(['http://i/bad.jpg'], 4)).toEqual([]);
    expect(tilePhotos(['https://i/1.jpg'], 0)).toEqual([]);
  });
});

describe('fetchEarnSection', () => {
  it('asks for the one site and lays its saved fields over the defaults', async () => {
    const fetchMock = respond(200, {
      data: { publicWebsiteEarnSection: { enabled: false, heading: 'Host and earn', images: ['https://i/1.jpg'] } },
    });
    vi.stubGlobal('fetch', fetchMock);
    const section = await fetchEarnSection('https://api.test/graphql', 'PARTNERS');
    expect(section).toEqual({ ...EARN_SECTION_DEFAULTS, enabled: false, heading: 'Host and earn', images: ['https://i/1.jpg'] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/graphql');
    expect(JSON.parse(String(init.body)).variables).toEqual({ site: 'PARTNERS' });
  });

  it('falls back to the defaults, and says so, on GraphQL errors, a bad status or an empty answer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', respond(200, { errors: [{ message: 'boom' }] }));
    expect(await fetchEarnSection('https://api.test/graphql', 'MAIN')).toBe(EARN_SECTION_DEFAULTS);
    vi.stubGlobal('fetch', respond(500, { data: { publicWebsiteEarnSection: { enabled: false } } }));
    expect(await fetchEarnSection('https://api.test/graphql', 'MAIN')).toBe(EARN_SECTION_DEFAULTS);
    vi.stubGlobal('fetch', respond(200, { data: {} }));
    expect(await fetchEarnSection('https://api.test/graphql', 'ADS')).toBe(EARN_SECTION_DEFAULTS);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('falls back to the defaults, and says so, when the request itself fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    expect(await fetchEarnSection('https://api.test/graphql', 'MAIN')).toBe(EARN_SECTION_DEFAULTS);
    expect(warn).toHaveBeenCalledWith('[earn-section] settings could not be loaded', expect.any(Error));
  });
});

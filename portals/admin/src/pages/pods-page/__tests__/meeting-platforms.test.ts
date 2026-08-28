import { afterEach, describe, expect, it, vi } from 'vitest';
import { urlConfigs } from '../../../config/url-configs';
import { generateMeetingLink, MEETING_PLATFORMS } from '../meeting-platforms';

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

/** A typed `fetch` stand-in so `mock.calls[n]` keeps its (url, init) shape. */
const mockFetch = (impl: () => unknown) =>
  vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => impl());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MEETING_PLATFORMS', () => {
  it('offers Google Meet, Zoom, Teams and a manual fallback', () => {
    expect(MEETING_PLATFORMS).toEqual([
      { value: 'GOOGLE_MEET', label: 'Google Meet' },
      { value: 'ZOOM', label: 'Zoom' },
      { value: 'TEAMS', label: 'Microsoft Teams' },
      { value: 'OTHER', label: 'Other (paste link manually)' },
    ]);
  });
});

describe('generateMeetingLink', () => {
  const input = { platform: 'ZOOM', title: 'Sunday Hike', startISO: '2026-09-02T10:00:00.000Z' };

  it('posts to the configured GraphQL endpoint with the mutation variables', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ data: { generateMeetingLink: { ok: true, url: 'https://zoom.us/j/1' } } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const url = await generateMeetingLink(input);

    expect(url).toBe('https://zoom.us/j/1');
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(urlConfigs.graphqlUrl);
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.variables).toEqual({
      platform: 'ZOOM',
      title: 'Sunday Hike',
      start: '2026-09-02T10:00:00.000Z',
      end: null,
    });
  });

  it('sends the end date when the caller provides one', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ data: { generateMeetingLink: { ok: true, url: 'https://zoom.us/j/1' } } })
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateMeetingLink({ ...input, endISO: '2026-09-02T12:00:00.000Z' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.variables.end).toBe('2026-09-02T12:00:00.000Z');
  });

  it('uses a window-level __GRAPHQL_URL__ override when set', async () => {
    (globalThis as any).__GRAPHQL_URL__ = 'https://override.test/graphql';
    const fetchMock = mockFetch(() =>
      jsonResponse({ data: { generateMeetingLink: { ok: true, url: 'https://zoom.us/j/1' } } })
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateMeetingLink(input);

    expect(fetchMock.mock.calls[0][0]).toBe('https://override.test/graphql');
    delete (globalThis as any).__GRAPHQL_URL__;
  });

  it('falls back to the configured endpoint when window is not defined', async () => {
    vi.stubGlobal('window', undefined);
    const fetchMock = mockFetch(() =>
      jsonResponse({ data: { generateMeetingLink: { ok: true, url: 'https://zoom.us/j/1' } } })
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateMeetingLink(input);

    expect(fetchMock.mock.calls[0][0]).toBe(urlConfigs.graphqlUrl);
  });

  it('throws an HTTP-status error when the response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch(() => jsonResponse({}, false, 503)));

    await expect(generateMeetingLink(input)).rejects.toThrow('Meeting link generator returned HTTP 503');
  });

  it('throws the first GraphQL error message', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() => jsonResponse({ errors: [{ message: 'platform not supported' }] }))
    );

    await expect(generateMeetingLink(input)).rejects.toThrow('platform not supported');
  });

  it('throws the requires_oauth hint naming the platform when the server is not connected', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() =>
        jsonResponse({ data: { generateMeetingLink: { ok: false, requires_oauth: true } } })
      )
    );

    await expect(generateMeetingLink(input)).rejects.toThrow(
      'ZOOM is not connected on the server yet. Paste a link manually for now.'
    );
  });

  it('throws the server message when the mutation failed without requiring OAuth', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() =>
        jsonResponse({
          data: { generateMeetingLink: { ok: false, requires_oauth: false, message: 'Calendar is full' } },
        })
      )
    );

    await expect(generateMeetingLink(input)).rejects.toThrow('Calendar is full');
  });

  it('throws a generic message when the mutation returned nothing usable', async () => {
    vi.stubGlobal('fetch', mockFetch(() => jsonResponse({ data: {} })));

    await expect(generateMeetingLink(input)).rejects.toThrow('Could not generate meeting link');
  });

  it('throws when ok is true but the url is missing', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() => jsonResponse({ data: { generateMeetingLink: { ok: true, url: '' } } }))
    );

    await expect(generateMeetingLink(input)).rejects.toThrow('Could not generate meeting link');
  });
});

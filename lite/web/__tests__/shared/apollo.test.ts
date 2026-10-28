import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_HEADER, SURFACE_HEADER } from '@duncit/user-core';
import { createLiteClient } from '../../../shared/apollo';
import { LITE_SETTINGS } from '../../../shared/graphql/documents';
import { settingsFixture } from '../test-utils';

const TOKEN_KEY = 'lite_token';
const fetchMock = vi.fn<typeof fetch>();

const answer = () =>
  new Response(JSON.stringify({ data: { liteSettings: settingsFixture({ site_name: 'Lite Events' }) } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** The URL and headers of the n-th request the client sent. */
const request = (n = 0) => {
  const [input, init] = fetchMock.mock.calls[n] ?? [];
  return { url: String(input), headers: new Headers(init?.headers) };
};

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => answer());
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('createLiteClient in the browser', () => {
  it('sends the stored token and the app identity with every request', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-1');
    const client = createLiteClient(TOKEN_KEY, 'WEBSITE');

    const { data } = await client.query({ query: LITE_SETTINGS });

    expect(data).toMatchObject({ liteSettings: { site_name: 'Lite Events' } });
    const { headers } = request();
    expect(headers.get('authorization')).toBe('Bearer tok-1');
    expect(headers.get(SURFACE_HEADER)).toBe('WEBSITE');
    expect(headers.get(APP_HEADER)).toBe('lite');
  });

  it('reads the token afresh on each request, so signing in or out takes effect at once', async () => {
    const client = createLiteClient(TOKEN_KEY, 'PORTAL');

    await client.query({ query: LITE_SETTINGS, fetchPolicy: 'network-only' });
    localStorage.setItem(TOKEN_KEY, 'tok-2');
    await client.query({ query: LITE_SETTINGS, fetchPolicy: 'network-only' });

    expect(request(0).headers.get('authorization')).toBeNull();
    expect(request(0).headers.get(SURFACE_HEADER)).toBe('PORTAL');
    expect(request(1).headers.get('authorization')).toBe('Bearer tok-2');
  });

  it('starts from the cache the server rendered, without asking the API again', async () => {
    const server = createLiteClient(TOKEN_KEY, 'WEBSITE', { ssr: { uri: 'https://lite.internal/graphql', token: null } });
    await server.query({ query: LITE_SETTINGS });
    fetchMock.mockClear();

    const browser = createLiteClient(TOKEN_KEY, 'WEBSITE', { initialState: server.extract() });
    const { data } = await browser.query({ query: LITE_SETTINGS });

    expect(data).toMatchObject({ liteSettings: { site_name: 'Lite Events' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keys events, registrations, calendars and users by id, and keeps stats and discover pages inside their parent', () => {
    const { cache } = createLiteClient(TOKEN_KEY, 'WEBSITE');
    expect(cache.identify({ __typename: 'LiteEvent', id: 'ev-1' })).toBe('LiteEvent:{"id":"ev-1"}');
    expect(cache.identify({ __typename: 'LiteRegistration', id: 'reg-1' })).toBe('LiteRegistration:{"id":"reg-1"}');
    expect(cache.identify({ __typename: 'LiteCalendar', id: 'cal-1' })).toBe('LiteCalendar:{"id":"cal-1"}');
    expect(cache.identify({ __typename: 'LiteUser', id: 'u-1' })).toBe('LiteUser:{"id":"u-1"}');
    expect(cache.identify({ __typename: 'LiteEventStats', going: 3 })).toBeUndefined();
    expect(cache.identify({ __typename: 'LiteDiscover' })).toBeUndefined();
  });
});

describe('createLiteClient in the server render', () => {
  it("queries the absolute URL it is given, as the reader whose cookie carried the token", async () => {
    localStorage.setItem(TOKEN_KEY, 'stored-in-the-browser');
    const client = createLiteClient(TOKEN_KEY, 'WEBSITE', { ssr: { uri: 'https://lite.internal/graphql', token: 'cookie-token' } });

    await client.query({ query: LITE_SETTINGS });

    const { url, headers } = request();
    expect(url).toBe('https://lite.internal/graphql');
    expect(headers.get('authorization')).toBe('Bearer cookie-token');
  });

  it('renders anonymously when there is no cookie token', async () => {
    const client = createLiteClient(TOKEN_KEY, 'WEBSITE', { ssr: { uri: 'https://lite.internal/graphql', token: null } });
    await client.query({ query: LITE_SETTINGS });
    expect(request().headers.get('authorization')).toBeNull();
  });
});

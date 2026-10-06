import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CmsUnavailableError, errorPage, graphqlUrl, publicGraphqlUrl, renderPage, renderPreview, requestHost, sitemapUrls } from './cms-api';

const fetchMock = vi.fn<typeof fetch>();

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('GRAPHQL_URL', 'http://api.internal/graphql');
  vi.stubEnv('PUBLIC_GRAPHQL_URL', '');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const sentBody = () => JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { query: string; variables: Record<string, unknown> };

describe('API addresses', () => {
  it('prefers the internal address on the server and the public one in the browser', () => {
    vi.stubEnv('PUBLIC_GRAPHQL_URL', 'https://api.duncit.com/graphql');
    expect(graphqlUrl()).toBe('http://api.internal/graphql');
    expect(publicGraphqlUrl()).toBe('https://api.duncit.com/graphql');
  });

  it('falls back to whichever address is configured', () => {
    vi.stubEnv('GRAPHQL_URL', '');
    vi.stubEnv('PUBLIC_GRAPHQL_URL', 'https://api.duncit.com/graphql');
    expect(graphqlUrl()).toBe('https://api.duncit.com/graphql');
    vi.stubEnv('PUBLIC_GRAPHQL_URL', '');
    vi.stubEnv('GRAPHQL_URL', 'http://api.internal/graphql');
    expect(publicGraphqlUrl()).toBe('http://api.internal/graphql');
    vi.stubEnv('GRAPHQL_URL', '');
    expect(graphqlUrl()).toBe('');
  });
});

describe('queries', () => {
  it('renders a page by host, path and page, asking for the share-card SEO', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: { cmsRender: { status: 200, title: 'Home' } } }));
    await expect(renderPage('duncit.com', '/', 2)).resolves.toEqual({ status: 200, title: 'Home' });
    const body = sentBody();
    expect(body.variables).toEqual({ host: 'duncit.com', path: '/', page: 2 });
    expect(body.query).toContain('cmsRender(host: $host, path: $path, page: $page)');
    expect(body.query).toContain('og_title og_description twitter_card keywords json_ld meta_tags { name content }');
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.internal/graphql');
  });

  it('returns a preview, or null for a forged or expired link', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: { cmsRenderPreview: { status: 200 } } }));
    await expect(renderPreview('tok')).resolves.toEqual({ status: 200 });
    expect(sentBody().variables).toEqual({ token: 'tok' });
    fetchMock.mockResolvedValueOnce(reply({ data: { cmsRenderPreview: null } }));
    await expect(renderPreview('bad')).resolves.toBeNull();
  });

  it('returns a designed error page and the sitemap', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: { cmsErrorPage: { status: 503 } } }));
    await expect(errorPage('duncit.com', 503)).resolves.toEqual({ status: 503 });
    fetchMock.mockResolvedValueOnce(reply({ data: { cmsSitemap: [{ path: '/', updated_at: '2026-10-01' }] } }));
    await expect(sitemapUrls('duncit.com')).resolves.toEqual([{ path: '/', updated_at: '2026-10-01' }]);
  });
});

describe('failures', () => {
  it('refuses to query without an API address', async () => {
    vi.stubEnv('GRAPHQL_URL', '');
    await expect(renderPage('duncit.com', '/', 1)).rejects.toThrow(new CmsUnavailableError('GRAPHQL_URL is not configured'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an unreachable API', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(renderPage('duncit.com', '/', 1)).rejects.toThrow('CMS API unreachable: ECONNREFUSED');
  });

  it('reports the GraphQL errors, or the HTTP status when there are none', async () => {
    fetchMock.mockResolvedValueOnce(reply({ errors: [{ message: 'a' }, { message: 'b' }] }));
    await expect(renderPage('duncit.com', '/', 1)).rejects.toThrow('CMS API error: a; b');
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 502 }));
    await expect(renderPage('duncit.com', '/', 1)).rejects.toThrow('CMS API error: HTTP 502');
    fetchMock.mockResolvedValueOnce(reply({ data: { cmsRender: {} } }, 500));
    await expect(renderPage('duncit.com', '/', 1)).rejects.toBeInstanceOf(CmsUnavailableError);
  });
});

describe('requestHost', () => {
  it('reads the first forwarded host, then the Host header, then the URL', () => {
    expect(requestHost(new Request('http://internal:2043/x', { headers: { 'x-forwarded-host': ' duncit.com , proxy' } }))).toBe('duncit.com');
    expect(requestHost(new Request('http://internal:2043/x', { headers: { host: 'ads.duncit.com' } }))).toBe('ads.duncit.com');
    expect(requestHost(new Request('http://internal:2043/x'))).toBe('internal:2043');
  });
});

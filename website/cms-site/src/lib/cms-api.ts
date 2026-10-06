import type { CmsRenderResult, CmsSitemapUrl } from '@duncit/gql-types';

/**
 * The renderer's only data source: the CMS GraphQL API, asked on the server
 * for every request. The API's Redis response cache makes the repeat reads
 * cheap; this side only bounds how long a page may wait for an answer.
 */

/** Server-side address of the API (inside the deploy network it is internal). */
export const graphqlUrl = (): string => process.env.GRAPHQL_URL || import.meta.env.PUBLIC_GRAPHQL_URL || '';

/** The address a visitor's browser calls — forms, newsletter, widgets. */
export const publicGraphqlUrl = (): string => import.meta.env.PUBLIC_GRAPHQL_URL || process.env.PUBLIC_GRAPHQL_URL || graphqlUrl();

const TIMEOUT_MS = 8000;

export class CmsUnavailableError extends Error {}

async function query<T>(source: string, variables: Record<string, unknown>): Promise<T> {
  const url = graphqlUrl();
  if (!url) throw new CmsUnavailableError('GRAPHQL_URL is not configured');
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-name': 'cms-site' },
      body: JSON.stringify({ query: source, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new CmsUnavailableError(`CMS API unreachable: ${(error as Error).message}`);
  }
  const payload = (await response.json().catch(() => null)) as { data?: T; errors?: { message: string }[] } | null;
  if (!response.ok || !payload?.data) {
    const reason = payload?.errors?.map((e) => e.message).join('; ') || `HTTP ${response.status}`;
    throw new CmsUnavailableError(`CMS API error: ${reason}`);
  }
  return payload.data;
}

/** Everything a page needs, shared by the live render and a preview link. */
const RESULT_FIELDS = `
  status
  title
  html
  css
  head_html
  custom_js
  seo { title description og_image_url canonical_url noindex og_title og_description twitter_card keywords json_ld meta_tags { name content } }
  pagination { page total_pages base_path }
  site {
    key
    name
    legacy_site
    head_html
    body_end_html
    custom_css
    custom_js
    favicon_url
    design {
      tokens { name value group }
      fonts { family source weights italic role variable fallback files { weight style url } }
      font_urls
      base_css
    }
  }
`;

const RENDER = /* GraphQL */ `
  query CmsRender($host: String!, $path: String!, $page: Int) {
    cmsRender(host: $host, path: $path, page: $page) { ${RESULT_FIELDS} }
  }
`;

const ERROR_PAGE = /* GraphQL */ `
  query CmsErrorPage($host: String!, $code: Int!) {
    cmsErrorPage(host: $host, code: $code) { ${RESULT_FIELDS} }
  }
`;

/** Never cached server-side: the signed token is the permission, and it expires. */
const RENDER_PREVIEW = /* GraphQL */ `
  query CmsRenderPreview($token: String!) {
    cmsRenderPreview(token: $token) { ${RESULT_FIELDS} }
  }
`;

const SITEMAP = /* GraphQL */ `
  query CmsSitemap($host: String!) {
    cmsSitemap(host: $host) { path updated_at }
  }
`;

export async function renderPage(host: string, path: string, page: number): Promise<CmsRenderResult> {
  const data = await query<{ cmsRender: CmsRenderResult }>(RENDER, { host, path, page });
  return data.cmsRender;
}

/** A preview link's page (a draft or one saved version), or null when the link is forged or expired. */
export async function renderPreview(token: string): Promise<CmsRenderResult | null> {
  const data = await query<{ cmsRenderPreview: CmsRenderResult | null }>(RENDER_PREVIEW, { token });
  return data.cmsRenderPreview;
}

/** A site's designed error page (404, 500, 503), or null when it has none. */
export async function errorPage(host: string, code: number): Promise<CmsRenderResult | null> {
  const data = await query<{ cmsErrorPage: CmsRenderResult | null }>(ERROR_PAGE, { host, code });
  return data.cmsErrorPage;
}

export async function sitemapUrls(host: string): Promise<CmsSitemapUrl[]> {
  const data = await query<{ cmsSitemap: CmsSitemapUrl[] }>(SITEMAP, { host });
  return data.cmsSitemap;
}

/** The hostname the visitor asked for, as the proxy in front of us saw it. */
export function requestHost(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  return forwarded || request.headers.get('host') || new URL(request.url).host;
}

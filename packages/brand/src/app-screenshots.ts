/**
 * The app's real phone screenshots for the websites' app phone.
 *
 * They are the raw app screens kept in Tech > Store Listing > Websites (never the
 * store graphics, which already draw a phone of their own),
 * read through the public `appScreenshots` query. Its own query on purpose: a
 * site built against an API without the field loses only the slider, never the
 * branding beside it. Every failure answers an empty list, and the phone falls
 * back to its drawn screen.
 */

export const APP_SCREENSHOTS_QUERY = 'query WebsiteAppScreenshots { appScreenshots }';

/** How long one answer is reused — a static build asks once, the SSR site rarely. */
export const SCREENSHOTS_TTL_MS = 10 * 60 * 1000;

const TIMEOUT_MS = 8000;

/** The most slides the phone shows — the stores' own cap is eight. */
export const MAX_SCREENSHOTS = 8;

type FetchLike = (input: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>;

const cache = new Map<string, { at: number; urls: Promise<string[]> }>();

/** Only https image addresses, de-duplicated and capped. */
export function cleanScreenshots(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls = value.filter((url): url is string => typeof url === 'string' && url.startsWith('https://'));
  return [...new Set(urls)].slice(0, MAX_SCREENSHOTS);
}

async function request(graphqlUrl: string, fetchImpl: FetchLike): Promise<string[]> {
  try {
    const response = await fetchImpl(graphqlUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: APP_SCREENSHOTS_QUERY }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: { appScreenshots?: unknown } } | null;
    return cleanScreenshots(payload?.data?.appScreenshots);
  } catch (error) {
    // An unreachable API must never break a build or a page: the drawn phone
    // renders, and the build log says why.
    console.warn(`[app-screenshots] falling back to the drawn phone: ${(error as Error).message}`);
    return [];
  }
}

/** The screenshots, fetched at most once per {@link SCREENSHOTS_TTL_MS} per API. */
export function fetchAppScreenshots(
  graphqlUrl: string | null | undefined,
  fetchImpl: FetchLike = fetch,
  now: number = Date.now(),
): Promise<string[]> {
  if (!graphqlUrl) return Promise.resolve([]);
  const hit = cache.get(graphqlUrl);
  if (hit && now - hit.at < SCREENSHOTS_TTL_MS) return hit.urls;
  const urls = request(graphqlUrl, fetchImpl);
  cache.set(graphqlUrl, { at: now, urls });
  return urls;
}

/** Forget every cached answer (tests). */
export function resetAppScreenshotsCache(): void {
  cache.clear();
}

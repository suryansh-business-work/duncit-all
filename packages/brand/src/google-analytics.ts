/**
 * Google Analytics (gtag.js) for every Duncit website, set from Tech → Google
 * Analytics.
 *
 * Which GA4 tag a website loads — and whether it loads one at all — is chosen
 * per website in the Tech portal, and the page asks the API for it as it
 * opens. A change there reaches the website within the API's cache TTL, with
 * no rebuild. Staging and local stacks read their own databases, so neither
 * reports into the production property unless someone sets it up to.
 *
 * Framework-free on purpose: the Astro sites call it from GoogleAnalytics.astro,
 * the React sites (status, the pet store) from their entry module.
 */

/** Every Duncit website that can load a tag — the server's `TrackedWebsite` enum. */
export type TrackedWebsite = 'MAIN' | 'PARTNERS' | 'ADS' | 'EARNWITH' | 'STATUS' | 'ECOMM';

const TAG_QUERY = 'query GoogleAnalyticsTag($site: TrackedWebsite!) { googleAnalyticsTag(site: $site) }';

interface TagResponse {
  data?: { googleAnalyticsTag: string | null };
  errors?: unknown[];
}

/** The id this website loads, or null when it has none or it is switched off. */
async function fetchMeasurementId(graphqlUrl: string, site: TrackedWebsite): Promise<string | null> {
  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: TAG_QUERY, variables: { site } }),
  });
  if (!res.ok) throw new Error(`googleAnalyticsTag answered HTTP ${res.status}`);
  const body = (await res.json()) as TagResponse;
  if (body.errors?.length) throw new Error(`googleAnalyticsTag failed: ${JSON.stringify(body.errors)}`);
  return body.data?.googleAnalyticsTag ?? null;
}

/**
 * Loads gtag.js and runs Google's bootstrap exactly as Google ships it. The
 * bootstrap goes in as script text because gtag.js only reads a dataLayer
 * entry that is an `arguments` object — a rest-parameter array is ignored.
 * The id is JSON-encoded into it, and the server only stores ids of the shape
 * G-XXXXXXXXXX anyway.
 */
function installGtag(measurementId: string): void {
  const loader = document.createElement('script');
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  const bootstrap = document.createElement('script');
  bootstrap.textContent = [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('js', new Date());",
    `gtag('config', ${JSON.stringify(measurementId)});`,
  ].join('\n');
  document.head.append(loader, bootstrap);
}

/**
 * Asks which tag this website loads and installs it. Fire-and-forget: a page
 * never waits on analytics, and a failure is logged rather than shown.
 */
export function loadGoogleAnalytics(graphqlUrl: string, site: TrackedWebsite): void {
  fetchMeasurementId(graphqlUrl, site)
    .then((measurementId) => {
      if (measurementId) installGtag(measurementId);
    })
    .catch((error: unknown) => {
      console.warn('Google Analytics did not load', error);
    });
}

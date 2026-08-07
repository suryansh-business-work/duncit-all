import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';

/**
 * What a link in a chat message turns into on screen.
 *
 * Two different jobs wear one name here. An OUTSIDE link gets a preview card
 * built from its Open Graph tags, fetched by us because a browser cannot read
 * another origin's HTML. An INSIDE link — one of our own consoles — gets
 * something more useful: which portal it points at, and whether the person
 * being shown it can actually open it. Sending a colleague a Finance URL they
 * will bounce off is the most common way this feature wastes somebody's time.
 */

export interface StaffLinkPreview {
  url: string;
  internal: boolean;
  portal: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  has_access: boolean;
  access_note: string | null;
}

/**
 * Which role opens which console.
 *
 * Mirrors the `requiredRoles` each portal passes to `mountPortal`. It is a copy,
 * and the portal itself is still the thing that decides — this only tells the
 * sender whether the person will get in, so being wrong here costs a misleading
 * badge and never access.
 */
const PORTAL_ROLES: Record<string, string[]> = {
  admin: ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'],
  tech: ['TECH_MANAGER'],
  products: ['PRODUCTS_MANAGER'],
  marketing: ['MARKETING_MANAGER'],
  crm: ['CRM_MANAGER'],
  challenges: ['CHALLENGE_MANAGER'],
  ai: ['AI_MANAGER'],
  website: ['WEBSITE_MANAGER'],
  hr: ['HR_MANAGER'],
  finance: ['FINANCE_MANAGER'],
  developers: ['DEVELOPERS_MANAGER'],
  legal: ['LEGAL_MANAGER'],
  onboarding: ['ONBOARDING_MANAGER'],
  support: ['SUPPORT_MANAGER'],
  ads: ['ADS_MANAGER'],
  partners: [],
  mweb: [],
};

/** Opens everything, by definition. */
const MASTER_ROLE = 'SUPER_ADMIN';

/** Hostnames a server-side fetch must never be pointed at. */
const BLOCKED_HOST = /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 4000;

/** One `<meta>` value, whichever attribute order the page used. */
function metaContent(html: string, key: string): string | null {
  const pattern = new RegExp(
    String.raw`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
    'i'
  );
  const found = pattern.exec(html);
  return found ? (found[1] ?? found[2] ?? null) : null;
}

function titleOf(html: string): string | null {
  const og = metaContent(html, 'og:title');
  if (og) return og;
  const found = /<title[^>]*>([^<]{1,300})<\/title>/i.exec(html);
  return found?.[1]?.trim() ?? null;
}

/**
 * Read a page's Open Graph tags.
 *
 * Deliberately narrow: https/http only, no private or loopback host, one
 * request with no redirect chasing beyond what fetch does by default, a hard
 * timeout and a byte cap. A chat message is user-supplied input pointing this
 * server at a URL, which is the definition of SSRF — the answer is to make the
 * fetch boring rather than to trust the sender.
 */
async function fetchOpenGraph(url: URL): Promise<Partial<StaffLinkPreview>> {
  if (BLOCKED_HOST.test(url.hostname)) return {};
  const abort = new AbortController();
  const timer = globalThis.setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: abort.signal,
      redirect: 'follow',
      headers: { accept: 'text/html', 'user-agent': 'duncit-link-preview' },
    });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return {};
    const raw = await res.text();
    const html = raw.slice(0, MAX_BYTES);
    return {
      title: titleOf(html),
      description: metaContent(html, 'og:description') ?? metaContent(html, 'description'),
      image: metaContent(html, 'og:image'),
    };
  } catch (err) {
    // A dead link is a normal thing to paste; it is not worth an error.
    logs.server.warn('staffChat', 'linkPreview', { error: err, url: url.hostname });
    return {};
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/** The portal a `<name>.duncit.com` host belongs to, or null when it is outside. */
function portalOf(hostname: string, ourHosts: string[]): string | null {
  const host = hostname.toLowerCase();
  if (ourHosts.some((known) => host === known)) {
    return host.split('.')[0] ?? null;
  }
  if (!host.endsWith('.duncit.com') && host !== 'duncit.com') return null;
  // staging.<sub>.duncit.com is the same console, one environment along.
  const parts = host.replace(/^staging\./, '').split('.');
  return parts.length > 2 ? (parts[0] ?? null) : 'website';
}

export async function previewLink(url: string, viewerRoles: string[]): Promise<StaffLinkPreview> {
  const empty: StaffLinkPreview = {
    url,
    internal: false,
    portal: null,
    title: null,
    description: null,
    image: null,
    has_access: true,
    access_note: null,
  };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return empty;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return empty;

  const configs = await getUrlConfigs();
  const ourHosts = [configs.adminUrl, configs.mwebUrl, configs.partnersUrl, configs.websiteUrl]
    .map((value) => {
      try {
        return new URL(value).hostname.toLowerCase();
      } catch {
        return '';
      }
    })
    .filter(Boolean);

  const portal = portalOf(parsed.hostname, ourHosts);
  if (!portal) {
    return { ...empty, ...(await fetchOpenGraph(parsed)) };
  }

  // Inside: say which console, and whether they will get in. No OG fetch — a
  // portal is a login wall, so the tags would describe the login page.
  const required = PORTAL_ROLES[portal];
  const open = required === undefined || required.length === 0;
  const allowed = open || viewerRoles.includes(MASTER_ROLE) || required.some((role) => viewerRoles.includes(role));
  return {
    url,
    internal: true,
    portal,
    title: null,
    description: null,
    image: null,
    has_access: allowed,
    access_note: allowed ? null : `Needs the ${required.join(' or ')} role`,
  };
}

import { getUrlConfigs } from '@config/url-configs';
import { fetchOpenGraph } from '@utils/open-graph';

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
  communications: ['COMMUNICATIONS_MANAGER'],
  logs: ['LOGS_MANAGER'],
  analytics: ['ANALYTICS_MANAGER'],
  'ecomm-portal': ['ECOMM_MANAGER'],
  localization: ['LOCALIZATION_MANAGER'],
  partners: [],
  mweb: [],
};

/** Opens everything, by definition. */
const MASTER_ROLE = 'SUPER_ADMIN';

/** The portal a `<name>.duncit.com` host belongs to, or null when it is outside. */
function portalOf(hostname: string, ourHosts: string[]): string | null {
  const host = hostname.toLowerCase();
  if (ourHosts.includes(host)) {
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
    const tags = await fetchOpenGraph(parsed.toString());
    return { ...empty, title: tags.title, description: tags.description, image: tags.image };
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

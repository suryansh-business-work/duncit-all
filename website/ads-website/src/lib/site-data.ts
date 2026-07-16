import { siteConfig } from '../config/site-config';

/** Build-time GraphQL helpers for the static site. Every call degrades to a
 * safe fallback so an unreachable API can never break a deploy — the site
 * simply renders its bundled defaults. */

async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(siteConfig.graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors?.length) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

export interface SiteBranding {
  app_name: string;
  support_email: string;
  support_phone: string;
  website_header_logo_url: string;
  website_footer_logo_url: string;
  website_favicon_url: string;
  android_app_url: string;
  ios_app_url: string;
}

const BRANDING_FALLBACK: SiteBranding = {
  app_name: 'Duncit',
  support_email: 'support@duncit.com',
  support_phone: '',
  website_header_logo_url: '',
  website_footer_logo_url: '',
  website_favicon_url: '',
  android_app_url: '',
  ios_app_url: '',
};

/** Admin-managed branding (Website Logos section) — baked in at build time. */
export async function fetchBranding(): Promise<SiteBranding> {
  const data = await gqlFetch<{ branding: SiteBranding }>(`
    query WebsiteBranding {
      branding {
        app_name
        support_email
        support_phone
        website_header_logo_url
        website_footer_logo_url
        website_favicon_url
        android_app_url
        ios_app_url
      }
    }
  `);
  return { ...BRANDING_FALLBACK, ...data?.branding };
}

export interface SitePolicy {
  id: string;
  slug: string;
  title: string;
}

/** Active policies from the Legal portal — drives the Policy Hub everywhere. */
export async function fetchPolicies(): Promise<SitePolicy[]> {
  const data = await gqlFetch<{ publicPolicies: SitePolicy[] }>(`
    query WebsitePolicies {
      publicPolicies {
        id
        slug
        title
      }
    }
  `);
  return data?.publicPolicies ?? [];
}

export interface SiteNavLink {
  id: string;
  area: 'HEADER' | 'FOOTER';
  group_label: string;
  label: string;
  url: string;
  sort_order: number;
}

export interface SiteNavGroup {
  label: string;
  links: SiteNavLink[];
}

/** Website-portal-managed navigation for this site + area, grouped in order. */
export async function fetchNavGroups(
  area: 'HEADER' | 'FOOTER',
  fallback: SiteNavGroup[]
): Promise<SiteNavGroup[]> {
  const data = await gqlFetch<{ publicWebsiteNav: SiteNavLink[] }>(
    `
    query WebsiteNavLinks($site: WebsiteNavSite!) {
      publicWebsiteNav(site: $site) {
        id
        area
        group_label
        label
        url
        sort_order
      }
    }
  `,
    { site: 'ADS' }
  );
  const links = (data?.publicWebsiteNav ?? []).filter((l) => l.area === area);
  if (!links.length) return fallback;
  const groups = new Map<string, SiteNavLink[]>();
  for (const link of links) {
    const key = link.group_label || 'More';
    const bucket = groups.get(key);
    if (bucket) bucket.push(link);
    else groups.set(key, [link]);
  }
  return [...groups.entries()].map(([label, groupLinks]) => ({ label, links: groupLinks }));
}

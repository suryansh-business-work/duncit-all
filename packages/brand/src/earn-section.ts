/**
 * The Website portal's "Earn with Duncit" settings for one site, read in the
 * browser at page load — so a portal save reaches the static sites without a
 * rebuild, the same way the Reel Slider does.
 *
 * Framework-free: the fetch, the defaults and the "is this field set" rules.
 * earn-section-dom.ts applies the result to the page.
 */
export type EarnSite = 'MAIN' | 'PARTNERS' | 'ADS';
export type EarnPosition = 'AFTER_REELS' | 'AFTER_DOWNLOAD' | 'BEFORE_FOOTER';
export type EarnVariant = 'WALL' | 'SPLIT';
export type EarnAccent = 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

export interface EarnSection {
  enabled: boolean;
  position: EarnPosition;
  variant: EarnVariant;
  accent: EarnAccent;
  eyebrow: string;
  heading: string;
  heading_muted: string;
  text: string;
  cta_label: string;
  cta_url: string;
  images: string[];
  floating_enabled: boolean;
  floating_label: string;
}

/** What a page draws when the API is unreachable: the shipped section, on. */
export const EARN_SECTION_DEFAULTS: EarnSection = {
  enabled: true,
  position: 'AFTER_REELS',
  variant: 'WALL',
  accent: 'PRIMARY',
  eyebrow: '',
  heading: '',
  heading_muted: '',
  text: '',
  cta_label: '',
  cta_url: '',
  images: [],
  floating_enabled: true,
  floating_label: '',
};

const PUBLIC_EARN_QUERY = `query PublicWebsiteEarnSection($site: EarnSite!) {
  publicWebsiteEarnSection(site: $site) {
    enabled position variant accent eyebrow heading heading_muted text
    cta_label cta_url images floating_enabled floating_label
  }
}`;

/** Only https links leave the page — a stored value is still never trusted blindly. */
export function safeHttpsUrl(value: string): string {
  try {
    return new URL(value).protocol === 'https:' ? value : '';
  } catch {
    return '';
  }
}

/** A field the portal left blank keeps the words already on the page. */
export const pick = (override: string, current: string): string => override.trim() || current;

/**
 * Photos for `count` tiles: the portal's images in order, repeated to fill the
 * wall. No images (or none valid) answers an empty list — keep the bundled wall.
 */
export function tilePhotos(images: string[], count: number): string[] {
  const valid = images.map(safeHttpsUrl).filter(Boolean);
  if (!valid.length || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => valid[i % valid.length]);
}

/**
 * One site's settings. A failure answers the defaults — the shipped section
 * still shows — and is reported to the console so it is never silent.
 */
export async function fetchEarnSection(graphqlUrl: string, site: EarnSite): Promise<EarnSection> {
  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PUBLIC_EARN_QUERY, variables: { site } }),
    });
    const json = (await res.json()) as { data?: { publicWebsiteEarnSection?: EarnSection }; errors?: unknown[] };
    const section = json.data?.publicWebsiteEarnSection;
    if (!res.ok || json.errors?.length || !section) {
      console.warn('[earn-section] settings could not be loaded', res.status, json.errors);
      return EARN_SECTION_DEFAULTS;
    }
    return { ...EARN_SECTION_DEFAULTS, ...section };
  } catch (error) {
    console.warn('[earn-section] settings could not be loaded', error);
    return EARN_SECTION_DEFAULTS;
  }
}

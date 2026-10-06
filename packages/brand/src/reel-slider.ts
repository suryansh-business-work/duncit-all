/**
 * The home-page Reel Slider every Duncit website shows (ReelSlider.astro).
 *
 * Framework-free DOM, so the four Astro sites share one implementation. The
 * reels are read at VISIT time, not build time: the Website portal's edits
 * reach the page within the API cache's TTL instead of waiting for a deploy.
 *
 * Rules the slider keeps, whatever the design does around them:
 *   - every visible reel plays muted and looping (a browser only autoplays muted);
 *   - at most ONE reel has sound — turning one on mutes every other;
 *   - nothing plays while the section is off screen or the tab is hidden;
 *   - a visitor who asked for less motion gets still posters until they press play.
 */

export type ReelSite = 'MAIN' | 'PARTNERS' | 'ADS' | 'EARNWITH';

export interface SiteReel {
  id: string;
  title: string;
  description: string;
  video_url: string;
}

export interface ReelSliderCopy {
  slide: string;
  previous: string;
  next: string;
  play: string;
  pause: string;
  mute: string;
  unmute: string;
  goTo: string;
}

/** The `website.brand.reels.*` key behind every control label (WEBSITE_BUNDLE). */
export const REEL_SLIDER_KEYS: Readonly<Record<keyof ReelSliderCopy, string>> = {
  slide: 'website.brand.reels.slide',
  previous: 'website.brand.reels.previous',
  next: 'website.brand.reels.next',
  play: 'website.brand.reels.play',
  pause: 'website.brand.reels.pause',
  mute: 'website.brand.reels.mute',
  unmute: 'website.brand.reels.unmute',
  goTo: 'website.brand.reels.goTo',
};

/** Resolve the slider's copy through a site's translator. */
export function reelSliderCopy(t: (key: string) => string): ReelSliderCopy {
  const entries = Object.entries(REEL_SLIDER_KEYS).map(([field, key]) => [field, t(key)]);
  return Object.fromEntries(entries);
}

/** Fill `{name}` placeholders the build-time translator left in the copy. */
export const fillCopy = (text: string, vars: Record<string, string | number>): string =>
  text.replaceAll(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));

/** Reels further than this from the centre are not drawn, played or focusable. */
export const VISIBLE_DISTANCE = 2;

/**
 * Where slide `index` sits relative to the active one on a circular track:
 * 0 is centre, negative is left. Wraps the shorter way round, so the last reel
 * sits just left of the first.
 */
export function slideOffset(index: number, active: number, total: number): number {
  if (total <= 0) return 0;
  let offset = (((index - active) % total) + total) % total;
  if (offset > total / 2) offset -= total;
  return offset;
}

/** Step `active` by `delta` around a circular track of `total` reels. */
export const wrapIndex = (active: number, delta: number, total: number): number =>
  total > 0 ? (((active + delta) % total) + total) % total : 0;

/** ImageKit renders a still of any video it hosts at `<url>/ik-thumbnail.jpg`. */
export function reelPoster(videoUrl: string): string {
  try {
    const url = new URL(videoUrl);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/ik-thumbnail.jpg`;
    return url.toString();
  } catch {
    return '';
  }
}

const PUBLIC_REELS_QUERY = `query WebsiteReels($site: WebsiteNavSite!) {
  publicWebsiteReels(site: $site) { id title description video_url }
}`;

/**
 * A site's active reels, in slider order. Any failure answers an empty list —
 * the section stays hidden rather than showing a broken stage — and is reported
 * to the console so it is never silent.
 */
export async function fetchSiteReels(graphqlUrl: string, site: ReelSite): Promise<SiteReel[]> {
  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PUBLIC_REELS_QUERY, variables: { site } }),
    });
    const json = (await res.json()) as { data?: { publicWebsiteReels?: SiteReel[] }; errors?: unknown[] };
    if (!res.ok || json.errors?.length) {
      console.warn('[reel-slider] reels could not be loaded', res.status, json.errors);
      return [];
    }
    return json.data?.publicWebsiteReels ?? [];
  } catch (error) {
    console.warn('[reel-slider] reels could not be loaded', error);
    return [];
  }
}

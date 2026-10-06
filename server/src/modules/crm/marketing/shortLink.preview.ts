import { settingsService } from '@modules/platform/settings/settings.service';
import {
  linkPreviewService,
  type LinkPreviewKind,
} from '@modules/platform/linkPreview/linkPreview.service';
import { fetchOpenGraph } from '@utils/open-graph';

/**
 * What a link-preview crawler should see for a short link.
 *
 * A short link is one hop in front of something real — a pod, a club, a
 * profile — and the card has to describe THAT, not the hop. The destination
 * URL is the only thing needed to find it: every share link is built from the
 * entity itself (shortLink.share.ts), so its path is always the canonical mWeb
 * address of the thing being shared, and a marketing link typed into the
 * console points at the same pages.
 */

interface EntityRoute {
  pattern: string;
  kind: LinkPreviewKind;
}

/**
 * The entity pages, most specific first — the first match wins.
 *
 * TWIN: `DYNAMIC_ROUTES` in app/mweb/server/meta-routes.ts, which resolves the
 * same paths into the same `linkPreview` kinds for mWeb's own head tags. The
 * server takes no @duncit/* dependency by design, so the table is stated on
 * both sides: a new entity route needs a row in each.
 */
const ENTITY_ROUTES: EntityRoute[] = [
  { pattern: '/club/:clubSlug/pod/:podSlug', kind: 'POD' },
  { pattern: '/pod/:podId/feedback', kind: 'POD' },
  { pattern: '/pod/:podId/media', kind: 'POD' },
  { pattern: '/club/:clubSlug', kind: 'CLUB' },
  { pattern: '/u/:handle', kind: 'USER' },
  { pattern: '/hosts/:handle', kind: 'USER' },
  { pattern: '/post/:postId', kind: 'POST' },
  { pattern: '/venue/:venueId', kind: 'VENUE' },
  { pattern: '/product/:productId', kind: 'PRODUCT' },
];

/** `/club/x/pod/y` against `/club/:clubSlug/pod/:podSlug` → ['x', 'y']. */
function matchRoute(pattern: string, path: string): string[] | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const ids: string[] = [];
  for (const [index, part] of patternParts.entries()) {
    const value = pathParts[index];
    if (value === undefined) return null;
    if (part.startsWith(':')) ids.push(decodeURIComponent(value));
    else if (part !== value) return null;
  }
  return ids;
}

/** What a destination says about itself — the part of a card that is not ours. */
export interface DestinationMeta {
  title: string | null;
  description: string | null;
  image_url: string | null;
  /** The destination's own og:site_name; null for our entity pages. */
  site_name: string | null;
}

export interface ShortLinkCard {
  title: string;
  description: string | null;
  image_url: string | null;
  /** True when the picture belongs to the destination rather than being the
   * brand logo standing in — only then is a wide card an improvement. */
  large_image: boolean;
  site_name: string;
  theme_color: string;
}

/** The override fields a link carries — see IShortLink.meta_override_enabled. */
export interface MetaOverride {
  meta_override_enabled?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_image_url?: string | null;
}

/** One of our entity pages, described straight from the database. */
async function entityMeta(destination: string): Promise<DestinationMeta | null> {
  let path: string;
  try {
    path = new URL(destination).pathname;
  } catch {
    return null;
  }
  for (const route of ENTITY_ROUTES) {
    const ids = matchRoute(route.pattern, path);
    if (!ids) continue;
    const preview = await linkPreviewService.resolve(route.kind, ids[0] ?? '', ids[1] ?? null);
    if (!preview) return null;
    return {
      title: preview.title,
      description: preview.description,
      image_url: preview.image_url ?? null,
      site_name: null,
    };
  }
  return null;
}

/**
 * What the destination says about itself RIGHT NOW — never a stored copy, so
 * a link re-pointed somewhere else is described as the new place on its very
 * next unfurl.
 *
 * Our entity pages are read from the database; anything else — another of
 * our pages, a partner's site, an app store listing — is asked for its own
 * tags. `readPage: false` skips that request, which is how a card being built
 * FOR another card's fetch stops the two asking each other forever.
 */
export async function destinationMeta(
  destination: string,
  options: { readPage: boolean },
): Promise<DestinationMeta | null> {
  const entity = await entityMeta(destination);
  if (entity) return entity;
  if (!options.readPage) return null;
  const page = await fetchOpenGraph(destination);
  if (!page.title) return null;
  return {
    title: page.title,
    description: page.description,
    image_url: page.image,
    site_name: page.site_name,
  };
}

/** Every override field filled: the destination has nothing left to add. */
const fullyOverridden = (link: MetaOverride) =>
  !!(link.meta_override_enabled && link.meta_title && link.meta_description && link.meta_image_url);

/**
 * The card a link-preview crawler gets for a short link, or null when there
 * is nothing to describe it with — the caller redirects instead, so the
 * destination still gets the last word.
 *
 * The marketer's override, when switched on, replaces the destination's value
 * field by field; a field left blank keeps the destination's own.
 */
export async function cardForLink(
  link: MetaOverride & { destination_url: string },
  options: { readPage: boolean },
): Promise<ShortLinkCard | null> {
  const live = fullyOverridden(link) ? null : await destinationMeta(link.destination_url, options);
  const forced: MetaOverride = link.meta_override_enabled ? link : {};
  const title = forced.meta_title ?? live?.title;
  if (!title) return null;
  const image = forced.meta_image_url ?? live?.image_url ?? null;
  const branding = await settingsService.getBranding();
  return {
    title,
    description: forced.meta_description ?? live?.description ?? null,
    image_url: image ?? branding.logo_url ?? null,
    large_image: !!image,
    site_name: live?.site_name ?? branding.app_name,
    theme_color: branding.primary_color,
  };
}

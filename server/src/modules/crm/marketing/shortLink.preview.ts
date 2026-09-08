import { settingsService } from '@modules/platform/settings/settings.service';
import {
  linkPreviewService,
  type LinkPreviewKind,
} from '@modules/platform/linkPreview/linkPreview.service';

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

export interface ShortLinkCard {
  title: string;
  description: string | null;
  image_url: string | null;
  site_name: string;
  theme_color: string;
}

/**
 * The card for a destination, or null when the destination is not one of our
 * entity pages — a campaign landing page, an app store, a page whose entity
 * has been deleted. Null is not a failure: the caller redirects instead, and
 * the destination gets to describe itself with its own meta tags.
 */
export async function cardForDestination(destination: string): Promise<ShortLinkCard | null> {
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
    const branding = await settingsService.getBranding();
    return {
      title: preview.title,
      description: preview.description,
      image_url: preview.image_url ?? branding.logo_url ?? null,
      site_name: branding.app_name,
      theme_color: branding.primary_color,
    };
  }
  return null;
}

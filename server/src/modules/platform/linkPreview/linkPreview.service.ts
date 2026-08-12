import { podService } from '@modules/pods/pod/pod.service';
import { clubService } from '@modules/clubs/club/club.service';
import { userService } from '@modules/access/user/user.service';
import { venueService } from '@modules/venues/venue/venue.service';
import { inventoryService } from '@modules/venues/inventory/inventory.service';
import { postService } from '@modules/engagement/post/post.service';

export type LinkPreviewKind = 'POD' | 'CLUB' | 'USER' | 'POST' | 'VENUE' | 'PRODUCT';

export interface LinkPreview {
  title: string;
  description: string | null;
  image_url: string | null;
}

interface MediaItem {
  url?: string | null;
  type?: string | null;
}

/** First IMAGE in a pod/club media list — a crawler card cannot play a video. */
const firstImage = (media: unknown): string | null => {
  if (!Array.isArray(media)) return null;
  const image = (media as MediaItem[]).find(
    (m) => m?.url && (m.type ?? 'IMAGE') === 'IMAGE'
  );
  return image?.url ?? null;
};

const MAX_DESCRIPTION = 300;

/**
 * Descriptions are author-typed rich text; a meta tag wants one plain line.
 * Strips markup, collapses whitespace and cuts to what an unfurl displays.
 */
const cleanText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  // `>` optional so an unterminated trailing tag is dropped instead of making
  // the match backtrack (Sonar S8786) — for preview text that is the right
  // outcome anyway.
  const text = value
    .replaceAll(/<[^>]*>?/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (text.length <= MAX_DESCRIPTION) return text;
  return `${text.slice(0, MAX_DESCRIPTION - 1)}…`;
};

const preview = (
  title: unknown,
  description: unknown,
  imageUrl: unknown
): LinkPreview | null => {
  const cleanTitle = cleanText(title);
  if (!cleanTitle) return null;
  return {
    title: cleanTitle,
    description: cleanText(description),
    image_url: typeof imageUrl === 'string' && imageUrl ? imageUrl : null,
  };
};

/** `/club/:clubSlug/pod/:podSlug` (both ids present) or `/pod/:podId/...`. */
async function podPreview(id: string, secondaryId: string | null): Promise<LinkPreview | null> {
  const pod = secondaryId
    ? await podService.getBySlugs(id, secondaryId)
    : await podService.getById(id);
  if (!pod) return null;
  return preview(pod.pod_title, pod.pod_description, firstImage(pod.pod_images_and_videos));
}

async function clubPreview(id: string): Promise<LinkPreview | null> {
  const club = await clubService.getBySlug(id);
  if (!club) return null;
  return preview(
    club.club_name,
    club.club_description,
    firstImage(club.club_feature_images_and_videos)
  );
}

/** Mirrors publicUserProfile's privacy rule: name + avatar always, bio only when public. */
async function userPreview(id: string): Promise<LinkPreview | null> {
  const user = await userService.getById(id).catch(() => null);
  if (!user) return null;
  const isPrivate = (user.profile_visibility ?? 'PUBLIC') === 'PRIVATE';
  return preview(
    user.full_name ?? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
    isPrivate ? null : user.bio,
    user.profile_photo
  );
}

/** Title is the author's name; the surface wraps it in its own localized copy.
 * No author resolvable → null, so the caller renders its default card instead
 * of a hardcoded name (rule 38). */
async function postPreview(id: string): Promise<LinkPreview | null> {
  const post = await postService.getById(id, null);
  if (!post) return null;
  const author = await userService.getById(post.author_id).catch(() => null);
  const isPrivate = (author?.profile_visibility ?? 'PUBLIC') === 'PRIVATE';
  const image = post.media_type === 'IMAGE' ? post.image_url : null;
  return preview(author?.full_name, isPrivate ? null : post.caption, image);
}

async function venuePreview(id: string): Promise<LinkPreview | null> {
  const venue = await venueService.getPublicById(id);
  if (!venue) return null;
  const gallery = Array.isArray(venue.gallery) ? venue.gallery : [];
  return preview(venue.venue_name, venue.description, venue.cover_image_url || gallery[0]);
}

async function productPreview(id: string): Promise<LinkPreview | null> {
  const product = await inventoryService.getById(id);
  if (!product) return null;
  // Paused/archived products are hidden from the shop; hide their cards too.
  if (product.is_active === false || product.status === 'ARCHIVED') return null;
  const image = product.image_url || product.images[0] || product.variants[0]?.images[0];
  return preview(product.product_name, product.short_description || product.description, image);
}

const RESOLVERS: Record<LinkPreviewKind, (id: string, secondaryId: string | null) => Promise<LinkPreview | null>> = {
  POD: podPreview,
  CLUB: clubPreview,
  USER: userPreview,
  POST: postPreview,
  VENUE: venuePreview,
  PRODUCT: productPreview,
};

export const linkPreviewService = {
  /**
   * A malformed or stale id is normal crawler traffic, not an error: any
   * lookup failure (bad ObjectId cast included) degrades to null and the
   * caller's default card.
   */
  async resolve(
    kind: LinkPreviewKind,
    id: string,
    secondaryId: string | null
  ): Promise<LinkPreview | null> {
    const resolver = RESOLVERS[kind];
    if (!resolver || !id) return null;
    try {
      return await resolver(id, secondaryId);
    } catch {
      return null;
    }
  },
};

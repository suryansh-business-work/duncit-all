import type { PublishContent, PublishMedia, SocialMediaType, SocialPlatform } from './social.types';

/**
 * What each network accepts from Duncit's composer. The server's word is
 * final — the Marketing composer carries the same table to warn before
 * submit, not instead of this.
 *
 * Media support is what this integration publishes, not everything the
 * network can do: a LinkedIn or X video needs a chunked upload this does not
 * do yet, and an Instagram or YouTube post cannot exist without its media.
 * `maxMedia` is how many pieces one post may carry; `carouselVideo` says
 * whether a video may sit inside a multi-item post (Facebook takes one video
 * on its own, never inside a multi-photo post).
 */
interface PlatformRules {
  label: string;
  maxText: number;
  media: readonly SocialMediaType[];
  mediaRequired: boolean;
  textRequired: boolean;
  maxMedia: number;
  carouselVideo: boolean;
  /** Accounts that may be invited as collaborators; 0 where the network has no such thing. Instagram's Content Publishing API takes 3. */
  maxCollaborators: number;
}

export const PUBLISH_RULES: Record<SocialPlatform, PlatformRules> = {
  INSTAGRAM: { label: 'Instagram', maxText: 2200, media: ['IMAGE', 'VIDEO'], mediaRequired: true, textRequired: false, maxMedia: 10, carouselVideo: true, maxCollaborators: 3 },
  FACEBOOK: { label: 'Facebook', maxText: 63_206, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 10, carouselVideo: false, maxCollaborators: 0 },
  THREADS: { label: 'Threads', maxText: 500, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 20, carouselVideo: true, maxCollaborators: 0 },
  YOUTUBE: { label: 'YouTube', maxText: 5000, media: ['VIDEO'], mediaRequired: true, textRequired: true, maxMedia: 1, carouselVideo: false, maxCollaborators: 0 },
  LINKEDIN: { label: 'LinkedIn', maxText: 3000, media: ['IMAGE'], mediaRequired: false, textRequired: true, maxMedia: 20, carouselVideo: false, maxCollaborators: 0 },
  X: { label: 'X', maxText: 280, media: ['IMAGE'], mediaRequired: false, textRequired: false, maxMedia: 4, carouselVideo: false, maxCollaborators: 0 },
};

/** Characters as a person counts them — an emoji is one, not two UTF-16 units. */
export const textLength = (text: string) => [...text].length;

/** The content a post carries, with the first item doubled as media_url / media_type for readers of one. */
export function publishContent(text: string, media: readonly PublishMedia[]): PublishContent {
  const first = media[0];
  return {
    text,
    media: media.map((item) => ({ url: item.url, type: item.type })),
    media_url: first?.url ?? '',
    media_type: first?.type ?? null,
  };
}

/** Everything wrong with this post's media for this network. */
function mediaProblems(rules: PlatformRules, media: readonly PublishMedia[]): string[] {
  const problems: string[] = [];
  const types = new Set(media.map((item) => item.type));
  if (rules.mediaRequired && media.length === 0) problems.push(`${rules.label} needs ${rules.media.join(' or ').toLowerCase()} media`);
  for (const type of types) {
    if (!rules.media.includes(type)) problems.push(`${rules.label} cannot take ${type.toLowerCase()} from Duncit yet`);
  }
  if (media.length > rules.maxMedia) problems.push(`${rules.label} takes at most ${rules.maxMedia} media`);
  // Only a network that takes carousels, and video at all, has a say on video inside one.
  const videoInCarousel = media.length > 1 && rules.maxMedia > 1 && types.has('VIDEO') && rules.media.includes('VIDEO');
  if (videoInCarousel && !rules.carouselVideo) problems.push(`${rules.label} takes one video on its own, not in a carousel`);
  return problems;
}

/** Everything wrong with sending this content to this network; empty when it can go. */
export function publishProblems(platform: SocialPlatform, content: PublishContent): string[] {
  const rules = PUBLISH_RULES[platform];
  const problems: string[] = [];
  const hasText = content.text.trim().length > 0;
  if (!hasText && content.media.length === 0) problems.push(`${rules.label}: write something or add media`);
  if (rules.textRequired && !hasText) problems.push(`${rules.label} needs text`);
  if (textLength(content.text) > rules.maxText) problems.push(`${rules.label} allows ${rules.maxText} characters`);
  return [...problems, ...mediaProblems(rules, content.media)];
}

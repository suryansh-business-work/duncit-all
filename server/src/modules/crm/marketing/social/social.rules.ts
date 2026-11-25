import type { PublishContent, PublishMedia, SocialMediaType, SocialPlatform, SocialPostType } from './social.types';

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
 * on its own, never inside a multi-photo post). Reels, Stories and a first
 * comment are Instagram's alone here.
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
  postTypes: readonly SocialPostType[];
  firstComment: boolean;
}

const FEED_ONLY: readonly SocialPostType[] = ['FEED'];

export const PUBLISH_RULES: Record<SocialPlatform, PlatformRules> = {
  INSTAGRAM: { label: 'Instagram', maxText: 2200, media: ['IMAGE', 'VIDEO'], mediaRequired: true, textRequired: false, maxMedia: 10, carouselVideo: true, maxCollaborators: 3, postTypes: ['FEED', 'REEL', 'STORY'], firstComment: true },
  FACEBOOK: { label: 'Facebook', maxText: 63_206, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 10, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  THREADS: { label: 'Threads', maxText: 500, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 20, carouselVideo: true, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  YOUTUBE: { label: 'YouTube', maxText: 5000, media: ['VIDEO'], mediaRequired: true, textRequired: true, maxMedia: 1, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  LINKEDIN: { label: 'LinkedIn', maxText: 3000, media: ['IMAGE'], mediaRequired: false, textRequired: true, maxMedia: 20, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  X: { label: 'X', maxText: 280, media: ['IMAGE'], mediaRequired: false, textRequired: false, maxMedia: 4, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
};

/**
 * Instagram's own limits on shape and length, which its API refuses with an
 * error only after the upload: a feed picture (and every carousel item) from
 * 4:5 to 1.91:1, a reel (and a single feed video, which goes out as one) from
 * 3 seconds to 15 minutes, a carousel video up to 60 seconds, a story video up
 * to 60 seconds. Threads takes a video up to 5 minutes.
 */
export const SHAPE_LIMITS = {
  feedRatio: { min: 4 / 5, max: 1.91 },
  reelSeconds: { min: 3, max: 900 },
  carouselVideoSeconds: 60,
  storyVideoSeconds: 60,
  threadsVideoSeconds: 300,
} as const;
/** Rounding a measured ratio must not refuse a 1080×1350 picture. */
const RATIO_SLACK = 0.01;
export const FIRST_COMMENT_MAX = 2200;

/** Characters as a person counts them — an emoji is one, not two UTF-16 units. */
export const textLength = (text: string) => [...text].length;

const positive = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** A piece of media with only the measurements it really has, so an unmeasured piece reads exactly as before. */
const measuredMedia = (item: PublishMedia): PublishMedia => ({
  url: item.url,
  type: item.type,
  ...(positive(item.width) && positive(item.height) ? { width: Math.round(item.width), height: Math.round(item.height) } : {}),
  ...(positive(item.duration_s) ? { duration_s: item.duration_s } : {}),
});

/** The content a post carries, with the first item doubled as media_url / media_type for readers of one. */
export function publishContent(text: string, media: readonly PublishMedia[]): PublishContent {
  const first = media[0];
  return {
    text,
    media: media.map(measuredMedia),
    media_url: first?.url ?? '',
    media_type: first?.type ?? null,
  };
}

/** The content as one network gets it: its own caption when it has one, else the post's text. */
export function contentFor(platform: SocialPlatform, content: PublishContent): PublishContent {
  const own = content.captions?.[platform]?.trim();
  return own ? { ...content, text: own } : content;
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

/** A reel is one video; a story is one picture or one video; and only where the network has them. */
function postTypeProblems(rules: PlatformRules, content: PublishContent): string[] {
  const type = content.post_type ?? 'FEED';
  if (!rules.postTypes.includes(type)) return [`${rules.label} takes no ${type === 'REEL' ? 'reels' : 'stories'} from Duncit — post it to Instagram only`];
  if (type === 'REEL' && (content.media.length !== 1 || content.media[0]?.type !== 'VIDEO')) return [`An ${rules.label} reel is one video`];
  if (type === 'STORY' && content.media.length !== 1) return [`An ${rules.label} story is one picture or one video`];
  return [];
}

/** 60 reads as "60 seconds", 300 as "5 minutes". */
const seconds = (value: number) => (value > 60 ? `${Math.round(value / 60)} minutes` : `${value} seconds`);

/** The longest a video may run here, and the shortest; null where nothing is known. */
function videoBounds(platform: SocialPlatform, type: SocialPostType, carousel: boolean): { min: number; max: number } | null {
  if (platform === 'THREADS') return { min: 0, max: SHAPE_LIMITS.threadsVideoSeconds };
  if (platform !== 'INSTAGRAM') return null;
  if (type === 'STORY') return { min: 0, max: SHAPE_LIMITS.storyVideoSeconds };
  if (carousel) return { min: 0, max: SHAPE_LIMITS.carouselVideoSeconds };
  return SHAPE_LIMITS.reelSeconds;
}

/** One measured piece against the network's shape and length limits. */
function shapeProblem(platform: SocialPlatform, type: SocialPostType, carousel: boolean, item: PublishMedia, index: number): string | null {
  const which = `Media ${index + 1}`;
  const bounds = item.type === 'VIDEO' ? videoBounds(platform, type, carousel) : null;
  const length = item.duration_s ?? null;
  if (bounds && length !== null && (length < bounds.min || length > bounds.max)) {
    return bounds.min > 0
      ? `${which} runs ${Math.round(length)} seconds; ${PUBLISH_RULES[platform].label} takes ${bounds.min} seconds to ${seconds(bounds.max)}`
      : `${which} runs ${Math.round(length)} seconds; ${PUBLISH_RULES[platform].label} takes up to ${seconds(bounds.max)} here`;
  }
  // A single feed video goes out as a reel, and a story takes any shape: only feed pictures and carousel items are held to 4:5–1.91:1.
  const feedShaped = platform === 'INSTAGRAM' && type === 'FEED' && (carousel || item.type === 'IMAGE');
  if (feedShaped && item.width && item.height) {
    const ratio = item.width / item.height;
    const { min, max } = SHAPE_LIMITS.feedRatio;
    if (ratio < min - RATIO_SLACK || ratio > max + RATIO_SLACK) {
      return `${which} is ${item.width}×${item.height}; an Instagram feed post takes 4:5 (portrait) to 1.91:1 (landscape) — crop it, or post it as a story`;
    }
  }
  return null;
}

function shapeProblems(platform: SocialPlatform, content: PublishContent): string[] {
  const type = content.post_type ?? 'FEED';
  const carousel = content.media.length > 1;
  return content.media
    .map((item, index) => shapeProblem(platform, type, carousel, item, index))
    .filter((problem): problem is string => problem !== null);
}

function firstCommentProblems(rules: PlatformRules, content: PublishContent): string[] {
  const comment = content.first_comment?.trim() ?? '';
  if (!rules.firstComment || !comment) return [];
  if (content.post_type === 'STORY') return [`An ${rules.label} story takes no first comment`];
  return textLength(comment) > FIRST_COMMENT_MAX ? [`An ${rules.label} first comment allows ${FIRST_COMMENT_MAX} characters`] : [];
}

/** Everything wrong with sending this content to this network; empty when it can go. */
export function publishProblems(platform: SocialPlatform, content: PublishContent): string[] {
  const rules = PUBLISH_RULES[platform];
  const own = contentFor(platform, content);
  const problems: string[] = [];
  const hasText = own.text.trim().length > 0;
  if (!hasText && own.media.length === 0) problems.push(`${rules.label}: write something or add media`);
  if (rules.textRequired && !hasText) problems.push(`${rules.label} needs text`);
  if (textLength(own.text) > rules.maxText) problems.push(`${rules.label} allows ${rules.maxText} characters`);
  return [
    ...problems,
    ...mediaProblems(rules, own.media),
    ...postTypeProblems(rules, own),
    ...shapeProblems(platform, own),
    ...firstCommentProblems(rules, own),
  ];
}

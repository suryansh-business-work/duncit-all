import type { SocialPlatform } from '../queries';
import type { SocialMediaType, SocialPostMedia, SocialPostType } from '../publish.queries';

/**
 * What each network accepts from the composer — the same table the server
 * enforces (server/src/modules/crm/marketing/social/social.rules.ts), carried
 * here so the marketer is told while writing, not after pressing Schedule.
 */
export interface PlatformRules {
  maxText: number;
  media: readonly SocialMediaType[];
  mediaRequired: boolean;
  textRequired: boolean;
  /** How many items one post may carry; 1 means no carousel. */
  maxMedia: number;
  /** Whether a video may sit among several items — false means a carousel is images only. */
  carouselVideo: boolean;
  /**
   * How many accounts may be invited as collaborators on one post. Only
   * Instagram has them: its Content Publishing API takes up to 3 usernames on a
   * feed image, a reel or a carousel. 0 means the network has none.
   */
  maxCollaborators: number;
  /** Reels and Stories are Instagram's alone here. */
  postTypes: readonly SocialPostType[];
  firstComment: boolean;
}

const FEED_ONLY: readonly SocialPostType[] = ['FEED'];

export const PUBLISH_RULES: Record<SocialPlatform, PlatformRules> = {
  INSTAGRAM: { maxText: 2200, media: ['IMAGE', 'VIDEO'], mediaRequired: true, textRequired: false, maxMedia: 10, carouselVideo: true, maxCollaborators: 3, postTypes: ['FEED', 'REEL', 'STORY'], firstComment: true },
  FACEBOOK: { maxText: 63_206, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 10, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  THREADS: { maxText: 500, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 20, carouselVideo: true, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  YOUTUBE: { maxText: 5000, media: ['VIDEO'], mediaRequired: true, textRequired: true, maxMedia: 1, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  LINKEDIN: { maxText: 3000, media: ['IMAGE'], mediaRequired: false, textRequired: true, maxMedia: 20, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
  X: { maxText: 280, media: ['IMAGE'], mediaRequired: false, textRequired: false, maxMedia: 4, carouselVideo: false, maxCollaborators: 0, postTypes: FEED_ONLY, firstComment: false },
};

/** Instagram's shape and length limits, and Threads' video length — the server's SHAPE_LIMITS. */
export const SHAPE_LIMITS = {
  feedRatio: { min: 4 / 5, max: 1.91 },
  reelSeconds: { min: 3, max: 900 },
  carouselVideoSeconds: 60,
  storyVideoSeconds: 60,
  threadsVideoSeconds: 300,
} as const;
const RATIO_SLACK = 0.01;
export const FIRST_COMMENT_MAX = 2200;

/** Characters as a person counts them — an emoji is one, not two UTF-16 units. */
export const textLength = (text: string) => [...text].length;

export interface RuleProblem {
  /** The form field it belongs to: text, media, post_type, first_comment, or captions.<NETWORK>. */
  field: string;
  key: string;
  vars: Record<string, number>;
}

/** The post's type, per-network captions and first comment — what the rules need beyond the text and media. */
export interface PostOptions {
  post_type?: SocialPostType;
  captions?: Partial<Record<SocialPlatform, string>>;
  first_comment?: string;
}

function textProblems(rules: PlatformRules, text: string, field: string): RuleProblem[] {
  const problems: RuleProblem[] = [];
  if (rules.textRequired && !text.trim()) problems.push({ field, key: 'marketing.social.ruleNeedsText', vars: {} });
  if (textLength(text) > rules.maxText) {
    problems.push({ field, key: 'marketing.social.ruleTooLong', vars: { limit: rules.maxText } });
  }
  return problems;
}

function mediaProblems(rules: PlatformRules, media: readonly SocialPostMedia[]): RuleProblem[] {
  const problems: RuleProblem[] = [];
  if (rules.mediaRequired && media.length === 0) {
    const key = rules.media.includes('IMAGE') ? 'marketing.social.ruleNeedsMedia' : 'marketing.social.ruleNeedsVideo';
    problems.push({ field: 'media', key, vars: {} });
  }
  if (media.length > rules.maxMedia) {
    problems.push({ field: 'media', key: 'marketing.social.ruleTooManyMedia', vars: { limit: rules.maxMedia } });
  }
  if (media.some((item) => !rules.media.includes(item.type))) {
    problems.push({ field: 'media', key: 'marketing.social.ruleMediaUnsupported', vars: {} });
  } else if (media.length > 1 && rules.maxMedia > 1 && !rules.carouselVideo && media.some((item) => item.type === 'VIDEO')) {
    // A video the network takes on its own, but not beside other items. A network with no
    // carousel at all (YouTube) has already been told it was given too many.
    problems.push({ field: 'media', key: 'marketing.social.ruleCarouselImagesOnly', vars: {} });
  }
  return problems;
}

function postTypeProblems(rules: PlatformRules, type: SocialPostType, media: readonly SocialPostMedia[]): RuleProblem[] {
  if (!rules.postTypes.includes(type)) {
    return [{ field: 'post_type', key: type === 'REEL' ? 'marketing.social.ruleNoReels' : 'marketing.social.ruleNoStories', vars: {} }];
  }
  if (type === 'REEL' && (media.length !== 1 || media[0]?.type !== 'VIDEO')) return [{ field: 'media', key: 'marketing.social.ruleReelOneVideo', vars: {} }];
  if (type === 'STORY' && media.length !== 1) return [{ field: 'media', key: 'marketing.social.ruleStoryOnePiece', vars: {} }];
  return [];
}

function videoBounds(platform: SocialPlatform, type: SocialPostType, carousel: boolean): { min: number; max: number } | null {
  if (platform === 'THREADS') return { min: 0, max: SHAPE_LIMITS.threadsVideoSeconds };
  if (platform !== 'INSTAGRAM') return null;
  if (type === 'STORY') return { min: 0, max: SHAPE_LIMITS.storyVideoSeconds };
  if (carousel) return { min: 0, max: SHAPE_LIMITS.carouselVideoSeconds };
  return SHAPE_LIMITS.reelSeconds;
}

function shapeProblem(platform: SocialPlatform, type: SocialPostType, carousel: boolean, item: SocialPostMedia, index: number): RuleProblem | null {
  const bounds = item.type === 'VIDEO' ? videoBounds(platform, type, carousel) : null;
  const length = item.duration_s ?? null;
  if (bounds && length !== null && length > 0) {
    const seconds = Math.round(length);
    if (length < bounds.min) return { field: 'media', key: 'marketing.social.ruleVideoTooShort', vars: { index: index + 1, seconds, min: bounds.min } };
    if (length > bounds.max) return { field: 'media', key: 'marketing.social.ruleVideoTooLong', vars: { index: index + 1, seconds, max: bounds.max } };
  }
  const feedShaped = platform === 'INSTAGRAM' && type === 'FEED' && (carousel || item.type === 'IMAGE');
  if (feedShaped && item.width && item.height) {
    const ratio = item.width / item.height;
    if (ratio < SHAPE_LIMITS.feedRatio.min - RATIO_SLACK || ratio > SHAPE_LIMITS.feedRatio.max + RATIO_SLACK) {
      return { field: 'media', key: 'marketing.social.ruleFeedRatio', vars: { index: index + 1, width: item.width, height: item.height } };
    }
  }
  return null;
}

function firstCommentProblems(rules: PlatformRules, type: SocialPostType, comment: string): RuleProblem[] {
  if (!rules.firstComment || !comment.trim()) return [];
  if (type === 'STORY') return [{ field: 'first_comment', key: 'marketing.social.ruleStoryNoComment', vars: {} }];
  return textLength(comment.trim()) > FIRST_COMMENT_MAX ? [{ field: 'first_comment', key: 'marketing.social.ruleCommentTooLong', vars: { limit: FIRST_COMMENT_MAX } }] : [];
}

/** Everything that stops this text and media going to this network, judged against its own caption when it has one. */
export function platformProblems(platform: SocialPlatform, text: string, media: readonly SocialPostMedia[], options: PostOptions = {}): RuleProblem[] {
  const rules = PUBLISH_RULES[platform];
  const type = options.post_type ?? 'FEED';
  const own = options.captions?.[platform]?.trim();
  const carousel = media.length > 1;
  const shapes = media.map((item, index) => shapeProblem(platform, type, carousel, item, index)).filter((problem): problem is RuleProblem => problem !== null);
  return [
    ...textProblems(rules, own || text, own ? `captions.${platform}` : 'text'),
    ...mediaProblems(rules, media),
    ...postTypeProblems(rules, type, media),
    ...shapes,
    ...firstCommentProblems(rules, type, options.first_comment ?? ''),
  ];
}

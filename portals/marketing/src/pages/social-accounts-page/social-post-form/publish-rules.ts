import type { SocialPlatform } from '../queries';
import type { SocialMediaType, SocialPostMedia } from '../publish.queries';

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
}

export const PUBLISH_RULES: Record<SocialPlatform, PlatformRules> = {
  INSTAGRAM: { maxText: 2200, media: ['IMAGE', 'VIDEO'], mediaRequired: true, textRequired: false, maxMedia: 10, carouselVideo: true, maxCollaborators: 3 },
  FACEBOOK: { maxText: 63_206, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 10, carouselVideo: false, maxCollaborators: 0 },
  THREADS: { maxText: 500, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false, maxMedia: 20, carouselVideo: true, maxCollaborators: 0 },
  YOUTUBE: { maxText: 5000, media: ['VIDEO'], mediaRequired: true, textRequired: true, maxMedia: 1, carouselVideo: false, maxCollaborators: 0 },
  LINKEDIN: { maxText: 3000, media: ['IMAGE'], mediaRequired: false, textRequired: true, maxMedia: 20, carouselVideo: false, maxCollaborators: 0 },
  X: { maxText: 280, media: ['IMAGE'], mediaRequired: false, textRequired: false, maxMedia: 4, carouselVideo: false, maxCollaborators: 0 },
};

/** Characters as a person counts them — an emoji is one, not two UTF-16 units. */
export const textLength = (text: string) => [...text].length;

export interface RuleProblem {
  field: 'text' | 'media';
  key: string;
  vars: Record<string, number>;
}

function textProblems(rules: PlatformRules, text: string): RuleProblem[] {
  const problems: RuleProblem[] = [];
  if (rules.textRequired && !text.trim()) problems.push({ field: 'text', key: 'marketing.social.ruleNeedsText', vars: {} });
  if (textLength(text) > rules.maxText) {
    problems.push({ field: 'text', key: 'marketing.social.ruleTooLong', vars: { limit: rules.maxText } });
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

/** Everything that stops this text and media going to this network. */
export function platformProblems(platform: SocialPlatform, text: string, media: readonly SocialPostMedia[]): RuleProblem[] {
  const rules = PUBLISH_RULES[platform];
  return [...textProblems(rules, text), ...mediaProblems(rules, media)];
}

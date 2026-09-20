import type { SocialPlatform } from '../queries';
import type { SocialMediaType } from '../publish.queries';

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
}

export const PUBLISH_RULES: Record<SocialPlatform, PlatformRules> = {
  LINKEDIN: { maxText: 3000, media: ['IMAGE'], mediaRequired: false, textRequired: true },
  FACEBOOK: { maxText: 63_206, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false },
  INSTAGRAM: { maxText: 2200, media: ['IMAGE', 'VIDEO'], mediaRequired: true, textRequired: false },
  X: { maxText: 280, media: ['IMAGE'], mediaRequired: false, textRequired: false },
  YOUTUBE: { maxText: 5000, media: ['VIDEO'], mediaRequired: true, textRequired: true },
};

/** Characters as a person counts them — an emoji is one, not two UTF-16 units. */
export const textLength = (text: string) => [...text].length;

export interface RuleProblem {
  field: 'text' | 'media_url';
  key: string;
  vars: Record<string, number>;
}

/** Everything that stops this text and media going to this network. */
export function platformProblems(platform: SocialPlatform, text: string, media: SocialMediaType | null): RuleProblem[] {
  const rules = PUBLISH_RULES[platform];
  const problems: RuleProblem[] = [];
  if (rules.textRequired && !text.trim()) problems.push({ field: 'text', key: 'marketing.social.ruleNeedsText', vars: {} });
  if (textLength(text) > rules.maxText) {
    problems.push({ field: 'text', key: 'marketing.social.ruleTooLong', vars: { limit: rules.maxText } });
  }
  if (rules.mediaRequired && !media) {
    const key = rules.media.includes('IMAGE') ? 'marketing.social.ruleNeedsMedia' : 'marketing.social.ruleNeedsVideo';
    problems.push({ field: 'media_url', key, vars: {} });
  }
  if (media && !rules.media.includes(media)) {
    problems.push({ field: 'media_url', key: 'marketing.social.ruleMediaUnsupported', vars: {} });
  }
  return problems;
}

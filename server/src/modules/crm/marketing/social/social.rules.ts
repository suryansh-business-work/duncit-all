import type { PublishContent, SocialMediaType, SocialPlatform } from './social.types';

/**
 * What each network accepts from Duncit's composer. The server's word is
 * final — the Marketing composer carries the same table to warn before
 * submit, not instead of this.
 *
 * Media support is what this integration publishes, not everything the
 * network can do: a LinkedIn or X video needs a chunked upload this does not
 * do yet, and an Instagram or YouTube post cannot exist without its media.
 */
interface PlatformRules {
  label: string;
  maxText: number;
  media: readonly SocialMediaType[];
  mediaRequired: boolean;
  textRequired: boolean;
}

export const PUBLISH_RULES: Record<SocialPlatform, PlatformRules> = {
  LINKEDIN: { label: 'LinkedIn', maxText: 3000, media: ['IMAGE'], mediaRequired: false, textRequired: true },
  FACEBOOK: { label: 'Facebook', maxText: 63_206, media: ['IMAGE', 'VIDEO'], mediaRequired: false, textRequired: false },
  INSTAGRAM: { label: 'Instagram', maxText: 2200, media: ['IMAGE', 'VIDEO'], mediaRequired: true, textRequired: false },
  X: { label: 'X', maxText: 280, media: ['IMAGE'], mediaRequired: false, textRequired: false },
  YOUTUBE: { label: 'YouTube', maxText: 5000, media: ['VIDEO'], mediaRequired: true, textRequired: true },
};

/** Characters as a person counts them — an emoji is one, not two UTF-16 units. */
export const textLength = (text: string) => [...text].length;

/** Everything wrong with sending this content to this network; empty when it can go. */
export function publishProblems(platform: SocialPlatform, content: PublishContent): string[] {
  const rules = PUBLISH_RULES[platform];
  const problems: string[] = [];
  const hasText = content.text.trim().length > 0;
  if (!hasText && !content.media_type) problems.push(`${rules.label}: write something or add media`);
  if (rules.textRequired && !hasText) problems.push(`${rules.label} needs text`);
  if (textLength(content.text) > rules.maxText) problems.push(`${rules.label} allows ${rules.maxText} characters`);
  if (rules.mediaRequired && !content.media_type) problems.push(`${rules.label} needs ${rules.media.join(' or ').toLowerCase()} media`);
  if (content.media_type && !rules.media.includes(content.media_type)) {
    problems.push(`${rules.label} cannot take ${content.media_type.toLowerCase()} from Duncit yet`);
  }
  return problems;
}

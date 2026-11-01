import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { valuesOf } from '../../pages/reels/editor/labels';
import type { ReelVariant } from '../../pages/reels/types';
import { PLATFORM_LABEL } from '../../pages/social-accounts-page/copy';

/** The longest caption any network takes; the composer applies each network's own rule when the post is made. */
export const MAX_CAPTION_LENGTH = 2200;
export const MAX_TITLE_LENGTH = 100;
export const MAX_HASHTAGS_LENGTH = 500;

/** One network's caption, title and tags, as the dialog edits them: the tags as one line of words. */
export const buildReelVariantsSchema = (t: Translate) =>
  z.object({
    variants: z.array(
      z.object({
        platform: z.enum(valuesOf(PLATFORM_LABEL)),
        title: z.string().trim().max(MAX_TITLE_LENGTH, t('ai.reels.variants.titleMax', { vars: { max: MAX_TITLE_LENGTH } })),
        caption: z.string().trim().max(MAX_CAPTION_LENGTH, t('ai.reels.variants.captionMax', { vars: { max: MAX_CAPTION_LENGTH } })),
        hashtags: z.string().trim().max(MAX_HASHTAGS_LENGTH, t('ai.reels.variants.hashtagsMax', { vars: { max: MAX_HASHTAGS_LENGTH } })),
      })
    ),
  });

export type ReelVariantsFormValues = z.output<ReturnType<typeof buildReelVariantsSchema>>;
export type ReelVariantRowValues = ReelVariantsFormValues['variants'][number];

export const variantsToForm = (variants: readonly ReelVariant[]): ReelVariantsFormValues => ({
  variants: variants.map((variant) => ({
    platform: variant.platform,
    title: variant.title,
    caption: variant.caption,
    hashtags: variant.hashtags.map((tag) => `#${tag}`).join(' '),
  })),
});

/** Tags as typed — spaces or commas between them, with or without the hash — as the clean list the post carries. */
export function parseHashtags(line: string): string[] {
  const tags = line
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, '').trim())
    .filter((tag) => tag !== '');
  return [...new Set(tags)];
}

export const rowToVariant = (row: ReelVariantRowValues): ReelVariant => ({
  platform: row.platform,
  title: row.title,
  caption: row.caption,
  hashtags: parseHashtags(row.hashtags),
});

/** The caption as it goes into a post: the words, then the tags on their own line. */
export const variantPostText = (variant: Pick<ReelVariant, 'caption' | 'hashtags'>): string =>
  [variant.caption, variant.hashtags.map((tag) => `#${tag}`).join(' ')].filter((part) => part !== '').join('\n\n');

export interface ReelVariantsFormProps {
  variants: readonly ReelVariant[];
  /** Hands one network's caption to the post about to be made. */
  onUse: (variant: ReelVariant) => void;
}

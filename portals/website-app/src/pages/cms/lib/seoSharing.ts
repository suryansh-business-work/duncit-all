import { z } from 'zod';
import type { CmsSeo, CmsSeoInput } from '@duncit/gql-types';
import { isMetaName } from '@duncit/regex';

type Translate = (key: string) => string;

/** The card types X (Twitter) understands; '' lets the page decide by its image. */
export const TWITTER_CARDS = ['', 'summary', 'summary_large_image'] as const;

/** Bounds the API enforces too. */
export const MAX_SEO_META_TAGS = 20;

const isJsonOrBlank = (value: string) => {
  if (!value) return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Share-card copy, keywords, structured data and extra `<meta>` tags — the
 * SEO a page, a site or an entry carries beyond its title and description.
 */
export const seoSharingSchema = (t: Translate) =>
  z.object({
    og_title: z.string().trim().max(160),
    og_description: z.string().trim().max(320),
    twitter_card: z.enum(TWITTER_CARDS),
    keywords: z.string().trim().max(300),
    json_ld: z.string().trim().max(20_000).refine(isJsonOrBlank, t('websiteApp.cms.seo.errJsonLd')),
    meta_tags: z
      .array(
        z.object({
          name: z.string().trim().refine(isMetaName, t('websiteApp.cms.seo.errMetaName')),
          content: z.string().trim().max(500),
        }),
      )
      .max(MAX_SEO_META_TAGS),
  });

export type SeoSharingValues = z.input<ReturnType<typeof seoSharingSchema>>;
export type SeoSharingOutput = z.output<ReturnType<typeof seoSharingSchema>>;

export type SeoSharingSource = Partial<Pick<CmsSeo, 'og_title' | 'og_description' | 'twitter_card' | 'keywords' | 'json_ld' | 'meta_tags'>>;

const asTwitterCard = (value: string | undefined): SeoSharingValues['twitter_card'] =>
  TWITTER_CARDS.find((card) => card === value) ?? '';

export const toSeoSharingValues = (seo?: SeoSharingSource | null): SeoSharingValues => ({
  og_title: seo?.og_title ?? '',
  og_description: seo?.og_description ?? '',
  twitter_card: asTwitterCard(seo?.twitter_card),
  keywords: seo?.keywords ?? '',
  json_ld: seo?.json_ld ?? '',
  meta_tags: (seo?.meta_tags ?? []).map(({ name, content }) => ({ name, content })),
});

export const toSeoSharingInput = (values: SeoSharingOutput): Pick<CmsSeoInput, 'og_title' | 'og_description' | 'twitter_card' | 'keywords' | 'json_ld' | 'meta_tags'> => ({
  og_title: values.og_title,
  og_description: values.og_description,
  twitter_card: values.twitter_card,
  keywords: values.keywords,
  json_ld: values.json_ld,
  meta_tags: values.meta_tags,
});


import { z } from 'zod';

/*
 * These types mirror server/src/modules/content/websiteEarn/websiteEarn.schema.ts.
 * @duncit/gql-types does not carry them until codegen runs again; swap them for
 * the generated WebsiteEarnSection / WebsiteEarnSectionInput then.
 */
export type EarnSite = 'MAIN' | 'PARTNERS' | 'ADS';
export type EarnPosition = 'AFTER_REELS' | 'AFTER_DOWNLOAD' | 'BEFORE_FOOTER';
export type EarnVariant = 'WALL' | 'SPLIT';
export type EarnAccent = 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

export interface WebsiteEarnSection {
  site: EarnSite;
  enabled: boolean;
  position: EarnPosition;
  variant: EarnVariant;
  accent: EarnAccent;
  eyebrow: string;
  heading: string;
  heading_muted: string;
  text: string;
  cta_label: string;
  cta_url: string;
  images: string[];
  floating_enabled: boolean;
  floating_label: string;
  updated_at: string | null;
}

export type WebsiteEarnSectionInput = Omit<WebsiteEarnSection, 'updated_at'>;

export const EARN_POSITIONS = ['AFTER_REELS', 'AFTER_DOWNLOAD', 'BEFORE_FOOTER'] as const satisfies readonly EarnPosition[];
export const EARN_VARIANTS = ['WALL', 'SPLIT'] as const satisfies readonly EarnVariant[];
export const EARN_ACCENTS = ['PRIMARY', 'SECONDARY', 'TERTIARY'] as const satisfies readonly EarnAccent[];

/** The caps the server refuses past (EARN_LIMITS in websiteEarn.model.ts). */
export const EARN_LIMITS = {
  eyebrow: 40,
  heading: 60,
  heading_muted: 60,
  text: 240,
  cta_label: 40,
  floating_label: 40,
  url: 1000,
  images: 13,
} as const;

/** The same https-only rule websiteEarn.validator.ts applies. */
export const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

type Translate = (key: string, options?: { vars: Record<string, number> }) => string;

const copy = (t: Translate, max: number) =>
  z.string().trim().max(max, t('websiteApp.earn.errMax', { vars: { max } }));

/** Built per render so every message follows the console's language. */
export const earnSchema = (t: Translate) =>
  z.object({
    enabled: z.boolean(),
    position: z.enum(EARN_POSITIONS),
    variant: z.enum(EARN_VARIANTS),
    accent: z.enum(EARN_ACCENTS),
    eyebrow: copy(t, EARN_LIMITS.eyebrow),
    heading: copy(t, EARN_LIMITS.heading),
    heading_muted: copy(t, EARN_LIMITS.heading_muted),
    text: copy(t, EARN_LIMITS.text),
    cta_label: copy(t, EARN_LIMITS.cta_label),
    cta_url: copy(t, EARN_LIMITS.url).refine(
      (value) => value === '' || isHttpsUrl(value),
      t('websiteApp.earn.errHttps'),
    ),
    images: z
      .array(z.string().trim().refine(isHttpsUrl, t('websiteApp.earn.errHttps')))
      .max(EARN_LIMITS.images, t('websiteApp.earn.errImagesMax', { vars: { max: EARN_LIMITS.images } })),
    floating_enabled: z.boolean(),
    floating_label: copy(t, EARN_LIMITS.floating_label),
  });

export type EarnFormValues = z.input<ReturnType<typeof earnSchema>>;
export type EarnFormOutput = z.output<ReturnType<typeof earnSchema>>;

export const toEarnValues = (section: WebsiteEarnSection): EarnFormValues => ({
  enabled: section.enabled,
  position: section.position,
  variant: section.variant,
  accent: section.accent,
  eyebrow: section.eyebrow,
  heading: section.heading,
  heading_muted: section.heading_muted,
  text: section.text,
  cta_label: section.cta_label,
  cta_url: section.cta_url,
  images: section.images,
  floating_enabled: section.floating_enabled,
  floating_label: section.floating_label,
});

export const toEarnInput = (values: EarnFormOutput, site: EarnSite): WebsiteEarnSectionInput => ({
  site,
  ...values,
});

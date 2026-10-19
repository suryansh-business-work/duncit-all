import { z } from 'zod';
import { arr, bool, maxItems, maxLen, obj, shape, str, trim } from '@utils/zod-fields';
import { EARN_ACCENTS, EARN_LIMITS, EARN_POSITIONS, EARN_SITES, EARN_VARIANTS } from './websiteEarn.model';

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Blank is allowed (it means "use the default"); anything else must be https. */
const optionalHttps = (message: string) =>
  str(
    z
      .string()
      .check(maxLen(EARN_LIMITS.url))
      .refine((value) => value === '' || isHttpsUrl(value), message),
    { transforms: [trim], default: '' }
  );

const copy = (max: number) => str(z.string().check(maxLen(max)), { transforms: [trim], default: '' });

export const websiteEarnSectionInputSchema = obj(
  shape({
    site: str(z.enum(EARN_SITES), { oneOf: EARN_SITES, required: true }),
    enabled: bool(z.boolean(), { default: true }),
    position: str(z.enum(EARN_POSITIONS), { oneOf: EARN_POSITIONS, default: 'AFTER_REELS' }),
    variant: str(z.enum(EARN_VARIANTS), { oneOf: EARN_VARIANTS, default: 'WALL' }),
    accent: str(z.enum(EARN_ACCENTS), { oneOf: EARN_ACCENTS, default: 'PRIMARY' }),
    eyebrow: copy(EARN_LIMITS.eyebrow),
    heading: copy(EARN_LIMITS.heading),
    heading_muted: copy(EARN_LIMITS.heading_muted),
    text: copy(EARN_LIMITS.text),
    cta_label: copy(EARN_LIMITS.cta_label),
    cta_url: optionalHttps('The button link must be an https link'),
    images: arr(
      z
        .array(
          z
            .string()
            .trim()
            .refine(isHttpsUrl, 'Every image must be an https link')
        )
        .check(maxItems(EARN_LIMITS.images, `Up to ${EARN_LIMITS.images} images`)),
      { default: [] }
    ),
    floating_enabled: bool(z.boolean(), { default: true }),
    floating_label: copy(EARN_LIMITS.floating_label),
  })
);

export type WebsiteEarnSectionInput = z.infer<typeof websiteEarnSectionInputSchema>;

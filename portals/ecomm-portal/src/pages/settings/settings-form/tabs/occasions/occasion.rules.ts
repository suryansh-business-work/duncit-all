import { z } from 'zod';
import { numberText, toOptionalInt } from '../../../../../lib/format';
import { makeRules } from '../../../../../lib/rules';
import type { Translate } from '../../../../../lib/translate';
import type { StoreOccasion } from '../../../queries';

/** How many windows the tab lets an operator keep — a year of festivals, with room to spare. */
export const MAX_OCCASIONS = 20;

/** A CSS hex colour — `#RGB` or `#RRGGBB`. */
const HEX_COLOR = /^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/;

const isHexColor = (value: string) => value === '' || HEX_COLOR.test(value);

/** The end must come after the start; both are ISO strings from the picker. */
const endsAfterStart = (starts_at: string, ends_at: string) => Date.parse(ends_at) > Date.parse(starts_at);

/** Mirrors the server's `StoreOccasionInput`; the sort order stays text while it is typed. */
export const makeOccasionSchema = (t: Translate) => {
  const r = makeRules(t);
  const required = t('ecommPortal.form.required');
  return z
    .object({
      label: r.requiredText(60),
      slug: r.optionalText(60),
      starts_at: z.string().min(1, required),
      ends_at: z.string().min(1, required),
      logo_url: r.link(),
      favicon_url: r.link(),
      background_url: r.link(),
      background_color: z.string().trim().refine(isHexColor, t('ecommPortal.settings.occasionInvalidColor')),
      announcement_text: r.optionalText(200),
      is_active: z.boolean(),
      sort_order: r.whole(),
    })
    .superRefine((row, ctx) => {
      if (row.starts_at && row.ends_at && !endsAfterStart(row.starts_at, row.ends_at)) {
        ctx.addIssue({ code: 'custom', path: ['ends_at'], message: t('ecommPortal.settings.occasionEndsAfterStart') });
      }
    });
};

export const makeOccasionsSchema = (t: Translate) => z.object({ occasions: z.array(makeOccasionSchema(t)).max(MAX_OCCASIONS) });

export type OccasionValues = z.infer<ReturnType<typeof makeOccasionSchema>>;
export type OccasionsValues = z.infer<ReturnType<typeof makeOccasionsSchema>>;

/** A fresh row: switched on, with nothing chosen yet. */
export const blankOccasion = (): OccasionValues => ({
  label: '',
  slug: '',
  starts_at: '',
  ends_at: '',
  logo_url: '',
  favicon_url: '',
  background_url: '',
  background_color: '',
  announcement_text: '',
  is_active: true,
  sort_order: '',
});

export const toOccasionValues = (occasion: StoreOccasion): OccasionValues => ({
  label: occasion.label,
  slug: occasion.slug,
  starts_at: occasion.starts_at,
  ends_at: occasion.ends_at,
  logo_url: occasion.logo_url,
  favicon_url: occasion.favicon_url,
  background_url: occasion.background_url,
  background_color: occasion.background_color,
  announcement_text: occasion.announcement_text,
  is_active: occasion.is_active,
  sort_order: numberText(occasion.sort_order),
});

/** The server input — the sort order as a number, the dates as the ISO strings the picker kept. */
export const toOccasionInput = (occasion: OccasionValues) => ({
  ...occasion,
  sort_order: toOptionalInt(occasion.sort_order) ?? 0,
});

/** Whether the window contains `now` and the occasion is switched on — what the store shows this minute. */
export const isOccasionLive = (occasion: Pick<OccasionValues, 'starts_at' | 'ends_at' | 'is_active'>, now: Date): boolean => {
  if (!occasion.is_active || occasion.starts_at === '' || occasion.ends_at === '') return false;
  const at = now.getTime();
  return Date.parse(occasion.starts_at) <= at && at < Date.parse(occasion.ends_at);
};

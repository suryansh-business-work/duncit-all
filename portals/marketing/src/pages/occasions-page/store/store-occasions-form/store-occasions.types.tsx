import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { PUBLIC_URL_PATTERN } from '@duncit/forms';
import { isHexColor } from '@duncit/regex';
import type { StoreOccasionTheme } from '@duncit/gql-types';
import type { StoreOccasionRow } from '../queries';
import { STORE_THEMES } from '../store-themes';

/** The server keeps up to 24; the editor stops at a year of festivals with room to spare. */
export const MAX_STORE_OCCASIONS = 20;
export const MAX_GREETING = 80;

/** Blank, a path on the store, or a public link — what the storefront can load. */
const isAssetLink = (value: string) => value === '' || value.startsWith('/') || PUBLIC_URL_PATTERN.test(value);

const occasionSchema = (t: Translate) => {
  const required = t('marketing.storeOccasions.required');
  const link = z.string().trim().refine(isAssetLink, t('marketing.storeOccasions.invalidLink'));
  return z
    .object({
      label: z.string().trim().min(1, required).max(60, t('marketing.storeOccasions.tooLong')),
      slug: z.string().trim().max(60, t('marketing.storeOccasions.tooLong')),
      theme: z.enum(STORE_THEMES as [StoreOccasionTheme, ...StoreOccasionTheme[]]),
      effects_enabled: z.boolean(),
      greeting: z.string().trim().max(MAX_GREETING, t('marketing.storeOccasions.tooLong')),
      starts_at: z.string().min(1, required),
      ends_at: z.string().min(1, required),
      logo_url: link,
      favicon_url: link,
      background_url: link,
      background_color: z.string().trim().refine((value) => value === '' || isHexColor(value), t('marketing.storeOccasions.invalidColor')),
      announcement_text: z.string().trim().max(200, t('marketing.storeOccasions.tooLong')),
      is_active: z.boolean(),
      sort_order: z.coerce.number().int(t('marketing.storeOccasions.wholeNumber')),
    })
    .superRefine((row, ctx) => {
      if (row.starts_at && row.ends_at && Date.parse(row.ends_at) <= Date.parse(row.starts_at)) {
        ctx.addIssue({ code: 'custom', path: ['ends_at'], message: t('marketing.storeOccasions.endsAfterStart') });
      }
    });
};

export const storeOccasionsSchema = (t: Translate) => z.object({ occasions: z.array(occasionSchema(t)).max(MAX_STORE_OCCASIONS) });

export type StoreOccasionValues = Omit<StoreOccasionRow, 'theme'> & { theme: StoreOccasionTheme };

export interface StoreOccasionsValues {
  occasions: StoreOccasionValues[];
}

/** A fresh window: switched on, the house look with its animation on, nothing else chosen yet. */
export const blankStoreOccasion = (sortOrder: number): StoreOccasionValues => ({
  label: '',
  slug: '',
  theme: 'NONE',
  effects_enabled: true,
  greeting: '',
  starts_at: '',
  ends_at: '',
  logo_url: '',
  favicon_url: '',
  background_url: '',
  background_color: '',
  announcement_text: '',
  is_active: true,
  sort_order: sortOrder,
});

/** Only the input fields, in the order the server reads them (Apollo's `__typename` dropped). */
export const toStoreValues = (rows: readonly StoreOccasionRow[]): StoreOccasionsValues => ({
  occasions: rows.map((row) => ({
    label: row.label,
    slug: row.slug,
    theme: row.theme,
    effects_enabled: row.effects_enabled,
    greeting: row.greeting,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    logo_url: row.logo_url,
    favicon_url: row.favicon_url,
    background_url: row.background_url,
    background_color: row.background_color,
    announcement_text: row.announcement_text,
    is_active: row.is_active,
    sort_order: row.sort_order,
  })),
});

export const toStoreInput = (values: StoreOccasionsValues) =>
  values.occasions.map((occasion) => ({
    ...occasion,
    starts_at: new Date(occasion.starts_at).toISOString(),
    ends_at: new Date(occasion.ends_at).toISOString(),
  }));

export interface StoreOccasionsFormProps {
  occasions: readonly StoreOccasionRow[];
  onSubmit: (input: ReturnType<typeof toStoreInput>) => Promise<void>;
}

/** Whether the window is open now and switched on — what the storefront shows this minute. */
export const isStoreOccasionLive = (occasion: Pick<StoreOccasionValues, 'starts_at' | 'ends_at' | 'is_active'>, now: Date): boolean =>
  occasion.is_active && occasion.starts_at !== '' && occasion.ends_at !== '' && Date.parse(occasion.starts_at) <= now.getTime() && now.getTime() < Date.parse(occasion.ends_at);

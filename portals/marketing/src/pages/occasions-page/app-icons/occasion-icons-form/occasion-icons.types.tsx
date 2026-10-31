import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { isUrlSlug } from '@duncit/regex';
import type { OccasionIcon } from '../queries';

/** A year of festivals, with room to spare. */
export const MAX_ICONS = 20;

/** Slugs the native app ships its own art for — keep in step with app/mobile-app/src/assets/occasion-icons.ts. */
export const BUNDLED_SLUGS: readonly string[] = ['diwali', 'new-year', 'christmas', 'holi'];

const iconSchema = (t: Translate) =>
  z
    .object({
      slug: z
        .string()
        .trim()
        .min(1, t('marketing.occasionIcons.slugRequired'))
        .refine((slug) => isUrlSlug(slug.toLowerCase()), t('marketing.occasionIcons.slugShape')),
      label: z.string().trim().max(60, t('marketing.occasionIcons.labelTooLong')),
      starts_at: z.string().min(1, t('marketing.occasionIcons.dateRequired')),
      ends_at: z.string().min(1, t('marketing.occasionIcons.dateRequired')),
      icon_url: z.string(),
      fallback_icon: z.string(),
      is_active: z.boolean(),
      sort_order: z.coerce.number().int(t('marketing.occasionIcons.wholeNumber')),
    })
    .superRefine((row, ctx) => {
      if (row.starts_at && row.ends_at && Date.parse(row.ends_at) <= Date.parse(row.starts_at)) {
        ctx.addIssue({ code: 'custom', path: ['ends_at'], message: t('marketing.occasionIcons.endsAfterStart') });
      }
    });

export const occasionIconsSchema = (t: Translate) => z.object({ icons: z.array(iconSchema(t)).max(MAX_ICONS) });

export interface OccasionIconValues {
  slug: string;
  label: string;
  starts_at: string;
  ends_at: string;
  icon_url: string;
  fallback_icon: string;
  is_active: boolean;
  sort_order: number;
}

export interface OccasionIconsValues {
  icons: OccasionIconValues[];
}

/** A fresh window: switched on, the generic festive fallback, last in priority order. */
export const blankIcon = (sortOrder: number): OccasionIconValues => ({
  slug: '',
  label: '',
  starts_at: '',
  ends_at: '',
  icon_url: '',
  fallback_icon: 'occasion',
  is_active: true,
  sort_order: sortOrder,
});

/** Only the input fields — rows from the query carry Apollo's `__typename`, which the input type refuses. */
export const toIconValues = (icons: readonly OccasionIcon[]): OccasionIconsValues => ({
  icons: icons.map(({ slug, label, starts_at, ends_at, icon_url, fallback_icon, is_active, sort_order }) => ({
    slug,
    label,
    starts_at,
    ends_at,
    icon_url,
    fallback_icon: fallback_icon || 'occasion',
    is_active,
    sort_order,
  })),
});

export const toIconInput = (values: OccasionIconsValues) =>
  values.icons.map((icon) => ({
    ...icon,
    slug: icon.slug.trim().toLowerCase(),
    label: icon.label.trim(),
    starts_at: new Date(icon.starts_at).toISOString(),
    ends_at: new Date(icon.ends_at).toISOString(),
  }));

export interface OccasionIconsFormProps {
  icons: readonly OccasionIcon[];
  onSubmit: (input: ReturnType<typeof toIconInput>) => Promise<void>;
}

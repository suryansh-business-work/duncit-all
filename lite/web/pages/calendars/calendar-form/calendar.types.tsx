import { z } from 'zod';
import type { LiteCalendar } from '../../../../shared/graphql/documents';
import { THEME_ACCENT_KEYS } from '../../../../shared/tokens';
import type { LiteCalendarInput } from '../../../graphql/calendars';
import { blankToNull, rules, type Translate } from '../../../lib/validation';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Where a calendar's events happen: everywhere, or one city. */
export const CALENDAR_PLACES = ['GLOBAL', 'CITY'] as const;

export const makeCalendarSchema = (t: Translate) =>
  z
    .object({
      name: rules.required(t, 80),
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .max(60, t('liteWeb.validation.tooLong', { vars: { max: 60 } }))
        .refine((value) => value === '' || SLUG.test(value), t('liteWeb.validation.slugInvalid')),
      description: rules.optional(t, 1000),
      avatar_url: rules.optionalUrl(t),
      cover_url: rules.optionalUrl(t),
      tint: z.enum(THEME_ACCENT_KEYS),
      place: z.enum(CALENDAR_PLACES),
      city_slug: z.string(),
    })
    .refine((values) => values.place === 'GLOBAL' || values.city_slug !== '', { message: t('liteWeb.calendars.cityRequired'), path: ['city_slug'] });

export type CalendarValues = z.infer<ReturnType<typeof makeCalendarSchema>>;

export const calendarDefaults = (calendar: LiteCalendar | null): CalendarValues => ({
  name: calendar?.name ?? '',
  slug: calendar?.slug ?? '',
  description: calendar?.description ?? '',
  avatar_url: calendar?.avatar_url ?? '',
  cover_url: calendar?.cover_url ?? '',
  tint: calendar?.tint ?? 'DEFAULT',
  place: calendar?.city_slug ? 'CITY' : 'GLOBAL',
  city_slug: calendar?.city_slug ?? '',
});

export const toCalendarInput = (values: CalendarValues): LiteCalendarInput => ({
  name: values.name,
  slug: blankToNull(values.slug),
  description: blankToNull(values.description),
  avatar_url: blankToNull(values.avatar_url),
  cover_url: blankToNull(values.cover_url),
  // A global calendar keeps no city, even one picked before switching.
  city_slug: values.place === 'CITY' ? blankToNull(values.city_slug) : null,
  tint: values.tint,
});

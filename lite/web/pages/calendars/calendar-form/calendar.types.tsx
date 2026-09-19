import { z } from 'zod';
import type { LiteCalendar } from '../../../../shared/graphql/documents';
import type { LiteCalendarInput } from '../../../graphql/calendars';
import { blankToNull, rules, type Translate } from '../../../lib/validation';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const makeCalendarSchema = (t: Translate) =>
  z.object({
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
    city_slug: z.string(),
  });

export type CalendarValues = z.infer<ReturnType<typeof makeCalendarSchema>>;

export const calendarDefaults = (calendar: LiteCalendar | null): CalendarValues => ({
  name: calendar?.name ?? '',
  slug: calendar?.slug ?? '',
  description: calendar?.description ?? '',
  avatar_url: calendar?.avatar_url ?? '',
  cover_url: calendar?.cover_url ?? '',
  city_slug: calendar?.city_slug ?? '',
});

export const toCalendarInput = (values: CalendarValues): LiteCalendarInput => ({
  name: values.name,
  slug: blankToNull(values.slug),
  description: blankToNull(values.description),
  avatar_url: blankToNull(values.avatar_url),
  cover_url: blankToNull(values.cover_url),
  city_slug: blankToNull(values.city_slug),
});

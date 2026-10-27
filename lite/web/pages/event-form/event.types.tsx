import { z } from 'zod';
import { deviceTimeZone } from '../../../shared/format';
import type { LiteEvent, LiteMe, LitePublicSettings } from '../../../shared/graphql/documents';
import { SETTING_BOUNDS } from '../../../shared/limits';
import { EVENT_THEME_KEYS, THEME_ACCENT_KEYS } from '../../../shared/tokens';
import type { LiteEventInput } from '../../graphql/events';
import { splitOptions } from '../../lib/text';
import { blankToNull, digitsToNumber, rules, type Translate } from '../../lib/validation';

export const LOCATION_TYPES = ['IN_PERSON', 'VIRTUAL'] as const;
export const VISIBILITIES = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const;
export const QUESTION_TYPES = ['TEXT', 'LONG_TEXT', 'CHECKBOX', 'SELECT'] as const;

/** The console's limits, from the public settings; the API enforces the same ones. */
export interface EventLimits {
  maxCapacity: number;
  /** 0 means no ceiling beyond the platform's own. */
  maxPrice: number;
}

export const limitsFrom = (settings: Pick<LitePublicSettings, 'max_event_capacity' | 'max_ticket_price'>): EventLimits => ({
  maxCapacity: settings.max_event_capacity,
  // 0 in the console means "no ceiling of its own": the platform's outer bound still applies.
  maxPrice: settings.max_ticket_price > 0 ? settings.max_ticket_price : SETTING_BOUNDS.ticketPrice.max,
});

const ticketSchema = (t: Translate, limits: EventLimits) =>
  z.object({
    id: z.string(),
    name: rules.required(t, 60),
    description: rules.optional(t, 300),
    price: rules.count(t, { min: 0, max: limits.maxPrice }),
    quantity: rules.countOrBlank(t, { min: 1, max: limits.maxCapacity }),
    /** Seats already taken on this ticket; its quantity may not drop below it. */
    sold: z.number(),
    is_active: z.boolean(),
  });

const questionSchema = (t: Translate) =>
  z.object({ id: z.string(), label: rules.required(t, 200), type: z.enum(QUESTION_TYPES), required: z.boolean(), options: rules.optional(t, 1000) });

/** The same rules the API applies, so a host hears about a problem before the round trip. */
export const makeEventSchema = (t: Translate, limits: EventLimits) =>
  z
    .object({
      title: rules.required(t, 120),
      description: rules.required(t, 10_000),
      cover_url: rules.optionalUrl(t),
      start_at: z.date({ error: t('liteWeb.validation.dateRequired') }),
      end_at: z.date({ error: t('liteWeb.validation.dateRequired') }),
      timezone: z.string().min(1, t('liteWeb.validation.required')),
      location_type: z.enum(LOCATION_TYPES),
      venue_name: rules.optional(t, 120),
      address: rules.optional(t, 300),
      map_url: rules.optionalUrl(t),
      place_id: z.string(),
      lat: z.number().min(-90).max(90).nullable(),
      lng: z.number().min(-180).max(180).nullable(),
      city_slug: z.string(),
      virtual_link: rules.optionalUrl(t),
      category_id: z.string(),
      calendar_id: z.string(),
      visibility: z.enum(VISIBILITIES),
      capacity: rules.countOrBlank(t, { min: 1, max: limits.maxCapacity }),
      require_approval: z.boolean(),
      theme_key: z.enum(EVENT_THEME_KEYS),
      theme_accent: z.enum(THEME_ACCENT_KEYS),
      tickets: z.array(ticketSchema(t, limits)).min(1, t('liteWeb.validation.ticketsMin')),
      questions: z.array(questionSchema(t)),
      upi_id: rules.optionalUpi(t),
      upi_name: rules.optional(t, 80),
    })
    .superRefine((values, ctx) => {
      const issue = (path: (string | number)[], key: string, vars?: Record<string, number>) => ctx.addIssue({ code: 'custom', path, message: t(key, vars ? { vars } : undefined) });
      if (values.end_at.getTime() <= values.start_at.getTime()) issue(['end_at'], 'liteWeb.validation.endAfterStart');
      if (values.location_type === 'VIRTUAL' && !values.virtual_link) issue(['virtual_link'], 'liteWeb.validation.virtualLinkRequired');
      if (values.location_type === 'IN_PERSON' && !values.venue_name && !values.address) issue(['venue_name'], 'liteWeb.validation.venueRequired');
      if (values.tickets.some((ticket) => Number.parseInt(ticket.price, 10) > 0) && !values.upi_id) issue(['upi_id'], 'liteWeb.validation.upiRequired');
      values.tickets.forEach((ticket, index) => {
        const quantity = digitsToNumber(ticket.quantity);
        if (quantity != null && quantity < ticket.sold) issue(['tickets', index, 'quantity'], 'liteWeb.validation.belowSold', { sold: ticket.sold });
      });
      values.questions.forEach((question, index) => {
        if (question.type === 'SELECT' && splitOptions(question.options).length < 2) issue(['questions', index, 'options'], 'liteWeb.validation.optionsMin');
      });
    });

export type EventFormValues = z.infer<ReturnType<typeof makeEventSchema>>;
export type TicketValues = EventFormValues['tickets'][number];
export type QuestionValues = EventFormValues['questions'][number];

/** The next full hour, so a fresh form never proposes a time already gone. */
const nextHour = (): Date => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
};

export const emptyTicket = (name: string): TicketValues => ({ id: '', name, description: '', price: '0', quantity: '', sold: 0, is_active: true });
export const emptyQuestion = (): QuestionValues => ({ id: '', label: '', type: 'TEXT', required: false, options: '' });

const ticketValues = (event: LiteEvent): TicketValues[] =>
  event.tickets.map((ticket) => ({
    id: ticket.id,
    name: ticket.name,
    description: ticket.description ?? '',
    price: String(ticket.price),
    quantity: ticket.quantity == null ? '' : String(ticket.quantity),
    sold: ticket.sold,
    is_active: ticket.is_active,
  }));

export function eventDefaults(event: LiteEvent | null, me: LiteMe | null, defaultTicketName: string): EventFormValues {
  const start = event ? new Date(event.start_at) : nextHour();
  const end = event ? new Date(event.end_at) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: event?.title ?? '',
    description: event?.description ?? '',
    cover_url: event?.cover_url ?? '',
    start_at: start,
    end_at: end,
    timezone: event?.timezone ?? deviceTimeZone(),
    location_type: event?.location_type ?? 'IN_PERSON',
    venue_name: event?.venue_name ?? '',
    address: event?.address ?? '',
    map_url: event?.map_url ?? '',
    place_id: event?.place_id ?? '',
    lat: event?.lat ?? null,
    lng: event?.lng ?? null,
    city_slug: event?.city_slug ?? '',
    virtual_link: event?.virtual_link ?? '',
    category_id: event?.category?.id ?? '',
    calendar_id: event?.calendar?.id ?? '',
    visibility: event?.visibility ?? 'PUBLIC',
    capacity: event?.capacity == null ? '' : String(event.capacity),
    require_approval: event?.require_approval ?? false,
    theme_key: event?.theme.key ?? 'MINIMAL',
    theme_accent: event?.theme.accent ?? 'DEFAULT',
    tickets: event ? ticketValues(event) : [emptyTicket(defaultTicketName)],
    questions: event
      ? event.questions.map((question) => ({ id: question.id, label: question.label, type: question.type, required: question.required, options: question.options.join('\n') }))
      : [],
    upi_id: event?.upi_id ?? me?.upi_id ?? '',
    upi_name: event?.upi_name ?? me?.upi_name ?? '',
  };
}

export function toEventInput(values: EventFormValues): LiteEventInput {
  const pinned = values.location_type === 'IN_PERSON' && values.lat != null && values.lng != null;
  return {
    title: values.title,
    description: values.description,
    cover_url: blankToNull(values.cover_url),
    start_at: values.start_at.toISOString(),
    end_at: values.end_at.toISOString(),
    timezone: values.timezone,
    location_type: values.location_type,
    address: blankToNull(values.address),
    venue_name: blankToNull(values.venue_name),
    map_url: blankToNull(values.map_url),
    place_id: pinned ? blankToNull(values.place_id) : null,
    lat: pinned ? values.lat : null,
    lng: pinned ? values.lng : null,
    city_slug: blankToNull(values.city_slug),
    virtual_link: blankToNull(values.virtual_link),
    category_id: blankToNull(values.category_id),
    calendar_id: blankToNull(values.calendar_id),
    visibility: values.visibility,
    capacity: digitsToNumber(values.capacity),
    require_approval: values.require_approval,
    theme: { key: values.theme_key, accent: values.theme_accent },
    tickets: values.tickets.map((ticket) => ({
      id: ticket.id || undefined,
      name: ticket.name,
      description: ticket.description || undefined,
      price: Number.parseInt(ticket.price, 10),
      quantity: digitsToNumber(ticket.quantity),
      is_active: ticket.is_active,
    })),
    questions: values.questions.map((question) => ({
      id: question.id || undefined,
      label: question.label,
      type: question.type,
      required: question.required,
      options: question.type === 'SELECT' ? splitOptions(question.options) : [],
    })),
    upi_id: blankToNull(values.upi_id),
    upi_name: blankToNull(values.upi_name),
  };
}

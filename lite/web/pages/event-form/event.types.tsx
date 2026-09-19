import { z } from 'zod';
import { deviceTimeZone } from '../../../shared/format';
import type { LiteEvent, LiteMe } from '../../../shared/graphql/documents';
import type { LiteEventInput } from '../../graphql/events';
import { splitOptions } from '../../lib/text';
import { blankToNull, digitsToNumber, rules, type Translate } from '../../lib/validation';

export const LOCATION_TYPES = ['IN_PERSON', 'VIRTUAL'] as const;
export const VISIBILITIES = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const;
export const QUESTION_TYPES = ['TEXT', 'LONG_TEXT', 'CHECKBOX', 'SELECT'] as const;

/** The same rules the API applies, so a host hears about a problem before the round trip. */
export const makeEventSchema = (t: Translate) =>
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
      city_slug: z.string(),
      virtual_link: rules.optionalUrl(t),
      category_id: z.string(),
      calendar_id: z.string(),
      visibility: z.enum(VISIBILITIES),
      capacity: rules.wholeNumberOrBlank(t),
      require_approval: z.boolean(),
      tickets: z
        .array(
          z.object({
            id: z.string(),
            name: rules.required(t, 80),
            description: rules.optional(t, 200),
            price: rules.wholeNumber(t),
            quantity: rules.wholeNumberOrBlank(t),
            is_active: z.boolean(),
          }),
        )
        .min(1, t('liteWeb.validation.ticketsMin')),
      questions: z.array(
        z.object({
          id: z.string(),
          label: rules.required(t, 200),
          type: z.enum(QUESTION_TYPES),
          required: z.boolean(),
          options: rules.optional(t, 1000),
        }),
      ),
      upi_id: rules.optionalUpi(t),
      upi_name: rules.optional(t, 80),
    })
    .superRefine((values, ctx) => {
      if (values.end_at.getTime() <= values.start_at.getTime()) {
        ctx.addIssue({ code: 'custom', path: ['end_at'], message: t('liteWeb.validation.endAfterStart') });
      }
      if (values.location_type === 'VIRTUAL' && !values.virtual_link) {
        ctx.addIssue({ code: 'custom', path: ['virtual_link'], message: t('liteWeb.validation.virtualLinkRequired') });
      }
      if (values.location_type === 'IN_PERSON' && !values.venue_name && !values.address) {
        ctx.addIssue({ code: 'custom', path: ['venue_name'], message: t('liteWeb.validation.venueRequired') });
      }
      if (values.tickets.some((ticket) => Number.parseInt(ticket.price, 10) > 0) && !values.upi_id) {
        ctx.addIssue({ code: 'custom', path: ['upi_id'], message: t('liteWeb.validation.upiRequired') });
      }
      values.questions.forEach((question, index) => {
        if (question.type === 'SELECT' && splitOptions(question.options).length < 2) {
          ctx.addIssue({ code: 'custom', path: ['questions', index, 'options'], message: t('liteWeb.validation.optionsMin') });
        }
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

export const emptyTicket = (name: string): TicketValues => ({ id: '', name, description: '', price: '0', quantity: '', is_active: true });
export const emptyQuestion = (): QuestionValues => ({ id: '', label: '', type: 'TEXT', required: false, options: '' });

export function eventDefaults(event: LiteEvent | null, me: LiteMe | null, defaultTicketName: string): EventFormValues {
  const start = event ? new Date(event.start_at) : nextHour();
  const end = event ? new Date(event.end_at) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
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
    city_slug: event?.city_slug ?? '',
    virtual_link: event?.virtual_link ?? '',
    category_id: event?.category?.id ?? '',
    calendar_id: event?.calendar?.id ?? '',
    visibility: event?.visibility ?? 'PUBLIC',
    capacity: event?.capacity == null ? '' : String(event.capacity),
    require_approval: event?.require_approval ?? false,
    tickets: event
      ? event.tickets.map((ticket) => ({
          id: ticket.id,
          name: ticket.name,
          description: ticket.description ?? '',
          price: String(ticket.price),
          quantity: ticket.quantity == null ? '' : String(ticket.quantity),
          is_active: ticket.is_active,
        }))
      : [emptyTicket(defaultTicketName)],
    questions: event
      ? event.questions.map((question) => ({ id: question.id, label: question.label, type: question.type, required: question.required, options: question.options.join('\n') }))
      : [],
    upi_id: event?.upi_id ?? me?.upi_id ?? '',
    upi_name: event?.upi_name ?? me?.upi_name ?? '',
  };
}

export function toEventInput(values: EventFormValues): LiteEventInput {
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
    city_slug: blankToNull(values.city_slug),
    virtual_link: blankToNull(values.virtual_link),
    category_id: blankToNull(values.category_id),
    calendar_id: blankToNull(values.calendar_id),
    visibility: values.visibility,
    capacity: digitsToNumber(values.capacity),
    require_approval: values.require_approval,
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

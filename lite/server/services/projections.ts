import { formatInTimeZone } from 'date-fns-tz';
import { env } from '../config/env';
import { LiteCalendarModel } from '../models/calendar.model';
import { LiteCategoryModel } from '../models/category.model';
import { LiteCityModel } from '../models/city.model';
import { LiteEventModel } from '../models/event.model';
import { LiteRegistrationModel, SEAT_HOLDING } from '../models/registration.model';
import { LiteSubscriptionModel } from '../models/subscription.model';
import { LiteUserModel } from '../models/user.model';
import { iso } from '../utils/ids';

/**
 * The GraphQL shapes of the domain documents. Every resolver answers through
 * these so a field is computed one way — who may see the virtual link, what
 * counts as "going" — wherever the document is read from.
 */
export interface Viewer {
  id: string;
  is_admin: boolean;
}

const idOf = (value: unknown): string => String(value);

export function isHostOf(event: { hosts: { user_id: unknown }[] }, viewer: Viewer | null): boolean {
  if (!viewer) return false;
  return event.hosts.some((h) => idOf(h.user_id) === viewer.id);
}

export async function eventStats(eventId: unknown) {
  const rows = await LiteRegistrationModel.aggregate<{ _id: string; n: number; seats: number; paid: number; checked: number }>([
    { $match: { event_id: eventId } },
    {
      $group: {
        _id: '$status',
        n: { $sum: 1 },
        seats: { $sum: '$quantity' },
        paid: { $sum: { $cond: [{ $eq: ['$payment_status', 'PAID'] }, '$amount_due', 0] } },
        checked: { $sum: { $cond: [{ $ne: ['$checked_in_at', null] }, 1, 0] } },
      },
    },
  ]);
  const by = new Map(rows.map((r) => [r._id, r]));
  return {
    going: by.get('CONFIRMED')?.seats ?? 0,
    waitlisted: by.get('WAITLISTED')?.n ?? 0,
    pending: by.get('PENDING_APPROVAL')?.n ?? 0,
    payment_pending: by.get('PAYMENT_PENDING')?.n ?? 0,
    checked_in: by.get('CONFIRMED')?.checked ?? 0,
    revenue_confirmed: rows.reduce((sum, r) => sum + r.paid, 0),
  };
}

/** Seats held against capacity: confirmed plus the ones waiting on the host. */
export async function seatsHeld(eventId: unknown): Promise<number> {
  const rows = await LiteRegistrationModel.aggregate<{ seats: number }>([
    { $match: { event_id: eventId, status: { $in: SEAT_HOLDING } } },
    { $group: { _id: null, seats: { $sum: '$quantity' } } },
  ]);
  return rows[0]?.seats ?? 0;
}

export function formatWhen(event: { start_at: Date; end_at: Date; timezone: string }): string {
  const zone = event.timezone || 'Asia/Kolkata';
  const start = formatInTimeZone(event.start_at, zone, 'EEE, d MMM yyyy · h:mm a');
  const sameDay = formatInTimeZone(event.start_at, zone, 'yyyy-MM-dd') === formatInTimeZone(event.end_at, zone, 'yyyy-MM-dd');
  const end = formatInTimeZone(event.end_at, zone, sameDay ? 'h:mm a' : 'EEE, d MMM yyyy · h:mm a');
  return `${start} – ${end} (${zone})`;
}

export function formatWhere(event: { location_type: string; venue_name: string; address: string; city_slug: string }, cityName = ''): string {
  if (event.location_type === 'VIRTUAL') return 'Online (link shared with confirmed guests)';
  return [event.venue_name, event.address, cityName].filter(Boolean).join(', ') || 'To be announced';
}

async function hostsOf(event: { hosts: { user_id: unknown; role: string }[] }) {
  const ids = event.hosts.map((h) => h.user_id);
  const users = await LiteUserModel.find({ _id: { $in: ids } }).lean();
  const by = new Map(users.map((u) => [idOf(u._id), u]));
  return event.hosts
    .map((h) => {
      const u = by.get(idOf(h.user_id));
      return u ? { user_id: idOf(u._id), name: u.name, handle: u.handle, avatar_url: u.avatar_url || null, role: h.role } : null;
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);
}

export async function toPublicCalendar(doc: any, viewer: Viewer | null) {
  const [owner, city, upcoming, subscribed] = await Promise.all([
    LiteUserModel.findById(doc.owner_id).lean(),
    doc.city_slug ? LiteCityModel.findOne({ slug: doc.city_slug }).lean() : null,
    LiteEventModel.countDocuments({ calendar_id: doc._id, status: 'PUBLISHED', hidden: false, visibility: 'PUBLIC', end_at: { $gte: new Date() } }),
    viewer ? LiteSubscriptionModel.exists({ calendar_id: doc._id, user_id: viewer.id }) : null,
  ]);
  return {
    id: idOf(doc._id),
    slug: doc.slug,
    name: doc.name,
    description: doc.description || null,
    avatar_url: doc.avatar_url || null,
    cover_url: doc.cover_url || null,
    city_slug: doc.city_slug || null,
    city_name: city?.name ?? null,
    owner: owner
      ? { id: idOf(owner._id), name: owner.name, handle: owner.handle, avatar_url: owner.avatar_url || null }
      : { id: idOf(doc.owner_id), name: 'Host', handle: '', avatar_url: null },
    featured: Boolean(doc.featured),
    subscriber_count: doc.subscriber_count ?? 0,
    upcoming_count: upcoming,
    viewer_subscribed: Boolean(subscribed),
    viewer_is_owner: viewer ? idOf(doc.owner_id) === viewer.id : false,
    created_at: iso(doc.created_at) ?? '',
  };
}

export function toPublicRegistration(doc: any, event: any, user: any) {
  return {
    id: idOf(doc._id),
    code: doc.code,
    event,
    ticket: { id: doc.ticket_id, name: doc.ticket_name, price: doc.ticket_price ?? 0 },
    quantity: doc.quantity ?? 1,
    amount_due: doc.amount_due ?? 0,
    status: doc.status,
    payment_status: doc.payment_status,
    payment_reference: doc.payment_reference || null,
    payment_note: doc.payment_note || null,
    payment_confirmed_at: iso(doc.payment_confirmed_at),
    answers: (doc.answers ?? []).map((a: any) => ({ question_id: a.question_id, label: a.label, answer: a.answer })),
    checked_in_at: iso(doc.checked_in_at),
    waitlist_position: doc.waitlist_position ?? null,
    user: user
      ? { id: idOf(user._id), name: user.name, email: user.email, handle: user.handle, avatar_url: user.avatar_url || null }
      : { id: idOf(doc.user_id), name: doc.user_name, email: doc.user_email, handle: '', avatar_url: null },
    created_at: iso(doc.created_at) ?? '',
  };
}

export interface EventProjectionOptions {
  /** Skip the viewer's own registration (the registration resolver embeds the event, not the other way round). */
  withoutViewerRegistration?: boolean;
}

export async function toPublicEvent(doc: any, viewer: Viewer | null, options: EventProjectionOptions = {}): Promise<any> {
  const isHost = isHostOf(doc, viewer) || Boolean(viewer?.is_admin);
  const [category, calendar, city, hosts, stats, ownRegistration] = await Promise.all([
    doc.category_id ? LiteCategoryModel.findById(doc.category_id).lean() : null,
    doc.calendar_id ? LiteCalendarModel.findById(doc.calendar_id).lean() : null,
    doc.city_slug ? LiteCityModel.findOne({ slug: doc.city_slug }).lean() : null,
    hostsOf(doc),
    eventStats(doc._id),
    viewer && !options.withoutViewerRegistration ? LiteRegistrationModel.findOne({ event_id: doc._id, user_id: viewer.id }).lean() : null,
  ]);
  const confirmedGuest = ownRegistration?.status === 'CONFIRMED';
  const hasPaid = doc.tickets.some((t: any) => t.price > 0);
  const eventPublic = {
    id: idOf(doc._id),
    slug: doc.slug,
    title: doc.title,
    description: doc.description ?? '',
    cover_url: doc.cover_url || null,
    start_at: doc.start_at.toISOString(),
    end_at: doc.end_at.toISOString(),
    timezone: doc.timezone,
    location_type: doc.location_type,
    address: doc.address || null,
    venue_name: doc.venue_name || null,
    map_url: doc.map_url || null,
    city_slug: doc.city_slug || null,
    city_name: city?.name ?? null,
    virtual_link: isHost || confirmedGuest ? doc.virtual_link || null : null,
    category: category ? { id: idOf(category._id), name: category.name, slug: category.slug, icon: category.icon || null, sort_order: category.sort_order ?? 0, is_active: category.is_active !== false, events_count: 0 } : null,
    calendar: calendar ? await toPublicCalendar(calendar, viewer) : null,
    hosts,
    visibility: doc.visibility,
    status: doc.status,
    capacity: doc.capacity ?? null,
    require_approval: Boolean(doc.require_approval),
    tickets: (doc.tickets ?? []).map((t: any) => ({ id: idOf(t._id), name: t.name, description: t.description || null, price: t.price ?? 0, quantity: t.quantity ?? null, sold: t.sold ?? 0, is_active: t.is_active !== false })),
    questions: (doc.questions ?? []).map((q: any) => ({ id: idOf(q._id), label: q.label, type: q.type, required: Boolean(q.required), options: q.options ?? [] })),
    upi_id: hasPaid ? doc.upi_id || null : null,
    upi_name: hasPaid ? doc.upi_name || null : null,
    featured: Boolean(doc.featured),
    hidden: Boolean(doc.hidden),
    stats,
    viewer_registration: null as unknown,
    viewer_is_host: isHostOf(doc, viewer),
    created_at: iso(doc.created_at) ?? '',
    updated_at: iso(doc.updated_at) ?? '',
    published_at: iso(doc.published_at),
    cancelled_at: iso(doc.cancelled_at),
    cancel_reason: doc.cancel_reason || null,
  };
  if (ownRegistration) {
    const owner = await LiteUserModel.findById(ownRegistration.user_id).lean();
    eventPublic.viewer_registration = toPublicRegistration(ownRegistration, { ...eventPublic, viewer_registration: null }, owner);
  }
  return eventPublic;
}

export const eventUrl = (slug: string): string => `${env.siteUrl}/e/${slug}`;
export const manageUrl = (slug: string): string => `${env.siteUrl}/e/${slug}/manage`;
export const ticketUrl = (id: unknown): string => `${env.siteUrl}/tickets/${idOf(id)}`;

import { LiteCalendarModel } from '../models/calendar.model';
import { LiteCategoryModel } from '../models/category.model';
import { LiteCityModel } from '../models/city.model';
import {
  EVENT_THEMES,
  LiteEventModel,
  LOCATION_TYPES,
  QUESTION_TYPES,
  THEME_ACCENTS,
  VISIBILITIES,
  type EventTheme,
  type LiteEvent,
  type LiteEventDoc,
  type ThemeAccent,
} from '../models/event.model';
import { LiteEventViewModel } from '../models/eventView.model';
import { LAPSED_STATUSES, LiteRegistrationModel } from '../models/registration.model';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { badInput, forbidden, notFound } from '../utils/errors';
import { uniqueSlug } from '../utils/slug';
import { URL_SLUG, cleanText, coordinate, isObjectId, normalizeEmail, optionalUpi, optionalUrl, optionalWholeNumber, parseInstant, validTimezone, wholeNumber } from '../utils/validate';
import { notifications } from './notifications';
import { isHostOf, seatsHeld, toPublicEvent, type Viewer } from './projections';
import { SETTING_BOUNDS, settingsService } from './settings.service';

export interface TicketInput {
  id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  quantity?: number | null;
  is_active?: boolean | null;
}

export interface QuestionInput {
  id?: string | null;
  label: string;
  type: string;
  required?: boolean | null;
  options?: string[] | null;
}

export interface EventInput {
  title: string;
  description: string;
  cover_url?: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: string;
  address?: string | null;
  venue_name?: string | null;
  map_url?: string | null;
  city_slug?: string | null;
  virtual_link?: string | null;
  category_id?: string | null;
  calendar_id?: string | null;
  visibility: string;
  capacity?: number | null;
  require_approval?: boolean | null;
  tickets: TicketInput[];
  questions?: QuestionInput[] | null;
  upi_id?: string | null;
  upi_name?: string | null;
  place_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  registration_open?: boolean | null;
  theme?: { key?: string | null; accent?: string | null } | null;
}

const viewerOf = (user: LiteUserDoc | null): Viewer | null => (user ? { id: String(user._id), is_admin: user.is_admin } : null);

async function requireHosted(id: string, user: LiteUserDoc): Promise<LiteEventDoc> {
  const doc = await LiteEventModel.findById(id);
  if (!doc) throw notFound('Event');
  if (!isHostOf(doc, viewerOf(user)) && !user.is_admin) throw forbidden('Only a host of this event can do that');
  return doc;
}

/** The limits a host's numbers are checked against, from the console's settings. */
interface EventLimits {
  maxPrice: number;
  maxCapacity: number;
}

function cleanTickets(input: TicketInput[], existing: any[], limits: EventLimits) {
  if (!input.length) throw badInput('Add at least one ticket type');
  // 0 in the console means "no ceiling"; the settings' own outer bound still applies.
  const priceCeiling = limits.maxPrice > 0 ? limits.maxPrice : SETTING_BOUNDS.ticketPrice.max;
  return input.map((t) => {
    const name = cleanText(t.name, 60, 'Ticket name', true);
    const price = wholeNumber(t.price, `Price of ${name}`, { min: 0, max: priceCeiling });
    const quantity = optionalWholeNumber(t.quantity, `Seats on ${name}`, { min: 1, max: limits.maxCapacity });
    const prior = t.id ? existing.find((e) => String(e._id) === t.id) : null;
    // Seats already sold on a ticket cannot be taken back by shrinking it.
    if (prior && quantity != null && quantity < (prior.sold ?? 0)) throw badInput(`${name} already has ${prior.sold} seats taken; it cannot drop below that`);
    return {
      ...(prior ? { _id: prior._id, sold: prior.sold } : {}),
      name,
      description: cleanText(t.description, 300, 'Ticket description'),
      price,
      quantity,
      is_active: t.is_active !== false,
    };
  });
}

/** A capacity of at least 1 within the console's ceiling, and never below the seats already held. */
async function cleanCapacity(doc: LiteEventDoc, requested: number | null | undefined, maxCapacity: number): Promise<number | null> {
  const capacity = optionalWholeNumber(requested, 'Capacity', { min: 1, max: maxCapacity });
  if (capacity != null && !doc.isNew) {
    const held = await seatsHeld(doc._id);
    if (capacity < held) throw badInput(`${held} seats are already taken, so the capacity cannot be lower than ${held}`);
  }
  return capacity;
}

function applyTheme(doc: LiteEventDoc, theme: EventInput['theme']): void {
  if (!theme) return;
  if (theme.key != null) {
    if (!EVENT_THEMES.includes(theme.key as EventTheme)) throw badInput('Pick a theme from the list');
    doc.set('theme.key', theme.key);
  }
  if (theme.accent != null) {
    if (!THEME_ACCENTS.includes(theme.accent as ThemeAccent)) throw badInput('Pick a colour from the list');
    doc.set('theme.accent', theme.accent);
  }
}

function cleanQuestions(input: QuestionInput[] | null | undefined, existing: any[]) {
  return (input ?? []).map((q) => {
    if (!QUESTION_TYPES.includes(q.type as any)) throw badInput('Unknown question type');
    const prior = q.id ? existing.find((e) => String(e._id) === q.id) : null;
    const options = (q.options ?? []).map((o) => cleanText(o, 80, 'Option')).filter(Boolean);
    if (q.type === 'SELECT' && options.length < 2) throw badInput('A choice question needs at least two options');
    return { ...(prior ? { _id: prior._id } : {}), label: cleanText(q.label, 200, 'Question', true), type: q.type, required: Boolean(q.required), options };
  });
}

function applySchedule(doc: LiteEventDoc, input: EventInput): void {
  const start = parseInstant(input.start_at, 'Start');
  const end = parseInstant(input.end_at, 'End');
  if (end.getTime() <= start.getTime()) throw badInput('The event must end after it starts');
  doc.start_at = start;
  doc.end_at = end;
  doc.timezone = validTimezone(input.timezone);
}

function applyPlace(doc: LiteEventDoc, input: EventInput): void {
  if (!LOCATION_TYPES.includes(input.location_type as any)) throw badInput('Unknown location type');
  doc.location_type = input.location_type as any;
  doc.address = cleanText(input.address, 300, 'Address');
  doc.venue_name = cleanText(input.venue_name, 120, 'Venue');
  doc.map_url = optionalUrl(input.map_url, 'Map link');
  doc.virtual_link = optionalUrl(input.virtual_link, 'Join link');
  if (doc.location_type === 'VIRTUAL' && !doc.virtual_link) throw badInput('Add the join link for an online event');
  if (doc.location_type === 'IN_PERSON' && !doc.address && !doc.venue_name) throw badInput('Add a venue or an address');
  // A pin only makes sense for a real place, and only as a pair.
  const pinned = doc.location_type === 'IN_PERSON' && input.lat != null && input.lng != null;
  doc.place_id = pinned ? cleanText(input.place_id, 300, 'Place') : '';
  doc.lat = pinned ? coordinate(input.lat, 'Latitude') : null;
  doc.lng = pinned ? coordinate(input.lng, 'Longitude') : null;
}

function applyPayment(doc: LiteEventDoc, input: EventInput, user: LiteUserDoc): void {
  const upiId = optionalUpi(input.upi_id) || user.upi_id;
  const hasPaid = doc.tickets.some((t) => t.price > 0);
  if (hasPaid && !upiId) throw badInput('Add your UPI ID so guests can pay you for a paid ticket');
  doc.upi_id = hasPaid ? upiId : '';
  doc.upi_name = hasPaid ? cleanText(input.upi_name, 80, 'UPI payee name') || user.upi_name || user.name : '';
}

async function resolveCity(slug: string | null | undefined): Promise<string> {
  if (!slug) return '';
  const city = await LiteCityModel.findOne({ slug: slug.toLowerCase(), is_active: true }).lean();
  if (!city) throw badInput('Pick a city from the list');
  return city.slug;
}

async function resolveCategory(id: string | null | undefined): Promise<any> {
  if (!id) return null;
  if (!isObjectId(id) || !(await LiteCategoryModel.exists({ _id: id, is_active: true }))) throw badInput('Pick a category from the list');
  return id;
}

async function resolveCalendar(id: string | null | undefined, user: LiteUserDoc): Promise<any> {
  if (!id) return null;
  const calendar = isObjectId(id) ? await LiteCalendarModel.findById(id).lean() : null;
  if (!calendar || String(calendar.owner_id) !== String(user._id)) throw badInput('Pick one of your own calendars');
  return calendar._id;
}

async function applyInput(doc: LiteEventDoc, input: EventInput, user: LiteUserDoc): Promise<void> {
  const settings = await settingsService.get();
  if (!VISIBILITIES.includes(input.visibility as any)) throw badInput('Unknown visibility');
  doc.title = cleanText(input.title, 120, 'Title', true);
  doc.description = cleanText(input.description, 10_000, 'Description', true);
  doc.cover_url = optionalUrl(input.cover_url, 'Cover image');
  applySchedule(doc, input);
  applyPlace(doc, input);
  doc.visibility = input.visibility as any;
  const limits: EventLimits = { maxPrice: settings.max_ticket_price ?? 0, maxCapacity: settings.max_event_capacity ?? SETTING_BOUNDS.eventCapacity.max };
  doc.capacity = await cleanCapacity(doc, input.capacity, limits.maxCapacity);
  doc.require_approval = Boolean(input.require_approval);
  if (input.registration_open != null) doc.registration_open = input.registration_open;
  applyTheme(doc, input.theme);
  doc.tickets = cleanTickets(input.tickets, doc.tickets as any[], limits) as any;
  doc.questions = cleanQuestions(input.questions, doc.questions as any[]) as any;
  applyPayment(doc, input, user);
  doc.city_slug = await resolveCity(input.city_slug);
  doc.category_id = await resolveCategory(input.category_id);
  doc.calendar_id = await resolveCalendar(input.calendar_id, user);
}

type VisibleEvent = Pick<LiteEvent, 'status' | 'hidden' | 'visibility'> & { _id: unknown; hosts: { user_id: unknown }[] };

export const eventService = {
  /**
   * Whether the viewer may see the event at all. Hosts and admins always can;
   * anyone else only once it is out of draft and not hidden, and a PRIVATE
   * event only when they already hold a registration for it.
   */
  async isVisibleTo(doc: VisibleEvent, viewer: Viewer | null): Promise<boolean> {
    if (isHostOf(doc, viewer) || viewer?.is_admin) return true;
    if (doc.status === 'DRAFT' || doc.hidden) return false;
    if (doc.visibility !== 'PRIVATE') return true;
    if (!viewer) return false;
    return Boolean(await LiteRegistrationModel.exists({ event_id: doc._id, user_id: viewer.id }));
  },

  async bySlug(slug: string, user: LiteUserDoc | null) {
    const doc = await LiteEventModel.findOne({ slug: slug.toLowerCase() }).lean();
    if (!doc) return null;
    const viewer = viewerOf(user);
    if (!(await eventService.isVisibleTo(doc, viewer))) return null;
    return toPublicEvent(doc, viewer);
  },

  async create(user: LiteUserDoc, input: EventInput) {
    const doc = new LiteEventModel({ slug: 'pending', hosts: [{ user_id: user._id, role: 'HOST' }] });
    await applyInput(doc, input, user);
    doc.slug = await uniqueSlug(doc.title, async (s) => Boolean(await LiteEventModel.exists({ slug: s })), 'event');
    await doc.save();
    return toPublicEvent(doc, viewerOf(user));
  },

  async update(user: LiteUserDoc, id: string, input: EventInput) {
    const doc = await requireHosted(id, user);
    if (doc.status === 'CANCELLED') throw badInput('A cancelled event cannot be edited');
    await applyInput(doc, input, user);
    await doc.save();
    return toPublicEvent(doc, viewerOf(user));
  },

  async publish(user: LiteUserDoc, id: string) {
    const doc = await requireHosted(id, user);
    if (doc.status === 'CANCELLED') throw badInput('A cancelled event cannot be published');
    const first = doc.status === 'DRAFT';
    doc.status = 'PUBLISHED';
    doc.published_at ??= new Date();
    await doc.save();
    if (first && doc.calendar_id && doc.visibility === 'PUBLIC') notifications.calendarPublished(doc, doc.calendar_id);
    return toPublicEvent(doc, viewerOf(user));
  },

  async cancel(user: LiteUserDoc, id: string, reason: string | null | undefined, byAdmin = false) {
    const doc = byAdmin ? await LiteEventModel.findById(id) : await requireHosted(id, user);
    if (!doc) throw notFound('Event');
    if (doc.status === 'CANCELLED') return toPublicEvent(doc, viewerOf(user));
    doc.status = 'CANCELLED';
    doc.cancelled_at = new Date();
    doc.cancel_reason = cleanText(reason, 500, 'Reason');
    await doc.save();
    notifications.eventCancelled(doc);
    return toPublicEvent(doc, viewerOf(user));
  },

  /**
   * Delete an event for good. Only its creator may (not a co-host), and only
   * while nobody holds a place on it (every registration cancelled or
   * declined) and no guest's payment is on record, which a delete would erase.
   * The delete itself is one conditional write that also needs every ticket's
   * sold count at 0: a guest takes their seat on the event before their
   * registration is written, so one registering at this moment stops it.
   */
  async remove(user: LiteUserDoc, id: string) {
    const doc = await LiteEventModel.findById(id);
    if (!doc) throw notFound('Event');
    const creator = { user_id: user._id, role: 'HOST' };
    if (!doc.hosts.some((h) => String(h.user_id) === String(user._id) && h.role === 'HOST')) throw forbidden('Only the person who created this event can delete it');
    const holding = await LiteRegistrationModel.countDocuments({ event_id: doc._id, status: { $nin: [...LAPSED_STATUSES] } });
    if (holding > 0) {
      throw badInput(`${holding} ${holding === 1 ? 'guest is' : 'guests are'} still registered. An event can be deleted once every spot is cancelled; you can cancel the event instead`);
    }
    const paid = await LiteRegistrationModel.exists({ event_id: doc._id, $or: [{ payment_status: 'PAID' }, { payment_reference: { $ne: '' } }] });
    if (paid) throw badInput("A guest's payment is on record for this event, so it cannot be deleted. Cancel it instead; the payment history stays");
    const res = await LiteEventModel.deleteOne({ _id: doc._id, hosts: { $elemMatch: creator }, 'tickets.sold': { $not: { $gt: 0 } } });
    if (res.deletedCount !== 1) throw badInput('Someone took a spot just now, so the event was not deleted. Check the guest list');
    // What is left is cancelled and declined registrations and the view counts; with the event gone they would point at nothing.
    await Promise.all([LiteRegistrationModel.deleteMany({ event_id: doc._id }), LiteEventViewModel.deleteMany({ event_id: doc._id })]);
    return true;
  },

  async duplicate(user: LiteUserDoc, id: string) {
    const source = await requireHosted(id, user);
    const copy = new LiteEventModel({
      ...source.toObject(),
      _id: undefined,
      slug: await uniqueSlug(source.title, async (s) => Boolean(await LiteEventModel.exists({ slug: s })), 'event'),
      title: `${source.title} (copy)`,
      status: 'DRAFT',
      published_at: null,
      cancelled_at: null,
      cancel_reason: '',
      featured: false,
      hidden: false,
      going_count: 0,
      reminders_sent: [],
      registration_open: true,
      tickets: source.tickets.map((t) => ({ ...t.toObject(), _id: undefined, sold: 0 })),
      questions: source.questions.map((q) => ({ ...q.toObject(), _id: undefined })),
      hosts: [{ user_id: user._id, role: 'HOST' }],
      created_at: undefined,
      updated_at: undefined,
    });
    await copy.save();
    return toPublicEvent(copy, viewerOf(user));
  },

  async addCoHost(user: LiteUserDoc, eventId: string, rawEmail: string) {
    const doc = await requireHosted(eventId, user);
    const email = normalizeEmail(rawEmail);
    const person = await LiteUserModel.findOne({ email }).lean();
    if (!person) throw badInput('No Lite account uses that email yet. Ask them to sign in once first');
    if (doc.hosts.some((h) => String(h.user_id) === String(person._id))) throw badInput('They are already a host');
    doc.hosts.push({ user_id: person._id as any, role: 'CO_HOST' });
    await doc.save();
    notifications.coHostAdded(doc, person._id);
    return toPublicEvent(doc, viewerOf(user));
  },

  async removeCoHost(user: LiteUserDoc, eventId: string, userId: string) {
    const doc = await requireHosted(eventId, user);
    const target = doc.hosts.find((h) => String(h.user_id) === userId);
    if (!target) throw notFound('Co-host');
    if (target.role === 'HOST') throw badInput('The main host cannot be removed');
    doc.hosts = doc.hosts.filter((h) => String(h.user_id) !== userId) as any;
    await doc.save();
    return toPublicEvent(doc, viewerOf(user));
  },

  /** Close (or reopen) registration without touching anything else on the event. */
  async setRegistrationOpen(user: LiteUserDoc, id: string, open: boolean) {
    const doc = await requireHosted(id, user);
    if (doc.status === 'CANCELLED') throw badInput('A cancelled event cannot take registrations');
    doc.registration_open = open;
    await doc.save();
    return toPublicEvent(doc, viewerOf(user));
  },

  /** A new public address for the event. The old one stops working, so the client warns first. */
  async changeSlug(user: LiteUserDoc, id: string, rawSlug: string) {
    const doc = await requireHosted(id, user);
    const slug = cleanText(rawSlug, 80, 'Event link', true).toLowerCase();
    if (slug.length < 3 || !URL_SLUG.test(slug)) throw badInput('An event link is 3 to 80 lowercase letters, numbers and single hyphens');
    if (slug === doc.slug) return toPublicEvent(doc, viewerOf(user));
    if (await LiteEventModel.exists({ slug, _id: { $ne: doc._id } })) throw badInput('That event link is already taken');
    doc.slug = slug;
    await doc.save();
    return toPublicEvent(doc, viewerOf(user));
  },

  async sendUpdate(user: LiteUserDoc, eventId: string, subject: string, body: string) {
    const doc = await requireHosted(eventId, user);
    const sent = await notifications.hostUpdate(doc, cleanText(subject, 120, 'Subject', true), cleanText(body, 5000, 'Message', true));
    return { sent };
  },

  async mine(user: LiteUserDoc, past: boolean) {
    const docs = await LiteEventModel.find({ 'hosts.user_id': user._id, end_at: past ? { $lt: new Date() } : { $gte: new Date() } })
      .sort({ start_at: past ? -1 : 1 })
      .limit(200)
      .lean();
    return Promise.all(docs.map((d) => toPublicEvent(d, viewerOf(user))));
  },

  /** Covers of the events this person hosts, the latest first and each once: the picker's "Previous events". */
  async coverHistory(user: LiteUserDoc, limit = 24): Promise<string[]> {
    const docs = await LiteEventModel.find({ 'hosts.user_id': user._id, cover_url: { $nin: ['', null] } })
      .sort({ start_at: -1 })
      .limit(limit * 2)
      .select('cover_url')
      .lean();
    return [...new Set(docs.map((d) => d.cover_url))].slice(0, limit);
  },

  async byHandle(handle: string, past: boolean, user: LiteUserDoc | null) {
    const person = await LiteUserModel.findOne({ handle: handle.toLowerCase(), is_blocked: false }).lean();
    if (!person) return [];
    const docs = await LiteEventModel.find({ 'hosts.user_id': person._id, status: 'PUBLISHED', hidden: false, visibility: 'PUBLIC', end_at: past ? { $lt: new Date() } : { $gte: new Date() } })
      .sort({ start_at: past ? -1 : 1 })
      .limit(100)
      .lean();
    return Promise.all(docs.map((d) => toPublicEvent(d, viewerOf(user))));
  },

  requireHosted,
  viewerOf,
};

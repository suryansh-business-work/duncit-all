import { LiteCalendarModel } from '../models/calendar.model';
import { LiteCategoryModel } from '../models/category.model';
import { LiteCityModel } from '../models/city.model';
import { LiteEventModel, LOCATION_TYPES, QUESTION_TYPES, VISIBILITIES, type LiteEventDoc } from '../models/event.model';
import { LiteRegistrationModel } from '../models/registration.model';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { badInput, forbidden, notFound } from '../utils/errors';
import { uniqueSlug } from '../utils/slug';
import { cleanText, isObjectId, normalizeEmail, optionalUpi, optionalUrl, parseInstant, validTimezone } from '../utils/validate';
import { notifications } from './notifications';
import { isHostOf, toPublicEvent, type Viewer } from './projections';
import { settingsService } from './settings.service';

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
}

const viewerOf = (user: LiteUserDoc | null): Viewer | null => (user ? { id: String(user._id), is_admin: user.is_admin } : null);

async function requireHosted(id: string, user: LiteUserDoc): Promise<LiteEventDoc> {
  const doc = await LiteEventModel.findById(id);
  if (!doc) throw notFound('Event');
  if (!isHostOf(doc, viewerOf(user)) && !user.is_admin) throw forbidden('Only a host of this event can do that');
  return doc;
}

function cleanTickets(input: TicketInput[], existing: any[], maxPrice: number) {
  if (!input.length) throw badInput('Add at least one ticket type');
  return input.map((t) => {
    const price = Math.max(0, Math.trunc(t.price ?? 0));
    if (maxPrice > 0 && price > maxPrice) throw badInput(`A ticket cannot cost more than ₹${maxPrice}`);
    const quantity = t.quantity == null ? null : Math.max(1, Math.trunc(t.quantity));
    const prior = t.id ? existing.find((e) => String(e._id) === t.id) : null;
    return {
      ...(prior ? { _id: prior._id, sold: prior.sold } : {}),
      name: cleanText(t.name, 60, 'Ticket name', true),
      description: cleanText(t.description, 300, 'Ticket description'),
      price,
      quantity,
      is_active: t.is_active !== false,
    };
  });
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
  doc.capacity = input.capacity == null ? null : Math.max(1, Math.trunc(input.capacity));
  doc.require_approval = Boolean(input.require_approval);
  doc.tickets = cleanTickets(input.tickets, doc.tickets as any[], settings.max_ticket_price) as any;
  doc.questions = cleanQuestions(input.questions, doc.questions as any[]) as any;
  applyPayment(doc, input, user);
  doc.city_slug = await resolveCity(input.city_slug);
  doc.category_id = await resolveCategory(input.category_id);
  doc.calendar_id = await resolveCalendar(input.calendar_id, user);
}

export const eventService = {
  async bySlug(slug: string, user: LiteUserDoc | null) {
    const doc = await LiteEventModel.findOne({ slug: slug.toLowerCase() }).lean();
    if (!doc) return null;
    const viewer = viewerOf(user);
    const host = isHostOf(doc, viewer) || Boolean(viewer?.is_admin);
    if (!host && (doc.status === 'DRAFT' || doc.hidden)) return null;
    if (!host && doc.visibility === 'PRIVATE') {
      const registered = viewer ? await LiteRegistrationModel.exists({ event_id: doc._id, user_id: viewer.id }) : null;
      if (!registered) return null;
    }
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
      tickets: source.tickets.map((t) => ({ ...(t as any).toObject(), _id: undefined, sold: 0 })),
      questions: source.questions.map((q) => ({ ...(q as any).toObject(), _id: undefined })),
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

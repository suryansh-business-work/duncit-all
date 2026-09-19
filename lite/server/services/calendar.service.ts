import { LiteCalendarModel, type LiteCalendarDoc } from '../models/calendar.model';
import { LiteCityModel } from '../models/city.model';
import { LiteEventModel } from '../models/event.model';
import { LiteSubscriptionModel } from '../models/subscription.model';
import type { LiteUserDoc } from '../models/user.model';
import { badInput, forbidden, notFound } from '../utils/errors';
import { slugify, uniqueSlug } from '../utils/slug';
import { cleanText, optionalUrl } from '../utils/validate';
import { toPublicCalendar, toPublicEvent, type Viewer } from './projections';

export interface CalendarInput {
  name: string;
  slug?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  city_slug?: string | null;
}

const RESERVED = new Set(['discover', 'create', 'tickets', 'calendars', 'profile', 'signin', 'e', 'u', 'cal', 'category', 'admin', 'graphql', 'upload', 'ics', 'health']);

async function cleanCity(slug: unknown): Promise<string> {
  const text = cleanText(slug, 80, 'City').toLowerCase();
  if (!text) return '';
  const city = await LiteCityModel.findOne({ slug: text, is_active: true }).lean();
  if (!city) throw badInput('Pick a city from the list');
  return city.slug;
}

async function requireOwned(id: string, user: LiteUserDoc): Promise<LiteCalendarDoc> {
  const doc = await LiteCalendarModel.findById(id);
  if (!doc) throw notFound('Calendar');
  if (String(doc.owner_id) !== String(user._id) && !user.is_admin) throw forbidden('Only the calendar owner can edit it');
  return doc;
}

const viewerOf = (user: LiteUserDoc | null): Viewer | null => (user ? { id: String(user._id), is_admin: user.is_admin } : null);

export const calendarService = {
  async bySlug(slug: string, user: LiteUserDoc | null) {
    const doc = await LiteCalendarModel.findOne({ slug: slug.toLowerCase() }).lean();
    return doc ? toPublicCalendar(doc, viewerOf(user)) : null;
  },

  async events(slug: string, past: boolean, user: LiteUserDoc | null) {
    const calendar = await LiteCalendarModel.findOne({ slug: slug.toLowerCase() }).lean();
    if (!calendar) return [];
    const viewer = viewerOf(user);
    const isOwner = viewer ? String(calendar.owner_id) === viewer.id : false;
    const filter: Record<string, unknown> = { calendar_id: calendar._id, status: 'PUBLISHED', hidden: false, visibility: isOwner ? { $in: ['PUBLIC', 'UNLISTED'] } : 'PUBLIC' };
    filter.end_at = past ? { $lt: new Date() } : { $gte: new Date() };
    const docs = await LiteEventModel.find(filter).sort({ start_at: past ? -1 : 1 }).limit(100).lean();
    return Promise.all(docs.map((d) => toPublicEvent(d, viewer)));
  },

  async mine(user: LiteUserDoc) {
    const docs = await LiteCalendarModel.find({ owner_id: user._id }).sort({ created_at: 1 }).lean();
    return Promise.all(docs.map((d) => toPublicCalendar(d, viewerOf(user))));
  },

  async create(user: LiteUserDoc, input: CalendarInput) {
    const name = cleanText(input.name, 80, 'Name', true);
    const wanted = slugify(input.slug || name);
    if (RESERVED.has(wanted)) throw badInput('That link is reserved; pick another');
    const slug = await uniqueSlug(wanted, async (s) => Boolean(await LiteCalendarModel.exists({ slug: s })), 'calendar');
    const doc = await LiteCalendarModel.create({
      owner_id: user._id,
      slug,
      name,
      description: cleanText(input.description, 1000, 'Description'),
      avatar_url: optionalUrl(input.avatar_url, 'Avatar'),
      cover_url: optionalUrl(input.cover_url, 'Cover'),
      city_slug: await cleanCity(input.city_slug),
    });
    return toPublicCalendar(doc, viewerOf(user));
  },

  async update(user: LiteUserDoc, id: string, input: CalendarInput) {
    const doc = await requireOwned(id, user);
    doc.name = cleanText(input.name, 80, 'Name', true);
    if (input.slug) {
      const wanted = slugify(input.slug);
      if (RESERVED.has(wanted)) throw badInput('That link is reserved; pick another');
      const taken = await LiteCalendarModel.exists({ slug: wanted, _id: { $ne: doc._id } });
      if (taken) throw badInput('That link is already taken');
      doc.slug = wanted;
    }
    doc.description = cleanText(input.description, 1000, 'Description');
    doc.avatar_url = optionalUrl(input.avatar_url, 'Avatar');
    doc.cover_url = optionalUrl(input.cover_url, 'Cover');
    doc.city_slug = await cleanCity(input.city_slug);
    await doc.save();
    return toPublicCalendar(doc, viewerOf(user));
  },

  async subscribe(user: LiteUserDoc, id: string, on: boolean) {
    const doc = await LiteCalendarModel.findById(id);
    if (!doc) throw notFound('Calendar');
    if (on) {
      const created = await LiteSubscriptionModel.updateOne({ calendar_id: doc._id, user_id: user._id }, { $setOnInsert: { calendar_id: doc._id, user_id: user._id } }, { upsert: true });
      if (created.upsertedCount > 0) await LiteCalendarModel.updateOne({ _id: doc._id }, { $inc: { subscriber_count: 1 } });
    } else {
      const removed = await LiteSubscriptionModel.deleteOne({ calendar_id: doc._id, user_id: user._id });
      if (removed.deletedCount > 0) await LiteCalendarModel.updateOne({ _id: doc._id }, { $inc: { subscriber_count: -1 } });
    }
    const fresh = await LiteCalendarModel.findById(id).lean();
    return toPublicCalendar(fresh, viewerOf(user));
  },

  async setFeatured(id: string, featured: boolean) {
    const doc = await LiteCalendarModel.findByIdAndUpdate(id, { $set: { featured } }, { new: true }).lean();
    if (!doc) throw notFound('Calendar');
    return toPublicCalendar(doc, null);
  },
};

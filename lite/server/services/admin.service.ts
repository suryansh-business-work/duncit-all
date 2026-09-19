import { LiteCalendarModel } from '../models/calendar.model';
import { LiteCategoryModel } from '../models/category.model';
import { LiteCityModel } from '../models/city.model';
import { LiteEmailLogModel } from '../models/emailLog.model';
import { LiteEventModel } from '../models/event.model';
import { LiteRegistrationModel } from '../models/registration.model';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { badInput, notFound } from '../utils/errors';
import { iso } from '../utils/ids';
import { slugify, uniqueSlug } from '../utils/slug';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '../utils/table-query';
import { cleanText, optionalUrl } from '../utils/validate';
import { publicCategories, publicCities } from './discover.service';
import { toPublicCalendar, toPublicEvent, toPublicRegistration, type Viewer } from './projections';
import { toPublicUser } from './user.service';

const EVENTS_TABLE: TableEntityConfig = {
  searchFields: ['title', 'slug', 'venue_name', 'city_slug'],
  sortFields: { title: 'title', start_at: 'start_at', status: 'status', visibility: 'visibility', featured: 'featured', hidden: 'hidden', going_count: 'going_count', created_at: 'created_at' },
  filterFields: {
    status: { type: 'enum' },
    visibility: { type: 'enum' },
    featured: { type: 'boolean' },
    hidden: { type: 'boolean' },
    city_slug: { type: 'string' },
    start_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { start_at: -1 },
};

const USERS_TABLE: TableEntityConfig = {
  searchFields: ['name', 'email', 'handle'],
  sortFields: { name: 'name', email: 'email', handle: 'handle', is_admin: 'is_admin', is_blocked: 'is_blocked', created_at: 'created_at', last_sign_in_at: 'last_sign_in_at' },
  filterFields: { is_admin: { type: 'boolean' }, is_blocked: { type: 'boolean' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

const REGISTRATIONS_TABLE: TableEntityConfig = {
  searchFields: ['user_name', 'user_email', 'event_title', 'code', 'payment_reference'],
  sortFields: { status: 'status', payment_status: 'payment_status', amount_due: 'amount_due', event_start_at: 'event_start_at', created_at: 'created_at', event_title: 'event_title', user_name: 'user_name' },
  filterFields: { status: { type: 'enum' }, payment_status: { type: 'enum' }, amount_due: { type: 'number' }, created_at: { type: 'date' }, event_start_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

const CALENDARS_TABLE: TableEntityConfig = {
  searchFields: ['name', 'slug', 'city_slug'],
  sortFields: { name: 'name', slug: 'slug', featured: 'featured', subscriber_count: 'subscriber_count', created_at: 'created_at' },
  filterFields: { featured: { type: 'boolean' }, city_slug: { type: 'string' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

const EMAIL_LOGS_TABLE: TableEntityConfig = {
  searchFields: ['to', 'subject', 'template_key'],
  sortFields: { to: 'to', subject: 'subject', template_key: 'template_key', status: 'status', created_at: 'created_at' },
  filterFields: { status: { type: 'enum' }, template_key: { type: 'string' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

const adminViewer = (admin: LiteUserDoc): Viewer => ({ id: String(admin._id), is_admin: true });

export interface CategoryInput {
  name: string;
  slug?: string | null;
  icon?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

export interface CityInput extends CategoryInput {
  country?: string | null;
  cover_url?: string | null;
  featured?: boolean | null;
}

export const adminService = {
  async stats() {
    const now = new Date();
    const week = new Date(Date.now() - 7 * 86_400_000);
    const [users, events, published, upcoming, registrations, confirmed, revenue, calendars, emails] = await Promise.all([
      LiteUserModel.countDocuments({}),
      LiteEventModel.countDocuments({}),
      LiteEventModel.countDocuments({ status: 'PUBLISHED' }),
      LiteEventModel.countDocuments({ status: 'PUBLISHED', end_at: { $gte: now } }),
      LiteRegistrationModel.countDocuments({}),
      LiteRegistrationModel.countDocuments({ status: 'CONFIRMED' }),
      LiteRegistrationModel.aggregate<{ total: number }>([{ $match: { payment_status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount_due' } } }]),
      LiteCalendarModel.countDocuments({}),
      LiteEmailLogModel.countDocuments({ status: 'SENT', created_at: { $gte: week } }),
    ]);
    return { users, events, published_events: published, upcoming_events: upcoming, registrations, confirmed_registrations: confirmed, revenue_confirmed: revenue[0]?.total ?? 0, calendars, emails_sent_7d: emails };
  },

  async eventsTable(admin: LiteUserDoc, query: TableQueryInput | null | undefined) {
    const page = await runTableQuery<any>(LiteEventModel, {}, query, EVENTS_TABLE);
    return { ...page, rows: await Promise.all(page.docs.map((d) => toPublicEvent(d, adminViewer(admin)))) };
  },

  async usersTable(query: TableQueryInput | null | undefined) {
    const page = await runTableQuery<any>(LiteUserModel, {}, query, USERS_TABLE);
    return { ...page, rows: page.docs.map((d) => toPublicUser(d, { withEmail: true })) };
  },

  async registrationsTable(admin: LiteUserDoc, query: TableQueryInput | null | undefined) {
    const page = await runTableQuery<any>(LiteRegistrationModel, {}, query, REGISTRATIONS_TABLE);
    const events = await LiteEventModel.find({ _id: { $in: page.docs.map((d) => d.event_id) } }).lean();
    const users = await LiteUserModel.find({ _id: { $in: page.docs.map((d) => d.user_id) } }).lean();
    const eventBy = new Map(await Promise.all(events.map(async (e) => [String(e._id), await toPublicEvent(e, adminViewer(admin), { withoutViewerRegistration: true })] as const)));
    const userBy = new Map(users.map((u) => [String(u._id), u]));
    return { ...page, rows: page.docs.map((d) => toPublicRegistration(d, eventBy.get(String(d.event_id)) ?? null, userBy.get(String(d.user_id)))) };
  },

  async calendarsTable(query: TableQueryInput | null | undefined) {
    const page = await runTableQuery<any>(LiteCalendarModel, {}, query, CALENDARS_TABLE);
    return { ...page, rows: await Promise.all(page.docs.map((d) => toPublicCalendar(d, null))) };
  },

  async emailLogsTable(query: TableQueryInput | null | undefined) {
    const page = await runTableQuery<any>(LiteEmailLogModel, {}, query, EMAIL_LOGS_TABLE);
    return {
      ...page,
      rows: page.docs.map((d) => ({ id: String(d._id), to: d.to, subject: d.subject, template_key: d.template_key, status: d.status, error: d.error || null, message_id: d.message_id || null, created_at: iso(d.created_at) ?? '' })),
    };
  },

  async setEventFlags(admin: LiteUserDoc, id: string, featured: boolean | null | undefined, hidden: boolean | null | undefined) {
    const $set: Record<string, boolean> = {};
    if (featured != null) $set.featured = featured;
    if (hidden != null) $set.hidden = hidden;
    const doc = await LiteEventModel.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (!doc) throw notFound('Event');
    return toPublicEvent(doc, adminViewer(admin));
  },

  async setUserFlags(id: string, isAdmin: boolean | null | undefined, isBlocked: boolean | null | undefined) {
    const $set: Record<string, boolean> = {};
    if (isAdmin != null) $set.is_admin = isAdmin;
    if (isBlocked != null) $set.is_blocked = isBlocked;
    const doc = await LiteUserModel.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (!doc) throw notFound('Account');
    return toPublicUser(doc, { withEmail: true });
  },

  async upsertCategory(id: string | null | undefined, input: CategoryInput) {
    const name = cleanText(input.name, 60, 'Name', true);
    const doc = id ? await LiteCategoryModel.findById(id) : new LiteCategoryModel({});
    if (!doc) throw notFound('Category');
    doc.name = name;
    if (!id || input.slug) {
      const wanted = slugify(input.slug || name);
      const taken = await LiteCategoryModel.exists({ slug: wanted, _id: { $ne: doc._id } });
      doc.slug = taken ? await uniqueSlug(wanted, async (s) => Boolean(await LiteCategoryModel.exists({ slug: s })), 'category') : wanted;
    }
    doc.icon = cleanText(input.icon, 60, 'Icon');
    doc.sort_order = Math.trunc(input.sort_order ?? doc.sort_order ?? 0);
    doc.is_active = input.is_active ?? doc.is_active ?? true;
    await doc.save();
    const all = await publicCategories(true);
    return all.find((c) => c.id === String(doc._id))!;
  },

  async deleteCategory(id: string) {
    const used = await LiteEventModel.countDocuments({ category_id: id });
    if (used > 0) throw badInput(`This category is on ${used} event(s); switch it off instead`);
    const res = await LiteCategoryModel.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },

  async upsertCity(id: string | null | undefined, input: CityInput) {
    const name = cleanText(input.name, 60, 'Name', true);
    const doc = id ? await LiteCityModel.findById(id) : new LiteCityModel({});
    if (!doc) throw notFound('City');
    doc.name = name;
    if (!id || input.slug) {
      const wanted = slugify(input.slug || name);
      const taken = await LiteCityModel.exists({ slug: wanted, _id: { $ne: doc._id } });
      if (taken) throw badInput('That city link is already used');
      doc.slug = wanted;
    }
    doc.country = cleanText(input.country, 60, 'Country') || doc.country || 'India';
    doc.cover_url = optionalUrl(input.cover_url, 'Cover');
    doc.featured = input.featured ?? doc.featured ?? false;
    doc.sort_order = Math.trunc(input.sort_order ?? doc.sort_order ?? 0);
    doc.is_active = input.is_active ?? doc.is_active ?? true;
    await doc.save();
    const all = await publicCities(true);
    return all.find((c) => c.id === String(doc._id))!;
  },

  async deleteCity(id: string) {
    const city = await LiteCityModel.findById(id).lean();
    if (!city) return false;
    const used = await LiteEventModel.countDocuments({ city_slug: city.slug });
    if (used > 0) throw badInput(`This city is on ${used} event(s); switch it off instead`);
    await LiteCityModel.deleteOne({ _id: id });
    return true;
  },
};

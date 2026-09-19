import { LiteCalendarModel } from '../models/calendar.model';
import { LiteCategoryModel } from '../models/category.model';
import { LiteCityModel } from '../models/city.model';
import { LiteEventModel } from '../models/event.model';
import { LiteRegistrationModel } from '../models/registration.model';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { escapedSearchRegex } from '../utils/table-query';
import { toPublicCalendar, toPublicEvent, type Viewer } from './projections';

export interface EventFilter {
  search?: string | null;
  city_slug?: string | null;
  category_slug?: string | null;
  calendar_slug?: string | null;
  host_handle?: string | null;
  from?: string | null;
  to?: string | null;
  featured?: boolean | null;
  past?: boolean | null;
}

const viewerOf = (user: LiteUserDoc | null): Viewer | null => (user ? { id: String(user._id), is_admin: user.is_admin } : null);

/** What Discover, a city page and a search all agree is "an event people can find". */
const LISTABLE = { status: 'PUBLISHED', visibility: 'PUBLIC', hidden: false } as const;

async function countsByField(field: 'city_slug' | 'category_id'): Promise<Map<string, number>> {
  const rows = await LiteEventModel.aggregate<{ _id: unknown; n: number }>([
    { $match: { ...LISTABLE, end_at: { $gte: new Date() } } },
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export async function publicCategories(includeInactive = false) {
  const [docs, counts] = await Promise.all([LiteCategoryModel.find(includeInactive ? {} : { is_active: true }).sort({ sort_order: 1, name: 1 }).lean(), countsByField('category_id')]);
  return docs.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, icon: c.icon || null, sort_order: c.sort_order ?? 0, is_active: c.is_active !== false, events_count: counts.get(String(c._id)) ?? 0 }));
}

export async function publicCities(includeInactive = false) {
  const [docs, counts] = await Promise.all([LiteCityModel.find(includeInactive ? {} : { is_active: true }).sort({ featured: -1, sort_order: 1, name: 1 }).lean(), countsByField('city_slug')]);
  return docs.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, country: c.country, cover_url: c.cover_url || null, featured: Boolean(c.featured), sort_order: c.sort_order ?? 0, is_active: c.is_active !== false, events_count: counts.get(c.slug) ?? 0 }));
}

/** The time window and the plain scalar filters. */
function scalarFilter(filter: EventFilter): Record<string, unknown> {
  const query: Record<string, unknown> = { ...LISTABLE };
  const now = new Date();
  query.end_at = filter.past ? { $lt: now } : { $gte: filter.from ? new Date(filter.from) : now };
  if (filter.to) query.start_at = { $lte: new Date(filter.to) };
  if (filter.city_slug) query.city_slug = filter.city_slug.toLowerCase();
  if (filter.featured) query.featured = true;
  if (filter.search?.trim()) {
    const rx = escapedSearchRegex(filter.search);
    query.$or = [{ title: rx }, { description: rx }, { venue_name: rx }, { address: rx }];
  }
  return query;
}

/** The filters that name another document by slug; `undefined` means the slug matched nothing. */
async function referencedIds(filter: EventFilter): Promise<Record<string, unknown> | undefined> {
  const refs: Record<string, unknown> = {};
  if (filter.category_slug) {
    const category = await LiteCategoryModel.findOne({ slug: filter.category_slug.toLowerCase() }).lean();
    if (!category) return undefined;
    refs.category_id = category._id;
  }
  if (filter.calendar_slug) {
    const calendar = await LiteCalendarModel.findOne({ slug: filter.calendar_slug.toLowerCase() }).lean();
    if (!calendar) return undefined;
    refs.calendar_id = calendar._id;
  }
  if (filter.host_handle) {
    const host = await LiteUserModel.findOne({ handle: filter.host_handle.toLowerCase() }).lean();
    if (!host) return undefined;
    refs['hosts.user_id'] = host._id;
  }
  return refs;
}

async function buildFilter(filter: EventFilter): Promise<Record<string, unknown> | null> {
  const refs = await referencedIds(filter);
  if (!refs) return null;
  return { ...scalarFilter(filter), ...refs };
}

export const discoverService = {
  async events(filter: EventFilter, page: number, pageSize: number, user: LiteUserDoc | null) {
    const query = await buildFilter(filter);
    const size = Math.min(50, Math.max(1, pageSize));
    const current = Math.max(1, page);
    if (!query) return { rows: [], total: 0, page: current, page_size: size };
    const [docs, total] = await Promise.all([
      LiteEventModel.find(query).sort({ start_at: filter.past ? -1 : 1 }).skip((current - 1) * size).limit(size).lean(),
      LiteEventModel.countDocuments(query),
    ]);
    const viewer = viewerOf(user);
    return { rows: await Promise.all(docs.map((d) => toPublicEvent(d, viewer))), total, page: current, page_size: size };
  },

  async discover(citySlug: string | null | undefined, user: LiteUserDoc | null) {
    const viewer = viewerOf(user);
    const now = new Date();
    const scope: Record<string, unknown> = { ...LISTABLE, end_at: { $gte: now } };
    if (citySlug) scope.city_slug = citySlug.toLowerCase();
    const [categories, cities, calendars, popular, upcoming] = await Promise.all([
      publicCategories(),
      publicCities(),
      LiteCalendarModel.find({ featured: true }).sort({ subscriber_count: -1 }).limit(8).lean(),
      LiteEventModel.find(scope).sort({ featured: -1, going_count: -1, start_at: 1 }).limit(8).lean(),
      LiteEventModel.find(scope).sort({ start_at: 1 }).limit(24).lean(),
    ]);
    return {
      categories,
      cities,
      featured_calendars: await Promise.all(calendars.map((c) => toPublicCalendar(c, viewer))),
      popular_events: await Promise.all(popular.map((e) => toPublicEvent(e, viewer))),
      upcoming_events: await Promise.all(upcoming.map((e) => toPublicEvent(e, viewer))),
    };
  },

  async city(slug: string) {
    const cities = await publicCities();
    return cities.find((c) => c.slug === slug.toLowerCase()) ?? null;
  },

  /** Kept current by the registration service so "popular" needs no aggregation per read. */
  async refreshGoingCounts(): Promise<void> {
    const rows = await LiteRegistrationModel.aggregate<{ _id: unknown; seats: number }>([
      { $match: { status: 'CONFIRMED' } },
      { $group: { _id: '$event_id', seats: { $sum: '$quantity' } } },
    ]);
    await Promise.all(rows.map((r) => LiteEventModel.updateOne({ _id: r._id }, { $set: { going_count: r.seats } })));
  },
};

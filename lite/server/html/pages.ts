import { env } from '../config/env';
import { LiteCalendarModel } from '../models/calendar.model';
import { LiteCategoryModel } from '../models/category.model';
import { LiteCityModel } from '../models/city.model';
import { LiteEventModel } from '../models/event.model';
import { LiteUserModel } from '../models/user.model';
import { formatWhen, formatWhere } from '../services/projections';
import { settingsService } from '../services/settings.service';
import type { PageMeta } from './meta';

export interface PageHead {
  meta: PageMeta;
  structured: unknown[];
}

const clip = (text: string): string => {
  const flat = text.replaceAll(/\s+/g, ' ').trim();
  return flat.length > 160 ? `${flat.slice(0, 157).trimEnd()}...` : flat;
};

const pageUrl = (path: string): string => `${env.siteUrl}${path}`;

async function eventHead(slug: string, siteName: string): Promise<PageHead | null> {
  const event = await LiteEventModel.findOne({ slug, status: { $ne: 'DRAFT' }, hidden: false }).lean();
  if (!event || event.visibility === 'PRIVATE') return null;
  const [city, host] = await Promise.all([
    event.city_slug ? LiteCityModel.findOne({ slug: event.city_slug }).lean() : null,
    LiteUserModel.findById(event.hosts[0]?.user_id).lean(),
  ]);
  const where = formatWhere(event, city?.name ?? '');
  const description = clip(`${formatWhen(event)} · ${where}. ${event.description}`);
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: clip(event.description),
    startDate: event.start_at.toISOString(),
    endDate: event.end_at.toISOString(),
    eventStatus: event.status === 'CANCELLED' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.location_type === 'VIRTUAL' ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location:
      event.location_type === 'VIRTUAL'
        ? { '@type': 'VirtualLocation', url: pageUrl(`/e/${event.slug}`) }
        : { '@type': 'Place', name: event.venue_name || where, address: [event.address, city?.name].filter(Boolean).join(', ') },
    image: event.cover_url || undefined,
    organizer: host ? { '@type': 'Person', name: host.name, url: pageUrl(`/u/${host.handle}`) } : undefined,
    offers: event.tickets.map((t) => ({ '@type': 'Offer', name: t.name, price: t.price, priceCurrency: 'INR', url: pageUrl(`/e/${event.slug}`), availability: 'https://schema.org/InStock' })),
    url: pageUrl(`/e/${event.slug}`),
  };
  return {
    meta: { title: event.title, description, url: pageUrl(`/e/${event.slug}`), siteName, imageUrl: event.cover_url || null, type: 'article', noindex: event.visibility === 'UNLISTED' },
    structured: [structured],
  };
}

async function calendarHead(slug: string, siteName: string): Promise<PageHead | null> {
  const calendar = await LiteCalendarModel.findOne({ slug }).lean();
  if (!calendar) return null;
  return {
    meta: { title: calendar.name, description: clip(calendar.description || `Events by ${calendar.name} on ${siteName}.`), url: pageUrl(`/cal/${calendar.slug}`), siteName, imageUrl: calendar.cover_url || calendar.avatar_url || null },
    structured: [],
  };
}

async function profileHead(handle: string, siteName: string): Promise<PageHead | null> {
  const person = await LiteUserModel.findOne({ handle, is_blocked: false }).lean();
  if (!person) return null;
  return { meta: { title: person.name, description: clip(person.bio || `Events hosted by ${person.name} on ${siteName}.`), url: pageUrl(`/u/${person.handle}`), siteName, imageUrl: person.avatar_url || null }, structured: [] };
}

async function categoryHead(slug: string, siteName: string): Promise<PageHead | null> {
  const category = await LiteCategoryModel.findOne({ slug, is_active: true }).lean();
  if (!category) return null;
  return { meta: { title: `${category.name} events`, description: `Upcoming ${category.name.toLowerCase()} events on ${siteName}.`, url: pageUrl(`/category/${category.slug}`), siteName }, structured: [] };
}

async function cityHead(slug: string, siteName: string): Promise<PageHead | null> {
  const city = await LiteCityModel.findOne({ slug, is_active: true }).lean();
  if (!city) return null;
  return { meta: { title: `Events in ${city.name}`, description: `What's happening in ${city.name}: upcoming events, meetups and gatherings on ${siteName}.`, url: pageUrl(`/${city.slug}`), siteName, imageUrl: city.cover_url || null }, structured: [] };
}

/** The head for a path a crawler may read; null for app-only routes (the shell's own head serves). */
export async function headFor(path: string): Promise<PageHead | null> {
  const settings = await settingsService.get();
  const siteName = settings.site_name;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'discover')) {
    return { meta: { title: `Discover events · ${siteName}`, description: `Browse by category, find featured calendars and explore local events on ${siteName}.`, url: pageUrl('/discover'), siteName }, structured: [] };
  }
  if (parts[0] === 'e' && parts[1]) return eventHead(parts[1].toLowerCase(), siteName);
  if (parts[0] === 'cal' && parts[1]) return calendarHead(parts[1].toLowerCase(), siteName);
  if (parts[0] === 'u' && parts[1]) return profileHead(parts[1].toLowerCase(), siteName);
  if (parts[0] === 'category' && parts[1]) return categoryHead(parts[1].toLowerCase(), siteName);
  if (parts.length === 1) return cityHead(parts[0].toLowerCase(), siteName);
  return null;
}

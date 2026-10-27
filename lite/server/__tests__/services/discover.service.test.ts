import { beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteCategoryModel } from '../../models/category.model';
import { LiteCityModel } from '../../models/city.model';
import { LiteEventModel } from '../../models/event.model';
import type { LiteUserDoc } from '../../models/user.model';
import { discoverService, publicCategories, publicCities } from '../../services/discover.service';
import { DAY, HOUR, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

let host: LiteUserDoc;

beforeEach(async () => {
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema', handle: 'hema' });
});

interface EventFields {
  title: string;
  daysAhead?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  hidden?: boolean;
  featured?: boolean;
  city_slug?: string;
  category_id?: Types.ObjectId;
  calendar_id?: Types.ObjectId;
  going_count?: number;
  description?: string;
  hostId?: Types.ObjectId;
}

/** A listable (published, public, visible) event `daysAhead` days from now unless told otherwise. */
async function listed({ title, daysAhead = 3, hostId, ...rest }: EventFields) {
  const start = new Date(Date.now() + daysAhead * DAY);
  return LiteEventModel.create({
    slug: title.toLowerCase().replaceAll(' ', '-'),
    title,
    start_at: start,
    end_at: new Date(start.getTime() + 2 * HOUR),
    venue_name: 'Blue Frog',
    address: 'Lower Parel',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    hosts: [{ user_id: hostId ?? host._id, role: 'HOST' }],
    tickets: [{ name: 'General', price: 0 }],
    ...rest,
  });
}

const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

describe('publicCategories and publicCities', () => {
  it('lists active categories in order, counting their upcoming listable events', async () => {
    const music = await LiteCategoryModel.create({ name: 'Music', slug: 'music', sort_order: 1 });
    await LiteCategoryModel.create({ name: 'Art', slug: 'art', sort_order: 1 });
    await LiteCategoryModel.create({ name: 'Food', slug: 'food', sort_order: 0 });
    await LiteCategoryModel.create({ name: 'Old', slug: 'old', is_active: false });
    await listed({ title: 'Jazz Night', category_id: music._id });
    await listed({ title: 'Past Jazz', category_id: music._id, daysAhead: -5 });
    await listed({ title: 'Secret Jazz', category_id: music._id, visibility: 'PRIVATE' });

    const categories = await publicCategories();
    expect(categories.map((c) => c.slug)).toEqual(['food', 'art', 'music']);
    expect(categories.find((c) => c.slug === 'music')).toMatchObject({ events_count: 1, is_active: true, icon: null });
    expect((await publicCategories(true)).map((c) => c.slug)).toContain('old');
  });

  it('lists featured cities first, then by order and name, counting their events', async () => {
    await LiteCityModel.create({ name: 'Pune', slug: 'pune', sort_order: 2 });
    await LiteCityModel.create({ name: 'Delhi', slug: 'delhi', sort_order: 2 });
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai', featured: true, sort_order: 9 });
    await LiteCityModel.create({ name: 'Goa', slug: 'goa', is_active: false });
    await LiteCityModel.create({ name: 'London', slug: 'london', region: 'EUROPE', sort_order: 1 });
    await listed({ title: 'Mumbai Gig', city_slug: 'mumbai' });
    await listed({ title: 'Mumbai Draft', city_slug: 'mumbai', status: 'DRAFT' });

    const cities = await publicCities();
    expect(cities.map((c) => c.slug)).toEqual(['mumbai', 'london', 'delhi', 'pune']);
    expect(cities[0]).toMatchObject({ events_count: 1, featured: true, region: 'ASIA_PACIFIC', country: 'India', cover_url: null });
    expect(cities[1].region).toBe('EUROPE');
    expect((await publicCities(true)).map((c) => c.slug)).toContain('goa');
  });
});

describe('discoverService.events', () => {
  it('lists only published, public, visible upcoming events, soonest first', async () => {
    await listed({ title: 'Later Gig', daysAhead: 9 });
    await listed({ title: 'Soon Gig', daysAhead: 1 });
    await listed({ title: 'Draft Gig', status: 'DRAFT' });
    await listed({ title: 'Unlisted Gig', visibility: 'UNLISTED' });
    await listed({ title: 'Hidden Gig', hidden: true });
    await listed({ title: 'Old Gig', daysAhead: -3 });

    const page = await discoverService.events({}, 1, 24, null);
    expect(titles(page.rows)).toEqual(['Soon Gig', 'Later Gig']);
    expect(page).toMatchObject({ total: 2, page: 1, page_size: 24 });
  });

  it('lists past events latest first when asked', async () => {
    await listed({ title: 'Last Month', daysAhead: -30 });
    await listed({ title: 'Last Week', daysAhead: -7 });
    await listed({ title: 'Next Week', daysAhead: 7 });
    expect(titles((await discoverService.events({ past: true }, 1, 24, null)).rows)).toEqual(['Last Week', 'Last Month']);
  });

  it('searches title, description, venue and address, taking regex characters literally', async () => {
    await listed({ title: 'C++ Meetup' });
    await listed({ title: 'Cpp Social' });
    await listed({ title: 'Open Mic', description: 'Bring your guitar' });
    expect(titles((await discoverService.events({ search: 'c++' }, 1, 24, null)).rows)).toEqual(['C++ Meetup']);
    expect(titles((await discoverService.events({ search: 'GUITAR' }, 1, 24, null)).rows)).toEqual(['Open Mic']);
    expect((await discoverService.events({ search: '   ' }, 1, 24, null)).total).toBe(3);
  });

  it('filters by city, featured flag and time window', async () => {
    await listed({ title: 'Mumbai Gig', city_slug: 'mumbai', featured: true, daysAhead: 2 });
    await listed({ title: 'Pune Gig', city_slug: 'pune', daysAhead: 5 });
    await listed({ title: 'Far Gig', city_slug: 'mumbai', daysAhead: 40 });
    expect(titles((await discoverService.events({ city_slug: 'MUMBAI' }, 1, 24, null)).rows)).toEqual(['Mumbai Gig', 'Far Gig']);
    expect(titles((await discoverService.events({ featured: true }, 1, 24, null)).rows)).toEqual(['Mumbai Gig']);
    const to = new Date(Date.now() + 10 * DAY).toISOString();
    const from = new Date(Date.now() + 4 * DAY).toISOString();
    expect(titles((await discoverService.events({ from, to }, 1, 24, null)).rows)).toEqual(['Pune Gig']);
  });

  it('filters by category, calendar and host, and answers nothing for an unknown one', async () => {
    const music = await LiteCategoryModel.create({ name: 'Music', slug: 'music' });
    const calendar = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    const other = await makeUser({ handle: 'ravi' });
    await listed({ title: 'Music Night', category_id: music._id, calendar_id: calendar._id });
    await listed({ title: 'Ravi Night', hostId: other._id });

    expect(titles((await discoverService.events({ category_slug: 'MUSIC' }, 1, 24, null)).rows)).toEqual(['Music Night']);
    expect(titles((await discoverService.events({ calendar_slug: 'hema-live' }, 1, 24, null)).rows)).toEqual(['Music Night']);
    expect(titles((await discoverService.events({ host_handle: 'Ravi' }, 1, 24, null)).rows)).toEqual(['Ravi Night']);
    for (const filter of [{ category_slug: 'dance' }, { calendar_slug: 'nobody' }, { host_handle: 'ghost' }]) {
      await expect(discoverService.events(filter, 2, 10, null)).resolves.toEqual({ rows: [], total: 0, page: 2, page_size: 10 });
    }
  });

  it('pages within 1..50 rows', async () => {
    for (let day = 1; day <= 4; day += 1) await listed({ title: `Gig ${day}`, daysAhead: day });
    const second = await discoverService.events({}, 2, 3, null);
    expect(titles(second.rows)).toEqual(['Gig 4']);
    expect(second).toMatchObject({ total: 4, page: 2, page_size: 3 });
    expect(await discoverService.events({}, 0, 500, null)).toMatchObject({ page: 1, page_size: 50 });
    expect(await discoverService.events({}, 1, 0, null)).toMatchObject({ page_size: 1 });
  });
});

describe('discoverService.discover', () => {
  it('gathers categories, cities, featured calendars and the event rails', async () => {
    await LiteCategoryModel.create({ name: 'Music', slug: 'music' });
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    await LiteCalendarModel.create({ owner_id: host._id, slug: 'featured-cal', name: 'Featured', featured: true, subscriber_count: 5 });
    await LiteCalendarModel.create({ owner_id: host._id, slug: 'plain-cal', name: 'Plain' });
    await listed({ title: 'Popular Gig', city_slug: 'mumbai', going_count: 80, daysAhead: 6 });
    await listed({ title: 'Quiet Gig', city_slug: 'mumbai', going_count: 2, daysAhead: 1 });
    await listed({ title: 'Featured Pune Gig', city_slug: 'pune', featured: true, daysAhead: 4 });

    const page = await discoverService.discover('MUMBAI', null);

    expect(page.categories.map((c) => c.slug)).toEqual(['music']);
    expect(page.cities.map((c) => c.slug)).toEqual(['mumbai']);
    expect(page.featured_calendars.map((c) => c.slug)).toEqual(['featured-cal']);
    expect(titles(page.popular_events)).toEqual(['Popular Gig', 'Quiet Gig']);
    expect(titles(page.upcoming_events)).toEqual(['Quiet Gig', 'Popular Gig']);
    expect(titles(page.featured_events)).toEqual(['Featured Pune Gig']);
  });

  it('puts featured events first in the popular rail across all cities', async () => {
    await listed({ title: 'Popular Gig', going_count: 80 });
    await listed({ title: 'Featured Gig', featured: true, going_count: 1 });
    const page = await discoverService.discover(null, await makeUser());
    expect(titles(page.popular_events)).toEqual(['Featured Gig', 'Popular Gig']);
  });
});

describe('discoverService.city', () => {
  it('finds an active city by slug in any case', async () => {
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    await LiteCityModel.create({ name: 'Goa', slug: 'goa', is_active: false });
    await expect(discoverService.city('Mumbai')).resolves.toMatchObject({ name: 'Mumbai' });
    await expect(discoverService.city('goa')).resolves.toBeNull();
  });
});

describe('discoverService.refreshGoingCounts', () => {
  it('sets each event to the seats its confirmed guests hold', async () => {
    const busy = await listed({ title: 'Busy Gig' });
    const quiet = await listed({ title: 'Quiet Gig', going_count: 99 });
    await seedRegistration(busy, await makeUser(), { quantity: 3 });
    await seedRegistration(busy, await makeUser(), { quantity: 2 });
    await seedRegistration(busy, await makeUser(), { status: 'WAITLISTED', quantity: 4 });
    await seedRegistration(quiet, await makeUser(), { status: 'CANCELLED', quantity: 1 });

    await discoverService.refreshGoingCounts();

    expect((await LiteEventModel.findById(busy._id).lean())?.going_count).toBe(5);
    expect((await LiteEventModel.findById(quiet._id).lean())?.going_count).toBe(99);
  });
});

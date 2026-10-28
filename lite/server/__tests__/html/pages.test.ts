import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteCategoryModel } from '../../models/category.model';
import { LiteCityModel } from '../../models/city.model';
import { LiteEventModel } from '../../models/event.model';
import type { LiteUserDoc } from '../../models/user.model';
import { headFor } from '../../html/pages';
import { notifications } from '../../services/notifications';
import { settingsService } from '../../services/settings.service';
import { hostedEvent, makeUser } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test' } };
});

withTestDatabase();

let host: LiteUserDoc;

beforeEach(async () => {
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema', bio: 'Jazz host in Mumbai' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('headFor', () => {
  it('describes Discover for the home page and /discover', async () => {
    const home = await headFor('/');
    expect(home?.meta).toEqual({
      title: 'Discover events · Duncit Lite',
      description: 'Browse by category, find featured calendars and explore local events on Duncit Lite.',
      url: 'https://lite.duncit.test/discover',
      siteName: 'Duncit Lite',
    });
    await expect(headFor('/discover')).resolves.toEqual(home);
  });

  it("uses the console's site name", async () => {
    await settingsService.update({ site_name: 'Duncit Events' });
    expect((await headFor('/'))?.meta.siteName).toBe('Duncit Events');
  });

  it('describes a published event with its time, place and Event JSON-LD', async () => {
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    await hostedEvent(host, {
      city_slug: 'mumbai',
      cover_url: 'https://ik.imagekit.io/jazz.png',
      tickets: [{ name: 'Entry', price: 499 }],
      upi_id: 'hema@okaxis',
      start_at: '2026-11-01T13:00:00.000Z',
      end_at: '2026-11-01T16:00:00.000Z',
    });

    const head = await headFor('/e/SUNDAY-JAZZ-AT-BANDRA');

    expect(head?.meta).toEqual({
      title: 'Sunday Jazz at Bandra',
      description: 'Sun, 1 Nov 2026 · 6:30 PM – 9:30 PM (Asia/Kolkata) · The Terrace, 14 Hill Road, Bandra West, Mumbai. An evening of live jazz on the terrace.',
      url: 'https://lite.duncit.test/e/sunday-jazz-at-bandra',
      siteName: 'Duncit Lite',
      imageUrl: 'https://ik.imagekit.io/jazz.png',
      type: 'article',
      noindex: false,
    });
    expect(head?.structured).toEqual([
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Sunday Jazz at Bandra',
        description: 'An evening of live jazz on the terrace.',
        startDate: '2026-11-01T13:00:00.000Z',
        endDate: '2026-11-01T16:00:00.000Z',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: 'The Terrace', address: '14 Hill Road, Bandra West, Mumbai' },
        image: 'https://ik.imagekit.io/jazz.png',
        organizer: { '@type': 'Person', name: 'Hema Host', url: 'https://lite.duncit.test/u/hema' },
        offers: [{ '@type': 'Offer', name: 'Entry', price: 499, priceCurrency: 'INR', url: 'https://lite.duncit.test/e/sunday-jazz-at-bandra', availability: 'https://schema.org/InStock' }],
        url: 'https://lite.duncit.test/e/sunday-jazz-at-bandra',
      },
    ]);
  });

  it('marks an online, cancelled or unlisted event accordingly', async () => {
    const event = await hostedEvent(host, { location_type: 'VIRTUAL', virtual_link: 'https://meet.duncit.com/jam', visibility: 'UNLISTED' });
    await LiteEventModel.updateOne({ _id: event._id }, { $set: { status: 'CANCELLED' } });
    const head = await headFor('/e/sunday-jazz-at-bandra');
    expect(head?.meta).toMatchObject({ noindex: true, imageUrl: null });
    expect(head?.structured[0]).toMatchObject({
      eventStatus: 'https://schema.org/EventCancelled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url: 'https://lite.duncit.test/e/sunday-jazz-at-bandra' },
    });
    expect(JSON.stringify(head)).not.toContain('meet.duncit.com');
  });

  it('clips a long description to 160 characters', async () => {
    await hostedEvent(host, { description: `Lots   of\n\nwords ${'and more '.repeat(60)}` });
    const description = (await headFor('/e/sunday-jazz-at-bandra'))?.meta.description ?? '';
    expect(description.length).toBeGreaterThan(150);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith('...')).toBe(true);
    expect(description).not.toMatch(/\s{2,}|\n/);
    expect(description).toContain('Lots of words and more');
  });

  it('gives no head for a draft, private, hidden or unknown event', async () => {
    await hostedEvent(host, {}, false);
    await expect(headFor('/e/sunday-jazz-at-bandra')).resolves.toBeNull();
    await hostedEvent(host, { title: 'Private Dinner', visibility: 'PRIVATE' });
    await expect(headFor('/e/private-dinner')).resolves.toBeNull();
    const hidden = await hostedEvent(host, { title: 'Hidden Gig' });
    await LiteEventModel.updateOne({ _id: hidden._id }, { $set: { hidden: true } });
    await expect(headFor('/e/hidden-gig')).resolves.toBeNull();
    await expect(headFor('/e/nothing')).resolves.toBeNull();
  });

  it('describes a calendar, falling back to a generated description and the avatar', async () => {
    await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live', avatar_url: 'https://ik.imagekit.io/avatar.png' });
    await expect(headFor('/cal/hema-live')).resolves.toEqual({
      meta: { title: 'Hema Live', description: 'Events by Hema Live on Duncit Lite.', url: 'https://lite.duncit.test/cal/hema-live', siteName: 'Duncit Lite', imageUrl: 'https://ik.imagekit.io/avatar.png' },
      structured: [],
    });
    await expect(headFor('/cal/nope')).resolves.toBeNull();
  });

  it('describes a profile with its bio, but not a blocked one', async () => {
    await expect(headFor('/u/HEMA')).resolves.toMatchObject({ meta: { title: 'Hema Host', description: 'Jazz host in Mumbai', url: 'https://lite.duncit.test/u/hema', imageUrl: null } });
    const blocked = await makeUser({ handle: 'gone', is_blocked: true });
    await expect(headFor(`/u/${blocked.handle}`)).resolves.toBeNull();
  });

  it('describes an active category and city, and ignores inactive ones', async () => {
    await LiteCategoryModel.create({ name: 'Live Music', slug: 'live-music' });
    await LiteCategoryModel.create({ name: 'Old', slug: 'old', is_active: false });
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai', cover_url: 'https://ik.imagekit.io/mumbai.jpg' });
    await LiteCityModel.create({ name: 'Goa', slug: 'goa', is_active: false });

    await expect(headFor('/category/live-music')).resolves.toMatchObject({
      meta: { title: 'Live Music events', description: 'Upcoming live music events on Duncit Lite.', url: 'https://lite.duncit.test/category/live-music' },
    });
    await expect(headFor('/Mumbai')).resolves.toMatchObject({ meta: { title: 'Events in Mumbai', url: 'https://lite.duncit.test/mumbai', imageUrl: 'https://ik.imagekit.io/mumbai.jpg' } });
    await expect(headFor('/category/old')).resolves.toBeNull();
    await expect(headFor('/goa')).resolves.toBeNull();
  });

  it('gives no head for app-only routes', async () => {
    await expect(headFor('/tickets/123')).resolves.toBeNull();
    await expect(headFor('/e')).resolves.toBeNull();
  });
});

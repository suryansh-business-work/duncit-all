import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteCategoryModel } from '../../models/category.model';
import { LiteCityModel } from '../../models/city.model';
import { LiteEmailLogModel } from '../../models/emailLog.model';
import { LiteEventModel } from '../../models/event.model';
import type { LiteUserDoc } from '../../models/user.model';
import { adminService } from '../../services/admin.service';
import { notifications } from '../../services/notifications';
import { apiError, badInputError } from '../helpers/expect';
import { DAY, hostedEvent, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

let admin: LiteUserDoc;
let host: LiteUserDoc;

beforeEach(async () => {
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  admin = await makeUser({ email: 'admin@lite.test', name: 'Ada Admin', handle: 'ada', is_admin: true });
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('adminService.stats', () => {
  it('counts the platform at a glance', async () => {
    const live = await hostedEvent(host);
    const past = new Date(Date.now() - 2 * DAY);
    await hostedEvent(host, { title: 'Old Gig', start_at: past.toISOString(), end_at: new Date(past.getTime() + 3_600_000).toISOString() });
    await hostedEvent(host, { title: 'Draft' }, false);
    await seedRegistration(live, await makeUser(), { payment_status: 'PAID', amount_due: 750 });
    await seedRegistration(live, await makeUser(), { status: 'WAITLISTED' });
    await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    await LiteEmailLogModel.create({ to: 'a@lite.test', subject: 'Hi', status: 'SENT' });
    await LiteEmailLogModel.create({ to: 'b@lite.test', subject: 'Hi', status: 'FAILED' });

    await expect(adminService.stats()).resolves.toEqual({
      users: 4,
      events: 3,
      published_events: 2,
      upcoming_events: 1,
      registrations: 2,
      confirmed_registrations: 1,
      revenue_confirmed: 750,
      calendars: 1,
      emails_sent_7d: 1,
    });
  });
});

describe('console tables', () => {
  it('searches, filters, sorts and pages the users table, showing contact details', async () => {
    await makeUser({ email: 'zara@lite.test', name: 'Zara', handle: 'zara' });
    const page = await adminService.usersTable({ search: 'a', sort_by: 'name', sort_dir: 'asc', page_size: 2 });
    expect(page).toMatchObject({ total: 3, page: 1, page_size: 2 });
    expect(page.rows.map((u) => u.name)).toEqual(['Ada Admin', 'Hema Host']);
    expect(page.rows[0].email).toBe('admin@lite.test');

    const admins = await adminService.usersTable({ filters: [{ field: 'is_admin', op: 'is_true' }] });
    expect(admins.rows.map((u) => u.handle)).toEqual(['ada']);
  });

  it('lists events with their public projection', async () => {
    await hostedEvent(host);
    await hostedEvent(host, { title: 'Draft' }, false);
    const page = await adminService.eventsTable(admin, { filters: [{ field: 'status', op: 'eq', value: 'PUBLISHED' }] });
    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({ title: 'Sunday Jazz at Bandra', status: 'PUBLISHED' });
  });

  it('joins registrations to their event and guest', async () => {
    const event = await hostedEvent(host);
    const guest = await makeUser({ email: 'gita@lite.test', name: 'Gita' });
    await seedRegistration(event, guest, { code: 'GITA22', amount_due: 0 });
    const page = await adminService.registrationsTable(admin, { search: 'gita22' });
    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({ code: 'GITA22', user: { email: 'gita@lite.test' }, event: { title: 'Sunday Jazz at Bandra' } });
  });

  it('lists calendars and email logs', async () => {
    await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live', featured: true });
    await LiteEmailLogModel.create({ to: 'a@lite.test', subject: 'Welcome', template_key: 'sign_in_code', status: 'FAILED', error: 'Bounced' });
    await LiteEmailLogModel.create({ to: 'b@lite.test', subject: 'Reminder', template_key: 'event_reminder', status: 'SENT', message_id: '<m1>' });

    const calendars = await adminService.calendarsTable({ filters: [{ field: 'featured', op: 'is_true' }] });
    expect(calendars.rows).toEqual([expect.objectContaining({ slug: 'hema-live', owner: expect.objectContaining({ handle: 'hema' }) })]);

    const logs = await adminService.emailLogsTable({ sort_by: 'to', sort_dir: 'asc' });
    expect(logs.rows).toEqual([
      expect.objectContaining({ to: 'a@lite.test', status: 'FAILED', error: 'Bounced', message_id: null, template_key: 'sign_in_code' }),
      expect.objectContaining({ to: 'b@lite.test', status: 'SENT', error: null, message_id: '<m1>' }),
    ]);
  });
});

describe('flags', () => {
  it('features and hides an event, and answers NOT_FOUND for an unknown one', async () => {
    const event = await hostedEvent(host);
    await expect(adminService.setEventFlags(admin, String(event._id), true, null)).resolves.toMatchObject({ featured: true, hidden: false });
    await expect(adminService.setEventFlags(admin, String(event._id), null, true)).resolves.toMatchObject({ featured: true, hidden: true });
    await expect(adminService.setEventFlags(admin, '507f1f77bcf86cd799439011', true, true)).rejects.toMatchObject(apiError('NOT_FOUND', 'Event could not be found'));
  });

  it('grants admin and blocks an account', async () => {
    await expect(adminService.setUserFlags(String(host._id), true, null)).resolves.toMatchObject({ is_admin: true, is_blocked: false, email: 'hema@lite.test' });
    await expect(adminService.setUserFlags(String(host._id), undefined, true)).resolves.toMatchObject({ is_admin: true, is_blocked: true });
    await expect(adminService.setUserFlags('507f1f77bcf86cd799439011', true, null)).rejects.toMatchObject(apiError('NOT_FOUND', 'Account could not be found'));
  });
});

describe('categories', () => {
  it('creates a category with a slug from its name and answers the saved row', async () => {
    const row = await adminService.upsertCategory(null, { name: ' Live Music ', icon: 'music', sort_order: 3 });
    expect(row).toMatchObject({ name: 'Live Music', slug: 'live-music', icon: 'music', sort_order: 3, is_active: true, events_count: 0 });
  });

  it('gives a clashing slug a suffix, and keeps the slug on a rename that sends none', async () => {
    await adminService.upsertCategory(null, { name: 'Music' });
    const second = await adminService.upsertCategory(null, { name: 'Music' });
    expect(second.slug).toMatch(/^music-[0-9a-f]{6}$/);

    const renamed = await adminService.upsertCategory(second.id, { name: 'Indie Music', is_active: false });
    expect(renamed).toMatchObject({ name: 'Indie Music', slug: second.slug, is_active: false, sort_order: 0 });
  });

  it('bounds the sort order and keeps it when not sent', async () => {
    await expect(adminService.upsertCategory(null, { name: 'Art', sort_order: -1 })).rejects.toMatchObject(badInputError('Sort order cannot be negative'));
    await expect(adminService.upsertCategory(null, { name: 'Art', sort_order: 10_000 })).rejects.toMatchObject(badInputError('Sort order cannot be more than 9999'));
    const created = await adminService.upsertCategory(null, { name: 'Art', sort_order: 9999 });
    await expect(adminService.upsertCategory(created.id, { name: 'Art & Craft' })).resolves.toMatchObject({ sort_order: 9999, slug: 'art' });
  });

  it('refuses a blank name and an unknown id', async () => {
    await expect(adminService.upsertCategory(null, { name: '' })).rejects.toMatchObject(badInputError('Name is required'));
    await expect(adminService.upsertCategory('507f1f77bcf86cd799439011', { name: 'X' })).rejects.toMatchObject(apiError('NOT_FOUND', 'Category could not be found'));
  });

  it('deletes only a category no event uses', async () => {
    const used = await LiteCategoryModel.create({ name: 'Music', slug: 'music' });
    await hostedEvent(host, { category_id: String(used._id) });
    await expect(adminService.deleteCategory(String(used._id))).rejects.toMatchObject(badInputError('This category is on 1 event(s); switch it off instead'));
    const unused = await LiteCategoryModel.create({ name: 'Art', slug: 'art' });
    await expect(adminService.deleteCategory(String(unused._id))).resolves.toBe(true);
    await expect(adminService.deleteCategory(String(unused._id))).resolves.toBe(false);
  });
});

describe('cities', () => {
  it('creates a city in a region, defaulting the country', async () => {
    const row = await adminService.upsertCity(null, { name: 'London', region: 'EUROPE', country: 'United Kingdom', cover_url: 'https://ik.imagekit.io/london.jpg', featured: true });
    expect(row).toMatchObject({ name: 'London', slug: 'london', region: 'EUROPE', country: 'United Kingdom', featured: true, cover_url: 'https://ik.imagekit.io/london.jpg' });
    const mumbai = await adminService.upsertCity(null, { name: 'Mumbai' });
    expect(mumbai).toMatchObject({ country: 'India', region: 'ASIA_PACIFIC', featured: false });
  });

  it('refuses an unknown region, a used link and a bad cover', async () => {
    await expect(adminService.upsertCity(null, { name: 'Atlantis', region: 'OCEAN' })).rejects.toMatchObject(badInputError('Pick a region from the list'));
    await adminService.upsertCity(null, { name: 'Mumbai' });
    await expect(adminService.upsertCity(null, { name: 'Bombay', slug: 'mumbai' })).rejects.toMatchObject(badInputError('That city link is already used'));
    await expect(adminService.upsertCity(null, { name: 'Pune', cover_url: 'pune.jpg' })).rejects.toMatchObject(badInputError('Cover must be a full http(s) link'));
    await expect(adminService.upsertCity(null, { name: 'Pune', sort_order: -2 })).rejects.toMatchObject(badInputError('Sort order cannot be negative'));
  });

  it('edits a city, keeping its country and returning it even when switched off', async () => {
    const created = await adminService.upsertCity(null, { name: 'Pune', country: 'India' });
    const edited = await adminService.upsertCity(created.id, { name: 'Pune City', is_active: false });
    expect(edited).toMatchObject({ id: created.id, name: 'Pune City', slug: 'pune', country: 'India', is_active: false });
    await expect(adminService.upsertCity('507f1f77bcf86cd799439011', { name: 'X' })).rejects.toMatchObject(apiError('NOT_FOUND', 'City could not be found'));
  });

  it('deletes only a city no event uses', async () => {
    const used = await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    await hostedEvent(host, { city_slug: 'mumbai' });
    await expect(adminService.deleteCity(String(used._id))).rejects.toMatchObject(badInputError('This city is on 1 event(s); switch it off instead'));
    const unused = await LiteCityModel.create({ name: 'Goa', slug: 'goa' });
    await expect(adminService.deleteCity(String(unused._id))).resolves.toBe(true);
    await expect(adminService.deleteCity(String(unused._id))).resolves.toBe(false);
    expect(await LiteEventModel.countDocuments({ city_slug: 'mumbai' })).toBe(1);
  });
});

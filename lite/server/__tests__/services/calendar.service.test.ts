import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteCityModel } from '../../models/city.model';
import { LiteSubscriptionModel } from '../../models/subscription.model';
import type { LiteUserDoc } from '../../models/user.model';
import { calendarService } from '../../services/calendar.service';
import { notifications } from '../../services/notifications';
import { apiError, badInputError } from '../helpers/expect';
import { DAY, HOUR, hostedEvent, makeUser } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

let owner: LiteUserDoc;
let fan: LiteUserDoc;

beforeEach(async () => {
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  owner = await makeUser({ email: 'hema@lite.test', name: 'Hema', handle: 'hema' });
  fan = await makeUser({ email: 'fan@lite.test', name: 'Fan' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const subscriberCount = async (id: string) => (await LiteCalendarModel.findById(id).lean())?.subscriber_count;

describe('calendarService.create', () => {
  it('creates a calendar with a slug from its name, owned by its creator', async () => {
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    const calendar = await calendarService.create(owner, {
      name: '  Hema Live  ',
      description: 'Jazz most Sundays',
      avatar_url: 'https://ik.imagekit.io/a.png',
      city_slug: 'Mumbai',
    });
    expect(calendar).toMatchObject({ name: 'Hema Live', slug: 'hema-live', description: 'Jazz most Sundays', city_slug: 'mumbai', city_name: 'Mumbai', viewer_is_owner: true });
  });

  it('uses a requested slug, suffixing it when taken', async () => {
    await calendarService.create(owner, { name: 'Jazz', slug: 'Sunday Jazz' });
    const second = await calendarService.create(fan, { name: 'Other jazz', slug: 'sunday-jazz' });
    expect(second.slug).toMatch(/^sunday-jazz-[0-9a-f]{6}$/);
  });

  it('refuses reserved links, unknown cities, bad links and a blank name', async () => {
    await expect(calendarService.create(owner, { name: 'Discover' })).rejects.toMatchObject(badInputError('That link is reserved; pick another'));
    await expect(calendarService.create(owner, { name: 'Mine', slug: 'admin' })).rejects.toMatchObject(badInputError('That link is reserved; pick another'));
    await expect(calendarService.create(owner, { name: 'Mine', city_slug: 'atlantis' })).rejects.toMatchObject(badInputError('Pick a city from the list'));
    await expect(calendarService.create(owner, { name: 'Mine', cover_url: 'cover.png' })).rejects.toMatchObject(badInputError('Cover must be a full http(s) link'));
    await expect(calendarService.create(owner, { name: ' ' })).rejects.toMatchObject(badInputError('Name is required'));
  });
});

describe('calendarService.update', () => {
  it('lets the owner or an admin edit, and nobody else', async () => {
    const calendar = await calendarService.create(owner, { name: 'Hema Live' });
    await expect(calendarService.update(owner, calendar.id, { name: 'Hema Live Sessions', description: 'New', slug: 'hema-sessions' })).resolves.toMatchObject({
      name: 'Hema Live Sessions',
      slug: 'hema-sessions',
      description: 'New',
    });
    const admin = await makeUser({ is_admin: true });
    await expect(calendarService.update(admin, calendar.id, { name: 'Admin fix' })).resolves.toMatchObject({ name: 'Admin fix', slug: 'hema-sessions' });
    await expect(calendarService.update(fan, calendar.id, { name: 'Mine now' })).rejects.toMatchObject(apiError('FORBIDDEN', 'Only the calendar owner can edit it'));
    await expect(calendarService.update(owner, '507f1f77bcf86cd799439011', { name: 'X' })).rejects.toMatchObject(apiError('NOT_FOUND', 'Calendar could not be found'));
  });

  it('refuses a reserved or taken link', async () => {
    const calendar = await calendarService.create(owner, { name: 'Hema Live' });
    await calendarService.create(fan, { name: 'Fan Club' });
    await expect(calendarService.update(owner, calendar.id, { name: 'Hema', slug: 'tickets' })).rejects.toMatchObject(badInputError('That link is reserved; pick another'));
    await expect(calendarService.update(owner, calendar.id, { name: 'Hema', slug: 'fan-club' })).rejects.toMatchObject(badInputError('That link is already taken'));
  });
});

describe('following a calendar', () => {
  it('counts a follower once, however often they follow, and never below zero', async () => {
    const calendar = await calendarService.create(owner, { name: 'Hema Live' });
    await calendarService.subscribe(fan, calendar.id, true);
    const again = await calendarService.subscribe(fan, calendar.id, true);
    expect(again).toMatchObject({ subscriber_count: 1, viewer_subscribed: true });

    const off = await calendarService.subscribe(fan, calendar.id, false);
    expect(off).toMatchObject({ subscriber_count: 0, viewer_subscribed: false });
    await calendarService.subscribe(fan, calendar.id, false);
    expect(await subscriberCount(calendar.id)).toBe(0);
  });

  it('refuses an unknown calendar', async () => {
    await expect(calendarService.subscribe(fan, '507f1f77bcf86cd799439011', true)).rejects.toMatchObject(apiError('NOT_FOUND', 'Calendar could not be found'));
  });

  it('lists followed calendars newest subscription first, dropping ones deleted since', async () => {
    const first = await calendarService.create(owner, { name: 'First Followed' });
    const second = await calendarService.create(owner, { name: 'Second Followed' });
    const gone = await calendarService.create(owner, { name: 'Deleted Later' });
    await calendarService.subscribe(fan, first.id, true);
    await calendarService.subscribe(fan, second.id, true);
    await calendarService.subscribe(fan, gone.id, true);
    // Space the follows a minute apart (written straight to the collection; Mongoose keeps created_at immutable).
    const now = Date.now();
    for (const [index, calendar] of [first, second, gone].entries()) {
      await LiteSubscriptionModel.collection.updateOne(
        { user_id: fan._id, calendar_id: new Types.ObjectId(String(calendar.id)) },
        { $set: { created_at: new Date(now - (3 - index) * 60_000) } },
      );
    }
    await LiteCalendarModel.deleteOne({ _id: gone.id });

    const followed = await calendarService.subscribed(fan);

    expect(followed.map((c) => c.slug)).toEqual(['second-followed', 'first-followed']);
    expect(followed.every((c) => c.viewer_subscribed)).toBe(true);
    await expect(calendarService.subscribed(owner)).resolves.toEqual([]);
  });
});

describe('calendar pages', () => {
  it('shows a calendar by slug in any case, or null', async () => {
    await calendarService.create(owner, { name: 'Hema Live' });
    await expect(calendarService.bySlug('HEMA-LIVE', fan)).resolves.toMatchObject({ name: 'Hema Live', viewer_is_owner: false });
    await expect(calendarService.bySlug('nope', null)).resolves.toBeNull();
  });

  it('lists public events to everyone and unlisted ones to the owner too', async () => {
    const calendar = await calendarService.create(owner, { name: 'Hema Live' });
    await hostedEvent(owner, { title: 'Public Gig', calendar_id: calendar.id });
    await hostedEvent(owner, { title: 'Unlisted Gig', visibility: 'UNLISTED', calendar_id: calendar.id });
    await hostedEvent(owner, { title: 'Draft Gig', calendar_id: calendar.id }, false);
    const start = new Date(Date.now() - 3 * DAY);
    await hostedEvent(owner, { title: 'Past Gig', calendar_id: calendar.id, start_at: start.toISOString(), end_at: new Date(start.getTime() + HOUR).toISOString() });

    const titles = async (user: LiteUserDoc | null, past = false) => (await calendarService.events('hema-live', past, user)).map((e) => e.title);
    expect(await titles(null)).toEqual(['Public Gig']);
    expect(await titles(fan)).toEqual(['Public Gig']);
    expect((await titles(owner)).sort()).toEqual(['Public Gig', 'Unlisted Gig']);
    expect(await titles(null, true)).toEqual(['Past Gig']);
    await expect(calendarService.events('nope', false, null)).resolves.toEqual([]);
  });

  it("lists the owner's calendars oldest first", async () => {
    await calendarService.create(owner, { name: 'Beta' });
    const alpha = await calendarService.create(owner, { name: 'Alpha' });
    await LiteCalendarModel.collection.updateOne({ _id: new Types.ObjectId(String(alpha.id)) }, { $set: { created_at: new Date(Date.now() - DAY) } });
    await calendarService.create(fan, { name: 'Not Hers' });
    expect((await calendarService.mine(owner)).map((c) => c.name)).toEqual(['Alpha', 'Beta']);
  });

  it('features a calendar from the console', async () => {
    const calendar = await calendarService.create(owner, { name: 'Hema Live' });
    await expect(calendarService.setFeatured(calendar.id, true)).resolves.toMatchObject({ featured: true });
    await expect(calendarService.setFeatured('507f1f77bcf86cd799439011', true)).rejects.toMatchObject(apiError('NOT_FOUND', 'Calendar could not be found'));
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteCategoryModel } from '../../models/category.model';
import { LiteCityModel } from '../../models/city.model';
import { LiteEventModel } from '../../models/event.model';
import type { LiteUserDoc } from '../../models/user.model';
import { eventService, type EventInput } from '../../services/event.service';
import { notifications } from '../../services/notifications';
import { settingsService } from '../../services/settings.service';
import { apiError, badInputError } from '../helpers/expect';
import { DAY, HOUR, eventInput, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

let host: LiteUserDoc;
let guest: LiteUserDoc;
let admin: LiteUserDoc;

beforeEach(async () => {
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
  guest = await makeUser({ email: 'gita@lite.test', name: 'Gita Guest' });
  admin = await makeUser({ email: 'admin@lite.test', name: 'Lite Admin', is_admin: true });
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'eventCancelled').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'coHostAdded').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'hostUpdate').mockResolvedValue(3);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Create an event as the host and answer its id. */
async function create(overrides: Partial<EventInput> = {}, by: LiteUserDoc = host): Promise<string> {
  const event = await eventService.create(by, eventInput(overrides));
  return String(event.id);
}

async function stored(id: string) {
  const doc = await LiteEventModel.findById(id);
  if (!doc) throw new Error('event missing');
  return doc;
}

const pastWindow = (): Partial<EventInput> => {
  const start = new Date(Date.now() - 2 * DAY);
  return { start_at: start.toISOString(), end_at: new Date(start.getTime() + 2 * HOUR).toISOString() };
};

describe('eventService.create', () => {
  it('creates a draft hosted by its creator, with a slug from the title and safe defaults', async () => {
    const event = await eventService.create(host, eventInput());
    expect(event).toMatchObject({
      slug: 'sunday-jazz-at-bandra',
      title: 'Sunday Jazz at Bandra',
      status: 'DRAFT',
      visibility: 'PUBLIC',
      registration_open: true,
      capacity: null,
      viewer_is_host: true,
      theme: { key: 'MINIMAL', accent: 'DEFAULT' },
      upi_id: null,
      lat: null,
      lng: null,
    });
    expect(event.hosts).toEqual([{ user_id: String(host._id), name: 'Hema Host', handle: 'hema', avatar_url: null, role: 'HOST' }]);
    expect(event.tickets).toEqual([{ id: expect.any(String), name: 'General', description: null, price: 0, quantity: null, sold: 0, is_active: true }]);
  });

  it('gives a second event with the same title its own link', async () => {
    await create();
    const second = await eventService.create(host, eventInput());
    expect(second.slug).toMatch(/^sunday-jazz-at-bandra-[0-9a-f]{6}$/);
  });

  it("bounds the capacity by the console's ceiling", async () => {
    await settingsService.update({ max_event_capacity: 500 });
    await expect(create({ capacity: 0 })).rejects.toMatchObject(badInputError('Capacity must be at least 1'));
    await expect(create({ capacity: 501 })).rejects.toMatchObject(badInputError('Capacity cannot be more than 500'));
    await expect(create({ capacity: 2.5 })).rejects.toMatchObject(badInputError('Capacity must be a whole number'));
    const ok = await eventService.create(host, eventInput({ capacity: 500 }));
    expect(ok.capacity).toBe(500);
  });

  it('refuses negative, fractional and over-ceiling ticket prices', async () => {
    await expect(create({ tickets: [{ name: 'General', price: -1 }] })).rejects.toMatchObject(badInputError('Price of General cannot be negative'));
    await expect(create({ tickets: [{ name: 'General', price: 9.5 }] })).rejects.toMatchObject(badInputError('Price of General must be a whole number'));
    await expect(create({ tickets: [{ name: 'General', price: 10_000_001 }], upi_id: 'hema@okaxis' })).rejects.toMatchObject(
      badInputError('Price of General cannot be more than 10000000'),
    );
  });

  it("applies the console's highest ticket price when one is set", async () => {
    await settingsService.update({ max_ticket_price: 2000 });
    await expect(create({ tickets: [{ name: 'VIP', price: 2500 }], upi_id: 'hema@okaxis' })).rejects.toMatchObject(badInputError('Price of VIP cannot be more than 2000'));
    const ok = await eventService.create(host, eventInput({ tickets: [{ name: 'VIP', price: 2000 }], upi_id: 'hema@okaxis' }));
    expect(ok.tickets[0].price).toBe(2000);
  });

  it('bounds the seats on a ticket between 1 and the capacity ceiling', async () => {
    await settingsService.update({ max_event_capacity: 500 });
    await expect(create({ tickets: [{ name: 'General', price: 0, quantity: 0 }] })).rejects.toMatchObject(badInputError('Seats on General must be at least 1'));
    await expect(create({ tickets: [{ name: 'General', price: 0, quantity: 501 }] })).rejects.toMatchObject(badInputError('Seats on General cannot be more than 500'));
  });

  it('needs at least one named ticket type', async () => {
    await expect(create({ tickets: [] })).rejects.toMatchObject(badInputError('Add at least one ticket type'));
    await expect(create({ tickets: [{ name: '  ', price: 0 }] })).rejects.toMatchObject(badInputError('Ticket name is required'));
  });

  it('needs a UPI ID for a paid ticket, from the form or the profile', async () => {
    await expect(create({ tickets: [{ name: 'Entry', price: 499 }] })).rejects.toMatchObject(badInputError('Add your UPI ID so guests can pay you for a paid ticket'));

    const fromForm = await eventService.create(host, eventInput({ tickets: [{ name: 'Entry', price: 499 }], upi_id: ' Hema@OKAXIS ' }));
    expect(fromForm).toMatchObject({ upi_id: 'hema@okaxis', upi_name: 'Hema Host' });

    const payee = await makeUser({ email: 'sana@lite.test', upi_id: 'sana@okicici', upi_name: 'Sana S' });
    const fromProfile = await eventService.create(payee, eventInput({ tickets: [{ name: 'Entry', price: 499 }] }));
    expect(fromProfile).toMatchObject({ upi_id: 'sana@okicici', upi_name: 'Sana S' });
  });

  it('keeps no UPI details on a free event', async () => {
    const id = await create({ upi_id: 'hema@okaxis', upi_name: 'Hema' });
    expect((await stored(id)).upi_id).toBe('');
  });

  it('validates the theme key and accent against the lists', async () => {
    await expect(create({ theme: { key: 'NEON' } })).rejects.toMatchObject(badInputError('Pick a theme from the list'));
    await expect(create({ theme: { accent: 'BROWN' } })).rejects.toMatchObject(badInputError('Pick a colour from the list'));
    const themed = await eventService.create(host, eventInput({ theme: { key: 'CONFETTI', accent: 'TEAL' } }));
    expect(themed.theme).toEqual({ key: 'CONFETTI', accent: 'TEAL' });
    const accentOnly = await eventService.create(host, eventInput({ theme: { key: null, accent: 'PINK' } }));
    expect(accentOnly.theme).toEqual({ key: 'MINIMAL', accent: 'PINK' });
  });

  it('keeps a map pin only for an in-person event with both coordinates', async () => {
    const pinned = await eventService.create(host, eventInput({ lat: 19.0596, lng: 72.8295, place_id: 'ChIJ-bandra' }));
    expect(pinned).toMatchObject({ lat: 19.0596, lng: 72.8295, place_id: 'ChIJ-bandra' });

    const half = await eventService.create(host, eventInput({ lat: 19.0596, place_id: 'ChIJ-bandra' }));
    expect(half).toMatchObject({ lat: null, lng: null, place_id: null });

    const online = await eventService.create(host, eventInput({ location_type: 'VIRTUAL', virtual_link: 'https://meet.duncit.com/jazz', lat: 19, lng: 72 }));
    expect(online).toMatchObject({ lat: null, lng: null, place_id: null });

    await expect(create({ lat: 95, lng: 72 })).rejects.toMatchObject(badInputError('Latitude must be between -90 and 90'));
  });

  it('needs a join link online and a venue or address in person', async () => {
    await expect(create({ location_type: 'VIRTUAL', virtual_link: '' })).rejects.toMatchObject(badInputError('Add the join link for an online event'));
    await expect(create({ venue_name: '', address: '' })).rejects.toMatchObject(badInputError('Add a venue or an address'));
    await expect(create({ location_type: 'HYBRID' })).rejects.toMatchObject(badInputError('Unknown location type'));
    await expect(create({ map_url: 'maps' })).rejects.toMatchObject(badInputError('Map link must be a full http(s) link'));
  });

  it('validates the schedule, visibility and text fields', async () => {
    const start = eventInput().start_at;
    await expect(create({ end_at: start })).rejects.toMatchObject(badInputError('The event must end after it starts'));
    await expect(create({ start_at: 'tomorrow evening' })).rejects.toMatchObject(badInputError('Start is not a valid date and time'));
    await expect(create({ timezone: 'IST' })).rejects.toMatchObject(badInputError('Pick a valid time zone'));
    await expect(create({ visibility: 'SECRET' })).rejects.toMatchObject(badInputError('Unknown visibility'));
    await expect(create({ title: ' ' })).rejects.toMatchObject(badInputError('Title is required'));
    await expect(create({ description: '' })).rejects.toMatchObject(badInputError('Description is required'));
    await expect(create({ cover_url: 'ftp://covers/x.png' })).rejects.toMatchObject(badInputError('Cover image must be a full http(s) link'));
  });

  it('accepts only an active city, an active category and one of your own calendars', async () => {
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    await LiteCityModel.create({ name: 'Pune', slug: 'pune', is_active: false });
    const music = await LiteCategoryModel.create({ name: 'Music', slug: 'music' });
    const retired = await LiteCategoryModel.create({ name: 'Retired', slug: 'retired', is_active: false });
    const own = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    const theirs = await LiteCalendarModel.create({ owner_id: guest._id, slug: 'gita-gigs', name: 'Gita Gigs' });

    const event = await eventService.create(host, eventInput({ city_slug: 'MUMBAI', category_id: String(music._id), calendar_id: String(own._id) }));
    expect(event).toMatchObject({ city_slug: 'mumbai', city_name: 'Mumbai', category: { slug: 'music' }, calendar: { slug: 'hema-live' } });

    await expect(create({ city_slug: 'pune' })).rejects.toMatchObject(badInputError('Pick a city from the list'));
    await expect(create({ city_slug: 'atlantis' })).rejects.toMatchObject(badInputError('Pick a city from the list'));
    await expect(create({ category_id: String(retired._id) })).rejects.toMatchObject(badInputError('Pick a category from the list'));
    await expect(create({ category_id: 'music' })).rejects.toMatchObject(badInputError('Pick a category from the list'));
    await expect(create({ calendar_id: String(theirs._id) })).rejects.toMatchObject(badInputError('Pick one of your own calendars'));
    await expect(create({ calendar_id: 'hema-live' })).rejects.toMatchObject(badInputError('Pick one of your own calendars'));
  });

  it('validates registration questions', async () => {
    await expect(create({ questions: [{ label: 'Date of birth', type: 'DATE' }] })).rejects.toMatchObject(badInputError('Unknown question type'));
    await expect(create({ questions: [{ label: 'T-shirt size', type: 'SELECT', options: ['M', '  '] }] })).rejects.toMatchObject(
      badInputError('A choice question needs at least two options'),
    );
    const event = await eventService.create(host, eventInput({ questions: [{ label: ' Dietary needs ', type: 'TEXT', required: true }] }));
    expect(event.questions).toEqual([{ id: expect.any(String), label: 'Dietary needs', type: 'TEXT', required: true, options: [] }]);
  });
});

describe('eventService.update', () => {
  it('refuses a capacity below the seats already held, counting only seat-holding statuses', async () => {
    const id = await create();
    const doc = await stored(id);
    await seedRegistration(doc, guest, { status: 'CONFIRMED', quantity: 2 });
    await seedRegistration(doc, await makeUser(), { status: 'PENDING_APPROVAL', quantity: 1 });
    await seedRegistration(doc, await makeUser(), { status: 'WAITLISTED', quantity: 5 });

    await expect(eventService.update(host, id, eventInput({ capacity: 2 }))).rejects.toMatchObject(
      badInputError('3 seats are already taken, so the capacity cannot be lower than 3'),
    );
    const updated = await eventService.update(host, id, eventInput({ capacity: 3 }));
    expect(updated.capacity).toBe(3);
  });

  it('refuses shrinking a ticket below the seats sold on it, and keeps the sold count', async () => {
    const id = await create({ tickets: [{ name: 'General', price: 0, quantity: 10 }] });
    const doc = await stored(id);
    const ticketId = String(doc.tickets[0]._id);
    await LiteEventModel.updateOne({ _id: doc._id, 'tickets._id': doc.tickets[0]._id }, { $set: { 'tickets.$.sold': 4 } });

    await expect(eventService.update(host, id, eventInput({ tickets: [{ id: ticketId, name: 'General', price: 0, quantity: 3 }] }))).rejects.toMatchObject(
      badInputError('General already has 4 seats taken; it cannot drop below that'),
    );
    const updated = await eventService.update(host, id, eventInput({ tickets: [{ id: ticketId, name: 'General admission', price: 0, quantity: 4 }] }));
    expect(updated.tickets).toEqual([expect.objectContaining({ id: ticketId, name: 'General admission', quantity: 4, sold: 4 })]);
  });

  it('closes registration from the form and keeps the setting when it is not sent', async () => {
    const id = await create();
    await eventService.update(host, id, eventInput({ registration_open: false }));
    const kept = await eventService.update(host, id, eventInput({ title: 'Renamed' }));
    expect(kept).toMatchObject({ registration_open: false, title: 'Renamed', slug: 'sunday-jazz-at-bandra' });
  });

  it('lets only hosts and admins edit, and never a cancelled event', async () => {
    const id = await create();
    await expect(eventService.update(guest, id, eventInput())).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
    await expect(eventService.update(admin, id, eventInput({ title: 'Admin fix' }))).resolves.toMatchObject({ title: 'Admin fix' });
    await eventService.cancel(host, id, 'Rain');
    await expect(eventService.update(host, id, eventInput())).rejects.toMatchObject(badInputError('A cancelled event cannot be edited'));
    await expect(eventService.update(host, '507f1f77bcf86cd799439011', eventInput())).rejects.toMatchObject(apiError('NOT_FOUND', 'Event could not be found'));
  });
});

describe('eventService.publish', () => {
  it("publishes once, telling the calendar's followers only the first time", async () => {
    const calendar = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    const id = await create({ calendar_id: String(calendar._id) });

    const first = await eventService.publish(host, id);
    const publishedAt = first.published_at;
    expect(first.status).toBe('PUBLISHED');
    expect(publishedAt).toEqual(expect.any(String));
    expect(notifications.calendarPublished).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notifications.calendarPublished).mock.calls[0][1])).toBe(String(calendar._id));

    const again = await eventService.publish(host, id);
    expect(again.published_at).toBe(publishedAt);
    expect(notifications.calendarPublished).toHaveBeenCalledTimes(1);
  });

  it('tells no followers for an event outside a calendar or not public', async () => {
    const calendar = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    await eventService.publish(host, await create());
    await eventService.publish(host, await create({ calendar_id: String(calendar._id), visibility: 'UNLISTED' }));
    expect(notifications.calendarPublished).not.toHaveBeenCalled();
  });

  it('refuses a cancelled event and a non-host', async () => {
    const id = await create();
    await expect(eventService.publish(guest, id)).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
    await eventService.cancel(host, id, '');
    await expect(eventService.publish(host, id)).rejects.toMatchObject(badInputError('A cancelled event cannot be published'));
  });
});

describe('eventService.cancel', () => {
  it('cancels with a reason and tells the guests once', async () => {
    const id = await create();
    const cancelled = await eventService.cancel(host, id, '  Heavy rain  ');
    expect(cancelled).toMatchObject({ status: 'CANCELLED', cancel_reason: 'Heavy rain', cancelled_at: expect.any(String) });
    expect(notifications.eventCancelled).toHaveBeenCalledTimes(1);

    const again = await eventService.cancel(host, id, 'Again');
    expect(again).toMatchObject({ status: 'CANCELLED', cancel_reason: 'Heavy rain' });
    expect(notifications.eventCancelled).toHaveBeenCalledTimes(1);
  });

  it('lets an admin cancel any event from the console, and refuses guests', async () => {
    const id = await create();
    await expect(eventService.cancel(guest, id, 'mine now')).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
    await expect(eventService.cancel(admin, id, 'Policy', true)).resolves.toMatchObject({ status: 'CANCELLED', cancel_reason: 'Policy' });
    await expect(eventService.cancel(admin, '507f1f77bcf86cd799439011', 'x', true)).rejects.toMatchObject(apiError('NOT_FOUND', 'Event could not be found'));
  });

  it('refuses a reason longer than 500 characters', async () => {
    const id = await create();
    await expect(eventService.cancel(host, id, 'x'.repeat(501))).rejects.toMatchObject(badInputError('Reason must be 500 characters or fewer'));
  });
});

describe('eventService.duplicate', () => {
  it('copies the page as a fresh draft owned by whoever duplicated it', async () => {
    const id = await create({ tickets: [{ name: 'General', price: 0, quantity: 50 }], theme: { key: 'AMBIENT', accent: 'BLUE' } });
    await eventService.addCoHost(host, id, guest.email ?? '');
    await eventService.publish(host, id);
    await eventService.setRegistrationOpen(host, id, false);
    const source = await stored(id);
    await LiteEventModel.updateOne({ _id: source._id, 'tickets._id': source.tickets[0]._id }, { $set: { 'tickets.$.sold': 12, featured: true } });

    const copy = await eventService.duplicate(guest, id);

    expect(copy.id).not.toBe(id);
    expect(copy).toMatchObject({ title: 'Sunday Jazz at Bandra (copy)', status: 'DRAFT', registration_open: true, featured: false, published_at: null, theme: { key: 'AMBIENT', accent: 'BLUE' } });
    expect(copy.slug).toMatch(/^sunday-jazz-at-bandra-[0-9a-f]{6}$/);
    expect(copy.hosts).toEqual([expect.objectContaining({ user_id: String(guest._id), role: 'HOST' })]);
    expect(copy.tickets).toEqual([expect.objectContaining({ name: 'General', quantity: 50, sold: 0 })]);
    expect(copy.tickets[0].id).not.toBe(String(source.tickets[0]._id));
  });

  it('is for hosts only', async () => {
    const id = await create();
    await expect(eventService.duplicate(guest, id)).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
  });
});

describe('co-hosts', () => {
  it('adds a co-host by email, who can then edit the event', async () => {
    const id = await create();
    const event = await eventService.addCoHost(host, id, ' GITA@lite.test ');
    expect(event.hosts.map((h: { role: string }) => h.role)).toEqual(['HOST', 'CO_HOST']);
    expect(notifications.coHostAdded).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notifications.coHostAdded).mock.calls[0][1])).toBe(String(guest._id));
    await expect(eventService.update(guest, id, eventInput({ title: 'Co-host edit' }))).resolves.toMatchObject({ title: 'Co-host edit' });
  });

  it('refuses an unknown email and someone who is already a host', async () => {
    const id = await create();
    await expect(eventService.addCoHost(host, id, 'stranger@lite.test')).rejects.toMatchObject(
      badInputError('No Lite account uses that email yet. Ask them to sign in once first'),
    );
    await expect(eventService.addCoHost(host, id, 'hema@lite.test')).rejects.toMatchObject(badInputError('They are already a host'));
    await eventService.addCoHost(host, id, 'gita@lite.test');
    await expect(eventService.addCoHost(host, id, 'gita@lite.test')).rejects.toMatchObject(badInputError('They are already a host'));
  });

  it('removes a co-host, who then loses access, but never the main host', async () => {
    const id = await create();
    await eventService.addCoHost(host, id, 'gita@lite.test');
    await expect(eventService.removeCoHost(host, id, String(host._id))).rejects.toMatchObject(badInputError('The main host cannot be removed'));
    await expect(eventService.removeCoHost(host, id, String(admin._id))).rejects.toMatchObject(apiError('NOT_FOUND', 'Co-host could not be found'));

    const event = await eventService.removeCoHost(host, id, String(guest._id));
    expect(event.hosts).toHaveLength(1);
    await expect(eventService.update(guest, id, eventInput())).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
  });
});

describe('eventService.setRegistrationOpen', () => {
  it('closes and reopens registration without touching the rest of the event', async () => {
    const id = await create({ capacity: 40 });
    await expect(eventService.setRegistrationOpen(host, id, false)).resolves.toMatchObject({ registration_open: false, capacity: 40, status: 'DRAFT' });
    await expect(eventService.setRegistrationOpen(host, id, true)).resolves.toMatchObject({ registration_open: true });
  });

  it('refuses a cancelled event', async () => {
    const id = await create();
    await eventService.cancel(host, id, '');
    await expect(eventService.setRegistrationOpen(host, id, true)).rejects.toMatchObject(badInputError('A cancelled event cannot take registrations'));
  });
});

describe('eventService.changeSlug', () => {
  it('moves the event to a new link and retires the old one', async () => {
    const id = await create();
    await eventService.publish(host, id);
    const moved = await eventService.changeSlug(host, id, ' Jazz-Night-2026 ');
    expect(moved.slug).toBe('jazz-night-2026');
    await expect(eventService.bySlug('jazz-night-2026', null)).resolves.toMatchObject({ id });
    await expect(eventService.bySlug('sunday-jazz-at-bandra', null)).resolves.toBeNull();
  });

  it('keeps the same link as a no-op', async () => {
    const id = await create();
    await expect(eventService.changeSlug(host, id, 'sunday-jazz-at-bandra')).resolves.toMatchObject({ slug: 'sunday-jazz-at-bandra' });
  });

  it('refuses links that are malformed, too long or taken', async () => {
    const id = await create();
    await create({ title: 'Garden Party' });
    for (const slug of ['jazz night', 'ab', 'jazz--night', '-jazz', 'jazz_night']) {
      await expect(eventService.changeSlug(host, id, slug)).rejects.toMatchObject(badInputError('An event link is 3 to 80 lowercase letters, numbers and single hyphens'));
    }
    await expect(eventService.changeSlug(host, id, 'a'.repeat(81))).rejects.toMatchObject(badInputError('Event link must be 80 characters or fewer'));
    await expect(eventService.changeSlug(host, id, 'garden-party')).rejects.toMatchObject(badInputError('That event link is already taken'));
  });
});

describe('who can see an event', () => {
  it('hides a draft from everyone but its hosts and admins', async () => {
    await create();
    await expect(eventService.bySlug('sunday-jazz-at-bandra', null)).resolves.toBeNull();
    await expect(eventService.bySlug('sunday-jazz-at-bandra', guest)).resolves.toBeNull();
    await expect(eventService.bySlug('SUNDAY-JAZZ-AT-BANDRA', host)).resolves.toMatchObject({ viewer_is_host: true });
    await expect(eventService.bySlug('sunday-jazz-at-bandra', admin)).resolves.toMatchObject({ viewer_is_host: false });
  });

  it('shows a published public or unlisted event to anyone, and hides one an admin hid', async () => {
    const id = await create();
    await eventService.publish(host, id);
    await expect(eventService.bySlug('sunday-jazz-at-bandra', null)).resolves.toMatchObject({ id, status: 'PUBLISHED' });

    const unlisted = await create({ title: 'Quiet Supper', visibility: 'UNLISTED' });
    await eventService.publish(host, unlisted);
    await expect(eventService.bySlug('quiet-supper', null)).resolves.toMatchObject({ id: unlisted });

    await LiteEventModel.updateOne({ _id: id }, { $set: { hidden: true } });
    await expect(eventService.bySlug('sunday-jazz-at-bandra', null)).resolves.toBeNull();
    await expect(eventService.bySlug('sunday-jazz-at-bandra', host)).resolves.toMatchObject({ id });
  });

  it('shows a private event only to people already registered', async () => {
    const id = await create({ visibility: 'PRIVATE' });
    await eventService.publish(host, id);
    await expect(eventService.bySlug('sunday-jazz-at-bandra', null)).resolves.toBeNull();
    await expect(eventService.bySlug('sunday-jazz-at-bandra', guest)).resolves.toBeNull();
    await seedRegistration(await stored(id), guest);
    await expect(eventService.bySlug('sunday-jazz-at-bandra', guest)).resolves.toMatchObject({ id });
  });

  it('answers null for an unknown link', async () => {
    await expect(eventService.bySlug('nothing-here', host)).resolves.toBeNull();
  });
});

describe('eventService.sendUpdate', () => {
  it('sends the host message to the guests and reports how many went out', async () => {
    const id = await create();
    await expect(eventService.sendUpdate(host, id, ' Venue change ', 'We moved to the rooftop.')).resolves.toEqual({ sent: 3 });
    const [doc, subject, body] = vi.mocked(notifications.hostUpdate).mock.calls[0];
    expect(String(doc._id)).toBe(id);
    expect(subject).toBe('Venue change');
    expect(body).toBe('We moved to the rooftop.');
  });

  it('needs a subject and a message within limits', async () => {
    const id = await create();
    await expect(eventService.sendUpdate(host, id, '', 'Body')).rejects.toMatchObject(badInputError('Subject is required'));
    await expect(eventService.sendUpdate(host, id, 'Hi', 'x'.repeat(5001))).rejects.toMatchObject(badInputError('Message must be 5000 characters or fewer'));
    expect(notifications.hostUpdate).not.toHaveBeenCalled();
  });
});

describe('event lists', () => {
  it("lists the host's own upcoming and past events, drafts included", async () => {
    const upcoming = await create();
    const past = await create({ title: 'Last Week Social', ...pastWindow() });
    await create({ title: 'Not Mine' }, guest);

    expect((await eventService.mine(host, false)).map((e) => e.id)).toEqual([upcoming]);
    expect((await eventService.mine(host, true)).map((e) => e.id)).toEqual([past]);
  });

  it("lists only a person's published, public, visible events on their profile", async () => {
    const shown = await create();
    await eventService.publish(host, shown);
    await create({ title: 'Draft Idea' });
    const unlisted = await create({ title: 'Unlisted Supper', visibility: 'UNLISTED' });
    await eventService.publish(host, unlisted);
    const past = await create({ title: 'Old Gig', ...pastWindow() });
    await eventService.publish(host, past);

    expect((await eventService.byHandle('HEMA', false, null)).map((e) => e.id)).toEqual([shown]);
    expect((await eventService.byHandle('hema', true, guest)).map((e) => e.id)).toEqual([past]);
    await expect(eventService.byHandle('nobody', false, null)).resolves.toEqual([]);

    await host.updateOne({ $set: { is_blocked: true } });
    await expect(eventService.byHandle('hema', false, null)).resolves.toEqual([]);
  });
});

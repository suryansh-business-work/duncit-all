import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteCityModel } from '../../models/city.model';
import { LiteEventModel, type LiteEventDoc } from '../../models/event.model';
import { LiteSubscriptionModel } from '../../models/subscription.model';
import { LiteUserModel, type LiteUserDoc } from '../../models/user.model';
import { notifications } from '../../services/notifications';
import {
  eventStats,
  eventUrl,
  formatWhen,
  formatWhere,
  isHostOf,
  manageUrl,
  seatsHeld,
  ticketUrl,
  toPublicCalendar,
  toPublicEvent,
  toPublicRegistration,
} from '../../services/projections';
import { DAY, hostedEvent, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test' } };
});

withTestDatabase();

let host: LiteUserDoc;

beforeEach(async () => {
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const viewerOf = (user: LiteUserDoc) => ({ id: String(user._id), is_admin: user.is_admin });

describe('isHostOf', () => {
  it('is true only for a viewer listed among the hosts', () => {
    const event = { hosts: [{ user_id: 'a1' }, { user_id: 'b2' }] };
    expect(isHostOf(event, { id: 'b2', is_admin: false })).toBe(true);
    expect(isHostOf(event, { id: 'c3', is_admin: true })).toBe(false);
    expect(isHostOf(event, null)).toBe(false);
  });
});

describe('seat and guest counts', () => {
  let event: LiteEventDoc;

  beforeEach(async () => {
    event = await hostedEvent(host);
    await seedRegistration(event, await makeUser(), { status: 'CONFIRMED', quantity: 2, checked_in_at: new Date() });
    await seedRegistration(event, await makeUser(), { status: 'CONFIRMED', quantity: 1, payment_status: 'PAID', amount_due: 500 });
    await seedRegistration(event, await makeUser(), { status: 'PAYMENT_PENDING', quantity: 3, payment_status: 'PENDING', amount_due: 1500 });
    await seedRegistration(event, await makeUser(), { status: 'PENDING_APPROVAL', quantity: 1 });
    await seedRegistration(event, await makeUser(), { status: 'WAITLISTED', quantity: 4 });
    await seedRegistration(event, await makeUser(), { status: 'CANCELLED', quantity: 5 });
    await seedRegistration(event, await makeUser(), { status: 'DECLINED', quantity: 6, payment_status: 'REJECTED', amount_due: 900 });
  });

  it('holds seats for confirmed, payment-pending and pending-approval guests only', async () => {
    await expect(seatsHeld(event._id)).resolves.toBe(7);
  });

  it('summarises going seats, queues, check-ins and confirmed revenue', async () => {
    await expect(eventStats(event._id)).resolves.toEqual({ going: 3, waitlisted: 1, pending: 1, payment_pending: 1, checked_in: 1, revenue_confirmed: 500 });
  });

  it('answers zero for an event with no guests', async () => {
    const empty = await hostedEvent(host, { title: 'Empty Room' });
    await expect(seatsHeld(empty._id)).resolves.toBe(0);
    await expect(eventStats(empty._id)).resolves.toEqual({ going: 0, waitlisted: 0, pending: 0, payment_pending: 0, checked_in: 0, revenue_confirmed: 0 });
  });
});

describe('formatWhen', () => {
  it('shows a same-day event with one date, in its own zone', () => {
    const when = formatWhen({ start_at: new Date('2026-11-01T13:00:00Z'), end_at: new Date('2026-11-01T16:00:00Z'), timezone: 'Asia/Kolkata' });
    expect(when).toBe('Sun, 1 Nov 2026 · 6:30 PM – 9:30 PM (Asia/Kolkata)');
  });

  it('shows both dates for an event that runs past midnight, defaulting the zone', () => {
    const when = formatWhen({ start_at: new Date('2026-11-01T13:00:00Z'), end_at: new Date('2026-11-01T19:30:00Z'), timezone: '' });
    expect(when).toBe('Sun, 1 Nov 2026 · 6:30 PM – Mon, 2 Nov 2026 · 1:00 AM (Asia/Kolkata)');
  });
});

describe('formatWhere', () => {
  it('keeps an online event link private and joins the parts of a place', () => {
    expect(formatWhere({ location_type: 'VIRTUAL', venue_name: 'Zoom', address: '', city_slug: '' })).toBe('Online (link shared with confirmed guests)');
    expect(formatWhere({ location_type: 'IN_PERSON', venue_name: 'The Terrace', address: 'Hill Road', city_slug: 'mumbai' }, 'Mumbai')).toBe('The Terrace, Hill Road, Mumbai');
    expect(formatWhere({ location_type: 'IN_PERSON', venue_name: '', address: '', city_slug: '' })).toBe('To be announced');
  });
});

describe('links', () => {
  it('builds event, manage and ticket links on the site address', () => {
    expect(eventUrl('jazz')).toBe('https://lite.duncit.test/e/jazz');
    expect(manageUrl('jazz')).toBe('https://lite.duncit.test/e/jazz/manage');
    expect(ticketUrl('507f1f77bcf86cd799439011')).toBe('https://lite.duncit.test/tickets/507f1f77bcf86cd799439011');
  });
});

describe('toPublicEvent', () => {
  it('shows the join link to hosts, admins and confirmed guests only', async () => {
    const online = await hostedEvent(host, { title: 'Online Jam', location_type: 'VIRTUAL', virtual_link: 'https://meet.duncit.com/jam' });
    const doc = await LiteEventModel.findById(online._id).lean();
    if (!doc) throw new Error('missing event');
    const confirmed = await makeUser();
    const waiting = await makeUser();
    const admin = await makeUser({ is_admin: true });
    await seedRegistration(online, confirmed);
    await seedRegistration(online, waiting, { status: 'WAITLISTED' });

    expect((await toPublicEvent(doc, viewerOf(host))).virtual_link).toBe('https://meet.duncit.com/jam');
    expect((await toPublicEvent(doc, viewerOf(admin))).virtual_link).toBe('https://meet.duncit.com/jam');
    expect((await toPublicEvent(doc, viewerOf(confirmed))).virtual_link).toBe('https://meet.duncit.com/jam');
    expect((await toPublicEvent(doc, viewerOf(waiting))).virtual_link).toBeNull();
    expect((await toPublicEvent(doc, null)).virtual_link).toBeNull();
  });

  it("embeds the viewer's own registration unless asked not to", async () => {
    const event = await hostedEvent(host);
    const guest = await makeUser({ email: 'gita@lite.test', name: 'Gita' });
    const reg = await seedRegistration(event, guest, { code: 'GITA22' });

    const view = await toPublicEvent(event, viewerOf(guest));
    expect(view.viewer_registration).toMatchObject({ id: String(reg._id), code: 'GITA22', user: { email: 'gita@lite.test' } });
    expect(view.viewer_registration.event.viewer_registration).toBeNull();
    expect(view.viewer_is_host).toBe(false);

    const bare = await toPublicEvent(event, viewerOf(guest), { withoutViewerRegistration: true });
    expect(bare.viewer_registration).toBeNull();
  });

  it('shows UPI details only when a ticket costs money, and resolves the city', async () => {
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    const paid = await hostedEvent(host, { tickets: [{ name: 'Entry', price: 300 }], upi_id: 'hema@okaxis', city_slug: 'mumbai' });
    await expect(toPublicEvent(paid, null)).resolves.toMatchObject({ upi_id: 'hema@okaxis', upi_name: 'Hema Host', city_name: 'Mumbai' });

    await LiteEventModel.updateOne({ _id: paid._id }, { $set: { 'tickets.0.price': 0 } });
    const free = await LiteEventModel.findById(paid._id).lean();
    await expect(toPublicEvent(free, null)).resolves.toMatchObject({ upi_id: null, upi_name: null });
  });

  it('lists only hosts whose accounts still exist', async () => {
    const event = await hostedEvent(host);
    const gone = await makeUser({ name: 'Gone' });
    await LiteEventModel.updateOne({ _id: event._id }, { $push: { hosts: { user_id: gone._id, role: 'CO_HOST' } } });
    await LiteUserModel.deleteOne({ _id: gone._id });
    const view = await toPublicEvent(await LiteEventModel.findById(event._id).lean(), null);
    expect(view.hosts.map((h: { name: string }) => h.name)).toEqual(['Hema Host']);
  });
});

describe('toPublicCalendar', () => {
  it('counts upcoming public events and knows whether the viewer follows or owns it', async () => {
    await LiteCityModel.create({ name: 'Pune', slug: 'pune' });
    const calendar = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live', city_slug: 'pune' });
    await hostedEvent(host, { calendar_id: String(calendar._id) });
    await hostedEvent(host, { title: 'Draft', calendar_id: String(calendar._id) }, false);
    const fan = await makeUser();
    await LiteSubscriptionModel.create({ calendar_id: calendar._id, user_id: fan._id });

    await expect(toPublicCalendar(calendar, viewerOf(fan))).resolves.toMatchObject({
      slug: 'hema-live',
      city_name: 'Pune',
      owner: { name: 'Hema Host', handle: 'hema' },
      upcoming_count: 1,
      viewer_subscribed: true,
      viewer_is_owner: false,
    });
    await expect(toPublicCalendar(calendar, viewerOf(host))).resolves.toMatchObject({ viewer_subscribed: false, viewer_is_owner: true });
    await expect(toPublicCalendar(calendar, null)).resolves.toMatchObject({ viewer_subscribed: false, viewer_is_owner: false });
  });

  it('stands in a placeholder owner when the account is gone', async () => {
    const owner = await makeUser();
    const calendar = await LiteCalendarModel.create({ owner_id: owner._id, slug: 'orphan', name: 'Orphan' });
    await LiteUserModel.deleteOne({ _id: owner._id });
    await expect(toPublicCalendar(calendar, null)).resolves.toMatchObject({ owner: { id: String(owner._id), name: 'Host', handle: '', avatar_url: null }, city_name: null });
  });
});

describe('toPublicRegistration', () => {
  it('falls back to the denormalised guest when the account is gone', () => {
    const view = toPublicRegistration(
      {
        _id: 'r1',
        code: 'K7M2P9',
        event_id: 'e1',
        user_id: 'u1',
        user_name: 'Gita',
        user_email: 'gita@lite.test',
        ticket_id: 't1',
        ticket_name: 'General',
        status: 'CONFIRMED',
        payment_status: 'NOT_REQUIRED',
        answers: [{ question_id: 'q1', label: 'Instrument', answer: 'Sax', extra: 'dropped' }],
        created_at: new Date('2026-10-01T00:00:00Z'),
      },
      null,
      null,
    );
    expect(view).toMatchObject({
      id: 'r1',
      ticket: { id: 't1', name: 'General', price: 0 },
      quantity: 1,
      amount_due: 0,
      payment_reference: null,
      checked_in_at: null,
      waitlist_position: null,
      answers: [{ question_id: 'q1', label: 'Instrument', answer: 'Sax' }],
      user: { id: 'u1', name: 'Gita', email: 'gita@lite.test', phone: null, handle: '', avatar_url: null },
      created_at: '2026-10-01T00:00:00.000Z',
    });
    expect(view.answers[0]).not.toHaveProperty('extra');
  });

  it("uses the live account's details when it exists", async () => {
    const guest = await makeUser({ phone: '+919812345678', name: 'Ravi', handle: 'ravi' });
    const view = toPublicRegistration({ _id: 'r2', user_id: guest._id, code: 'X', created_at: new Date(Date.now() - DAY) }, null, guest);
    expect(view.user).toEqual({ id: String(guest._id), name: 'Ravi', email: '', phone: '+919812345678', handle: 'ravi', avatar_url: null });
  });
});

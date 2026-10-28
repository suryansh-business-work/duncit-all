import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteCityModel } from '../../models/city.model';
import type { LiteUserDoc } from '../../models/user.model';
import { duncitBridge } from '../../services/duncit.bridge';
import { notifications } from '../../services/notifications';
import { log } from '../../utils/log';
import { eventInput, makeUser } from '../helpers/fixtures';
import { codeOf, liteGraphql } from '../helpers/graphql';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test', adminEmails: [], otpTestCode: '424242' } };
});

withTestDatabase();

const run = liteGraphql();

let host: LiteUserDoc;
let guest: LiteUserDoc;

beforeEach(async () => {
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
  guest = await makeUser({ email: 'gita@lite.test', name: 'Gita Guest', handle: 'gita' });
  for (const moment of ['guestStatus', 'hostNewRegistration', 'calendarPublished', 'eventCancelled', 'coHostAdded'] as const) {
    vi.spyOn(notifications, moment).mockImplementation(() => undefined);
  }
  vi.spyOn(notifications, 'hostUpdate').mockResolvedValue(2);
  vi.spyOn(log, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface EventRef {
  id: string;
  slug: string;
  tickets: { id: string }[];
}

async function hostEvent(overrides: Parameters<typeof eventInput>[0] = {}): Promise<EventRef> {
  const created = await run<{ liteCreateEvent: EventRef }>('mutation C($input: LiteEventInput!) { liteCreateEvent(input: $input) { id slug tickets { id } } }', { input: eventInput(overrides) }, host);
  const event = created.data?.liteCreateEvent;
  if (!event) throw new Error(`event not created: ${JSON.stringify(created.errors)}`);
  await run('mutation P($id: ID!) { litePublishEvent(id: $id) { id } }', { id: event.id }, host);
  return event;
}

describe('signing in over GraphQL', () => {
  it('requests an email code and trades it for a session', async () => {
    vi.spyOn(duncitBridge, 'requestCode').mockResolvedValue(null);
    const requested = await run('mutation { liteRequestSignInCode(email: "meera@lite.test") { via test_code expires_in_minutes } }');
    expect(requested.data).toEqual({ liteRequestSignInCode: { via: 'LITE', test_code: '424242', expires_in_minutes: 10 } });

    const verified = await run<{ liteVerifySignInCode: { token: string; user: { name: string; email: string } } }>(
      'mutation V($code: String!) { liteVerifySignInCode(email: "meera@lite.test", code: $code, name: "Meera") { token user { name email } } }',
      { code: '424242' },
    );
    expect(verified.data?.liteVerifySignInCode.user).toEqual({ name: 'Meera', email: 'meera@lite.test' });
    expect(verified.data?.liteVerifySignInCode.token.split('.')).toHaveLength(3);
  });

  it('reports phone and Google sign-in as unavailable until configured', async () => {
    expect(codeOf(await run('mutation { liteRequestPhoneSignInCode(phone: "9876543210") { via } }'))).toBe('CONFIG_ERROR');
    expect(codeOf(await run('mutation { liteVerifyPhoneSignInCode(phone: "9876543210", code: "123456") { token } }'))).toBe('CONFIG_ERROR');
    expect(codeOf(await run('mutation { liteSignInWithGoogle(id_token: "t") { token } }'))).toBe('CONFIG_ERROR');
  });

  it('adds a proven email to a phone-only account', async () => {
    const ravi = await makeUser({ phone: '+919812345678', name: 'Ravi', handle: 'ravi' });
    const requested = await run('mutation { liteRequestContactCode(kind: EMAIL, value: "ravi@lite.test") { test_code } }', {}, ravi);
    expect(requested.data).toEqual({ liteRequestContactCode: { test_code: '424242' } });
    const verified = await run('mutation { liteVerifyContact(kind: EMAIL, value: "ravi@lite.test", code: "424242") { email phone } }', {}, ravi);
    expect(verified.data).toEqual({ liteVerifyContact: { email: 'ravi@lite.test', phone: '+919812345678' } });
  });
});

describe('profiles', () => {
  it('updates the profile and the reading language, and shows the public view to others', async () => {
    const updated = await run('mutation { liteUpdateProfile(input: { bio: "Sax player", social: { instagram: "@gita.sax" } }) { bio social { instagram } } }', {}, guest);
    expect(updated.data).toEqual({ liteUpdateProfile: { bio: 'Sax player', social: { instagram: 'gita.sax' } } });
    const locale = await run('mutation { liteSetMyLocale(locale: "hi-IN") { locale } }', {}, guest);
    expect(locale.data).toEqual({ liteSetMyLocale: { locale: 'hi-IN' } });
    const profile = await run('{ liteUserProfile(handle: "GITA") { name email bio } }');
    expect(profile.data).toEqual({ liteUserProfile: { name: 'Gita Guest', email: '', bio: 'Sax player' } });
  });
});

describe('calendars', () => {
  it('creates, edits, follows and lists a calendar with its events', async () => {
    const created = await run<{ liteCreateCalendar: { id: string; slug: string } }>('mutation { liteCreateCalendar(input: { name: "Hema Live" }) { id slug } }', {}, host);
    const calendar = created.data?.liteCreateCalendar;
    if (!calendar) throw new Error('calendar not created');
    expect(calendar.slug).toBe('hema-live');

    const renamed = await run('mutation R($id: ID!) { liteUpdateCalendar(id: $id, input: { name: "Hema Live Sessions" }) { name slug } }', { id: calendar.id }, host);
    expect(renamed.data).toEqual({ liteUpdateCalendar: { name: 'Hema Live Sessions', slug: 'hema-live' } });

    await hostEvent({ calendar_id: calendar.id });
    const followed = await run('mutation F($id: ID!) { liteSubscribeCalendar(id: $id) { subscriber_count viewer_subscribed } }', { id: calendar.id }, guest);
    expect(followed.data).toEqual({ liteSubscribeCalendar: { subscriber_count: 1, viewer_subscribed: true } });

    expect((await run('{ liteSubscribedCalendars { slug } }', {}, guest)).data).toEqual({ liteSubscribedCalendars: [{ slug: 'hema-live' }] });
    expect((await run('{ liteMyCalendars { slug } }', {}, host)).data).toEqual({ liteMyCalendars: [{ slug: 'hema-live' }] });
    expect((await run('{ liteCalendar(slug: "hema-live") { name upcoming_count } }')).data).toEqual({ liteCalendar: { name: 'Hema Live Sessions', upcoming_count: 1 } });
    expect((await run('{ liteCalendarEvents(slug: "hema-live") { title } }')).data).toEqual({ liteCalendarEvents: [{ title: 'Sunday Jazz at Bandra' }] });

    const unfollowed = await run('mutation U($id: ID!) { liteUnsubscribeCalendar(id: $id) { subscriber_count viewer_subscribed } }', { id: calendar.id }, guest);
    expect(unfollowed.data).toEqual({ liteUnsubscribeCalendar: { subscriber_count: 0, viewer_subscribed: false } });
  });
});

describe('discovering events', () => {
  it('finds a published event by city, search, host and view count', async () => {
    await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
    const event = await hostEvent({ city_slug: 'mumbai' });

    const discover = await run('{ liteDiscover(city_slug: "mumbai") { upcoming_events { title } cities { slug events_count } } }');
    expect(discover.data).toEqual({ liteDiscover: { upcoming_events: [{ title: 'Sunday Jazz at Bandra' }], cities: [{ slug: 'mumbai', events_count: 1 }] } });

    const search = await run('{ liteEvents(filter: { search: "JAZZ" }, page: 1, page_size: 5) { total page_size rows { slug } } }');
    expect(search.data).toEqual({ liteEvents: { total: 1, page_size: 5, rows: [{ slug: event.slug }] } });
    expect((await run('{ liteEvents { total } }')).data).toEqual({ liteEvents: { total: 1 } });

    expect((await run('{ liteCity(slug: "mumbai") { name } liteCities(include_inactive: true) { slug } liteCategories(include_inactive: true) { slug } }')).data).toEqual({
      liteCity: { name: 'Mumbai' },
      liteCities: [{ slug: 'mumbai' }],
      liteCategories: [],
    });
    expect((await run('{ liteUserEvents(handle: "hema") { title } }')).data).toEqual({ liteUserEvents: [{ title: 'Sunday Jazz at Bandra' }] });

    expect((await run('mutation T($slug: String!) { liteTrackEventView(slug: $slug) }', { slug: event.slug }, guest)).data).toEqual({ liteTrackEventView: true });
    const insights = await run('query I($id: ID!) { liteEventInsights(event_id: $id, days: 3) { days total_views } }', { id: event.id }, host);
    expect(insights.data).toEqual({ liteEventInsights: { days: 3, total_views: 1 } });
  });
});

describe('managing an event', () => {
  it('lets the host edit, close, move, staff, message, copy and cancel the event', async () => {
    const event = await hostEvent();
    const vars = { id: event.id };

    const edited = await run('mutation E($id: ID!, $input: LiteEventInput!) { liteUpdateEvent(id: $id, input: $input) { title } }', { ...vars, input: eventInput({ title: 'Jazz on the Roof' }) }, host);
    expect(edited.data).toEqual({ liteUpdateEvent: { title: 'Jazz on the Roof' } });

    const closed = await run('mutation O($id: ID!) { liteSetRegistrationOpen(id: $id, open: false) { registration_open } }', vars, host);
    expect(closed.data).toEqual({ liteSetRegistrationOpen: { registration_open: false } });

    const moved = await run('mutation S($id: ID!) { liteChangeEventSlug(id: $id, slug: "jazz-on-the-roof") { slug } }', vars, host);
    expect(moved.data).toEqual({ liteChangeEventSlug: { slug: 'jazz-on-the-roof' } });

    const staffed = await run('mutation A($id: ID!) { liteAddCoHost(event_id: $id, email: "gita@lite.test") { hosts { role } } }', vars, host);
    expect(staffed.data).toEqual({ liteAddCoHost: { hosts: [{ role: 'HOST' }, { role: 'CO_HOST' }] } });
    const unstaffed = await run('mutation R($id: ID!, $user: ID!) { liteRemoveCoHost(event_id: $id, user_id: $user) { hosts { role } } }', { ...vars, user: String(guest._id) }, host);
    expect(unstaffed.data).toEqual({ liteRemoveCoHost: { hosts: [{ role: 'HOST' }] } });

    const update = await run('mutation M($id: ID!) { liteSendEventUpdate(event_id: $id, subject: "Moved", body: "We are on the roof now.") { sent } }', vars, host);
    expect(update.data).toEqual({ liteSendEventUpdate: { sent: 2 } });

    const copy = await run('mutation D($id: ID!) { liteDuplicateEvent(id: $id) { title status } }', vars, host);
    expect(copy.data).toEqual({ liteDuplicateEvent: { title: 'Jazz on the Roof (copy)', status: 'DRAFT' } });

    const cancelled = await run('mutation X($id: ID!) { liteCancelEvent(id: $id, reason: "Storm") { status cancel_reason } }', vars, host);
    expect(cancelled.data).toEqual({ liteCancelEvent: { status: 'CANCELLED', cancel_reason: 'Storm' } });
  });

  it('runs a paid ticket from payment to confirmation, and lets the guest cancel', async () => {
    const event = await hostEvent({ tickets: [{ name: 'Entry', price: 300 }], upi_id: 'hema@okaxis' });
    const registered = await run<{ liteRegister: { id: string; status: string } }>(
      'mutation R($id: ID!, $input: LiteRegisterInput!) { liteRegister(event_id: $id, input: $input) { id status } }',
      { id: event.id, input: { ticket_id: event.tickets[0].id, quantity: 2 } },
      guest,
    );
    const ticket = registered.data?.liteRegister;
    expect(ticket?.status).toBe('PAYMENT_PENDING');

    const paid = await run('mutation P($id: ID!) { liteSubmitPaymentReference(registration_id: $id, reference: "UTR 4123", note: "GPay") { payment_reference amount_due } }', { id: ticket?.id }, guest);
    expect(paid.data).toEqual({ liteSubmitPaymentReference: { payment_reference: 'UTR 4123', amount_due: 600 } });

    const confirmed = await run('mutation C($id: ID!) { liteHostRegistrationAction(id: $id, action: CONFIRM_PAYMENT) { status payment_status } }', { id: ticket?.id }, host);
    expect(confirmed.data).toEqual({ liteHostRegistrationAction: { status: 'CONFIRMED', payment_status: 'PAID' } });

    expect((await run('{ liteMyRegistrations { status } }', {}, guest)).data).toEqual({ liteMyRegistrations: [{ status: 'CONFIRMED' }] });
    const cancelled = await run('mutation X($id: ID!) { liteCancelRegistration(id: $id) { status } }', { id: ticket?.id }, guest);
    expect(cancelled.data).toEqual({ liteCancelRegistration: { status: 'CANCELLED' } });
  });
});

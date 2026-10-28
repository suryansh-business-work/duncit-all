import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteCityModel } from '../../models/city.model';
import { LiteEventModel, type LiteEventDoc } from '../../models/event.model';
import { LiteSubscriptionModel } from '../../models/subscription.model';
import type { LiteUserDoc } from '../../models/user.model';
import { emailService, type SendInput } from '../../services/email.service';
import { notifications } from '../../services/notifications';
import { log } from '../../utils/log';
import { DAY, eventInput, hostedEvent, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test' } };
});

withTestDatabase();

/** Wait for a fire-and-forget email to go out. */
const settle = (assertion: () => void) => vi.waitFor(assertion, { timeout: 5000 });

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let send: MockInstance<typeof emailService.send>;
let host: LiteUserDoc;
let event: LiteEventDoc;

beforeEach(async () => {
  send = vi.spyOn(emailService, 'send').mockResolvedValue({ status: 'SENT', message: 'Sent' });
  await LiteCityModel.create({ name: 'Mumbai', slug: 'mumbai' });
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
  event = await hostedEvent(host, { city_slug: 'mumbai', tickets: [{ name: 'Entry', price: 499 }], upi_id: 'hema@okaxis' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const inputs = (): SendInput[] => send.mock.calls.map(([input]) => input);
const recipients = () => inputs().map((input) => input.to).sort();

describe('notifications.guestStatus', () => {
  it("sends the confirmation with the ticket's check-in QR as an inline image", async () => {
    const guest = await makeUser({ email: 'gita@lite.test', name: 'Gita' });
    const reg = await seedRegistration(event, guest, { code: 'K7M2P9', amount_due: 499 });

    notifications.guestStatus(event, reg, 'registration_confirmed');

    await settle(() => expect(send).toHaveBeenCalledTimes(1));
    const [input] = inputs();
    expect(input).toMatchObject({ to: 'gita@lite.test', templateKey: 'registration_confirmed', eventId: String(event._id) });
    expect(input.inlineImage?.cid).toBe('ticket-qr');
    expect(input.inlineImage?.alt).toBe('Check-in QR for code K7M2P9');
    expect(input.inlineImage?.png.subarray(0, 8)).toEqual(PNG_MAGIC);
    expect(input.vars).toMatchObject({
      name: 'Gita',
      code: 'K7M2P9',
      amount: 499,
      upi_id: 'hema@okaxis',
      upi_name: 'Hema Host',
      host_name: 'Hema Host',
      host_email: 'hema@lite.test',
      event_title: 'Sunday Jazz at Bandra',
      event_where: 'The Terrace, 14 Hill Road, Bandra West, Mumbai',
      event_url: 'https://lite.duncit.test/e/sunday-jazz-at-bandra',
      ticket_url: `https://lite.duncit.test/tickets/${String(reg._id)}`,
      position: '',
      reason: '',
    });
  });

  it('sends other statuses without a QR, with the waitlist position and any extra vars', async () => {
    const guest = await makeUser({ email: 'gita@lite.test', name: 'Gita' });
    const reg = await seedRegistration(event, guest, { status: 'WAITLISTED' });

    notifications.guestStatus(event, { ...reg.toObject(), waitlist_position: 3 }, 'registration_waitlisted', { reason: 'Full house' });

    await settle(() => expect(send).toHaveBeenCalledTimes(1));
    const [input] = inputs();
    expect(input.inlineImage).toBeUndefined();
    expect(input.vars).toMatchObject({ position: 3, reason: 'Full house' });
  });

  it('logs a failed send instead of throwing at the caller', async () => {
    send.mockRejectedValueOnce(new Error('SMTP down'));
    const error = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const guest = await makeUser({ email: 'gita@lite.test' });
    const reg = await seedRegistration(event, guest);

    expect(() => notifications.guestStatus(event, reg, 'registration_pending')).not.toThrow();

    await settle(() => expect(error).toHaveBeenCalledWith('notifications', 'registration_pending', { error: expect.any(Error) }));
  });
});

describe('notifications.hostNewRegistration', () => {
  it("emails every host with a mailbox, naming a phone-only guest by their number", async () => {
    const cohost = await makeUser({ email: 'cohost@lite.test', name: 'Cora' });
    const phoneHost = await makeUser({ phone: '+919800000001', name: 'Phone Host' });
    await LiteEventModel.updateOne({ _id: event._id }, { $push: { hosts: { $each: [{ user_id: cohost._id, role: 'CO_HOST' }, { user_id: phoneHost._id, role: 'CO_HOST' }] } } });
    const fresh = await LiteEventModel.findById(event._id);
    if (!fresh) throw new Error('missing event');
    const guest = await makeUser({ phone: '+919812345678', name: 'Ravi' });
    const reg = await seedRegistration(fresh, guest);

    notifications.hostNewRegistration(fresh, reg, 'registered');

    await settle(() => expect(send).toHaveBeenCalledTimes(2));
    expect(recipients()).toEqual(['cohost@lite.test', 'hema@lite.test']);
    expect(inputs()[0]).toMatchObject({
      templateKey: 'host_new_registration',
      vars: { guest_name: 'Ravi', guest_email: '+919812345678', what: 'registered', manage_url: 'https://lite.duncit.test/e/sunday-jazz-at-bandra/manage' },
    });
  });
});

describe('notifications.hostUpdate', () => {
  it('writes to confirmed guests who have an email, and counts only real sends', async () => {
    const mailable = await makeUser({ email: 'gita@lite.test', name: 'Gita' });
    const second = await makeUser({ email: 'arun@lite.test', name: 'Arun' });
    const phoneOnly = await makeUser({ phone: '+919812345678' });
    const waitlisted = await makeUser({ email: 'wait@lite.test' });
    await seedRegistration(event, mailable);
    await seedRegistration(event, second);
    await seedRegistration(event, phoneOnly);
    await seedRegistration(event, waitlisted, { status: 'WAITLISTED' });
    send.mockResolvedValueOnce({ status: 'SENT', message: 'ok' }).mockResolvedValueOnce({ status: 'FAILED', message: 'bounced' });

    const sent = await notifications.hostUpdate(event, 'Venue change', 'We moved upstairs.');

    expect(sent).toBe(1);
    expect(recipients()).toEqual(['arun@lite.test', 'gita@lite.test']);
    expect(inputs()[0]).toMatchObject({ templateKey: 'event_update', vars: { subject: 'Venue change', message: 'We moved upstairs.' } });
  });
});

describe('notifications.eventCancelled', () => {
  it('tells every guest still holding or waiting for a spot, with the reason', async () => {
    const confirmed = await makeUser({ email: 'gita@lite.test' });
    const waiting = await makeUser({ email: 'wait@lite.test' });
    await seedRegistration(event, confirmed);
    await seedRegistration(event, waiting, { status: 'WAITLISTED' });
    await seedRegistration(event, await makeUser({ email: 'left@lite.test' }), { status: 'CANCELLED' });
    await LiteEventModel.updateOne({ _id: event._id }, { $set: { cancel_reason: 'Heavy rain' } });
    const cancelled = await LiteEventModel.findById(event._id);
    if (!cancelled) throw new Error('missing event');

    notifications.eventCancelled(cancelled);

    await settle(() => expect(send).toHaveBeenCalledTimes(2));
    expect(recipients()).toEqual(['gita@lite.test', 'wait@lite.test']);
    expect(inputs()[0]).toMatchObject({ templateKey: 'event_cancelled', vars: { reason: 'Heavy rain' } });
  });
});

describe('notifications.calendarPublished', () => {
  it("emails the calendar's followers who have a mailbox", async () => {
    const calendar = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    const fan = await makeUser({ email: 'fan@lite.test', name: 'Fan' });
    const phoneFan = await makeUser({ phone: '+919812345678' });
    await LiteSubscriptionModel.create({ calendar_id: calendar._id, user_id: fan._id });
    await LiteSubscriptionModel.create({ calendar_id: calendar._id, user_id: phoneFan._id });

    notifications.calendarPublished(event, calendar._id);

    await settle(() => expect(send).toHaveBeenCalledTimes(1));
    expect(inputs()[0]).toMatchObject({ to: 'fan@lite.test', templateKey: 'calendar_new_event', vars: { name: 'Fan', calendar_name: 'Hema Live' } });
  });
});

describe('notifications.coHostAdded', () => {
  it('tells the new co-host where to manage the event', async () => {
    const cohost = await makeUser({ email: 'cora@lite.test', name: 'Cora' });
    notifications.coHostAdded(event, cohost._id);
    await settle(() => expect(send).toHaveBeenCalledTimes(1));
    expect(inputs()[0]).toMatchObject({ to: 'cora@lite.test', templateKey: 'cohost_added', vars: { name: 'Cora', host_name: 'Hema Host', manage_url: 'https://lite.duncit.test/e/sunday-jazz-at-bandra/manage' } });
  });
});

describe('notifications.reminder', () => {
  it.each([
    [24, 'in 1 day'],
    [36, 'in 2 days'],
    [48, 'in 2 days'],
    [72, 'in 3 days'],
    [1, 'in 1 hour'],
    [3, 'in 3 hours'],
  ])('describes a %i-hour reminder as "%s"', async (hours, words) => {
    await seedRegistration(event, await makeUser({ email: 'gita@lite.test' }));
    await expect(notifications.reminder(event, hours)).resolves.toBe(1);
    expect(inputs()[0].vars).toMatchObject({ in_words: words, virtual_line: '' });
  });

  it('reminds confirmed guests with a mailbox only, each with their own code and QR', async () => {
    const gita = await makeUser({ email: 'gita@lite.test', name: 'Gita' });
    await seedRegistration(event, gita, { code: 'GITA22' });
    await seedRegistration(event, await makeUser({ phone: '+919812345678' }));
    await seedRegistration(event, await makeUser({ email: 'pending@lite.test' }), { status: 'PAYMENT_PENDING' });

    await expect(notifications.reminder(event, 24)).resolves.toBe(1);

    const [input] = inputs();
    expect(input).toMatchObject({ to: 'gita@lite.test', templateKey: 'event_reminder', vars: { name: 'Gita', code: 'GITA22' } });
    expect(input.inlineImage?.alt).toBe('Check-in QR for code GITA22');
  });

  it('includes the join link for an online event, and counts only real sends', async () => {
    const online = await hostedEvent(host, eventInput({ title: 'Online Jam', location_type: 'VIRTUAL', virtual_link: 'https://meet.duncit.com/jam' }));
    await seedRegistration(online, await makeUser({ email: 'gita@lite.test' }));
    send.mockResolvedValueOnce({ status: 'SKIPPED', message: 'Template switched off' });

    await expect(notifications.reminder(online, 1)).resolves.toBe(0);
    expect(inputs()[0].vars).toMatchObject({ virtual_line: 'Join link: https://meet.duncit.com/jam\n', event_where: 'Online (link shared with confirmed guests)' });
  });

  it('falls back to "The host" when the event has no host account left', async () => {
    const orphan = await LiteEventModel.create({
      slug: 'orphan-night',
      title: 'Orphan Night',
      start_at: new Date(Date.now() + DAY),
      end_at: new Date(Date.now() + DAY + 3_600_000),
      status: 'PUBLISHED',
      venue_name: 'Hall',
      hosts: [],
      tickets: [{ name: 'General', price: 0 }],
    });
    await seedRegistration(orphan, await makeUser({ email: 'gita@lite.test' }));
    await notifications.reminder(orphan, 24);
    expect(inputs()[0].vars).toMatchObject({ host_name: 'The host', host_email: '', event_where: 'Hall' });
  });
});

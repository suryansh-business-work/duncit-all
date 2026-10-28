import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteEventModel, type LiteEventDoc } from '../../models/event.model';
import { LiteRegistrationModel } from '../../models/registration.model';
import type { LiteUserDoc } from '../../models/user.model';
import { eventService } from '../../services/event.service';
import { notifications } from '../../services/notifications';
import { ticketQrPayload } from '../../services/qr';
import { registrationService } from '../../services/registration.service';
import { settingsService } from '../../services/settings.service';
import { apiError, badInputError } from '../helpers/expect';
import { DAY, HOUR, hostedEvent, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

let host: LiteUserDoc;
let guest: LiteUserDoc;

beforeEach(async () => {
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
  guest = await makeUser({ email: 'gita@lite.test', name: 'Gita Guest' });
  vi.spyOn(notifications, 'guestStatus').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'hostNewRegistration').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ticketOf = (event: LiteEventDoc, index = 0) => String(event.tickets[index]._id);
const soldOn = async (event: LiteEventDoc, index = 0) => (await LiteEventModel.findById(event._id).lean())?.tickets[index].sold;
const register = (user: LiteUserDoc, event: LiteEventDoc, quantity?: number) =>
  registrationService.register(user, String(event._id), { ticket_id: ticketOf(event), quantity });

describe('registrationService.register', () => {
  it('confirms a free ticket at once, taking the seats and telling guest and host', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'General', price: 0, quantity: 20 }] });

    const reg = await register(guest, event, 2);

    expect(reg).toMatchObject({ status: 'CONFIRMED', payment_status: 'NOT_REQUIRED', quantity: 2, amount_due: 0, ticket: { name: 'General', price: 0 } });
    expect(reg.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(reg.user).toMatchObject({ id: String(guest._id), email: 'gita@lite.test' });
    expect(await soldOn(event)).toBe(2);
    expect(vi.mocked(notifications.guestStatus).mock.calls[0][2]).toBe('registration_confirmed');
    expect(vi.mocked(notifications.hostNewRegistration).mock.calls[0][2]).toBe('registered');
  });

  it('holds a paid ticket as payment pending for the full amount', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'Entry', price: 499 }], upi_id: 'hema@okaxis' });
    const reg = await register(guest, event, 3);
    expect(reg).toMatchObject({ status: 'PAYMENT_PENDING', payment_status: 'PENDING', amount_due: 1497 });
    expect(vi.mocked(notifications.guestStatus).mock.calls[0][2]).toBe('registration_payment_pending');
    expect(vi.mocked(notifications.hostNewRegistration).mock.calls[0][2]).toBe('took a paid ticket (payment pending)');
  });

  it('asks the host first when the event needs approval', async () => {
    const event = await hostedEvent(host, { require_approval: true });
    const reg = await register(guest, event);
    expect(reg.status).toBe('PENDING_APPROVAL');
    expect(vi.mocked(notifications.hostNewRegistration).mock.calls[0][2]).toBe('requested a spot');
  });

  it('waitlists a guest once the event is full, without taking seats, and tells them their place', async () => {
    const event = await hostedEvent(host, { capacity: 2 });
    await register(guest, event, 2);
    const late = await makeUser({ email: 'late@lite.test' });

    const reg = await register(late, event);

    expect(reg.status).toBe('WAITLISTED');
    expect(await soldOn(event)).toBe(2);
    const [, sentReg, template] = vi.mocked(notifications.guestStatus).mock.calls[1];
    expect(template).toBe('registration_waitlisted');
    expect(sentReg.waitlist_position).toBe(1);
  });

  it('refuses when the host closed registration', async () => {
    const event = await hostedEvent(host);
    await eventService.setRegistrationOpen(host, String(event._id), false);
    await expect(register(guest, event)).rejects.toMatchObject(badInputError('The host has closed registration for this event'));
  });

  it('refuses an event that has ended', async () => {
    const start = new Date(Date.now() - DAY);
    const event = await hostedEvent(host, { start_at: start.toISOString(), end_at: new Date(start.getTime() + HOUR).toISOString() });
    await expect(register(guest, event)).rejects.toMatchObject(badInputError('This event has already ended'));
  });

  it('answers NOT_FOUND for a draft, a hidden event and a private event the guest cannot see', async () => {
    const draft = await hostedEvent(host, {}, false);
    await expect(register(guest, draft)).rejects.toMatchObject(apiError('NOT_FOUND', 'Event could not be found'));

    const hidden = await hostedEvent(host, { title: 'Hidden Gig' });
    await LiteEventModel.updateOne({ _id: hidden._id }, { $set: { hidden: true } });
    await expect(register(guest, hidden)).rejects.toMatchObject(apiError('NOT_FOUND', 'Event could not be found'));

    const secret = await hostedEvent(host, { title: 'Private Dinner', visibility: 'PRIVATE' });
    await expect(register(guest, secret)).rejects.toMatchObject(apiError('NOT_FOUND', 'Event could not be found'));

    await expect(registrationService.register(guest, '507f1f77bcf86cd799439011', { ticket_id: 'x' })).rejects.toMatchObject(apiError('NOT_FOUND', 'Event could not be found'));
  });

  it('bounds the seats in one registration by the console setting', async () => {
    await settingsService.update({ max_seats_per_registration: 2 });
    const event = await hostedEvent(host);
    await expect(register(guest, event, 3)).rejects.toMatchObject(badInputError('Number of seats cannot be more than 2'));
    await expect(register(guest, event, 0)).rejects.toMatchObject(badInputError('Number of seats must be at least 1'));
    await expect(register(guest, event, 1.5)).rejects.toMatchObject(badInputError('Number of seats must be a whole number'));
    await expect(register(guest, event, 2)).resolves.toMatchObject({ quantity: 2 });
  });

  it('refuses an unknown or switched-off ticket type', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'General', price: 0 }, { name: 'Backstage', price: 0, is_active: false }] });
    await expect(registrationService.register(guest, String(event._id), { ticket_id: 'nope' })).rejects.toMatchObject(badInputError('Pick a ticket type'));
    await expect(registrationService.register(guest, String(event._id), { ticket_id: ticketOf(event, 1) })).rejects.toMatchObject(badInputError('Pick a ticket type'));
  });

  it('refuses more seats than a limited ticket has left', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'Early bird', price: 0, quantity: 3 }] });
    await register(guest, event, 2);
    await expect(register(await makeUser(), event, 2)).rejects.toMatchObject(badInputError('That ticket type is sold out'));
  });

  it('gives the last seat on a limited ticket to exactly one of two guests racing for it', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'Last seat', price: 0, quantity: 1 }] });
    const rival = await makeUser({ email: 'rival@lite.test' });

    const results = await Promise.allSettled([register(guest, event), register(rival, event)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((r) => r.status === 'rejected');
    expect(refused?.status === 'rejected' ? refused.reason : null).toMatchObject(badInputError('That ticket type is sold out'));
    expect(await soldOn(event)).toBe(1);
    expect(await LiteRegistrationModel.countDocuments({ event_id: event._id })).toBe(1);
  });

  it('refuses a second registration but lets a guest who cancelled come back', async () => {
    const event = await hostedEvent(host);
    const first = await register(guest, event);
    await expect(register(guest, event)).rejects.toMatchObject(badInputError('You are already registered for this event'));

    await registrationService.cancel(guest, first.id);
    const again = await register(guest, event);
    expect(again).toMatchObject({ id: first.id, status: 'CONFIRMED' });
    expect(again.code).not.toBe(first.code);
  });

  it('checks the answers to the questions', async () => {
    const event = await hostedEvent(host, {
      questions: [
        { label: 'Your instrument', type: 'TEXT', required: true },
        { label: 'T-shirt size', type: 'SELECT', options: ['S', 'M', 'L'] },
      ],
    });
    const [instrument, size] = event.questions.map((q) => String(q._id));
    const answer = (answers: { question_id: string; answer: string }[]) => registrationService.register(guest, String(event._id), { ticket_id: ticketOf(event), answers });

    await expect(answer([])).rejects.toMatchObject(badInputError('Please answer: Your instrument'));
    await expect(answer([{ question_id: instrument, answer: 'Sax' }, { question_id: size, answer: 'XXL' }])).rejects.toMatchObject(
      badInputError('Pick one of the options for: T-shirt size'),
    );
    const reg = await answer([{ question_id: instrument, answer: ' Sax ' }, { question_id: size, answer: 'M' }]);
    expect(reg.answers).toEqual([
      { question_id: instrument, label: 'Your instrument', answer: 'Sax' },
      { question_id: size, label: 'T-shirt size', answer: 'M' },
    ]);
  });
});

describe('registrationService.cancel', () => {
  it('gives the seat back and moves the first waitlisted guest in', async () => {
    const event = await hostedEvent(host, { capacity: 1 });
    const first = await register(guest, event);
    const waiting = await makeUser({ email: 'wait@lite.test' });
    const queued = await register(waiting, event);
    expect(queued.status).toBe('WAITLISTED');

    const cancelled = await registrationService.cancel(guest, first.id);

    expect(cancelled.status).toBe('CANCELLED');
    expect((await LiteRegistrationModel.findById(queued.id).lean())?.status).toBe('CONFIRMED');
    expect(await soldOn(event)).toBe(1);
    expect(vi.mocked(notifications.guestStatus).mock.calls.at(-1)?.[2]).toBe('registration_confirmed');
  });

  it('is idempotent and only for the guest who holds the ticket', async () => {
    const event = await hostedEvent(host);
    const reg = await register(guest, event);
    await expect(registrationService.cancel(host, reg.id)).rejects.toMatchObject(apiError('NOT_FOUND', 'Ticket could not be found'));
    await registrationService.cancel(guest, reg.id);
    await expect(registrationService.cancel(guest, reg.id)).resolves.toMatchObject({ status: 'CANCELLED' });
    expect(await soldOn(event)).toBe(0);
  });

  it('frees no seat when a waitlisted guest leaves', async () => {
    const event = await hostedEvent(host, { capacity: 1 });
    await register(guest, event);
    const waiting = await makeUser();
    const queued = await register(waiting, event);
    await registrationService.cancel(waiting, queued.id);
    expect(await soldOn(event)).toBe(1);
  });
});

describe('registrationService.submitPaymentReference', () => {
  it('records the UTR on a payment-pending ticket and tells the host', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'Entry', price: 499 }], upi_id: 'hema@okaxis' });
    const reg = await register(guest, event);
    const updated = await registrationService.submitPaymentReference(guest, reg.id, ' 4123 5678 9012 ', 'Paid from GPay');
    expect(updated).toMatchObject({ payment_reference: '4123 5678 9012', payment_note: 'Paid from GPay' });
    expect(vi.mocked(notifications.hostNewRegistration).mock.calls.at(-1)?.[2]).toBe('sent a payment reference (4123 5678 9012)');
  });

  it('refuses a ticket that is not waiting for payment, or someone else’s', async () => {
    const event = await hostedEvent(host);
    const reg = await register(guest, event);
    await expect(registrationService.submitPaymentReference(guest, reg.id, 'UTR1', null)).rejects.toMatchObject(badInputError('This ticket is not waiting for a payment'));
    await expect(registrationService.submitPaymentReference(host, reg.id, 'UTR1', null)).rejects.toMatchObject(apiError('NOT_FOUND', 'Ticket could not be found'));
  });
});

describe('registrationService.hostAction', () => {
  it('approves a pending request into payment pending for a paid ticket', async () => {
    const event = await hostedEvent(host, { require_approval: true, tickets: [{ name: 'Entry', price: 300 }], upi_id: 'hema@okaxis' });
    const reg = await register(guest, event);
    const approved = await registrationService.hostAction(host, reg.id, 'APPROVE');
    expect(approved.status).toBe('PAYMENT_PENDING');
    expect(vi.mocked(notifications.guestStatus).mock.calls.at(-1)?.[2]).toBe('registration_payment_pending');
    await expect(registrationService.hostAction(host, reg.id, 'APPROVE')).rejects.toMatchObject(badInputError('Only a pending request can be approved'));
  });

  it('confirms a payment, marking it paid', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'Entry', price: 300 }], upi_id: 'hema@okaxis' });
    const reg = await register(guest, event);
    const confirmed = await registrationService.hostAction(host, reg.id, 'CONFIRM_PAYMENT');
    expect(confirmed).toMatchObject({ status: 'CONFIRMED', payment_status: 'PAID', payment_confirmed_at: expect.any(String) });
    expect(vi.mocked(notifications.guestStatus).mock.calls.at(-1)?.[2]).toBe('registration_confirmed');
  });

  it('rejects a payment reference, releasing the seat with a reason', async () => {
    const event = await hostedEvent(host, { tickets: [{ name: 'Entry', price: 300, quantity: 5 }], upi_id: 'hema@okaxis' });
    const reg = await register(guest, event);
    expect(await soldOn(event)).toBe(1);
    const rejected = await registrationService.hostAction(host, reg.id, 'REJECT_PAYMENT');
    expect(rejected).toMatchObject({ status: 'DECLINED', payment_status: 'REJECTED' });
    expect(await soldOn(event)).toBe(0);
    const [, , template, extra] = vi.mocked(notifications.guestStatus).mock.calls.at(-1) ?? [];
    expect(template).toBe('registration_declined');
    expect(extra).toEqual({ reason: 'The payment reference could not be matched.' });
  });

  it('checks a confirmed guest in, and can undo it', async () => {
    const event = await hostedEvent(host);
    const reg = await register(guest, event);
    await expect(registrationService.hostAction(host, reg.id, 'CHECK_IN')).resolves.toMatchObject({ checked_in_at: expect.any(String) });
    await expect(registrationService.hostAction(host, reg.id, 'UNDO_CHECK_IN')).resolves.toMatchObject({ checked_in_at: null });
  });

  it('refuses transitions that do not apply, and anyone but a host', async () => {
    const event = await hostedEvent(host, { require_approval: true });
    const reg = await register(guest, event);
    await expect(registrationService.hostAction(host, reg.id, 'CHECK_IN')).rejects.toMatchObject(badInputError('Only a confirmed guest can be checked in'));
    await expect(registrationService.hostAction(host, reg.id, 'CONFIRM_PAYMENT')).rejects.toMatchObject(badInputError('There is no pending payment on this guest'));
    await expect(registrationService.hostAction(host, reg.id, 'REJECT_PAYMENT')).rejects.toMatchObject(badInputError('There is no pending payment on this guest'));
    await expect(registrationService.hostAction(guest, reg.id, 'APPROVE')).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
    await expect(registrationService.hostAction(host, '507f1f77bcf86cd799439011', 'APPROVE')).rejects.toMatchObject(apiError('NOT_FOUND', 'Guest could not be found'));

    await registrationService.hostAction(host, reg.id, 'DECLINE');
    await expect(registrationService.hostAction(host, reg.id, 'DECLINE')).rejects.toMatchObject(badInputError('This guest cannot be declined now'));
  });

  it('removes a guest once, promoting the waitlist', async () => {
    const event = await hostedEvent(host, { capacity: 1 });
    const reg = await register(guest, event);
    const waiting = await makeUser();
    const queued = await register(waiting, event);

    await expect(registrationService.hostAction(host, reg.id, 'REMOVE')).resolves.toMatchObject({ status: 'CANCELLED' });
    expect((await LiteRegistrationModel.findById(queued.id).lean())?.status).toBe('CONFIRMED');
    await expect(registrationService.hostAction(host, reg.id, 'REMOVE')).rejects.toMatchObject(badInputError('This guest already cancelled'));
  });

  it('promotes a waitlisted guest into approval when the event asks for it', async () => {
    const event = await hostedEvent(host, { capacity: 1, require_approval: true });
    const reg = await register(guest, event);
    const waiting = await makeUser();
    const queued = await register(waiting, event);
    await registrationService.hostAction(host, reg.id, 'DECLINE');
    expect((await LiteRegistrationModel.findById(queued.id).lean())?.status).toBe('PENDING_APPROVAL');
  });
});

describe('registrationService.checkInByCode', () => {
  async function confirmedTicket() {
    const event = await hostedEvent(host);
    const reg = await register(guest, event);
    return { event, reg };
  }

  it('checks in from the code typed at the door, in any case', async () => {
    const { event, reg } = await confirmedTicket();
    const checked = await registrationService.checkInByCode(host, String(event._id), ` ${reg.code.toLowerCase()} `);
    expect(checked).toMatchObject({ id: reg.id, checked_in_at: expect.any(String) });
  });

  it('checks in from a scanned ticket QR', async () => {
    const { event, reg } = await confirmedTicket();
    const checked = await registrationService.checkInByCode(host, String(event._id), ticketQrPayload(String(event._id), reg.code));
    expect(checked.id).toBe(reg.id);
  });

  it("refuses another event's QR, naming the mix-up", async () => {
    const { reg } = await confirmedTicket();
    const other = await hostedEvent(host, { title: 'Other Night' });
    await expect(registrationService.checkInByCode(host, String(other._id), ticketQrPayload('507f1f77bcf86cd799439011', reg.code))).rejects.toMatchObject(
      badInputError('This ticket is for a different event'),
    );
  });

  it('refuses a ticket that is not confirmed', async () => {
    const event = await hostedEvent(host, { require_approval: true });
    const reg = await register(guest, event);
    await expect(registrationService.checkInByCode(host, String(event._id), reg.code)).rejects.toMatchObject(
      badInputError('This ticket is pending approval, not confirmed'),
    );
  });

  it('refuses an unknown code and a blank one', async () => {
    const { event } = await confirmedTicket();
    await expect(registrationService.checkInByCode(host, String(event._id), 'ZZZZZZ')).rejects.toMatchObject(apiError('NOT_FOUND', 'A ticket with that code could not be found'));
    await expect(registrationService.checkInByCode(host, String(event._id), '   ')).rejects.toMatchObject(badInputError('Check-in code is required'));
  });

  it('lets a ticket in once', async () => {
    const { event, reg } = await confirmedTicket();
    await registrationService.checkInByCode(host, String(event._id), reg.code);
    await expect(registrationService.checkInByCode(host, String(event._id), reg.code)).rejects.toMatchObject(badInputError('This ticket was already checked in'));
  });

  it('lets exactly one of two door phones scanning the same ticket at once through', async () => {
    const { event, reg } = await confirmedTicket();
    const scan = () => registrationService.checkInByCode(host, String(event._id), reg.code);
    const results = await Promise.allSettled([scan(), scan()]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
  });

  it('is for hosts only', async () => {
    const { event, reg } = await confirmedTicket();
    await expect(registrationService.checkInByCode(guest, String(event._id), reg.code)).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
  });
});

describe('reading registrations', () => {
  it("lists a guest's upcoming and past tickets, skipping cancelled ones", async () => {
    const upcoming = await hostedEvent(host);
    const reg = await register(guest, upcoming);
    const pastEvent = await hostedEvent(host, { title: 'Old Gig' });
    await seedRegistration(pastEvent, guest, { event_start_at: new Date(Date.now() - DAY) });
    const dropped = await hostedEvent(host, { title: 'Dropped' });
    await seedRegistration(dropped, guest, { status: 'CANCELLED' });

    expect((await registrationService.mine(guest, false)).map((r) => r.id)).toEqual([reg.id]);
    const past = await registrationService.mine(guest, true);
    expect(past).toHaveLength(1);
    expect(past[0].event).toMatchObject({ title: 'Old Gig' });
  });

  it('shows a ticket to its guest, the hosts and admins only, with the waitlist position', async () => {
    const event = await hostedEvent(host, { capacity: 1 });
    await register(guest, event);
    const waiting = await makeUser({ email: 'wait@lite.test' });
    const queued = await register(waiting, event);
    const admin = await makeUser({ is_admin: true });

    await expect(registrationService.byId(waiting, queued.id)).resolves.toMatchObject({ status: 'WAITLISTED', waitlist_position: 1 });
    await expect(registrationService.byId(host, queued.id)).resolves.toMatchObject({ id: queued.id });
    await expect(registrationService.byId(admin, queued.id)).resolves.toMatchObject({ id: queued.id });
    await expect(registrationService.byId(guest, queued.id)).rejects.toMatchObject(apiError('FORBIDDEN', 'You do not have access to this'));
    await expect(registrationService.byId(guest, '507f1f77bcf86cd799439011')).resolves.toBeNull();
  });

  it('gives the host a searchable guest list, with regex characters taken literally', async () => {
    const event = await hostedEvent(host);
    await register(guest, event);
    const other = await makeUser({ email: 'ravi+jazz@lite.test', name: 'Ravi (drums)' });
    await register(other, event);

    expect(await registrationService.forEvent(host, String(event._id), null, null)).toHaveLength(2);
    const found = await registrationService.forEvent(host, String(event._id), null, 'Ravi (drums');
    expect(found.map((r) => r.user.name)).toEqual(['Ravi (drums)']);
    expect(await registrationService.forEvent(host, String(event._id), 'WAITLISTED', '')).toEqual([]);
    await expect(registrationService.forEvent(guest, String(event._id), null, null)).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
  });
});

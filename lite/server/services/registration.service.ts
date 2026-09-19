import { LiteEventModel, type LiteEventDoc } from '../models/event.model';
import { LiteRegistrationModel, type LiteRegistrationDoc, type RegistrationStatus } from '../models/registration.model';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { badInput, forbidden, notFound } from '../utils/errors';
import { checkInCode } from '../utils/ids';
import { cleanText } from '../utils/validate';
import { eventService } from './event.service';
import { notifications } from './notifications';
import { seatsHeld, toPublicEvent, toPublicRegistration, type Viewer } from './projections';

export interface RegisterInput {
  ticket_id: string;
  quantity?: number | null;
  answers?: { question_id: string; answer: string }[] | null;
}

export type HostAction = 'APPROVE' | 'DECLINE' | 'CONFIRM_PAYMENT' | 'REJECT_PAYMENT' | 'CHECK_IN' | 'UNDO_CHECK_IN' | 'REMOVE';

const viewerOf = (user: LiteUserDoc | null): Viewer | null => (user ? { id: String(user._id), is_admin: user.is_admin } : null);

async function project(doc: LiteRegistrationDoc | any, viewer: Viewer | null) {
  const [event, user] = await Promise.all([LiteEventModel.findById(doc.event_id).lean(), LiteUserModel.findById(doc.user_id).lean()]);
  const eventPublic = event ? await toPublicEvent(event, viewer, { withoutViewerRegistration: true }) : null;
  return toPublicRegistration(doc, eventPublic, user);
}

function cleanAnswers(event: LiteEventDoc, answers: RegisterInput['answers']) {
  const given = new Map((answers ?? []).map((a) => [a.question_id, cleanText(a.answer, 1000, 'Answer')]));
  return event.questions.map((q) => {
    const answer = given.get(String(q._id)) ?? '';
    if (q.required && !answer) throw badInput(`Please answer: ${q.label}`);
    if (q.type === 'SELECT' && answer && !q.options.includes(answer)) throw badInput(`Pick one of the options for: ${q.label}`);
    return { question_id: String(q._id), label: q.label, answer };
  });
}

/** Where a new registration lands, from what the event asks for and how full it is. */
async function initialStatus(event: LiteEventDoc, quantity: number, paid: boolean): Promise<RegistrationStatus> {
  if (event.capacity != null) {
    const held = await seatsHeld(event._id);
    if (held + quantity > event.capacity) return 'WAITLISTED';
  }
  if (event.require_approval) return 'PENDING_APPROVAL';
  return paid ? 'PAYMENT_PENDING' : 'CONFIRMED';
}

async function bump(event: LiteEventDoc, ticketId: string, delta: number): Promise<void> {
  await LiteEventModel.updateOne({ _id: event._id, 'tickets._id': ticketId }, { $inc: { 'tickets.$.sold': delta } });
}

async function waitlistPosition(reg: { event_id: unknown; created_at?: Date | null }): Promise<number> {
  const since = reg.created_at ?? new Date();
  return (await LiteRegistrationModel.countDocuments({ event_id: reg.event_id, status: 'WAITLISTED', created_at: { $lt: since } })) + 1;
}

/** The email that tells a guest where their registration landed. */
const STATUS_TEMPLATE: Partial<Record<RegistrationStatus, string>> = {
  CONFIRMED: 'registration_confirmed',
  PENDING_APPROVAL: 'registration_pending',
  PAYMENT_PENDING: 'registration_payment_pending',
  WAITLISTED: 'registration_waitlisted',
};

/** Where a seat that just opened lands: approval first, then payment, else in. */
function seatStatus(event: LiteEventDoc, amountDue: number): RegistrationStatus {
  if (event.require_approval) return 'PENDING_APPROVAL';
  return amountDue > 0 ? 'PAYMENT_PENDING' : 'CONFIRMED';
}

/** When a seat frees up, the first person waiting takes it. */
async function promoteWaitlist(event: LiteEventDoc): Promise<void> {
  if (event.status !== 'PUBLISHED') return;
  const next = await LiteRegistrationModel.findOne({ event_id: event._id, status: 'WAITLISTED' }).sort({ created_at: 1 });
  if (!next) return;
  if (event.capacity != null && (await seatsHeld(event._id)) + next.quantity > event.capacity) return;
  next.status = seatStatus(event, next.amount_due);
  await next.save();
  await bump(event, next.ticket_id, next.quantity);
  const template = STATUS_TEMPLATE[next.status];
  if (template) notifications.guestStatus(event, next, template);
}

/** What the host is told a guest did, by where the registration landed. */
function hostWhat(status: RegistrationStatus): string {
  if (status === 'PENDING_APPROVAL') return 'requested a spot';
  if (status === 'PAYMENT_PENDING') return 'took a paid ticket (payment pending)';
  return 'registered';
}

const HOST_TRANSITIONS: Record<HostAction, (reg: LiteRegistrationDoc) => void> = {
  APPROVE: (reg) => {
    if (reg.status !== 'PENDING_APPROVAL') throw badInput('Only a pending request can be approved');
    reg.status = reg.amount_due > 0 ? 'PAYMENT_PENDING' : 'CONFIRMED';
    reg.approved_at = new Date();
  },
  DECLINE: (reg) => {
    if (!['PENDING_APPROVAL', 'WAITLISTED', 'PAYMENT_PENDING'].includes(reg.status)) throw badInput('This guest cannot be declined now');
    reg.status = 'DECLINED';
  },
  CONFIRM_PAYMENT: (reg) => {
    if (reg.status !== 'PAYMENT_PENDING') throw badInput('There is no pending payment on this guest');
    reg.status = 'CONFIRMED';
    reg.payment_status = 'PAID';
    reg.payment_confirmed_at = new Date();
  },
  REJECT_PAYMENT: (reg) => {
    if (reg.status !== 'PAYMENT_PENDING') throw badInput('There is no pending payment on this guest');
    reg.payment_status = 'REJECTED';
    reg.status = 'DECLINED';
  },
  CHECK_IN: (reg) => {
    if (reg.status !== 'CONFIRMED') throw badInput('Only a confirmed guest can be checked in');
    reg.checked_in_at ??= new Date();
  },
  UNDO_CHECK_IN: (reg) => {
    reg.checked_in_at = null;
  },
  REMOVE: (reg) => {
    if (reg.status === 'CANCELLED') throw badInput('This guest already cancelled');
    reg.status = 'CANCELLED';
    reg.cancelled_at = new Date();
  },
};

const AFTER_ACTION_TEMPLATE: Partial<Record<HostAction, string>> = {
  CONFIRM_PAYMENT: 'registration_confirmed',
  DECLINE: 'registration_declined',
  REJECT_PAYMENT: 'registration_declined',
};

export const registrationService = {
  async register(user: LiteUserDoc, eventId: string, input: RegisterInput) {
    const event = await LiteEventModel.findById(eventId);
    if (!event || event.status !== 'PUBLISHED' || event.hidden) throw notFound('Event');
    if (event.end_at.getTime() < Date.now()) throw badInput('This event has already ended');
    const existing = await LiteRegistrationModel.findOne({ event_id: event._id, user_id: user._id });
    if (existing && existing.status !== 'CANCELLED' && existing.status !== 'DECLINED') throw badInput('You are already registered for this event');
    const ticket = event.tickets.find((t) => String(t._id) === input.ticket_id && t.is_active !== false);
    if (!ticket) throw badInput('Pick a ticket type');
    const quantity = Math.min(10, Math.max(1, Math.trunc(input.quantity ?? 1)));
    if (ticket.quantity != null && ticket.sold + quantity > ticket.quantity) throw badInput('That ticket type is sold out');
    const paid = ticket.price > 0;
    const status = await initialStatus(event, quantity, paid);
    const fields = {
      event_id: event._id,
      user_id: user._id,
      code: checkInCode(),
      ticket_id: String(ticket._id),
      ticket_name: ticket.name,
      ticket_price: ticket.price,
      quantity,
      amount_due: ticket.price * quantity,
      status,
      payment_status: paid ? 'PENDING' : 'NOT_REQUIRED',
      payment_reference: '',
      payment_note: '',
      payment_confirmed_at: null,
      answers: cleanAnswers(event, input.answers),
      checked_in_at: null,
      approved_at: null,
      cancelled_at: null,
      event_title: event.title,
      event_start_at: event.start_at,
      user_email: user.email,
      user_name: user.name,
    };
    const reg = existing ? Object.assign(existing, fields) : new LiteRegistrationModel(fields);
    await reg.save();
    if (status !== 'WAITLISTED') await bump(event, reg.ticket_id, quantity);
    const template = STATUS_TEMPLATE[status];
    const position = status === 'WAITLISTED' ? await waitlistPosition(reg) : null;
    if (template) notifications.guestStatus(event, { ...reg.toObject(), waitlist_position: position }, template);
    notifications.hostNewRegistration(event, reg, hostWhat(status));
    return project(reg, viewerOf(user));
  },

  async submitPaymentReference(user: LiteUserDoc, id: string, reference: string, note: string | null | undefined) {
    const reg = await LiteRegistrationModel.findOne({ _id: id, user_id: user._id });
    if (!reg) throw notFound('Ticket');
    if (reg.status !== 'PAYMENT_PENDING') throw badInput('This ticket is not waiting for a payment');
    reg.payment_reference = cleanText(reference, 60, 'Transaction reference', true);
    reg.payment_note = cleanText(note, 300, 'Note');
    await reg.save();
    const event = await LiteEventModel.findById(reg.event_id);
    if (event) notifications.hostNewRegistration(event, reg, `sent a payment reference (${reg.payment_reference})`);
    return project(reg, viewerOf(user));
  },

  async cancel(user: LiteUserDoc, id: string) {
    const reg = await LiteRegistrationModel.findOne({ _id: id, user_id: user._id });
    if (!reg) throw notFound('Ticket');
    if (reg.status === 'CANCELLED') return project(reg, viewerOf(user));
    const heldSeat = reg.status !== 'WAITLISTED' && reg.status !== 'DECLINED';
    reg.status = 'CANCELLED';
    reg.cancelled_at = new Date();
    await reg.save();
    const event = await LiteEventModel.findById(reg.event_id);
    if (event && heldSeat) {
      await bump(event, reg.ticket_id, -reg.quantity);
      await promoteWaitlist(event);
    }
    return project(reg, viewerOf(user));
  },

  async hostAction(user: LiteUserDoc, id: string, action: HostAction) {
    const reg = await LiteRegistrationModel.findById(id);
    if (!reg) throw notFound('Guest');
    const event = await eventService.requireHosted(String(reg.event_id), user);
    const wasHolding = ['CONFIRMED', 'PAYMENT_PENDING', 'PENDING_APPROVAL'].includes(reg.status);
    HOST_TRANSITIONS[action](reg);
    await reg.save();
    const nowHolding = ['CONFIRMED', 'PAYMENT_PENDING', 'PENDING_APPROVAL'].includes(reg.status);
    if (wasHolding && !nowHolding) {
      await bump(event, reg.ticket_id, -reg.quantity);
      await promoteWaitlist(event);
    }
    let template = AFTER_ACTION_TEMPLATE[action];
    if (action === 'APPROVE') template = STATUS_TEMPLATE[reg.status];
    if (template) notifications.guestStatus(event, reg, template, { reason: action === 'REJECT_PAYMENT' ? 'The payment reference could not be matched.' : '' });
    return project(reg, viewerOf(user));
  },

  async checkInByCode(user: LiteUserDoc, eventId: string, code: string) {
    const event = await eventService.requireHosted(eventId, user);
    const reg = await LiteRegistrationModel.findOne({ event_id: event._id, code: code.trim().toUpperCase() });
    if (!reg) throw notFound('No ticket with that code');
    if (reg.status !== 'CONFIRMED') throw badInput(`This ticket is ${reg.status.toLowerCase().replaceAll('_', ' ')}, not confirmed`);
    if (reg.checked_in_at) throw badInput('This ticket was already checked in');
    reg.checked_in_at = new Date();
    await reg.save();
    return project(reg, viewerOf(user));
  },

  async mine(user: LiteUserDoc, past: boolean) {
    const docs = await LiteRegistrationModel.find({ user_id: user._id, status: { $ne: 'CANCELLED' }, event_start_at: past ? { $lt: new Date() } : { $gte: new Date() } })
      .sort({ event_start_at: past ? -1 : 1 })
      .limit(200)
      .lean();
    return Promise.all(docs.map((d) => project(d, viewerOf(user))));
  },

  async byId(user: LiteUserDoc, id: string) {
    const doc = await LiteRegistrationModel.findById(id).lean();
    if (!doc) return null;
    const event = await LiteEventModel.findById(doc.event_id).lean();
    const allowed = String(doc.user_id) === String(user._id) || user.is_admin || (event ? event.hosts.some((h) => String(h.user_id) === String(user._id)) : false);
    if (!allowed) throw forbidden();
    const withPosition = doc.status === 'WAITLISTED' ? { ...doc, waitlist_position: await waitlistPosition(doc) } : doc;
    return project(withPosition, viewerOf(user));
  },

  async forEvent(user: LiteUserDoc, eventId: string, status: RegistrationStatus | null | undefined, search: string | null | undefined) {
    const event = await eventService.requireHosted(eventId, user);
    const filter: Record<string, unknown> = { event_id: event._id };
    if (status) filter.status = status;
    const term = search?.trim();
    if (term) {
      const rx = new RegExp(term.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      filter.$or = [{ user_name: rx }, { user_email: rx }, { code: rx }, { payment_reference: rx }];
    }
    const docs = await LiteRegistrationModel.find(filter).sort({ created_at: -1 }).limit(1000).lean();
    return Promise.all(docs.map((d) => project(d, viewerOf(user))));
  },
};

import { LiteEventModel, type LiteEventDoc } from '../../models/event.model';
import { LiteRegistrationModel, type RegistrationStatus } from '../../models/registration.model';
import { LiteUserModel, type LiteUserDoc } from '../../models/user.model';
import { eventService, type EventInput } from '../../services/event.service';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

let sequence = 0;

export interface UserFields {
  email?: string;
  phone?: string;
  name?: string;
  handle?: string;
  is_admin?: boolean;
  is_blocked?: boolean;
  upi_id?: string;
  upi_name?: string;
  bio?: string;
}

/** A saved Lite account; the handle is unique per call unless one is given. */
export async function makeUser(fields: UserFields = {}): Promise<LiteUserDoc> {
  sequence += 1;
  return LiteUserModel.create({ name: `Guest ${sequence}`, handle: `guest_${sequence}`, ...fields });
}

/** A valid in-person, free event a week from now; override any field. */
export function eventInput(overrides: Partial<EventInput> = {}): EventInput {
  const start = new Date(Date.now() + 7 * DAY);
  return {
    title: 'Sunday Jazz at Bandra',
    description: 'An evening of live jazz on the terrace.',
    start_at: start.toISOString(),
    end_at: new Date(start.getTime() + 3 * HOUR).toISOString(),
    timezone: 'Asia/Kolkata',
    location_type: 'IN_PERSON',
    venue_name: 'The Terrace',
    address: '14 Hill Road, Bandra West',
    visibility: 'PUBLIC',
    tickets: [{ name: 'General', price: 0 }],
    ...overrides,
  };
}

/** An event created (and by default published) through the service, read back as a document. */
export async function hostedEvent(host: LiteUserDoc, overrides: Partial<EventInput> = {}, publish = true): Promise<LiteEventDoc> {
  const created = await eventService.create(host, eventInput(overrides));
  if (publish) await eventService.publish(host, created.id);
  const doc = await LiteEventModel.findById(created.id);
  if (!doc) throw new Error('The event was not saved');
  return doc;
}

export interface RegistrationFields {
  status?: RegistrationStatus;
  quantity?: number;
  code?: string;
  amount_due?: number;
  payment_status?: 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'REJECTED';
  checked_in_at?: Date | null;
  event_start_at?: Date | null;
}

/** A registration written straight to the database, for setting up seats already held. */
export async function seedRegistration(event: LiteEventDoc, user: LiteUserDoc, fields: RegistrationFields = {}) {
  sequence += 1;
  const ticket = event.tickets[0];
  return LiteRegistrationModel.create({
    event_id: event._id,
    user_id: user._id,
    code: `SEED${sequence}`,
    ticket_id: String(ticket._id),
    ticket_name: ticket.name,
    ticket_price: ticket.price,
    status: 'CONFIRMED',
    quantity: 1,
    event_title: event.title,
    event_start_at: event.start_at,
    user_email: user.email ?? '',
    user_name: user.name,
    ...fields,
  });
}

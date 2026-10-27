import { LiteCalendarModel } from '../models/calendar.model';
import { LiteCityModel } from '../models/city.model';
import { LiteRegistrationModel } from '../models/registration.model';
import { LiteSubscriptionModel } from '../models/subscription.model';
import { LiteUserModel } from '../models/user.model';
import { log } from '../utils/log';
import { emailService, type InlineImage, type TemplateVars } from './email.service';
import { eventUrl, formatWhen, formatWhere, manageUrl, ticketUrl } from './projections';
import { ticketQrPng } from './qr';

/** The template that means "you're in": it carries the ticket's check-in QR. */
const CONFIRMED_TEMPLATE = 'registration_confirmed';

async function ticketQrImage(eventId: unknown, code: string): Promise<InlineImage> {
  return { cid: 'ticket-qr', png: await ticketQrPng(String(eventId), code), alt: `Check-in QR for code ${code}` };
}

/**
 * Every email an event sends, named by the moment that triggers it. Each is
 * fire-and-forget from the caller's point of view: a mail failure is logged
 * and never fails the registration that caused it.
 */
type EventLike = {
  _id: unknown;
  slug: string;
  title: string;
  start_at: Date;
  end_at: Date;
  timezone: string;
  location_type: string;
  venue_name: string;
  address: string;
  city_slug: string;
  virtual_link: string;
  hosts: { user_id: unknown; role: string }[];
  upi_id: string;
  upi_name: string;
  cancel_reason?: string;
};

type RegistrationLike = {
  _id: unknown;
  code: string;
  amount_due: number;
  user_id: unknown;
  waitlist_position?: number | null;
};

async function primaryHost(event: EventLike) {
  const host = event.hosts.find((h) => h.role === 'HOST') ?? event.hosts[0];
  return host ? LiteUserModel.findById(host.user_id).lean() : null;
}

async function baseVars(event: EventLike): Promise<TemplateVars> {
  const [host, city] = await Promise.all([primaryHost(event), event.city_slug ? LiteCityModel.findOne({ slug: event.city_slug }).lean() : null]);
  return {
    event_title: event.title,
    event_when: formatWhen(event),
    event_where: formatWhere(event, city?.name ?? ''),
    event_url: eventUrl(event.slug),
    host_name: host?.name ?? 'The host',
    host_email: host?.email ?? '',
  };
}

/**
 * The people who can be emailed: a phone-only account has no mailbox, so it
 * simply gets no email (its ticket and the event page still show everything).
 */
const mailable = <T extends { email?: string | null }>(people: T[]): (T & { email: string })[] =>
  people.filter((person): person is T & { email: string } => Boolean(person.email));

const fire = (promise: Promise<unknown>, what: string) => {
  promise.catch((error) => log.error('notifications', what, { error }));
};

/** "in 2 days" / "in 1 hour" — how far off the event is, for a reminder's copy. */
function reminderLeadInWords(hoursBefore: number): string {
  if (hoursBefore >= 24) {
    const days = Math.round(hoursBefore / 24);
    return `in ${days} day${hoursBefore >= 48 ? 's' : ''}`;
  }
  return `in ${hoursBefore} hour${hoursBefore === 1 ? '' : 's'}`;
}

export const notifications = {
  guestStatus(event: EventLike, registration: RegistrationLike, templateKey: string, extra: TemplateVars = {}): void {
    fire(
      (async () => {
        const guest = await LiteUserModel.findById(registration.user_id).lean();
        if (!guest?.email) return;
        const vars = await baseVars(event);
        const inlineImage = templateKey === CONFIRMED_TEMPLATE ? await ticketQrImage(event._id, registration.code) : undefined;
        await emailService.send({
          to: guest.email,
          templateKey,
          eventId: String(event._id),
          inlineImage,
          vars: {
            ...vars,
            name: guest.name,
            code: registration.code,
            amount: registration.amount_due,
            upi_id: event.upi_id,
            upi_name: event.upi_name || vars.host_name,
            ticket_url: ticketUrl(registration._id),
            position: registration.waitlist_position ?? '',
            reason: '',
            ...extra,
          },
        });
      })(),
      templateKey,
    );
  },

  hostNewRegistration(event: EventLike, registration: RegistrationLike, what: string): void {
    fire(
      (async () => {
        const [guest, vars] = await Promise.all([LiteUserModel.findById(registration.user_id).lean(), baseVars(event)]);
        const hosts = await LiteUserModel.find({ _id: { $in: event.hosts.map((h) => h.user_id) } }).lean();
        for (const host of mailable(hosts)) {
          await emailService.send({
            to: host.email,
            templateKey: 'host_new_registration',
            eventId: String(event._id),
            vars: { ...vars, name: host.name, guest_name: guest?.name ?? 'A guest', guest_email: guest?.email || guest?.phone || '', what, manage_url: manageUrl(event.slug) },
          });
        }
      })(),
      'host_new_registration',
    );
  },

  /** The host's own message to every confirmed guest. Awaited: the host is told how many went out. */
  async hostUpdate(event: EventLike, subject: string, message: string): Promise<number> {
    const [vars, rows] = await Promise.all([baseVars(event), LiteRegistrationModel.find({ event_id: event._id, status: 'CONFIRMED' }).lean()]);
    const users = await LiteUserModel.find({ _id: { $in: rows.map((r) => r.user_id) } }).lean();
    let sent = 0;
    for (const guest of mailable(users)) {
      const outcome = await emailService.send({ to: guest.email, templateKey: 'event_update', eventId: String(event._id), vars: { ...vars, name: guest.name, subject, message } });
      if (outcome.status === 'SENT') sent += 1;
    }
    return sent;
  },

  eventCancelled(event: EventLike): void {
    fire(
      (async () => {
        const [vars, rows] = await Promise.all([
          baseVars(event),
          LiteRegistrationModel.find({ event_id: event._id, status: { $in: ['CONFIRMED', 'PAYMENT_PENDING', 'PENDING_APPROVAL', 'WAITLISTED'] } }).lean(),
        ]);
        const users = await LiteUserModel.find({ _id: { $in: rows.map((r) => r.user_id) } }).lean();
        for (const guest of mailable(users)) {
          await emailService.send({ to: guest.email, templateKey: 'event_cancelled', eventId: String(event._id), vars: { ...vars, name: guest.name, reason: event.cancel_reason ?? '' } });
        }
      })(),
      'event_cancelled',
    );
  },

  calendarPublished(event: EventLike, calendarId: unknown): void {
    fire(
      (async () => {
        const calendar = await LiteCalendarModel.findById(calendarId).lean();
        if (!calendar) return;
        const [vars, subs] = await Promise.all([baseVars(event), LiteSubscriptionModel.find({ calendar_id: calendarId }).lean()]);
        const users = await LiteUserModel.find({ _id: { $in: subs.map((s) => s.user_id) } }).lean();
        for (const person of mailable(users)) {
          await emailService.send({ to: person.email, templateKey: 'calendar_new_event', eventId: String(event._id), vars: { ...vars, name: person.name, calendar_name: calendar.name } });
        }
      })(),
      'calendar_new_event',
    );
  },

  coHostAdded(event: EventLike, userId: unknown): void {
    fire(
      (async () => {
        const [person, vars] = await Promise.all([LiteUserModel.findById(userId).lean(), baseVars(event)]);
        if (!person?.email) return;
        await emailService.send({ to: person.email, templateKey: 'cohost_added', eventId: String(event._id), vars: { ...vars, name: person.name, manage_url: manageUrl(event.slug) } });
      })(),
      'cohost_added',
    );
  },

  async reminder(event: EventLike, hoursBefore: number): Promise<number> {
    const vars = await baseVars(event);
    const rows = await LiteRegistrationModel.find({ event_id: event._id, status: 'CONFIRMED' }).lean();
    const users = new Map(mailable(await LiteUserModel.find({ _id: { $in: rows.map((r) => r.user_id) } }).lean()).map((u) => [String(u._id), u]));
    const inWords = reminderLeadInWords(hoursBefore);
    let sent = 0;
    for (const row of rows) {
      const guest = users.get(String(row.user_id));
      if (!guest) continue;
      const outcome = await emailService.send({
        to: guest.email,
        templateKey: 'event_reminder',
        eventId: String(event._id),
        inlineImage: await ticketQrImage(event._id, row.code),
        vars: {
          ...vars,
          name: guest.name,
          in_words: inWords,
          virtual_line: event.location_type === 'VIRTUAL' && event.virtual_link ? `Join link: ${event.virtual_link}\n` : '',
          code: row.code,
          ticket_url: ticketUrl(row._id),
        },
      });
      if (outcome.status === 'SENT') sent += 1;
    }
    return sent;
  },
};

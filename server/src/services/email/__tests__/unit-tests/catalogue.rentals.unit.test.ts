const waSend = jest.fn();
const sendEmail = jest.fn();
const claimCreate = jest.fn();

jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({
  whatsappService: { send: (...a: unknown[]) => waSend(...a) },
}));
jest.mock('@services/email/email.service', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
jest.mock('@modules/content/emailLog/emailClaim.model', () => ({
  EmailClaimModel: { create: (...a: unknown[]) => claimCreate(...a), deleteOne: jest.fn().mockResolvedValue({}) },
}));
jest.mock('@config/queue', () => ({ enqueue: jest.fn(), startWorker: jest.fn() }));

import { WA_EVENT_BY_KEY } from '@modules/platform/whatsapp/whatsapp.events.generated';
import { WA_TEMPLATE_DRAFTS, draftParamCount } from '@modules/platform/whatsapp/whatsapp.drafts';
import { EMAIL_BY_WA_EVENT } from '@services/email/catalogue';
import { RENTAL_EMAILS } from '@services/email/catalogue/catalogue.rentals';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';
import { notifyEvent } from '@services/notify/notify.service';

/**
 * rentalNotify fills these events positionally. The email row names each
 * position, so the key order below IS the contract with those call sites: a
 * swap here would put the pod's date into the venue's name in every email.
 */
const CONTRACT: Record<string, { slug: string; audience: string; category: string; keys: string[] }> = {
  VENUE_RENTAL_BOOKED: {
    slug: 'venue-rental-booked',
    audience: 'VENUE',
    category: 'transactional',
    keys: ['name', 'items', 'pod_title', 'pod_when', 'guest_name', 'order_ref', 'rentals_url'],
  },
  USER_RENTAL_BOOKED: {
    slug: 'rental-booked-user',
    audience: 'USER',
    category: 'transactional',
    keys: ['name', 'items', 'pod_title', 'pod_when', 'venue', 'amount_paid', 'rentals_url'],
  },
  VENUE_RENTAL_CANCELLED: {
    slug: 'venue-rental-cancelled',
    audience: 'VENUE',
    category: 'transactional',
    keys: ['name', 'items', 'pod_title', 'pod_when', 'reason', 'rentals_url'],
  },
  USER_RENTAL_CANCELLED: {
    slug: 'rental-cancelled-user',
    audience: 'USER',
    category: 'billing',
    keys: ['name', 'items', 'pod_title', 'reason', 'refund_amount', 'rentals_url'],
  },
  USER_RENTAL_RETURNED: {
    slug: 'rental-returned-user',
    audience: 'USER',
    category: 'billing',
    keys: ['name', 'item', 'pod_title', 'outcome', 'deposit_refund', 'rentals_url'],
  },
  USER_RENTAL_REFUND_DELAYED: {
    slug: 'rental-refund-delayed-user',
    audience: 'USER',
    category: 'billing',
    keys: ['name', 'amount', 'item', 'pod_title', 'rentals_url'],
  },
  USER_REFUND_PROCESSED: {
    slug: 'refund-processed',
    audience: 'USER',
    category: 'billing',
    keys: ['name', 'amount', 'refund_for', 'refund_days'],
  },
};
const EVENTS = Object.keys(CONTRACT);
const RENTAL_ONLY = EVENTS.filter((key) => key !== 'USER_REFUND_PROCESSED');

describe('rental emails: one row per event, named in the order the call sites fill', () => {
  it('registers exactly the seven rows, each reachable by its WhatsApp event', () => {
    expect(RENTAL_EMAILS.map((row) => row.waEvent).sort()).toEqual([...EVENTS].sort());
    for (const key of EVENTS) expect(EMAIL_BY_WA_EVENT.get(key)?.slug).toBe(CONTRACT[key].slug);
  });

  it.each(EVENTS)('%s: slug, audience, category and var order match the contract', (key) => {
    const row = EMAIL_BY_WA_EVENT.get(key);
    const event = WA_EVENT_BY_KEY.get(key);
    expect(event).toBeDefined();
    expect(row).toMatchObject({ slug: CONTRACT[key].slug, audience: CONTRACT[key].audience, category: CONTRACT[key].category });
    expect(row?.vars.map((variable) => variable.key)).toEqual(CONTRACT[key].keys);
    expect(row?.vars).toHaveLength(event?.params.length ?? -1);
  });

  it.each(RENTAL_ONLY)('%s: the WhatsApp event has the audience and category the email has', (key) => {
    const event = WA_EVENT_BY_KEY.get(key);
    expect(event?.audience).toBe(CONTRACT[key].audience);
    expect(event?.category).toBe(CONTRACT[key].category);
  });

  it.each(EVENTS)('%s: every copy key the body renders ships an English fallback', (key) => {
    const mjml = EMAIL_BY_WA_EVENT.get(key)?.mjml ?? '';
    const keys = [...mjml.matchAll(/\{\{t:([\w.]+)\}\}/g)].map((match) => match[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const copyKey of keys) expect(EMAIL_FALLBACK[copyKey]).toEqual(expect.any(String));
  });

  it.each(EVENTS)('%s: the subject and body only use variables the row declares', (key) => {
    const row = EMAIL_BY_WA_EVENT.get(key);
    const declared = new Set(row?.vars.map((variable) => variable.key));
    const used = [...(row?.subject ?? '').matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
    const copy = EMAIL_FALLBACK[`${copyKeyOf(row?.mjml)}.body`] ?? '';
    expect(copy).not.toBe('');
    used.push(...[...copy.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]));
    for (const name of used) expect(declared.has(name)).toBe(true);
  });
});

/** The `email.<x>` namespace a standard body's heading comes from. */
function copyKeyOf(mjml?: string): string {
  return /\{\{t:(email\.[A-Za-z]+)\.title\}\}/.exec(mjml ?? '')?.[1] ?? '';
}

describe('rental WhatsApp drafts', () => {
  it.each(RENTAL_ONLY)('%s: one {{n}} per registry param, and a sample with none left', (key) => {
    const draft = WA_TEMPLATE_DRAFTS[key];
    expect(draft?.category).toBe('UTILITY');
    expect(draftParamCount(draft.body)).toBe(WA_EVENT_BY_KEY.get(key)?.params.length);
    expect(draftParamCount(draft.sample)).toBe(0);
  });

  it.each(RENTAL_ONLY)('%s: passes the shape Meta rejects (edge or adjacent placeholders)', (key) => {
    const { body } = WA_TEMPLATE_DRAFTS[key];
    expect(body).not.toMatch(/^\s*\{\{\d+\}\}/);
    expect(body).not.toMatch(/\{\{\d+\}\}\s*$/);
    expect(body).not.toMatch(/\{\{\d+\}\}\s*\{\{\d+\}\}/);
    expect(body.endsWith('Team Duncit')).toBe(true);
  });

  it.each(['USER_RENTAL_CANCELLED', 'USER_RENTAL_RETURNED'])(
    '%s: says the refund is on its way, never that it was processed',
    (key) => {
      const texts = [WA_TEMPLATE_DRAFTS[key].body, EMAIL_FALLBACK[`${copyKeyOf(EMAIL_BY_WA_EVENT.get(key)?.mjml)}.body`]];
      for (const text of texts) {
        expect(text).toContain('on its way');
        expect(text).not.toMatch(/(?:has been|was) (?:processed|refunded)/);
      }
    }
  );
});

describe('notifyEvent sends the rental email off the same positional values', () => {
  beforeEach(() => {
    waSend.mockResolvedValue({ status: 'SENT', reason: '', message_id: 'm1' });
    sendEmail.mockResolvedValue({ accepted: ['a@b.co'] });
    claimCreate.mockResolvedValue({});
  });

  it('renders the generic refund email for a rental refund Razorpay confirmed', async () => {
    const outcome = await notifyEvent({
      event: 'USER_REFUND_PROCESSED',
      entityId: 'rental_refund:b1',
      user: { auth: { email: 'guest@duncit.test' } },
      name: 'Aarav',
      params: ['Aarav', 'Rs 200.00', 'UNO Cards rented for Sunday Chess', '7'],
    });

    expect(sendEmail).toHaveBeenCalledWith({
      to: 'guest@duncit.test',
      subject: 'Your refund of Rs 200.00 has been processed',
      template: 'refund-processed',
      category: 'billing',
      vars: { name: 'Aarav', amount: 'Rs 200.00', refund_for: 'UNO Cards rented for Sunday Chess', refund_days: '7' },
    });
    expect(claimCreate).toHaveBeenCalledWith({ key: 'USER_REFUND_PROCESSED|rental_refund:b1|guest@duncit.test' });
    expect(outcome.mail).toEqual({ accepted: ['a@b.co'] });
  });

  it('sends the venue email to the address the call site passes, naming each value', async () => {
    await notifyEvent({
      event: 'VENUE_RENTAL_BOOKED',
      entityId: 'rental_booked:p1',
      user: null,
      email: 'owner@venue.test',
      name: 'Rohan',
      params: ['Rohan', 'UNO Cards × 1', 'Sunday Chess', '29 Nov 2026, 07:30 PM', 'Aarav', 'DPAY-X1', 'https://p/r'],
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@venue.test',
        template: 'venue-rental-booked',
        subject: 'Rented items booked for Sunday Chess',
        vars: {
          name: 'Rohan',
          items: 'UNO Cards × 1',
          pod_title: 'Sunday Chess',
          pod_when: '29 Nov 2026, 07:30 PM',
          guest_name: 'Aarav',
          order_ref: 'DPAY-X1',
          rentals_url: 'https://p/r',
        },
      })
    );
  });

  it('sends no second email when the same refund event is retried', async () => {
    claimCreate.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
    const outcome = await notifyEvent({
      event: 'USER_RENTAL_RETURNED',
      entityId: 'rental_returned:b1',
      user: { auth: { email: 'guest@duncit.test' } },
      name: 'Aarav',
      params: ['Aarav', 'UNO Cards × 1', 'Sunday Chess', 'Returned in good shape', 'Rs 200.00', 'https://m/r'],
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(outcome.mail).toBeNull();
  });
});

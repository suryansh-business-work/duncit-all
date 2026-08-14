import { logs } from '@observability/log';
import { destinationFor } from '@modules/crm/marketing/waCampaign.recipients';
import { getWaPricing, ratePerMessage } from '@modules/crm/marketing/waPricing.model';
import { sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import { WA_EVENT_BY_KEY, isRequiredWaCategory, type WaEvent } from './whatsapp.events';
import { WaEventSettingModel, WA_GLOBAL_DEFAULT_ENABLED, WA_GLOBAL_KEY } from './waEventSetting.model';
import { WaMessageLogModel, type WaMessageStatus } from './waMessageLog.model';
import { WaPreferenceModel } from './waPreference.model';

/**
 * The one way a domain event sends a WhatsApp message.
 *
 * IT NEVER THROWS. That is the whole contract, and it is the difference between
 * this and calling `aisensyService.send` directly: cancelling a pod flips
 * payments to REFUNDED and then tells people, and an AiSensy outage must not
 * fail the mutation after the money already moved. Every outcome — sent,
 * skipped, failed — comes back as a value and lands in `WaMessageLog`, exactly
 * as `sendEmail`'s `notSent()` does for email.
 *
 * The gates, cheapest first, so a switched-off product costs one indexed read:
 *   global switch -> per-scenario switch -> a reachable number -> the person's
 *   own opt-out -> the right number of non-blank values -> not already sent.
 */

export interface WaSendInput {
  /** A key from the registry, e.g. `USER_POD_CANCELLED_BY_HOST`. */
  event: string;
  /** The pod / release / ticket this is about. Two messages for the same event
   * and the same recipient about the SAME entity are the duplicate the unique
   * index exists to stop; leave it empty for account-level messages. */
  entityId?: string | null;
  /** The recipient account. Its WhatsApp number is preferred over its login phone. */
  user?: Record<string, any> | null;
  /** Or an explicit number, for a partner contact that is not a Duncit account. */
  destination?: string | null;
  /** The name AiSensy files the contact under. */
  name?: string | null;
  /** One value per placeholder, in the order the registry declares. */
  params: readonly (string | number | null | undefined)[];
  /** A header image or document. AiSensy fetches the URL itself, so it must be
   * publicly reachable. */
  media?: { url: string; filename: string } | null;
}

export interface WaSendOutcome {
  status: WaMessageStatus;
  reason: string;
  message_id: string;
}

const sent = (message_id: string): WaSendOutcome => ({ status: 'SENT', reason: '', message_id });
const skip = (reason: string): WaSendOutcome => ({ status: 'SKIPPED', reason, message_id: '' });
const failed = (reason: string): WaSendOutcome => ({ status: 'FAILED', reason, message_id: '' });

const digits = (v: unknown) => String(v ?? '').replaceAll(/\D/g, '');
const text = (v: unknown) => String(v ?? '').trim();

/** Both switches in one read: the collection holds a handful of rows. */
async function switchesFor(eventKey: string): Promise<{ on: boolean; reason: string; category: string }> {
  const rows = await WaEventSettingModel.find({ event_key: { $in: [WA_GLOBAL_KEY, eventKey] } })
    .select('event_key enabled template_category')
    .lean();
  const global = rows.find((row) => row.event_key === WA_GLOBAL_KEY);
  const own = rows.find((row) => row.event_key === eventKey);
  // An absent global row means nobody has turned automatic WhatsApp on yet.
  if (!(global?.enabled ?? WA_GLOBAL_DEFAULT_ENABLED)) {
    return { on: false, reason: 'Automatic WhatsApp is switched off', category: '' };
  }
  // An absent scenario row means ON — a newly wired scenario works without
  // anybody having to create a row for it first.
  if (own && !own.enabled) {
    return { on: false, reason: 'This message is switched off', category: '' };
  }
  return { on: true, reason: '', category: own?.template_category ?? '' };
}

/**
 * Whether this person still accepts this kind of message.
 *
 * Required categories short-circuit before Mongo is touched: nobody's ticket or
 * refund notice should cost a lookup, and none of them can be switched off.
 * Fails OPEN — a database blip must not lose a booking confirmation.
 */
export async function waPreferenceAllows(destination: string, category: string): Promise<boolean> {
  if (isRequiredWaCategory(category)) return true;
  try {
    const row = await WaPreferenceModel.findOne({ destination }).select('opted_out').lean();
    return !row?.opted_out?.includes(category);
  } catch (error) {
    logs.server.warn('whatsapp', 'preference', { error, destination });
    return true;
  }
}

/** A log row for an outcome that never reached AiSensy. */
async function record(
  event: WaEvent,
  input: WaSendInput,
  destination: string,
  outcome: WaSendOutcome
): Promise<WaSendOutcome> {
  await WaMessageLogModel.create({
    event_key: event.key,
    campaign: event.campaign,
    category: event.category,
    audience: event.audience,
    entity_id: text(input.entityId),
    recipient_user_id: input.user?._id ?? null,
    destination,
    status: outcome.status,
    reason: outcome.reason,
    params: input.params.map(text),
    // A row that did not send holds no slot, so the same event can be tried
    // again once the number is added or the switch is turned back on.
    holds_slot: false,
  }).catch((error) => logs.server.warn('whatsapp', 'record', { error, event: event.key }));
  return outcome;
}

/** Values are wrong if there is the wrong number of them, or any is blank —
 * AiSensy renders a missing one as the literal `{{7}}` and bills for it. */
function paramError(params: string[], event: WaEvent): string {
  if (params.length !== event.params.length) {
    return `Expected ${event.params.length} value(s), got ${params.length}`;
  }
  const blank = params.findIndex((value) => !value);
  return blank >= 0 ? `Value ${blank + 1} (${event.params[blank]}) is empty` : '';
}

/** MongoServerError 11000 — the unique index rejected a second attempt. */
const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

async function deliver(input: WaSendInput): Promise<WaSendOutcome> {
  const event = WA_EVENT_BY_KEY.get(input.event);
  if (!event) {
    // A key that is not in the registry is a wiring mistake, not a runtime
    // condition — there is no row to file it against, so it goes to the log.
    logs.server.error('whatsapp', 'send', { error: new Error(`Unknown event ${input.event}`) });
    return skip('Unknown event');
  }

  const switches = await switchesFor(event.key);
  const destination = input.destination ? digits(input.destination) : destinationFor(input.user ?? {});
  if (!switches.on) return record(event, input, destination, skip(switches.reason));
  if (!destination) return record(event, input, '', skip('No WhatsApp number'));

  if (!(await waPreferenceAllows(destination, event.category))) {
    return record(event, input, destination, skip('Recipient switched this off'));
  }

  const params = input.params.map(text);
  const wrong = paramError(params, event);
  if (wrong) return record(event, input, destination, failed(wrong));

  return dispatch(event, input, destination, params, switches.category);
}

/** Claim the slot, send, then write what happened onto the same row. */
async function dispatch(
  event: WaEvent,
  input: WaSendInput,
  destination: string,
  params: string[],
  templateCategory: string
): Promise<WaSendOutcome> {
  const pricing = await getWaPricing();
  const claim = {
    event_key: event.key,
    campaign: event.campaign,
    category: event.category,
    audience: event.audience,
    entity_id: text(input.entityId),
    recipient_user_id: input.user?._id ?? null,
    destination,
    status: 'SENDING' as const,
    params,
    template_category: templateCategory,
    msg_rate: ratePerMessage(pricing, templateCategory || 'UTILITY'),
    holds_slot: true,
  };

  let row;
  try {
    // Claim BEFORE sending. Two workers racing the same event both pass every
    // check above; only one of them can win this insert.
    row = await WaMessageLogModel.create(claim);
  } catch (error) {
    if (isDuplicate(error)) return skip('Already sent');
    logs.server.warn('whatsapp', 'claim', { error, event: event.key });
    return failed('Could not record the message');
  }

  const startedAt = Date.now();
  try {
    const messageId = await sendCampaign({
      campaign_name: event.campaign,
      destination,
      user_name: text(input.name) || 'there',
      template_params: params,
      media: input.media ?? undefined,
    });
    await WaMessageLogModel.updateOne(
      { _id: row._id },
      { $set: { status: 'SENT', submitted_message_id: messageId, duration_ms: Date.now() - startedAt } }
    );
    return sent(messageId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'AiSensy rejected the message';
    // The claim is released so a later re-trigger can try again — an AiSensy
    // outage must not silence this message forever.
    await WaMessageLogModel.updateOne(
      { _id: row._id },
      { $set: { status: 'FAILED', reason, holds_slot: false, duration_ms: Date.now() - startedAt } }
    );
    logs.server.warn('whatsapp', 'send', { error, event: event.key });
    return failed(reason);
  }
}

export const whatsappService = {
  /** Send one message. Never throws; the outcome is the return value. */
  async send(input: WaSendInput): Promise<WaSendOutcome> {
    try {
      return await deliver(input);
    } catch (error) {
      logs.server.error('whatsapp', 'send', { error, event: input.event });
      return failed('Unexpected error');
    }
  },

  /**
   * A fan-out, one message at a time.
   *
   * Sequential on purpose: AiSensy rate-limits the campaign API, and the
   * marketing sender keeps one message in flight for exactly this reason. A
   * 40-attendee cancellation fired through `Promise.all` is 40 concurrent POSTs
   * and there is no limiter anywhere in the server to catch them.
   */
  async sendEach(inputs: readonly WaSendInput[]): Promise<WaSendOutcome[]> {
    const outcomes: WaSendOutcome[] = [];
    for (const input of inputs) {
      // eslint-disable-next-line no-await-in-loop
      outcomes.push(await this.send(input));
    }
    return outcomes;
  },
};

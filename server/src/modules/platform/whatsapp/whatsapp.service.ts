import { logs } from '@observability/log';
import { destinationFor } from '@modules/crm/marketing/waCampaign.recipients';
import { getWaPricing, ratePerMessage } from '@modules/crm/marketing/waPricing.model';
import { isMediaMissing, sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import {
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
} from '@modules/platform/aisensy/aisensy.project';
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

/** A header image or document, or nothing — the shape AiSensy's `media` takes. */
type SendMedia = { url: string; filename: string } | null;

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

interface Switches {
  on: boolean;
  reason: string;
  category: string;
  /** The header asset this scenario sends: the admin's override when one is
   * set, else the asset cached off the campaign by the console's reconcile. */
  media: SendMedia;
  /** Whether that cache has ever been filled. A blank asset on a row nobody has
   * synced is not "no asset" — it is "nobody looked", and `bindCampaignMedia`
   * is what looks. */
  media_synced: boolean;
  /** The template's header kind, cached with the pair above. The platform
   * default is one image, so it is attached to IMAGE and nothing else. */
  header_format: string;
  /** The platform-wide default header asset, off the global row. The last
   * resort in the media order, and — with no campaign at AiSensy carrying an
   * asset of its own — the one that actually sends today. */
  default_media: SendMedia;
}

/** Both switches in one read: the collection holds a handful of rows. */
async function switchesFor(eventKey: string): Promise<Switches> {
  const rows = await WaEventSettingModel.find({ event_key: { $in: [WA_GLOBAL_KEY, eventKey] } })
    .select(
      'event_key enabled template_category media_url media_filename media_synced_at template_header_format override_media_url override_media_filename'
    )
    .lean();
  const global = rows.find((row) => row.event_key === WA_GLOBAL_KEY);
  const own = rows.find((row) => row.event_key === eventKey);
  const off = (reason: string): Switches => ({
    on: false,
    reason,
    category: '',
    media: null,
    media_synced: true,
    header_format: '',
    default_media: null,
  });
  // An absent global row means nobody has turned automatic WhatsApp on yet.
  if (!(global?.enabled ?? WA_GLOBAL_DEFAULT_ENABLED)) return off('Automatic WhatsApp is switched off');
  // An absent scenario row means ON — a newly wired scenario works without
  // anybody having to create a row for it first.
  if (own && !own.enabled) return off('This message is switched off');
  // The admin's own asset beats the campaign cache: the override was set
  // deliberately in the console, the cache is whatever reconcile last copied —
  // and 0 of the live campaigns actually carry one. The filename travels with
  // whichever url won, never mixed across the two pairs.
  const mediaUrl = own?.override_media_url || own?.media_url || '';
  const mediaFilename = own?.override_media_url ? own.override_media_filename : own?.media_filename;
  const defaultUrl = global?.override_media_url ?? '';
  return {
    on: true,
    reason: '',
    category: own?.template_category ?? '',
    media: mediaUrl ? { url: mediaUrl, filename: mediaFilename || 'attachment' } : null,
    // A row stamped before `template_header_format` existed knows its asset
    // but not its header kind — so it counts as unsynced and binds once more,
    // rather than reading as "no header" until somebody presses Reconcile.
    // `.lean()` applies no schema defaults, so an old document really is
    // `undefined` here rather than ''.
    media_synced: Boolean(own?.media_synced_at) && own?.template_header_format !== undefined,
    header_format: own?.template_header_format ?? '',
    default_media: defaultUrl
      ? { url: defaultUrl, filename: global?.override_media_filename || 'attachment' }
      : null,
  };
}

interface BoundMedia {
  /** The asset the campaign was built with at AiSensy, or null. */
  media: SendMedia;
  /** Its template's header kind — TEXT, IMAGE, VIDEO, FILE, or '' for none. */
  header_format: string;
}

/**
 * The only header kind the platform default fits.
 *
 * The default is one image an operator uploads once. A VIDEO header wants a
 * video, and the five FILE-header templates are the payment ones — each wants
 * that send's own invoice, never a shared picture. Both keep failing until
 * they are given an asset of their own, which is the honest outcome.
 */
const DEFAULTABLE_HEADER = 'IMAGE';

/**
 * The campaign's own header asset — and its template's header kind — read off
 * AiSensy and cached onto the row.
 *
 * The cache is normally filled by the console's Reconcile — but a scenario
 * nobody has reconciled sends with nothing attached, and a media campaign
 * answers that with `Media URL Missing (HTTP 400)`. Binding it here is what
 * makes Reconcile an optimisation rather than a prerequisite for a message the
 * platform sends by itself.
 *
 * It costs ONE catalogue read per scenario, ever: the stamp is written whatever
 * the answer was, so a text template never pays for a second one. The admin
 * override is untouched — this fills the reconcile-owned fields, and only when
 * they have never been filled.
 *
 * Best effort. The Project API is a second credential the send itself does not
 * need, so a console that cannot read it sends exactly as before — the rule
 * `resolveCampaign` already follows for a marketing send.
 */
async function bindCampaignMedia(event: WaEvent): Promise<BoundMedia | null> {
  // Asked first: without the Project API both reads below throw before they
  // reach the network, and an unsynced row would pay for two throws on every
  // send until somebody configures it.
  if (!(await isProjectApiConfigured())) return null;
  try {
    const [campaigns, templates] = await Promise.all([listCampaigns(), listTemplates()]);
    const campaign = campaigns.find((row) => row.name === event.campaign);
    const template = templates.find((row) => row.name === campaign?.template_name);
    const header_format = template?.header_format ?? '';
    await WaEventSettingModel.updateOne(
      { event_key: event.key },
      {
        $set: {
          media_url: campaign?.media_url ?? '',
          media_filename: campaign?.media_filename ?? '',
          template_header_format: header_format,
          media_synced_at: new Date(),
        },
      },
      { upsert: true }
    );
    const media = campaign?.media_url
      ? { url: campaign.media_url, filename: campaign.media_filename || 'attachment' }
      : null;
    return { media, header_format };
  } catch (error) {
    // An unconfigured or unreachable Project API is not a send failure. No
    // stamp is written, so the next send on this scenario tries again.
    logs.server.debug('whatsapp', 'bindMedia', { error, event: event.key });
    return null;
  }
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

/** The number this send was addressed to, without ever throwing — it is read
 * on the path that files a row for a send that already went wrong. */
function addressedTo(input: WaSendInput): string {
  try {
    return input.destination ? digits(input.destination) : destinationFor(input.user ?? {});
  } catch {
    return '';
  }
}

/**
 * A log row for an outcome that never reached AiSensy.
 *
 * `event` is nullable because the two outcomes that need a row MOST are the
 * two that cannot supply one: a key that is not in the registry, and a throw
 * before the registry was ever read. Both used to return an outcome and write
 * nothing at all, so the Logs console showed no trace of a message the caller
 * was told had been handled.
 */
async function record(
  event: WaEvent | null,
  input: WaSendInput,
  destination: string,
  outcome: WaSendOutcome
): Promise<WaSendOutcome> {
  await WaMessageLogModel.create({
    event_key: event?.key ?? input.event,
    campaign: event?.campaign ?? '',
    category: event?.category ?? '',
    audience: event?.audience ?? '',
    entity_id: text(input.entityId),
    recipient_user_id: input.user?._id ?? null,
    destination,
    status: outcome.status,
    reason: outcome.reason,
    params: input.params.map(text),
    // A row that did not send holds no slot, so the same event can be tried
    // again once the number is added or the switch is turned back on.
    holds_slot: false,
  }).catch((error) =>
    logs.server.warn('whatsapp', 'record', { error, event: event?.key ?? input.event })
  );
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
  const destination = addressedTo(input);
  const event = WA_EVENT_BY_KEY.get(input.event);
  if (!event) {
    // A key that is not in the registry is a wiring mistake rather than a
    // runtime condition, so it goes to the app log AS WELL — but it still files
    // a row under the key that was asked for, because a scenario that silently
    // logs nothing is the hardest kind of missing message to find.
    logs.server.error('whatsapp', 'send', { error: new Error(`Unknown event ${input.event}`) });
    return record(null, input, destination, skip('Unknown event'));
  }

  const switches = await switchesFor(event.key);
  if (!switches.on) return record(event, input, destination, skip(switches.reason));
  if (!destination) return record(event, input, '', skip('No WhatsApp number'));

  if (!(await waPreferenceAllows(destination, event.category))) {
    return record(event, input, destination, skip('Recipient switched this off'));
  }

  const params = input.params.map(text);
  const wrong = paramError(params, event);
  if (wrong) return record(event, input, destination, failed(wrong));

  return dispatch(event, input, destination, params, switches);
}

/**
 * The header asset this send carries, or null.
 *
 * The platform default is attached ONLY to an IMAGE header: a text template
 * sent with a header it does not have is a different rejection, not a fix, and
 * a document header wants a document.
 */
async function resolveMedia(
  event: WaEvent,
  input: WaSendInput,
  switches: Switches
): Promise<SendMedia> {
  const own = input.media ?? switches.media;
  if (own) return own;

  const bound = switches.media_synced ? null : await bindCampaignMedia(event);
  if (bound?.media) return bound.media;

  const headerFormat = bound?.header_format ?? switches.header_format;
  return headerFormat === DEFAULTABLE_HEADER ? switches.default_media : null;
}

/**
 * Header kinds the platform default — one image — must never stand in for. A
 * VIDEO header wants a video, and the five FILE-header templates are the
 * payment ones: each wants that send's own invoice, never a shared picture.
 */
const OWN_ASSET_HEADERS = new Set(['VIDEO', 'FILE', 'DOCUMENT']);

/**
 * The two rejections an operator can act on, in the words of the screen that
 * fixes them. AiSensy's own sentence names no setting anybody can find.
 */
const NO_DEFAULT_MEDIA =
  'This campaign needs a header image and none is set — add the default header image under Marketing > WhatsApp > Settings';
const headerOfItsOwn = (format: string) =>
  `This campaign needs its own header ${format.toLowerCase()} — set media on this scenario under Marketing > WhatsApp > Automation`;

/**
 * Remember that this campaign's template carries an image header, because
 * AiSensy has just said so by rejecting a send.
 *
 * It fills the same reconcile-owned pair `bindCampaignMedia` does, so the NEXT send on
 * this scenario attaches the default straight away rather than paying for a
 * rejection first — and it learns it without the Project API, which is a second
 * credential the send path does not otherwise need.
 */
async function rememberImageHeader(eventKey: string): Promise<void> {
  await WaEventSettingModel.updateOne(
    { event_key: eventKey },
    { $set: { template_header_format: DEFAULTABLE_HEADER, media_synced_at: new Date() } },
    { upsert: true }
  ).catch((error) => logs.server.warn('whatsapp', 'learnHeader', { error, event: eventKey }));
}

/**
 * The asset a rejected send can be tried again with, or null when this
 * rejection is not one the server can answer.
 *
 * Only for a send that carried NOTHING: `Media URL Missing` on a message that
 * already had an asset is a different problem — an unreachable URL — and
 * resending the default over it would hide that.
 */
function recoveryMedia(error: unknown, carried: SendMedia, switches: Switches): SendMedia {
  if (carried || !isMediaMissing(error)) return null;
  if (OWN_ASSET_HEADERS.has(switches.header_format.toUpperCase())) return null;
  return switches.default_media;
}

/** What the Logs console shows for a failure. */
function failureReason(error: unknown, carried: SendMedia, switches: Switches): string {
  const raw = error instanceof Error ? error.message : 'AiSensy rejected the message';
  if (carried || !isMediaMissing(error)) return raw;
  const format = switches.header_format.toUpperCase();
  return OWN_ASSET_HEADERS.has(format) ? headerOfItsOwn(format) : NO_DEFAULT_MEDIA;
}

interface PostAttempt {
  message_id: string;
  /** null when AiSensy took the message. */
  error: unknown;
  /** What actually travelled with it. */
  media: SendMedia;
}

/** One POST, with the throw turned into a value so the recovery below reads as
 * a decision rather than a nest of catches. */
async function postOnce(
  event: WaEvent,
  input: WaSendInput,
  destination: string,
  params: string[],
  media: SendMedia
): Promise<PostAttempt> {
  try {
    const message_id = await sendCampaign({
      campaign_name: event.campaign,
      destination,
      user_name: text(input.name) || 'there',
      template_params: params,
      media: media ?? undefined,
    });
    return { message_id, error: null, media };
  } catch (error) {
    return { message_id: '', error, media };
  }
}

interface SendAttempt extends PostAttempt {
  /** '' when it went through; otherwise what the log row says. */
  reason: string;
}

/**
 * Send — and when AiSensy answers "this campaign's template has a media header
 * and your message carried none", send once more with the platform default
 * attached.
 *
 * This is what makes the default reach a message at all. Everything upstream
 * INFERS whether a campaign needs an asset from `template_header_format`, which is
 * cached off the Project API — unset, unreachable, or unable to resolve a
 * campaign's template, that cache reads '' and {@link resolveMedia} attaches
 * nothing, so every media scenario fails forever with a vendor string nobody
 * can act on. AiSensy's own rejection needs no second credential and cannot be
 * wrong, so the recovery is keyed on it and the answer is remembered.
 *
 * ONE retry, and only for a send that carried nothing — see
 * {@link recoveryMedia}.
 */
async function postWithMediaRecovery(
  event: WaEvent,
  input: WaSendInput,
  destination: string,
  params: string[],
  switches: Switches,
  media: SendMedia
): Promise<SendAttempt> {
  const first = await postOnce(event, input, destination, params, media);
  if (!first.error) return { ...first, reason: '' };

  const fallback = recoveryMedia(first.error, media, switches);
  if (!fallback) return { ...first, reason: failureReason(first.error, media, switches) };

  const second = await postOnce(event, input, destination, params, fallback);
  if (second.error) return { ...second, reason: failureReason(second.error, fallback, switches) };

  // Only now: the retry going through is the proof that an image header is what
  // this template wanted. Stamping it before would teach the row the wrong kind
  // off a VIDEO or FILE template that rejected the image for its own reason.
  await rememberImageHeader(event.key);
  return { ...second, reason: '' };
}

/** Claim the slot, send, then write what happened onto the same row. */
async function dispatch(
  event: WaEvent,
  input: WaSendInput,
  destination: string,
  params: string[],
  switches: Switches
): Promise<WaSendOutcome> {
  const pricing = await getWaPricing();

  // The most specific asset wins: caller > this row's admin override > the
  // campaign's own (cached, or bound off AiSensy on first use) > the platform
  // default. A media campaign rejects a send that carries none and the
  // requirement is invisible on the template — and today the default is the
  // only rung on this ladder that is set for any scenario.
  //
  // Resolved lazily: a caller that brought its own asset must not pay for two
  // AiSensy reads to learn a header kind this send will never consult.
  const media = await resolveMedia(event, input, switches);

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
    template_category: switches.category,
    msg_rate: ratePerMessage(pricing, switches.category || 'UTILITY'),
    // Frozen alongside the params: a header that went out empty is the whole
    // story behind a `Media URL Missing` row, and nothing else records it.
    media_url: media?.url ?? '',
    media_filename: media?.filename ?? '',
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
  const attempt = await postWithMediaRecovery(event, input, destination, params, switches, media);
  // Re-stamped rather than left at the claim's guess: the recovery above can
  // change what actually travelled, and a header that went out empty is the
  // whole story behind a `Media URL Missing` row.
  const wrote = {
    duration_ms: Date.now() - startedAt,
    media_url: attempt.media?.url ?? '',
    media_filename: attempt.media?.filename ?? '',
  };

  // Every write below is caught rather than left to the outer guard: an update
  // that throws would reach `send`'s catch and file a SECOND row for a message that
  // already has one.
  if (!attempt.reason) {
    await WaMessageLogModel.updateOne(
      { _id: row._id },
      { $set: { ...wrote, status: 'SENT', submitted_message_id: attempt.message_id } }
    ).catch((error) => logs.server.warn('whatsapp', 'record', { error, event: event.key }));
    return sent(attempt.message_id);
  }

  // The claim is released so a later re-trigger can try again — an AiSensy
  // outage must not silence this message forever.
  await WaMessageLogModel.updateOne(
    { _id: row._id },
    { $set: { ...wrote, status: 'FAILED', reason: attempt.reason, holds_slot: false } }
  ).catch((error) => logs.server.warn('whatsapp', 'record', { error, event: event.key }));
  logs.server.warn('whatsapp', 'send', { error: attempt.error, event: event.key });
  return failed(attempt.reason);
}

export const whatsappService = {
  /** Send one message. Never throws; the outcome is the return value. */
  async send(input: WaSendInput): Promise<WaSendOutcome> {
    try {
      return await deliver(input);
    } catch (error) {
      logs.server.error('whatsapp', 'send', { error, event: input.event });
      // Everything that reaches here threw BEFORE the claim was written —
      // `dispatch` catches its own bookkeeping — so this row is the only record
      // this attempt will ever have. Without it the console shows nothing for a
      // message the caller was told was handled.
      const reason = error instanceof Error ? error.message : 'Unexpected error';
      // Caught, because the contract at the top of this file is that send
      // NEVER throws, and filing the row is the last thing that could break it.
      return await record(
        WA_EVENT_BY_KEY.get(input.event) ?? null,
        input,
        addressedTo(input),
        failed(reason)
      ).catch(() => failed(reason));
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

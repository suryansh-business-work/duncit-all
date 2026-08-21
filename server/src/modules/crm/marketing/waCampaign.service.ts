import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import { isAisensyConfigured } from '@modules/platform/aisensy/aisensy.gateway';
import {
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
} from '@modules/platform/aisensy/aisensy.project';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  WaCampaignModel,
  WA_CAMPAIGN_AUDIENCES,
  type WaCampaignAudience,
} from './waCampaign.model';
import { getWaPricing, WaPricingModel, type IWaPricing } from './waPricing.model';
import { resolveCampaign, sendExtras } from './waCampaign.template';
import { waDashboard, type WaDashboardRange } from './waCampaign.dashboard';
import { WaCampaignNameModel } from './waCampaignName.model';
import {
  WaCampaignRecipientModel,
  type WaRecipientStatus,
} from './waCampaignRecipient.model';
import {
  assertKnownTokens,
  countReachable,
  destinationFor,
  fillParams,
  manualUsers,
  recipientUsers,
  searchReachableUsers,
  userNameFor,
  usersByIds,
  WA_VARIABLES,
  type RecipientScope,
} from './waCampaign.recipients';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });
const notFound = () => new GraphQLError('Campaign not found', { extensions: { code: 'NOT_FOUND' } });

/** Progress (counters + the recipient rows collected so far) is written every
 * this many recipients, so a long send shows movement in the table and its
 * detail view instead of jumping from nothing to done. */
const PROGRESS_EVERY = 20;

const str = (v: unknown) => String(v ?? '').trim();
const digitsOnly = (v: unknown) => str(v).replaceAll(/\D/g, '');
const iso = (d?: Date | null) => (d ? d.toISOString() : null);

/** setTimeout tops out here; a schedule further out re-arms in hops. */
const MAX_TIMER_DELAY = 2_147_483_647;
/** Live timers for SCHEDULED campaigns in THIS process, by campaign id. */
const timers = new Map<string, NodeJS.Timeout>();

/** What a send cost: the rate it froze times the messages that actually went
 * out. Skipped and failed people were never billed, so they never count. */
const costOf = (doc: any) => Number(doc.msg_rate ?? 0) * Number(doc.sent_count ?? 0);

const toPub = (doc: any) => ({
  campaign_id: doc.campaign_id,
  name: doc.name,
  wa_campaign_name: doc.wa_campaign_name,
  audience: doc.audience,
  audience_list_id: doc.audience_list_id ? String(doc.audience_list_id) : null,
  user_ids: (doc.user_ids ?? []).map(String),
  contacts: (doc.contacts ?? []).map((contact: any) => ({
    name: contact.name ?? '',
    extension: contact.extension ?? '',
    number: contact.number ?? '',
  })),
  template_name: doc.template_name ?? '',
  template_category: doc.template_category ?? '',
  msg_rate: Number(doc.msg_rate ?? 0),
  cost: costOf(doc),
  template_params: doc.template_params ?? [],
  media: doc.media?.url ? { url: doc.media.url, filename: doc.media.filename ?? '' } : null,
  buttons: (doc.buttons ?? []).map((button: any) => ({
    index: button.index,
    value: button.value,
  })),
  status: doc.status,
  scheduled_at: iso(doc.scheduled_at),
  recipient_count: doc.recipient_count,
  sent_count: doc.sent_count,
  failed_count: doc.failed_count,
  skipped_count: doc.skipped_count,
  error: doc.error ?? null,
  sent_at: iso(doc.sent_at),
  created_at: iso(doc.created_at),
  updated_at: iso(doc.updated_at),
});

const toNameOption = (doc: any) => ({
  id: String(doc._id),
  name: doc.name,
  description: doc.description ?? '',
});

const toPricing = (doc: IWaPricing) => ({
  marketing_per_msg: Number(doc.marketing_per_msg ?? 0),
  utility_per_msg: Number(doc.utility_per_msg ?? 0),
  authentication_per_msg: Number(doc.authentication_per_msg ?? 0),
  service_per_msg: Number(doc.service_per_msg ?? 0),
  currency_symbol: doc.currency_symbol ?? '₹',
});

/** A rate is money per message: a real number, never negative. A typo that
 * saves a negative rate would turn a bill into a credit. */
function rate(value: unknown, label: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw badInput(`${label} rate must be zero or more`);
  }
  return amount;
}

/** Allowlists for the shared table engine (waCampaignsTable — DUNCIT TABLE CONTRACT v1). */
const WA_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'wa_campaign_name'],
  sortFields: {
    name: 'name',
    wa_campaign_name: 'wa_campaign_name',
    audience: 'audience',
    status: 'status',
    template_category: 'template_category',
    recipient_count: 'recipient_count',
    sent_count: 'sent_count',
    failed_count: 'failed_count',
    sent_at: 'sent_at',
    created_at: 'created_at',
  },
  filterFields: {
    audience: { type: 'enum' },
    status: { type: 'enum' },
    template_category: { type: 'enum' },
    sent_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** Allowlists for the recipient table inside a campaign's detail view. */
const RECIPIENT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'destination', 'reason', 'submitted_message_id'],
  sortFields: {
    name: 'name',
    destination: 'destination',
    status: 'status',
    created_at: 'created_at',
  },
  filterFields: { status: { type: 'enum' } },
  // Send order — the run reads top to bottom the way it happened.
  defaultSort: { created_at: 1 },
};

const toRecipient = (doc: any) => ({
  id: String(doc._id),
  name: doc.name ?? '',
  destination: doc.destination ?? '',
  status: doc.status,
  reason: doc.reason ?? '',
  submitted_message_id: doc.submitted_message_id ?? '',
  template_params: doc.template_params ?? [],
  attempts: doc.attempts ?? 1,
  created_at: iso(doc.created_at),
  updated_at: iso(doc.updated_at),
});

/** RFC 4180: quote every field and double the quotes inside it. A reason like
 * `AiSensy error: "Unauthorized", retry` must not split a row. */
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const CSV_HEADER = [
  'Name',
  'Destination',
  'Status',
  'Reason',
  'Template params',
  'AiSensy message id',
  'Attempts',
  'At',
];

interface ManualContactInput {
  name?: string | null;
  extension?: string | null;
  number?: string | null;
}

interface SendInput {
  name?: string | null;
  wa_campaign_name?: string | null;
  audience?: WaCampaignAudience | null;
  audience_list_id?: string | null;
  /** SPECIFIC_USERS — the accounts picked in the portal. */
  user_ids?: (string | null)[] | null;
  /** MANUAL_NUMBERS — numbers typed in, which may belong to no account. */
  contacts?: (ManualContactInput | null)[] | null;
  template_params?: (string | null)[] | null;
  /** The header asset, for a template whose header is IMAGE, VIDEO or FILE.
   * Left out, the campaign's own asset is used. */
  media?: { url?: string | null; filename?: string | null } | null;
  /** Values for CTA buttons whose link carries a {{n}}, by button position. */
  buttons?: ({ index?: number | null; value?: string | null } | null)[] | null;
  /** ISO time to send at. Absent, or already past, means send now. */
  scheduled_at?: string | null;
}

/** The send time, or null for "now". A time that has already passed is not an
 * error — it just means now, the same as leaving it out. */
function parseSchedule(raw?: string | null): Date | null {
  const value = str(raw);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badInput('That schedule date is not a real date');
  return date.getTime() > Date.now() ? date : null;
}

const AUDIENCES = new Set<string>(WA_CAMPAIGN_AUDIENCES);

/** Who this send goes to, checked against the kind it claims to be. Each kind
 * carries exactly one thing, so the stored document can never say "these users"
 * and "this list" at the same time. */
function validateScope(input: SendInput) {
  const audience = (
    AUDIENCES.has(String(input.audience)) ? input.audience : 'ALL_USERS'
  ) as WaCampaignAudience;
  const audienceListId = str(input.audience_list_id);
  if (audience === 'AUDIENCE_LIST' && !Types.ObjectId.isValid(audienceListId)) {
    throw badInput('Pick the audience list to send to');
  }
  const userIds = (input.user_ids ?? []).map(str).filter((id) => Types.ObjectId.isValid(id));
  if (audience === 'SPECIFIC_USERS' && userIds.length === 0) {
    throw badInput('Pick at least one person to send to');
  }
  const contacts = (input.contacts ?? []).map((contact) => ({
    name: str(contact?.name),
    extension: digitsOnly(contact?.extension),
    number: digitsOnly(contact?.number),
  }));
  if (audience === 'MANUAL_NUMBERS') {
    if (contacts.length === 0) throw badInput('Add at least one contact to send to');
    if (contacts.some((contact) => !contact.name || !contact.extension || !contact.number)) {
      throw badInput('Every contact needs a name, a country code and a number');
    }
  }
  return {
    audience,
    audience_list_id: audience === 'AUDIENCE_LIST' ? audienceListId : null,
    user_ids: audience === 'SPECIFIC_USERS' ? userIds : [],
    contacts: audience === 'MANUAL_NUMBERS' ? contacts : [],
  };
}

/**
 * Validate what the portal sent.
 *
 * The campaign name has to be one somebody vouched for: either AiSensy itself
 * returned it, or it is on the saved list. AiSensy's own answer wins where it
 * exists — the saved list was only ever a stand-in for a catalogue the send
 * key cannot read, and a name that is on neither fails every message in the
 * send, one at a time.
 */
async function validateSendInput(input: SendInput) {
  const name = str(input.name);
  if (name.length < 3) throw badInput('Give this campaign a name of at least 3 characters');
  const waCampaignName = str(input.wa_campaign_name);
  const resolved = await resolveCampaign(waCampaignName);
  if (!resolved.known && !(await WaCampaignNameModel.findOne({ name: waCampaignName }))) {
    throw badInput('AiSensy has no campaign by that name — pick one, or add the name under Settings');
  }
  const templateParams = (input.template_params ?? []).map(str);
  if (templateParams.some((param) => !param)) {
    throw badInput('Fill every template parameter before sending');
  }
  assertKnownTokens(templateParams);
  return {
    name,
    wa_campaign_name: waCampaignName,
    ...validateScope(input),
    template_name: resolved.template_name,
    template_category: resolved.template_category,
    msg_rate: resolved.msg_rate,
    template_params: templateParams,
    // Checked against the live template, and frozen onto the document: the
    // asset a campaign carries can be swapped in the AiSensy console, and a
    // past send must keep saying what it actually sent.
    ...sendExtras(resolved, {
      template_params: templateParams,
      media: input.media,
      buttons: input.buttons,
    }),
    scheduled_at: parseSchedule(input.scheduled_at),
  };
}

/** The stored campaign's own answer to "who does this reach" — read from the
 * document so a run can never resolve against anything but what was saved. */
const scopeOf = (doc: any): RecipientScope => ({
  audience_list_id: doc.audience_list_id,
  user_ids: doc.user_ids ?? [],
  contacts: doc.contacts ?? [],
});

interface RecipientRow {
  campaign_id: string;
  user_id: unknown;
  name: string;
  destination: string;
  status: WaRecipientStatus;
  reason: string;
  submitted_message_id: string;
  template_params: string[];
}

/**
 * Send to one recipient and describe what happened to them. A missing number or
 * an empty variable is a SKIP, not a failure: nothing was attempted, nothing was
 * billed, and the reason says which of the two it was.
 */
async function deliver(doc: any, user: Record<string, any>): Promise<RecipientRow> {
  const base = {
    campaign_id: doc.campaign_id,
    user_id: user._id ?? null,
    name: userNameFor(user),
    destination: destinationFor(user),
    submitted_message_id: '',
    template_params: [] as string[],
  };
  if (!base.destination) {
    return { ...base, status: 'SKIPPED', reason: 'No WhatsApp number with a country code' };
  }
  if (!base.name) return { ...base, status: 'SKIPPED', reason: 'No name on the account' };
  const { params, missingReason } = fillParams(doc.template_params ?? [], user);
  if (missingReason) return { ...base, status: 'SKIPPED', reason: missingReason };
  try {
    const result = await aisensyService.send({
      campaign_name: doc.wa_campaign_name,
      destination: base.destination,
      user_name: base.name,
      template_params: params,
      // Read from the document, not re-resolved: every message in one send
      // carries what the send was created with.
      media: doc.media,
      buttons: doc.buttons,
    });
    return {
      ...base,
      template_params: params,
      status: 'SENT',
      reason: '',
      submitted_message_id: result.submitted_message_id,
    };
  } catch (e: any) {
    return {
      ...base,
      template_params: params,
      status: 'FAILED',
      reason: str(e?.message) || 'Send failed',
    };
  }
}

const COUNTER_OF: Record<WaRecipientStatus, 'sent_count' | 'skipped_count' | 'failed_count'> = {
  SENT: 'sent_count',
  SKIPPED: 'skipped_count',
  FAILED: 'failed_count',
};

/**
 * Walk the audience one recipient at a time. Sequential on purpose: AiSensy
 * rate-limits the campaign API, and one in-flight message keeps a large send
 * well inside that limit without any throttling machinery.
 */
async function runSend(campaignId: string) {
  const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
  if (!doc) return;
  // Cancelled between the timer being armed and it firing — the hour passing
  // does not resurrect a send somebody called off.
  if (doc.status === 'CANCELLED') return;
  doc.status = 'SENDING';
  try {
    const users = await recipientUsers(doc.audience as WaCampaignAudience, scopeOf(doc));
    doc.recipient_count = users.length;
    await doc.save();
    let pending: RecipientRow[] = [];
    // Rows land in batches rather than one insert per message: the send is
    // already one HTTP call per recipient without adding a write to each.
    const flush = async () => {
      if (pending.length > 0) await WaCampaignRecipientModel.insertMany(pending);
      pending = [];
      await doc.save();
    };
    for (const [index, user] of users.entries()) {
      const row = await deliver(doc, user);
      doc[COUNTER_OF[row.status]] += 1;
      pending.push(row);
      if (index % PROGRESS_EVERY === PROGRESS_EVERY - 1) await flush();
    }
    await flush();
    doc.status = doc.sent_count > 0 ? 'SENT' : 'FAILED';
    if (doc.sent_count === 0) doc.error = 'No message could be delivered';
    doc.sent_at = new Date();
  } catch (e: any) {
    doc.status = 'FAILED';
    doc.error = str(e?.message) || 'WhatsApp campaign send failed';
  }
  await doc.save();
  logs.server.info('waCampaign', 'runSend', {
    campaign_id: campaignId,
    status: doc.status,
    sent: doc.sent_count,
    failed: doc.failed_count,
    skipped: doc.skipped_count,
  });
}

/** The statuses a retry re-attempts: nobody was reached in either case. */
const UNREACHED = ['FAILED', 'SKIPPED'];

/**
 * Recount from the rows rather than incrementing. After a retry the rows are
 * the truth — a row that flips FAILED → SENT has to move both counters, and
 * two increments that must agree are two chances to drift.
 */
async function refreshCounters(doc: any) {
  const [sent, failed, skipped] = await Promise.all([
    WaCampaignRecipientModel.countDocuments({ campaign_id: doc.campaign_id, status: 'SENT' }),
    WaCampaignRecipientModel.countDocuments({ campaign_id: doc.campaign_id, status: 'FAILED' }),
    WaCampaignRecipientModel.countDocuments({ campaign_id: doc.campaign_id, status: 'SKIPPED' }),
  ]);
  doc.sent_count = sent;
  doc.failed_count = failed;
  doc.skipped_count = skipped;
  await doc.save();
}

/** A recipient row's identity for a retry: the account it belongs to, or — for
 * a typed-in contact, which has no account — the number itself. */
const retryKey = (row: any) => String(row.user_id ?? '') || `#${row.destination ?? ''}`;

/**
 * Who a retry re-attempts against, keyed the same way the rows are. Accounts
 * are re-read from the database because a retry exists for data that may have
 * changed; typed-in contacts are re-read from the campaign, because that is the
 * only place they ever lived.
 */
async function retryTargets(doc: any, rows: readonly any[]) {
  if (doc.audience === 'MANUAL_NUMBERS') {
    const users = manualUsers(doc.contacts ?? []);
    return new Map(users.map((user) => [`#${destinationFor(user)}`, user as Record<string, any>]));
  }
  const users = await usersByIds(rows.map((row) => row.user_id).filter(Boolean));
  return new Map(users.map((user: any) => [String(user._id), user as Record<string, any>]));
}

/**
 * Re-attempt the people a send did not reach, reading them from the campaign's
 * own rows. Each row is UPDATED rather than duplicated, so a campaign keeps one
 * row per person however many attempts it took — `attempts` is where the second
 * try shows up. People are re-read from the database first: a retry exists
 * because the data may have changed (a number added since), not to repeat the
 * same call with the same inputs.
 */
async function runRetry(campaignId: string) {
  const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
  if (!doc) return;
  try {
    const rows = await WaCampaignRecipientModel.find({
      campaign_id: campaignId,
      status: { $in: UNREACHED },
    }).exec();
    const byKey = await retryTargets(doc, rows);
    for (const [index, row] of rows.entries()) {
      const user = byKey.get(retryKey(row));
      // The account is gone — there is nobody left to retry against, and the
      // row keeps saying why it was never reached.
      if (user) {
        const outcome = await deliver(doc, user);
        row.name = outcome.name;
        row.destination = outcome.destination;
        row.status = outcome.status;
        row.reason = outcome.reason;
        row.submitted_message_id = outcome.submitted_message_id;
        row.template_params = outcome.template_params;
        row.attempts += 1;
        await row.save();
      }
      if (index % PROGRESS_EVERY === PROGRESS_EVERY - 1) await refreshCounters(doc);
    }
    await refreshCounters(doc);
    doc.status = doc.sent_count > 0 ? 'SENT' : 'FAILED';
    doc.error = doc.sent_count > 0 ? null : 'No message could be delivered';
  } catch (e: any) {
    doc.status = 'FAILED';
    doc.error = str(e?.message) || 'WhatsApp campaign retry failed';
  }
  await doc.save();
  logs.server.info('waCampaign', 'runRetry', {
    campaign_id: campaignId,
    status: doc.status,
    sent: doc.sent_count,
    failed: doc.failed_count,
    skipped: doc.skipped_count,
  });
}

/**
 * Arm the in-process timer for a scheduled campaign. setTimeout cannot hold
 * more than ~24.8 days, so a schedule further out re-arms itself in hops; every
 * SCHEDULED row is re-armed on boot by resumeSchedules, so a restart does not
 * lose one.
 */
function scheduleDoc(doc: any) {
  if (doc.status !== 'SCHEDULED' || !doc.scheduled_at) return;
  const existing = timers.get(doc.campaign_id);
  if (existing) clearTimeout(existing);
  const delay = doc.scheduled_at.getTime() - Date.now();
  const timer = setTimeout(
    () => {
      timers.delete(doc.campaign_id);
      if (delay > MAX_TIMER_DELAY) scheduleDoc(doc);
      else {
        runSend(doc.campaign_id).catch((e) =>
          logs.server.error('waCampaign', 'scheduleDoc', { error: e, campaign_id: doc.campaign_id })
        );
      }
    },
    Math.max(0, Math.min(delay, MAX_TIMER_DELAY))
  );
  timers.set(doc.campaign_id, timer);
}

function clearTimer(campaignId: string) {
  const timer = timers.get(campaignId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(campaignId);
  }
}

export const waCampaignService = {
  /** Whether the Tech portal's AiSensy API key is in place — the portal warns
   * instead of letting a send fail once per recipient. */
  configured: () => isAisensyConfigured(),

  variables: () => WA_VARIABLES.map(({ name, description }) => ({ name, description })),

  /** The AiSensy side, read live through the Project API — never stored here,
   * so what the console shows is what AiSensy has right now. */
  projectConfigured: () => isProjectApiConfigured(),
  aisensyCampaigns: () => listCampaigns(),
  aisensyTemplates: () => listTemplates(),

  async names() {
    const docs = await WaCampaignNameModel.find().sort({ name: 1 }).exec();
    return docs.map(toNameOption);
  },

  async createName(input: { name?: string | null; description?: string | null }, userId?: string | null) {
    const name = str(input.name);
    if (!name) throw badInput('Campaign name is required');
    const existing = await WaCampaignNameModel.findOne({ name });
    if (existing) throw badInput(`"${name}" is already in the list`);
    const doc = await WaCampaignNameModel.create({
      name,
      description: str(input.description),
      created_by: userId ?? null,
    });
    return toNameOption(doc);
  },

  async removeName(id: string) {
    const doc = await WaCampaignNameModel.findByIdAndDelete(id);
    if (!doc) throw new GraphQLError('Campaign name not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },

  /** How many messages this send would actually produce, for every kind of
   * recipient list — one answer, so the portal never counts for itself. */
  reach: (audience: WaCampaignAudience, scope: RecipientScope) => countReachable(audience, scope),

  /** The accounts a "send to these people" picker offers. */
  userSearch: (search: string) => searchReachableUsers(str(search)),

  /** What WhatsApp cost and reached over a window. */
  dashboard: (range: WaDashboardRange) => waDashboard(range),

  /** What a message costs, by category. */
  async pricing() {
    return toPricing(await getWaPricing());
  },

  /**
   * Change the rate card. It applies to sends made from now on: every campaign
   * froze its own rate when it was created, which is what keeps a past send's
   * cost from moving under a price change.
   */
  async updatePricing(input: Record<string, unknown>) {
    const rates = {
      marketing_per_msg: rate(input.marketing_per_msg, 'Marketing'),
      utility_per_msg: rate(input.utility_per_msg, 'Utility'),
      authentication_per_msg: rate(input.authentication_per_msg, 'Authentication'),
      service_per_msg: rate(input.service_per_msg, 'Service'),
      currency_symbol: str(input.currency_symbol) || '₹',
    };
    const doc = await WaPricingModel.findOneAndUpdate(
      { singleton_key: 'whatsapp' },
      { $set: rates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
    return toPricing(doc as IWaPricing);
  },

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      WaCampaignModel,
      {},
      input,
      WA_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async byId(campaignId: string) {
    const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
    if (!doc) throw notFound();
    return toPub(doc);
  },

  /**
   * The whole recipient list as CSV — every row, not the page the table is
   * showing. Built here rather than in the browser because the table engine
   * caps a page at 100 and a send is not: paging a 20,000-person campaign
   * through the client to make a spreadsheet is 200 round trips for one file.
   */
  async recipientsCsv(campaignId: string) {
    const rows = await WaCampaignRecipientModel.find({ campaign_id: campaignId })
      .sort({ created_at: 1 })
      .lean()
      .exec();
    const lines = rows.map((row: any) =>
      [
        row.name,
        row.destination,
        row.status,
        row.reason,
        (row.template_params ?? []).join(' | '),
        row.submitted_message_id,
        row.attempts ?? 1,
        iso(row.created_at),
      ]
        .map(csvCell)
        .join(',')
    );
    return [CSV_HEADER.map(csvCell).join(','), ...lines].join('\n');
  },

  /** Who the send reached and who it did not, one row per person. */
  async recipients(campaignId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      WaCampaignRecipientModel,
      { campaign_id: campaignId },
      input,
      RECIPIENT_TABLE_CONFIG
    );
    return { rows: docs.map(toRecipient), total, page, page_size };
  },

  /**
   * Start a send. The document is returned as soon as it exists and the walk
   * continues in the background: a WhatsApp campaign is one HTTP call per
   * recipient, so waiting for it would hold the request open for minutes.
   */
  async send(input: SendInput, userId?: string | null) {
    if (!(await isAisensyConfigured())) {
      throw badInput('Add the AiSensy API key in the Tech portal before sending');
    }
    const payload = await validateSendInput(input);
    const doc = await WaCampaignModel.create({
      ...payload,
      campaign_id: crypto.randomUUID(),
      status: payload.scheduled_at ? 'SCHEDULED' : 'SENDING',
      created_by: userId ?? null,
    });
    if (payload.scheduled_at) scheduleDoc(doc);
    else {
      runSend(doc.campaign_id).catch((e) =>
        logs.server.error('waCampaign', 'send', { error: e, campaign_id: doc.campaign_id })
      );
    }
    return toPub(doc);
  },

  /**
   * Re-attempt only the people this campaign did not reach. Not a new campaign:
   * the audience is not re-resolved, so a retry can only ever touch people the
   * original send already walked over.
   */
  async retry(campaignId: string) {
    if (!(await isAisensyConfigured())) {
      throw badInput('Add the AiSensy API key in the Tech portal before sending');
    }
    const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
    if (!doc) throw notFound();
    if (doc.status === 'SENDING') {
      throw badInput('That campaign is sending right now — wait for it to finish');
    }
    if (doc.status === 'SCHEDULED') throw badInput('That campaign has not run yet');
    const pending = await WaCampaignRecipientModel.countDocuments({
      campaign_id: campaignId,
      status: { $in: UNREACHED },
    });
    if (pending === 0) throw badInput('Nothing to retry — this campaign reached everyone it walked over');
    doc.status = 'SENDING';
    await doc.save();
    runRetry(campaignId).catch((e) =>
      logs.server.error('waCampaign', 'retry', { error: e, campaign_id: campaignId })
    );
    return toPub(doc);
  },

  /**
   * One message to one number — the check a marketer makes before pointing a
   * template at an audience. Goes through the same send path as a campaign, so
   * a template that passes here is the template a campaign will send: the same
   * template checks run, and the campaign's own asset fills in the same way.
   */
  async testSend(input: any) {
    const templateParams = (input.template_params ?? []).map(str);
    const resolved = await resolveCampaign(str(input.wa_campaign_name));
    return aisensyService.send({
      campaign_name: input.wa_campaign_name,
      destination: input.destination,
      user_name: input.user_name,
      template_params: templateParams,
      ...sendExtras(resolved, {
        template_params: templateParams,
        media: input.media,
        buttons: input.buttons,
      }),
    });
  },

  /** Call off a send that has not started. Only SCHEDULED can be cancelled —
   * once messages are going out there is nothing to call off. */
  async cancel(campaignId: string) {
    const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
    if (!doc) throw notFound();
    if (doc.status !== 'SCHEDULED') throw badInput('Only a scheduled campaign can be cancelled');
    clearTimer(campaignId);
    doc.status = 'CANCELLED';
    await doc.save();
    return toPub(doc);
  },

  /** Re-arm every scheduled campaign after a restart — the timers live in this
   * process, the schedule lives in the database. */
  async resumeSchedules() {
    const docs = await WaCampaignModel.find({ status: 'SCHEDULED' }).exec();
    docs.forEach(scheduleDoc);
  },

  async remove(campaignId: string) {
    const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
    if (!doc) throw notFound();
    if (doc.status === 'SENDING') {
      throw badInput('That campaign is sending right now — wait for it to finish');
    }
    // A scheduled campaign owns a live timer; dropping the row without clearing
    // it leaves a timer that fires for a campaign that no longer exists.
    clearTimer(campaignId);
    await doc.deleteOne();
    // The per-recipient rows exist only for this campaign — they go with it.
    await WaCampaignRecipientModel.deleteMany({ campaign_id: campaignId });
    return true;
  },
};

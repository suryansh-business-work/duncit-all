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
import { WaCampaignModel, type WaCampaignAudience } from './waCampaign.model';
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
  recipientUsers,
  userNameFor,
  WA_VARIABLES,
} from './waCampaign.recipients';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });
const notFound = () => new GraphQLError('Campaign not found', { extensions: { code: 'NOT_FOUND' } });

/** Progress (counters + the recipient rows collected so far) is written every
 * this many recipients, so a long send shows movement in the table and its
 * detail view instead of jumping from nothing to done. */
const PROGRESS_EVERY = 20;

const str = (v: unknown) => String(v ?? '').trim();
const iso = (d?: Date | null) => (d ? d.toISOString() : null);

/** setTimeout tops out here; a schedule further out re-arms in hops. */
const MAX_TIMER_DELAY = 2_147_483_647;
/** Live timers for SCHEDULED campaigns in THIS process, by campaign id. */
const timers = new Map<string, NodeJS.Timeout>();

const toPub = (doc: any) => ({
  campaign_id: doc.campaign_id,
  name: doc.name,
  wa_campaign_name: doc.wa_campaign_name,
  audience: doc.audience,
  audience_list_id: doc.audience_list_id ? String(doc.audience_list_id) : null,
  template_params: doc.template_params ?? [],
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

/** Allowlists for the shared table engine (waCampaignsTable — DUNCIT TABLE CONTRACT v1). */
const WA_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'wa_campaign_name'],
  sortFields: {
    name: 'name',
    wa_campaign_name: 'wa_campaign_name',
    audience: 'audience',
    status: 'status',
    recipient_count: 'recipient_count',
    sent_count: 'sent_count',
    failed_count: 'failed_count',
    sent_at: 'sent_at',
    created_at: 'created_at',
  },
  filterFields: {
    audience: { type: 'enum' },
    status: { type: 'enum' },
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
  created_at: iso(doc.created_at),
});

interface SendInput {
  name?: string | null;
  wa_campaign_name?: string | null;
  audience?: WaCampaignAudience | null;
  audience_list_id?: string | null;
  template_params?: (string | null)[] | null;
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

/** Validate what the portal sent, resolving the campaign name against the saved
 * list so a send can only ever use a name somebody deliberately added. */
async function validateSendInput(input: SendInput) {
  const name = str(input.name);
  if (name.length < 3) throw badInput('Give this campaign a name of at least 3 characters');
  const waCampaignName = str(input.wa_campaign_name);
  const known = await WaCampaignNameModel.findOne({ name: waCampaignName });
  if (!known) throw badInput('Pick a WhatsApp campaign name from the list');
  const audience = input.audience === 'AUDIENCE_LIST' ? 'AUDIENCE_LIST' : 'ALL_USERS';
  const audienceListId = str(input.audience_list_id);
  if (audience === 'AUDIENCE_LIST' && !Types.ObjectId.isValid(audienceListId)) {
    throw badInput('Pick the audience list to send to');
  }
  const templateParams = (input.template_params ?? []).map(str);
  if (templateParams.some((param) => !param)) {
    throw badInput('Fill every template parameter before sending');
  }
  assertKnownTokens(templateParams);
  return {
    name,
    wa_campaign_name: waCampaignName,
    audience: audience as WaCampaignAudience,
    audience_list_id: audience === 'AUDIENCE_LIST' ? audienceListId : null,
    template_params: templateParams,
    scheduled_at: parseSchedule(input.scheduled_at),
  };
}

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
    const users = await recipientUsers(doc.audience as WaCampaignAudience, doc.audience_list_id);
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

  reach: (audience: WaCampaignAudience, audienceListId?: string | null) =>
    countReachable(audience, audienceListId),

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

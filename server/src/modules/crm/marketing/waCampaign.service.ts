import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import { isAisensyConfigured } from '@modules/platform/aisensy/aisensy.gateway';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { WaCampaignModel, type WaCampaignAudience } from './waCampaign.model';
import { WaCampaignNameModel } from './waCampaignName.model';
import {
  assertKnownTokens,
  countReachable,
  destinationFor,
  fillParam,
  recipientUsers,
  userNameFor,
  WA_VARIABLES,
} from './waCampaign.recipients';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });
const notFound = () => new GraphQLError('Campaign not found', { extensions: { code: 'NOT_FOUND' } });

/** Progress is written every this many recipients so a long send shows movement
 * in the table instead of jumping from 0 to done. */
const PROGRESS_EVERY = 20;
/** A send that fails for everybody must not grow the document unbounded. */
const MAX_FAILURES_KEPT = 20;

const str = (v: unknown) => String(v ?? '').trim();
const iso = (d?: Date | null) => (d ? d.toISOString() : null);

const toPub = (doc: any) => ({
  campaign_id: doc.campaign_id,
  name: doc.name,
  wa_campaign_name: doc.wa_campaign_name,
  audience: doc.audience,
  audience_list_id: doc.audience_list_id ? String(doc.audience_list_id) : null,
  template_params: doc.template_params ?? [],
  status: doc.status,
  recipient_count: doc.recipient_count,
  sent_count: doc.sent_count,
  failed_count: doc.failed_count,
  skipped_count: doc.skipped_count,
  failures: doc.failures ?? [],
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

interface SendInput {
  name?: string | null;
  wa_campaign_name?: string | null;
  audience?: WaCampaignAudience | null;
  audience_list_id?: string | null;
  template_params?: (string | null)[] | null;
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
  };
}

type Outcome = 'sent' | 'skipped' | 'failed';

/** Send to one recipient. A missing number or an empty variable is a skip, not
 * a failure: nothing was attempted and nothing was billed. */
async function deliver(doc: any, user: Record<string, any>): Promise<Outcome> {
  const destination = destinationFor(user);
  const userName = userNameFor(user);
  if (!destination || !userName) return 'skipped';
  const params = doc.template_params.map((param: string) => fillParam(param, user));
  if (params.some((param: string | null) => param === null)) return 'skipped';
  try {
    await aisensyService.send({
      campaign_name: doc.wa_campaign_name,
      destination,
      user_name: userName,
      template_params: params,
    });
    return 'sent';
  } catch (e: any) {
    if (doc.failures.length < MAX_FAILURES_KEPT) {
      doc.failures.push({ destination, reason: str(e?.message) || 'Send failed' });
    }
    return 'failed';
  }
}

const COUNTER_OF: Record<Outcome, 'sent_count' | 'skipped_count' | 'failed_count'> = {
  sent: 'sent_count',
  skipped: 'skipped_count',
  failed: 'failed_count',
};

/**
 * Walk the audience one recipient at a time. Sequential on purpose: AiSensy
 * rate-limits the campaign API, and one in-flight message keeps a large send
 * well inside that limit without any throttling machinery.
 */
async function runSend(campaignId: string) {
  const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
  if (!doc) return;
  try {
    const users = await recipientUsers(doc.audience as WaCampaignAudience, doc.audience_list_id);
    doc.recipient_count = users.length;
    await doc.save();
    for (const [index, user] of users.entries()) {
      const outcome = await deliver(doc, user);
      doc[COUNTER_OF[outcome]] += 1;
      if (index % PROGRESS_EVERY === PROGRESS_EVERY - 1) await doc.save();
    }
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

export const waCampaignService = {
  /** Whether the Tech portal's AiSensy API key is in place — the portal warns
   * instead of letting a send fail once per recipient. */
  configured: () => isAisensyConfigured(),

  variables: () => WA_VARIABLES.map(({ name, description }) => ({ name, description })),

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
      status: 'SENDING',
      created_by: userId ?? null,
    });
    runSend(doc.campaign_id).catch((e) =>
      logs.server.error('waCampaign', 'send', { error: e, campaign_id: doc.campaign_id })
    );
    return toPub(doc);
  },

  async remove(campaignId: string) {
    const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).exec();
    if (!doc) throw notFound();
    if (doc.status === 'SENDING') {
      throw badInput('That campaign is sending right now — wait for it to finish');
    }
    await doc.deleteOne();
    return true;
  },
};

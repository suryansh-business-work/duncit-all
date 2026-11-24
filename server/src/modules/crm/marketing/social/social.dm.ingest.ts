import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { IgLeadModel } from '../igLeads/igLead.model';
import { setStatus as setIgLeadStatus } from '../igLeads/igLead.outreach';
import { CLOSED_STATUSES, type IgLeadStatus } from '../igLeads/igLead.types';
import { handleKey } from '../leads/marketingLead.keys';
import { MarketingLeadModel } from '../leads/marketingLead.model';
import { outreachInstagramReply } from '../outreach/outreach.inbound';
import { SocialConversationModel, SocialMessageModel } from './social.conversation.model';
import { isKeyword, loadSocialSettings, type SocialSettings } from './social.settings';
import type { SocialMessageDirection, SocialPlatform } from './social.types';

/**
 * One direct message, however it reached us — a webhook, the backfill, the
 * echo of our own send — stored exactly once in its conversation.
 *
 * The conversation is created on its first message (assigned per Settings);
 * an inbound message reopens a conversation that was answered or done (never
 * one marked spam), moves the messaging window, counts as unread, and asks
 * the AI to read it again. A stop or start keyword flips the person's opt-out,
 * and an inbound DM from a lead's handle is that lead replying.
 */
export interface IncomingDm {
  account_id: string;
  platform: SocialPlatform;
  participant_id: string;
  direction: SocialMessageDirection;
  external_id: string;
  text: string;
  attachments?: { type: string; url: string }[];
  sent_at: Date;
  external_thread_id?: string;
  /** Who sent an outbound message from Duncit; empty for one sent in the network's own app. */
  sent_by_user_id?: string;
  sent_by_name?: string;
  automation_rule_id?: string;
  tag?: string;
}

export interface RecordedDm {
  conversation_id: string;
  /** The conversation was made by this message. */
  created: boolean;
  /** The message was already stored (a webhook retry, the echo of our own send). */
  duplicate: boolean;
}

const DUPLICATE_KEY = 11000;
const isDuplicate = (error: unknown) => (error as { code?: number } | null)?.code === DUPLICATE_KEY;

async function conversationFor(dm: IncomingDm, settings: SocialSettings) {
  const assignee = settings.default_assignee_user_id && Types.ObjectId.isValid(settings.default_assignee_user_id) ? settings.default_assignee_user_id : null;
  const before = await SocialConversationModel.findOneAndUpdate(
    { account_id: dm.account_id, 'participant.external_id': dm.participant_id },
    {
      $setOnInsert: { platform: dm.platform, participant: { external_id: dm.participant_id }, assigned_user_id: assignee },
      ...(dm.external_thread_id ? { $set: { external_thread_id: dm.external_thread_id } } : {}),
    },
    { upsert: true, returnDocument: 'before', projection: { _id: 1 } }
  ).lean();
  if (before) return { id: String(before._id), created: false };
  const made = await SocialConversationModel.findOne({ account_id: dm.account_id, 'participant.external_id': dm.participant_id }).select('_id').lean();
  return { id: String(made?._id), created: true };
}

async function storeMessage(conversationId: string, dm: IncomingDm): Promise<boolean> {
  try {
    await SocialMessageModel.create({
      conversation_id: conversationId,
      account_id: dm.account_id,
      external_id: dm.external_id,
      direction: dm.direction,
      text: dm.text,
      attachments: dm.attachments ?? [],
      sent_at: dm.sent_at,
      status: dm.direction === 'IN' ? 'RECEIVED' : 'SENT',
      sent_by_user_id: dm.sent_by_user_id ?? '',
      sent_by_name: dm.sent_by_name ?? '',
      automation_rule_id: dm.automation_rule_id ?? '',
      tag: dm.tag ?? '',
    });
    return true;
  } catch (error) {
    if (isDuplicate(error)) return false;
    throw error;
  }
}

/** Move the conversation's clocks and counters for one new message — each as its own guarded update, so two at once cannot undo each other. */
async function touch(conversationId: string, dm: IncomingDm, settings: SocialSettings): Promise<void> {
  const id = new Types.ObjectId(conversationId);
  const preview = dm.text || (dm.attachments?.length ? `[${dm.attachments[0].type}]` : '');
  await SocialConversationModel.updateOne(
    { _id: id, $or: [{ last_message_at: null }, { last_message_at: { $lte: dm.sent_at } }] },
    { $set: { last_message_at: dm.sent_at, last_message_text: preview.slice(0, 500) } }
  );
  if (dm.direction !== 'IN') return;
  const triage = settings.auto_triage ? { ai_status: 'PENDING' } : {};
  await SocialConversationModel.updateOne({ _id: id }, { $max: { last_inbound_at: dm.sent_at }, $inc: { unread_count: 1 }, $set: triage });
  await SocialConversationModel.updateOne({ _id: id, status: { $in: ['REPLIED', 'DONE'] } }, { $set: { status: 'OPEN' } });
}

/** STOP / START, exactly as the settings list them. */
async function applyKeywords(conversationId: string, text: string, settings: SocialSettings): Promise<boolean | null> {
  if (isKeyword(text, settings.opt_out_keywords)) {
    await SocialConversationModel.updateOne({ _id: conversationId }, { $set: { opted_out: true } });
    return true;
  }
  if (isKeyword(text, settings.opt_in_keywords)) {
    await SocialConversationModel.updateOne({ _id: conversationId }, { $set: { opted_out: false } });
    return false;
  }
  return null;
}

/**
 * The person wrote back: an Instagram Lead still waiting is marked Replied,
 * a Marketing lead's sequence stops (or ends opted out), and the conversation
 * remembers both so the Inbox can show them.
 */
export async function linkDmToLeads(conversationId: string, username: string, optedOut: boolean): Promise<void> {
  const handle = handleKey(username);
  if (!handle) return;
  const [igLead, marketingLead] = await Promise.all([
    IgLeadModel.findOne({ username: handle }).select('_id status').lean(),
    MarketingLeadModel.findOne({ instagram_handle: handle }).select('_id').lean(),
  ]);
  if (igLead && !CLOSED_STATUSES.includes(igLead.status as IgLeadStatus)) await setIgLeadStatus(String(igLead._id), 'REPLIED');
  if (marketingLead) await outreachInstagramReply(handle, optedOut);
  if (igLead || marketingLead) {
    await SocialConversationModel.updateOne(
      { _id: conversationId },
      { $set: { ig_lead_id: igLead?._id ?? null, marketing_lead_id: marketingLead?._id ?? null } }
    );
  }
}

export async function recordDm(dm: IncomingDm): Promise<RecordedDm> {
  const settings = await loadSocialSettings();
  const conversation = await conversationFor(dm, settings);
  const stored = await storeMessage(conversation.id, dm);
  if (!stored) return { conversation_id: conversation.id, created: conversation.created, duplicate: true };
  await touch(conversation.id, dm, settings);
  if (dm.direction === 'IN') {
    const optedOut = await applyKeywords(conversation.id, dm.text, settings);
    if (settings.link_dms_to_leads) {
      const known = await SocialConversationModel.findById(conversation.id).select('participant.username opted_out').lean();
      const username = known?.participant?.username ?? '';
      if (username) {
        await linkDmToLeads(conversation.id, username, optedOut ?? known?.opted_out ?? false).catch((error: unknown) =>
          logs.server.warn('social-inbox', 'linkDmToLeads', { error, conversation_id: conversation.id })
        );
      }
    }
  }
  return { conversation_id: conversation.id, created: conversation.created, duplicate: false };
}

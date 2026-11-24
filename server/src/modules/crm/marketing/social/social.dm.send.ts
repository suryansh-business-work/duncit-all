import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { userActor, withRun, type RunActor } from '../runs/marketingRun.service';
import { READERS } from './providers';
import { messagingPageOf, sendPageMessage } from './providers/meta.messaging';
import { SocialConversationModel, SocialMessageModel, type SocialConversationDoc } from './social.conversation.model';
import { socialCredentials } from './social.credentials';
import { recordDm } from './social.dm.ingest';
import { mapSendError } from './social.errors';
import { SocialAccountModel } from './social.model';
import { freshHandle, type AccountWithTokens } from './social.sync';
import type { SocialAppCredentials } from './social.types';
import { DM_LIMIT, messagingWindow, missingDmPermission, sendTerms, type SendTerms } from './social.window';

/**
 * A direct message from the Inbox (or an auto-reply rule), checked on the
 * server before anything goes: the conversation exists, the text fits, the
 * person has not opted out of automation, Meta's window allows it (social.window.ts
 * — never a cold DM), the account holds the messaging permission and is linked
 * to a Page, and no other send to this conversation is in flight. Every send
 * is a MarketingRun (Activity shows who sent what and what Meta said); the
 * message is kept in the thread whichever way it went, without a token.
 */
/** A send stuck longer than this (a crash mid-send) no longer blocks the next one. */
const LOCK_MS = 2 * 60_000;

export interface DmSender {
  user?: { id: string; email?: string | null };
  /** Set when an auto-reply rule sends: automation never uses the human-agent window and never writes to an opted-out person. */
  automation_rule_id?: string;
}

function refuse(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

interface Prepared {
  conversation: SocialConversationDoc;
  account: AccountWithTokens;
  terms: SendTerms;
  creds: SocialAppCredentials;
}

async function prepare(id: string, text: string, sender: DmSender): Promise<Prepared> {
  const conversation = isValidObjectId(id) ? await SocialConversationModel.findById(id).lean<SocialConversationDoc>() : null;
  if (!conversation) refuse('NOT_FOUND', 'Conversation not found');
  if (!text) refuse('BAD_USER_INPUT', 'Write the message first.');
  const limit = DM_LIMIT[conversation.platform] ?? 1000;
  if ([...text].length > limit) refuse('BAD_USER_INPUT', `A message on ${conversation.platform} is at most ${limit} characters.`);
  const automated = Boolean(sender.automation_rule_id);
  if (automated && conversation.opted_out) refuse('OPTED_OUT', 'This person opted out of automated messages.');
  const terms = sendTerms(messagingWindow(conversation.last_inbound_at), automated);
  if (!terms) {
    refuse('WINDOW_CLOSED', automated
      ? 'Automated replies only go within 24 hours of the person’s last message.'
      : 'The messaging window is closed: replies go only within 7 days of the person’s last message, and never to someone who has not written.');
  }
  const account = await SocialAccountModel.findById(conversation.account_id).select('+access_token +refresh_token').lean<AccountWithTokens>();
  if (!account) refuse('NOT_FOUND', 'Social account not found');
  if (account.status === 'EXPIRED') refuse('BAD_USER_INPUT', 'This account needs reconnecting in Social Accounts before it can send messages.');
  const missing = missingDmPermission(account);
  if (missing) refuse('NOT_CONFIGURED', `Sending messages needs the ${missing} permission. Reconnect the account to grant it.`);
  if (!messagingPageOf({ ...account, meta: (account.meta ?? {}) as Record<string, string> })) {
    refuse('NOT_CONFIGURED', 'Messaging needs this Instagram account to be linked to a Facebook Page. Link it in Meta, then reconnect.');
  }
  const creds = await socialCredentials(account.provider);
  if (!creds) refuse('NOT_CONFIGURED', 'This network’s app is not set up yet — add it under Marketing › Settings › Integrations.');
  return { conversation, account, terms, creds };
}

async function lock(id: string): Promise<boolean> {
  const stale = new Date(Date.now() - LOCK_MS);
  const taken = await SocialConversationModel.updateOne(
    { _id: id, $or: [{ reply_lock_at: null }, { reply_lock_at: { $lt: stale } }] },
    { $set: { reply_lock_at: new Date() } }
  );
  return taken.modifiedCount > 0;
}

async function actorOf(sender: DmSender): Promise<RunActor> {
  if (sender.user) return userActor(sender.user);
  return { kind: 'AGENT', name: 'Auto-reply' };
}

async function deliver(prepared: Prepared, text: string, actor: RunActor) {
  const { conversation, account, terms, creds } = prepared;
  const who = conversation.participant.username || conversation.participant.name || 'a person';
  return withRun(
    { workflow: 'INBOX_REPLY', name: `Message to ${who} on ${account.platform}`, actor, links: { account_id: String(account._id) } },
    (run) =>
      run.step(
        'message',
        `Direct message · ${account.name || account.handle || String(account._id)}`,
        async () => {
          const handle = await freshHandle(account, READERS[account.platform], creds);
          return sendPageMessage(handle, { id: conversation.participant.external_id }, { text, ...terms }, creds);
        },
        { tool: `${account.platform.toLowerCase()}.message`, input_summary: text.slice(0, 200), summarize: (result) => result.external_id }
      )
  );
}

/**
 * Send, or keep the failure and refuse with Meta's reason in plain words. Everything
 * that could refuse was checked in prepare(); what fails here is the network's
 * answer (or no answer). A dead token marks the account for reconnecting.
 */
async function deliverOrRefuse(prepared: Prepared, text: string, actor: RunActor, keepFailure: (message: string) => Promise<void>) {
  try {
    return await deliver(prepared, text, actor);
  } catch (error) {
    const mapped = mapSendError(error);
    if (mapped.reconnect) {
      await SocialAccountModel.updateOne({ _id: prepared.account._id }, { $set: { status: 'EXPIRED', last_error: mapped.message } });
    }
    await keepFailure(mapped.message);
    return refuse('SEND_FAILED', `The message was not sent — ${mapped.message}`);
  }
}

export async function sendDirectMessage(id: string, rawText: string, sender: DmSender) {
  const text = rawText.trim();
  const prepared = await prepare(id, text, sender);
  if (!(await lock(id))) refuse('CONFLICT', 'A message to this person is already being sent.');
  const actor = await actorOf(sender);
  const base = {
    account_id: String(prepared.account._id),
    platform: prepared.conversation.platform,
    participant_id: prepared.conversation.participant.external_id,
    direction: 'OUT' as const,
    text,
    sent_by_user_id: actor.id ?? '',
    sent_by_name: actor.name ?? '',
    automation_rule_id: sender.automation_rule_id ?? '',
    tag: prepared.terms.tag,
  };
  try {
    const sent = await deliverOrRefuse(prepared, text, actor, async (message) => {
      await SocialMessageModel.create({ ...base, conversation_id: id, external_id: '', sent_at: new Date(), status: 'FAILED', error: message });
    });
    // Stored under Meta's id, so the echo the webhook brings back is the same message.
    await recordDm({ ...base, external_id: sent.external_id, sent_at: new Date() });
    await SocialConversationModel.updateOne({ _id: id }, { $set: { status: 'REPLIED', unread_count: 0 } });
  } finally {
    await SocialConversationModel.updateOne({ _id: id }, { $set: { reply_lock_at: null } });
  }
}

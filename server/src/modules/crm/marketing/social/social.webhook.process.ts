import { logs } from '@observability/log';
import { inSequence } from '@utils/in-sequence';
import { READERS } from './providers';
import { participantProfile } from './providers/meta.messaging';
import { analyzePendingComments } from './social.ai';
import { autoReplyToComment, autoReplyToDm } from './social.autoReply';
import { SocialConversationModel } from './social.conversation.model';
import { socialCredentials } from './social.credentials';
import { linkDmToLeads, recordDm } from './social.dm.ingest';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from './social.model';
import { loadSocialSettings } from './social.settings';
import { freshHandle, type AccountWithTokens } from './social.sync';
import { parseMetaWebhook, type CommentEvent, type DmEvent } from './social.webhook.parse';

/**
 * What the Meta webhook route hands off after it has answered 200: every DM
 * and comment in the payload stored (once — retries and echoes are duplicates
 * by their network id), a new person's name and picture fetched, a lead
 * replying linked, and the AI asked to read what is new. A failure on one
 * event is logged and never stops the rest; the scheduled sync reads the
 * same conversations again later, so nothing a webhook dropped is lost.
 */
const COMPONENT = 'social-webhook';

function accountFor(platform: string, externalId: string) {
  return SocialAccountModel.findOne({ platform, external_id: externalId }).select('+access_token +refresh_token').lean<AccountWithTokens>();
}

/** The person's name, username and picture, onto the conversation; the username is what leads are matched on. */
async function enrichParticipant(conversationId: string, account: AccountWithTokens, participantId: string): Promise<string> {
  const creds = await socialCredentials(account.provider);
  if (!creds) return '';
  const handle = await freshHandle(account, READERS[account.platform], creds);
  const profile = await participantProfile(handle, participantId, creds);
  await SocialConversationModel.updateOne(
    { _id: conversationId },
    { $set: { 'participant.username': profile.username, 'participant.name': profile.name, 'participant.avatar_url': profile.avatar_url } }
  );
  return profile.username;
}

async function handleDm(event: DmEvent): Promise<boolean> {
  const account = await accountFor(event.platform, event.account_external_id);
  if (!account) return false;
  const recorded = await recordDm({
    account_id: String(account._id),
    platform: event.platform,
    participant_id: event.participant_id,
    direction: event.direction,
    external_id: event.external_id,
    text: event.text,
    attachments: event.attachments,
    sent_at: event.sent_at,
  });
  if (recorded.duplicate) return false;
  if (recorded.created) await welcomeNewConversation(recorded.conversation_id, account, event);
  if (event.direction === 'IN') {
    await autoReplyToDm({
      account_id: String(account._id),
      conversation_id: recorded.conversation_id,
      external_id: event.external_id,
      text: event.text,
      first_message: recorded.created,
    }).catch((error: unknown) => logs.server.error(COMPONENT, 'autoReplyToDm', { error, conversation_id: recorded.conversation_id }));
  }
  return true;
}

/** A conversation's first message: who the person is, and whether they are a lead writing back. */
async function welcomeNewConversation(conversationId: string, account: AccountWithTokens, event: DmEvent): Promise<void> {
  const username = await enrichParticipant(conversationId, account, event.participant_id).catch((error: unknown) => {
    logs.server.warn(COMPONENT, 'participantProfile', { error, conversation_id: conversationId });
    return '';
  });
  const settings = await loadSocialSettings();
  if (event.direction === 'IN' && username && settings.link_dms_to_leads) {
    const conversation = await SocialConversationModel.findById(conversationId).select('opted_out').lean();
    await linkDmToLeads(conversationId, username, conversation?.opted_out ?? false);
  }
}

/** A comment the webhook saw before the sync did: its post is stubbed until the sync fills it in. */
async function handleComment(event: CommentEvent): Promise<boolean> {
  const account = await accountFor(event.platform, event.account_external_id);
  if (!account) return false;
  const accountId = String(account._id);
  const post = await SocialPostModel.findOneAndUpdate(
    { account_id: accountId, external_id: event.post_external_id },
    { $setOnInsert: { platform: event.platform, published_at: event.published_at } },
    { upsert: true, returnDocument: 'after', projection: { _id: 1, permalink: 1 } }
  ).lean();
  if (!post) return false;
  const stored = await SocialCommentModel.updateOne(
    { account_id: accountId, external_id: event.external_id },
    {
      $setOnInsert: {
        post_id: String(post._id),
        platform: event.platform,
        author_name: event.author_name,
        author_handle: event.author_handle,
        author_id: event.author_id,
        text: event.text,
        permalink: post.permalink ?? '',
        published_at: event.published_at,
        last_activity_at: event.published_at,
      },
    },
    { upsert: true }
  );
  if (stored.upsertedCount === 0) return false;
  await autoReplyToComment({
    account_id: accountId,
    comment_id: String(stored.upsertedId),
    external_id: event.external_id,
    text: event.text,
  }).catch((error: unknown) => logs.server.error(COMPONENT, 'autoReplyToComment', { error, external_id: event.external_id }));
  return true;
}

/** One AI pass at a time per process: a burst of webhooks leaves the rest to the pass already running. */
let triaging = false;
async function triage(): Promise<void> {
  if (triaging) return;
  triaging = true;
  try {
    await analyzePendingComments();
  } finally {
    triaging = false;
  }
}

export async function processMetaWebhook(payload: unknown): Promise<{ dms: number; comments: number }> {
  // In the order Meta sent them: two messages from one person in one delivery must be stored oldest first.
  const handled = await inSequence(parseMetaWebhook(payload), async (event) => {
    try {
      return (event.kind === 'DM' ? await handleDm(event) : await handleComment(event)) ? event.kind : null;
    } catch (error) {
      logs.server.error(COMPONENT, 'event', { error, kind: event.kind, platform: event.platform, external_id: event.external_id });
      return null;
    }
  });
  const dms = handled.filter((kind) => kind === 'DM').length;
  const comments = handled.filter((kind) => kind === 'COMMENT').length;
  if (comments > 0 && (await loadSocialSettings()).auto_triage) {
    triage().catch((error: unknown) => logs.server.error(COMPONENT, 'triage', { error }));
  }
  return { dms, comments };
}

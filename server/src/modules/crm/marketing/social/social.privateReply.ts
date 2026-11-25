import { isValidObjectId } from 'mongoose';
import { withRun } from '../runs/marketingRun.service';
import { READERS } from './providers';
import { sendPageMessage } from './providers/meta.messaging';
import { SocialConversationModel } from './social.conversation.model';
import { actorOf, messagingAccount, refuse, sendFailure, type DmSender } from './social.dm.send';
import { SocialCommentModel } from './social.model';
import { freshHandle } from './social.sync';
import { DM_LIMIT } from './social.window';

/**
 * A private reply: one DM to the person who left a comment, sent through the
 * comment (Meta's rule — the commenter has not written to the account, so this
 * is the only DM it may start, once per comment, within 7 days of it).
 * Automation (comment-to-DM) is held tighter: within 24 hours of the comment,
 * and never to someone who opted out. Every send is a MarketingRun.
 */
const DAY_MS = 86_400_000;
const PERSON_WINDOW_MS = 7 * DAY_MS;
const AUTOMATION_WINDOW_MS = DAY_MS;
const PRIVATE_REPLY_PLATFORMS = new Set(['FACEBOOK', 'INSTAGRAM']);

interface CommentForReply {
  _id: unknown;
  account_id: string;
  platform: string;
  external_id: string;
  author_id?: string | null;
  author_handle?: string | null;
  author_name?: string | null;
  published_at: Date;
  private_reply_at?: Date | null;
}

/** Whether the commenter sent a stop keyword in a DM to this account (by their id, or their handle on Instagram). */
async function commenterOptedOut(comment: CommentForReply): Promise<boolean> {
  const who = [
    ...(comment.author_id ? [{ 'participant.external_id': comment.author_id }] : []),
    ...(comment.author_handle ? [{ 'participant.username': comment.author_handle }] : []),
  ];
  if (who.length === 0) return false;
  const found = await SocialConversationModel.exists({ account_id: comment.account_id, opted_out: true, $or: who });
  return Boolean(found);
}

async function loadComment(id: string, text: string, sender: DmSender, now: number): Promise<CommentForReply> {
  const comment = isValidObjectId(id) ? await SocialCommentModel.findById(id).lean<CommentForReply>() : null;
  if (!comment) refuse('NOT_FOUND', 'Comment not found');
  if (!PRIVATE_REPLY_PLATFORMS.has(comment.platform)) refuse('BAD_USER_INPUT', `${comment.platform} has no private replies.`);
  if (!text) refuse('BAD_USER_INPUT', 'Write the message first.');
  const limit = DM_LIMIT[comment.platform as keyof typeof DM_LIMIT] ?? 1000;
  if ([...text].length > limit) refuse('BAD_USER_INPUT', `A message on ${comment.platform} is at most ${limit} characters.`);
  if (comment.private_reply_at) refuse('CONFLICT', 'This commenter already had a private reply — Meta allows one per comment.');
  const automated = Boolean(sender.automation_rule_id);
  const age = now - comment.published_at.getTime();
  if (age > (automated ? AUTOMATION_WINDOW_MS : PERSON_WINDOW_MS)) {
    refuse('WINDOW_CLOSED', automated
      ? 'Automated private replies only go within 24 hours of the comment.'
      : 'A private reply goes only within 7 days of the comment.');
  }
  if (automated && (await commenterOptedOut(comment))) refuse('OPTED_OUT', 'This person opted out of automated messages.');
  return comment;
}

export async function sendPrivateReply(commentId: string, rawText: string, sender: DmSender, now = Date.now()): Promise<{ external_id: string }> {
  const text = rawText.trim();
  const comment = await loadComment(commentId, text, sender, now);
  const { account, creds } = await messagingAccount(comment.account_id);
  // Claimed before sending, so two presses (or a rule and a person) cannot both send one.
  const claimed = await SocialCommentModel.updateOne({ _id: commentId, private_reply_at: null }, { $set: { private_reply_at: new Date(now) } });
  if (claimed.modifiedCount === 0) refuse('CONFLICT', 'This commenter already had a private reply — Meta allows one per comment.');
  const actor = await actorOf(sender);
  const who = comment.author_handle || comment.author_name || 'a commenter';
  try {
    return await withRun(
      {
        workflow: 'INBOX_REPLY',
        name: `Private reply to ${who} on ${account.platform}`,
        actor,
        links: { account_id: String(account._id) },
        ...(sender.parent_run_id ? { parent_run_id: sender.parent_run_id } : {}),
      },
      (run) =>
        run.step(
          'private-reply',
          `Private reply · ${account.name || account.handle || String(account._id)}`,
          async () => {
            const handle = await freshHandle(account, READERS[account.platform], creds);
            return sendPageMessage(handle, { comment_id: comment.external_id }, { text, messaging_type: 'RESPONSE', tag: '' }, creds);
          },
          { tool: `${account.platform.toLowerCase()}.private_reply`, input_summary: text.slice(0, 200), summarize: (result) => result.external_id }
        )
    );
  } catch (error) {
    // Not sent: the comment may still have its one private reply.
    await SocialCommentModel.updateOne({ _id: commentId }, { $set: { private_reply_at: null } });
    const message = await sendFailure(account, error);
    return refuse('SEND_FAILED', `The private reply was not sent — ${message}`);
  }
}

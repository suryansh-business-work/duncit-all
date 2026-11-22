import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { askDuncitActions, pubAction } from '../actions/askDuncit.actions';
import type { IAskDuncitAction } from '../actions/askDuncitAction.model';
import { HARD_LIMITS } from '../askDuncit.constants';
import { recordAudit, type AuditActor } from '../audit/askDuncitAudit.service';
import { turnRegistry } from '../turn/askDuncit.stream';
import { AskDuncitConversationModel, type IAskDuncitConversation } from './askDuncitConversation.model';
import { AskDuncitMessageModel, FEEDBACK_RATINGS, type FeedbackRating, type IAskDuncitMessage } from './askDuncitMessage.model';

/**
 * The person's own Ask Duncit history. Every read and write is scoped by
 * `user_id` — another person's conversation answers NOT_FOUND, never FORBIDDEN,
 * so ids cannot even be probed.
 */

const STUCK_MS = 5 * 60 * 1000;
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const notFound = (what: string) => new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });

export const pubConversation = (c: IAskDuncitConversation) => ({
  id: String(c._id),
  title: c.title,
  role_key: c.role_key,
  status: c.status,
  surface: c.surface,
  message_count: c.message_count,
  last_message_at: iso(c.last_message_at),
  last_message_preview: c.last_message_preview,
  generating: c.generating,
  handover_team: c.handover_team,
  handover_ticket_id: c.handover_ticket_id,
  created_at: iso(c.created_at),
});

/** A message whose turn died with the process is shown as failed, not typing forever. */
function liveStatus(m: IAskDuncitMessage): string {
  if (m.status !== 'STREAMING') return m.status;
  const old = Date.now() - m.created_at.getTime() > STUCK_MS;
  return old && !turnRegistry.isRunning(String(m._id)) ? 'FAILED' : 'STREAMING';
}

export const pubMessage = (m: IAskDuncitMessage, actions: ReadonlyMap<string, IAskDuncitAction>) => ({
  id: String(m._id),
  conversation_id: String(m.conversation_id),
  role: m.role,
  content: m.content,
  status: liveStatus(m),
  attachments: m.attachments ?? [],
  tool_calls: (m.tool_calls ?? []).map((c) => ({ name: c.name, title: c.title, risk: c.risk, status: c.status, action_id: c.action_id })),
  actions: (m.action_ids ?? []).flatMap((id) => {
    const action = actions.get(id);
    return action ? [pubAction(action)] : [];
  }),
  knowledge_refs: m.knowledge_refs ?? [],
  confidence: m.confidence,
  low_confidence: m.low_confidence,
  out_of_context: m.out_of_context,
  feedback_rating: m.feedback?.rating ?? null,
  error_code: m.error_code || null,
  created_at: m.created_at.toISOString(),
});

async function withActions(userId: string, rows: IAskDuncitMessage[]) {
  const actions = await askDuncitActions.byIds(userId, rows.flatMap((m) => m.action_ids ?? []));
  const byId = new Map(actions.map((a) => [String(a._id), a]));
  return rows.map((m) => pubMessage(m, byId));
}

async function ownedConversation(userId: string, id: string): Promise<IAskDuncitConversation> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Conversation');
  const conv = await AskDuncitConversationModel.findOne({ _id: id, user_id: userId, deleted_at: null }).lean<IAskDuncitConversation>();
  if (!conv) throw notFound('Conversation');
  return conv;
}

export const askDuncitConversations = {
  /** Newest first, by `last_message_at`; `before` is the last item's timestamp. */
  async list(userId: string, opts: { before?: string | null; limit?: number | null; search?: string | null }) {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
    const filter: Record<string, unknown> = { user_id: userId, deleted_at: null };
    if (opts.before) filter.last_message_at = { $lt: new Date(opts.before) };
    const search = opts.search?.trim();
    if (search) filter.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`).slice(0, 80), 'i');
    const rows = await AskDuncitConversationModel.find(filter).sort({ last_message_at: -1 }).limit(limit + 1).lean<IAskDuncitConversation[]>();
    return { items: rows.slice(0, limit).map(pubConversation), has_more: rows.length > limit };
  },

  async get(userId: string, id: string) {
    return pubConversation(await ownedConversation(userId, id));
  },

  /** A page of messages, oldest→newest; `before` (a message id) loads the page before it. */
  async messages(userId: string, conversationId: string, opts: { before?: string | null; limit?: number | null }) {
    await ownedConversation(userId, conversationId);
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    const filter: Record<string, unknown> = { conversation_id: new Types.ObjectId(conversationId), user_id: userId };
    if (opts.before && Types.ObjectId.isValid(opts.before)) filter._id = { $lt: new Types.ObjectId(opts.before) };
    const rows = await AskDuncitMessageModel.find(filter).sort({ _id: -1 }).limit(limit + 1).lean<IAskDuncitMessage[]>();
    const page = rows.slice(0, limit).reverse();
    return { items: await withActions(userId, page), has_more: rows.length > limit };
  },

  async message(userId: string, messageId: string) {
    if (!Types.ObjectId.isValid(messageId)) throw notFound('Message');
    const row = await AskDuncitMessageModel.findOne({ _id: messageId, user_id: userId }).lean<IAskDuncitMessage>();
    if (!row) throw notFound('Message');
    return (await withActions(userId, [row]))[0];
  },

  async rename(userId: string, id: string, title: string) {
    const clean = String(title ?? '').trim().slice(0, HARD_LIMITS.conversationTitleChars);
    if (!clean) throw new GraphQLError('A title is required', { extensions: { code: 'BAD_USER_INPUT' } });
    await ownedConversation(userId, id);
    const doc = await AskDuncitConversationModel.findOneAndUpdate({ _id: id, user_id: userId }, { $set: { title: clean } }, { new: true }).lean<IAskDuncitConversation>();
    if (!doc) throw notFound('Conversation');
    return pubConversation(doc);
  },

  /** Hidden from the person's history; the audit trail is unaffected. */
  async remove(userId: string, id: string) {
    await ownedConversation(userId, id);
    await AskDuncitConversationModel.updateOne({ _id: id, user_id: userId }, { $set: { deleted_at: new Date(), status: 'ARCHIVED' } });
    return true;
  },

  async removeAll(userId: string) {
    await AskDuncitConversationModel.updateMany({ user_id: userId, deleted_at: null }, { $set: { deleted_at: new Date(), status: 'ARCHIVED' } });
    return true;
  },

  async feedback(actor: AuditActor & { user_id: string }, messageId: string, rating: FeedbackRating, comment: string | null | undefined) {
    if (!(FEEDBACK_RATINGS as readonly string[]).includes(rating)) throw new GraphQLError('Invalid rating', { extensions: { code: 'BAD_USER_INPUT' } });
    if (!Types.ObjectId.isValid(messageId)) throw notFound('Message');
    const before = await AskDuncitMessageModel.findOne({ _id: messageId, user_id: actor.user_id, role: 'assistant' }).lean<IAskDuncitMessage>();
    if (!before) throw notFound('Message');
    const text = String(comment ?? '').trim().slice(0, 1000);
    await AskDuncitMessageModel.updateOne(
      { _id: before._id },
      { $set: { feedback: { rating, comment: text, at: new Date(), review_status: 'PENDING', reviewed_by: null, reviewed_at: null, review_note: '' } } }
    );
    const inc: Record<string, number> = { [rating === 'UP' ? 'thumbs_up' : 'thumbs_down']: 1 };
    if (before.feedback?.rating && before.feedback.rating !== rating) inc[before.feedback.rating === 'UP' ? 'thumbs_up' : 'thumbs_down'] = -1;
    if (before.feedback?.rating !== rating) await AskDuncitConversationModel.updateOne({ _id: before.conversation_id }, { $inc: inc });
    await recordAudit({ type: 'FEEDBACK', actor, conversation_id: String(before.conversation_id), message_id: messageId, reason: text, detail: { rating } });
    return this.message(actor.user_id, messageId);
  },
};

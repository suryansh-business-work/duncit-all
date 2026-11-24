import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { allUsersExist, ownerNamesOf } from '../userNames';
import { SocialConversationModel, SocialMessageModel, type SocialConversationDoc, type SocialMessageDoc } from './social.conversation.model';
import { viewFilter } from './social.inbox';
import { SocialAccountModel } from './social.model';
import type { SocialInboxStatus, SocialInboxView } from './social.types';
import { DM_LIMIT, messagingWindow, missingDmPermission } from './social.window';

/**
 * Marketing → Social → Inbox, the DM half: conversations listed, opened,
 * assigned and closed the way comments are (the same views, the same
 * statuses), and each one's thread with the state of Meta's window.
 */
const CONVERSATION_TABLE: TableEntityConfig = {
  searchFields: ['participant.username', 'participant.name', 'last_message_text'],
  sortFields: { last_message_at: 'last_message_at', unread_count: 'unread_count' },
  filterFields: {
    account_id: { type: 'enum' },
    platform: { type: 'enum' },
    status: { type: 'enum' },
    ai_status: { type: 'enum' },
    ai_sentiment: { type: 'enum' },
    ai_severity: { type: 'enum' },
    assigned_user_id: { type: 'string' },
    last_message_at: { type: 'date' },
  },
  defaultSort: { last_message_at: -1 },
};

/** The latest messages a thread shows. */
const THREAD_MESSAGES = 200;

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);
const idOrNull = (value: unknown) => (value ? String(value) : null);

function notFound(): never {
  throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
}

function pubConversation(o: SocialConversationDoc, accounts: Map<string, string>, people: Map<string, string>, now = Date.now()) {
  const window = messagingWindow(o.last_inbound_at, now);
  const assignee = idOrNull(o.assigned_user_id);
  return {
    id: String(o._id),
    account_id: o.account_id,
    account_name: accounts.get(o.account_id) ?? '',
    platform: o.platform,
    participant: { username: o.participant?.username ?? '', name: o.participant?.name ?? '', avatar_url: o.participant?.avatar_url ?? '' },
    last_message_at: iso(o.last_message_at),
    last_inbound_at: iso(o.last_inbound_at),
    last_message_text: o.last_message_text ?? '',
    unread_count: o.unread_count ?? 0,
    status: o.status,
    assigned_user_id: assignee,
    assigned_name: assignee ? people.get(assignee) ?? null : null,
    ai_status: o.ai_status,
    ai_sentiment: o.ai_sentiment ?? null,
    ai_severity: o.ai_severity ?? null,
    opted_out: Boolean(o.opted_out),
    ig_lead_id: idOrNull(o.ig_lead_id),
    marketing_lead_id: idOrNull(o.marketing_lead_id),
    window_state: window.state,
    window_closes_at: iso(window.closes_at),
  };
}

async function context(docs: SocialConversationDoc[]) {
  const ids = [...new Set(docs.map((doc) => doc.account_id))];
  const [accounts, people] = await Promise.all([
    SocialAccountModel.find({ _id: { $in: ids } }).select('name handle').lean(),
    ownerNamesOf(docs.map((doc) => ({ owner_user_id: doc.assigned_user_id }))),
  ]);
  return { accounts: new Map(accounts.map((a) => [String(a._id), a.name || a.handle || ''])), people };
}

const pubMessage = (o: SocialMessageDoc) => ({
  id: String(o._id),
  direction: o.direction,
  text: o.text ?? '',
  attachments: (o.attachments ?? []).map((item) => ({ type: item.type ?? '', url: item.url ?? '' })),
  sent_at: iso(o.sent_at),
  status: o.status,
  error: o.error ?? '',
  sent_by_name: o.sent_by_name ?? '',
  automated: Boolean(o.automation_rule_id),
  tag: o.tag ?? '',
});

/** One conversation with its thread, and what would stop a reply before it is typed. */
export async function conversationThread(id: string) {
  const doc = isValidObjectId(id) ? await SocialConversationModel.findById(id).lean<SocialConversationDoc>() : null;
  if (!doc) notFound();
  const [ctx, messages, account] = await Promise.all([
    context([doc]),
    SocialMessageModel.find({ conversation_id: id }).sort({ sent_at: -1 }).limit(THREAD_MESSAGES).lean<SocialMessageDoc[]>(),
    SocialAccountModel.findById(doc.account_id).select('platform scopes').lean(),
  ]);
  return {
    conversation: pubConversation(doc, ctx.accounts, ctx.people),
    // Read newest first to keep the latest; shown oldest first like any chat.
    messages: [...messages].reverse().map((message) => pubMessage(message)),
    missing_permission: account ? missingDmPermission(account) : 'messaging',
    max_length: DM_LIMIT[doc.platform] ?? 1000,
  };
}

async function update(id: string, set: Record<string, unknown>) {
  const updated = isValidObjectId(id) ? await SocialConversationModel.updateOne({ _id: id }, { $set: set }) : null;
  if (!updated || updated.matchedCount === 0) notFound();
  return conversationThread(id);
}

export const socialConversations = {
  async table(input: TableQueryInput | null | undefined, view: SocialInboxView | null | undefined, userId: string) {
    const { docs, total, page, page_size } = await runTableQuery<SocialConversationDoc>(SocialConversationModel, viewFilter(view, userId), input, CONVERSATION_TABLE);
    const ctx = await context(docs);
    return { rows: docs.map((doc) => pubConversation(doc, ctx.accounts, ctx.people)), total, page, page_size };
  },

  /** The same four counts as the comment queue, for DMs. */
  async summary(userId: string) {
    const [open, flagged, unassigned, mine] = await Promise.all(
      (['OPEN', 'FLAGGED', 'UNASSIGNED', 'MINE'] as const).map((view) => SocialConversationModel.countDocuments(viewFilter(view, userId)))
    );
    return { open, flagged, unassigned, mine };
  },

  async assign(id: string, userId: string | null | undefined, actorId: string) {
    const assignee = userId?.trim() || null;
    if (assignee && !(await allUsersExist([assignee]))) {
      throw new GraphQLError('The assignee is not a known user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const thread = await update(id, { assigned_user_id: assignee });
    logs.server.info('social-inbox', 'assignConversation', { conversation_id: id, assigned_user_id: assignee, by: actorId });
    return thread;
  },

  async setStatus(id: string, status: SocialInboxStatus, actorId: string) {
    const thread = await update(id, { status });
    logs.server.info('social-inbox', 'conversationStatus', { conversation_id: id, status, by: actorId });
    return thread;
  },

  /** Opening a conversation reads it. */
  markRead: (id: string) => update(id, { unread_count: 0 }),
};

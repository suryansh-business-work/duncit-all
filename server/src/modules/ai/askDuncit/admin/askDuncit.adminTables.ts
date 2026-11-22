import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { askDuncitActions, pubAction } from '../actions/askDuncit.actions';
import { maskSensitiveText } from '../audit/askDuncit.redact';
import { verifyAuditHash } from '../audit/askDuncitAudit.hash';
import { AskDuncitAuditModel, type IAskDuncitAudit } from '../audit/askDuncitAudit.model';
import { recordAudit, type AuditActor } from '../audit/askDuncitAudit.service';
import { AskDuncitConversationModel, type IAskDuncitConversation } from '../conversation/askDuncitConversation.model';
import { AskDuncitMessageModel, REVIEW_STATUSES, type IAskDuncitMessage, type ReviewStatus } from '../conversation/askDuncitMessage.model';
import { askDuncitKnowledge } from '../knowledge/askDuncit.knowledge';

/**
 * The AI portal's Ask Duncit tables. Operators read masked copies — message
 * text goes through the same sensitive-data masking as the audit trail.
 */

export const AUDIT_PRESETS = ['ALL', 'CHAT', 'OUT_OF_CONTEXT', 'VIOLATIONS', 'ACTIONS'] as const;
export type AuditPreset = (typeof AUDIT_PRESETS)[number];

const PRESET_FILTER: Readonly<Record<AuditPreset, Record<string, unknown>>> = {
  ALL: {},
  CHAT: { type: { $in: ['QUERY', 'RESPONSE', 'ERROR'] } },
  OUT_OF_CONTEXT: { type: 'OUT_OF_CONTEXT' },
  VIOLATIONS: { type: 'VIOLATION' },
  ACTIONS: { type: { $in: ['ACTION_PROPOSED', 'ACTION_APPROVED', 'ACTION_REJECTED', 'ACTION_EXECUTED', 'ACTION_FAILED', 'ACTION_ROLLED_BACK'] } },
};

const AUDIT_TABLE: TableEntityConfig = {
  searchFields: ['query', 'response', 'tool', 'reason', 'user_name', 'error_message'],
  sortFields: { created_at: 'created_at', type: 'type', role_key: 'role_key', total_tokens: 'total_tokens', latency_ms: 'latency_ms', cost_usd: 'cost_usd' },
  filterFields: {
    type: { type: 'enum' },
    severity: { type: 'enum' },
    status: { type: 'enum' },
    role_key: { type: 'enum' },
    violation_kind: { type: 'enum' },
    surface: { type: 'enum' },
    user_id: { type: 'string' },
    conversation_id: { type: 'string' },
    tool: { type: 'string' },
    model: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const CONVERSATION_TABLE: TableEntityConfig = {
  searchFields: ['title', 'last_message_preview', 'user_id'],
  sortFields: { last_message_at: 'last_message_at', created_at: 'created_at', message_count: 'message_count', cost_usd: 'cost_usd' },
  filterFields: { role_key: { type: 'enum' }, status: { type: 'enum' }, surface: { type: 'enum' }, user_id: { type: 'string' }, last_message_at: { type: 'date' } },
  defaultSort: { last_message_at: -1 },
};

const FEEDBACK_TABLE: TableEntityConfig = {
  searchFields: ['content', 'feedback.comment'],
  sortFields: { created_at: 'created_at', confidence: 'confidence' },
  filterFields: { 'feedback.rating': { type: 'enum' }, 'feedback.review_status': { type: 'enum' }, low_confidence: { type: 'boolean' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** runTableQuery hands back Mongoose documents; the mappers read plain objects. */
const plain = <T>(doc: T): T => {
  const withToObject = doc as T & { toObject?: () => T };
  return typeof withToObject.toObject === 'function' ? withToObject.toObject() : doc;
};
const LIVE_WINDOW_MS = 10 * 60 * 1000;

export const pubAudit = (a: IAskDuncitAudit) => ({ ...a, id: String(a._id), created_at: a.created_at.toISOString(), intact: verifyAuditHash(a) });

const pubConversationRow = (c: IAskDuncitConversation) => ({
  id: String(c._id),
  user_id: c.user_id,
  title: c.title,
  role_key: c.role_key,
  status: c.status,
  surface: c.surface,
  message_count: c.message_count,
  generating: c.generating,
  last_message_at: iso(c.last_message_at),
  last_message_preview: maskSensitiveText(c.last_message_preview, 200),
  out_of_context_count: c.out_of_context_count,
  violation_count: c.violation_count,
  thumbs_up: c.thumbs_up,
  thumbs_down: c.thumbs_down,
  total_tokens: c.total_tokens,
  cost_usd: c.cost_usd,
  handover_team: c.handover_team,
  handover_ticket_id: c.handover_ticket_id,
  created_at: iso(c.created_at),
});

const pubFeedbackRow = (m: IAskDuncitMessage) => ({
  id: String(m._id),
  conversation_id: String(m.conversation_id),
  user_id: m.user_id,
  content: maskSensitiveText(m.content, 1500),
  confidence: m.confidence,
  low_confidence: m.low_confidence,
  rating: m.feedback?.rating ?? null,
  comment: maskSensitiveText(m.feedback?.comment, 1000),
  review_status: m.feedback?.review_status ?? null,
  review_note: m.feedback?.review_note ?? '',
  model: m.model,
  created_at: m.created_at.toISOString(),
});

export const askDuncitAdminTables = {
  async audit(query: TableQueryInput | null | undefined, preset: AuditPreset = 'ALL') {
    const page = await runTableQuery<IAskDuncitAudit>(AskDuncitAuditModel, PRESET_FILTER[preset] ?? {}, query, AUDIT_TABLE);
    return { rows: page.docs.map((d) => pubAudit(plain(d))), total: page.total, page: page.page, page_size: page.page_size };
  },

  async conversations(query: TableQueryInput | null | undefined, live: boolean) {
    const base = live ? { $or: [{ generating: true }, { last_message_at: { $gte: new Date(Date.now() - LIVE_WINDOW_MS) } }] } : {};
    const page = await runTableQuery<IAskDuncitConversation>(AskDuncitConversationModel, base, query, CONVERSATION_TABLE);
    return { rows: page.docs.map((d) => pubConversationRow(plain(d))), total: page.total, page: page.page, page_size: page.page_size };
  },

  async conversation(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const conv = await AskDuncitConversationModel.findById(id).lean<IAskDuncitConversation>();
    if (!conv) return null;
    const [messages, events] = await Promise.all([
      AskDuncitMessageModel.find({ conversation_id: conv._id }).sort({ created_at: 1 }).limit(500).lean<IAskDuncitMessage[]>(),
      AskDuncitAuditModel.find({ conversation_id: id }).sort({ created_at: 1 }).limit(1000).lean<IAskDuncitAudit[]>(),
    ]);
    const actions = await askDuncitActions.byIds(conv.user_id, messages.flatMap((m) => m.action_ids ?? []));
    return {
      conversation: pubConversationRow(conv),
      messages: messages.map((m) => ({
        id: String(m._id),
        role: m.role,
        status: m.status,
        content: maskSensitiveText(m.content, 8000),
        tool_calls: m.tool_calls.map((c) => `${c.name}: ${c.status}`),
        model: m.model,
        tokens: m.prompt_tokens + m.completion_tokens,
        latency_ms: m.latency_ms,
        confidence: m.confidence,
        out_of_context: m.out_of_context,
        feedback_rating: m.feedback?.rating ?? null,
        attachments: m.attachments.length,
        created_at: m.created_at.toISOString(),
      })),
      actions: actions.map(pubAction),
      events: events.map(pubAudit),
    };
  },

  async feedback(query: TableQueryInput | null | undefined) {
    const page = await runTableQuery<IAskDuncitMessage>(AskDuncitMessageModel, { role: 'assistant', feedback: { $ne: null } }, query, FEEDBACK_TABLE);
    return { rows: page.docs.map((d) => pubFeedbackRow(plain(d))), total: page.total, page: page.page, page_size: page.page_size };
  },

  /**
   * Admin-reviewed feedback learning: an operator accepts or dismisses a
   * rating. Accepting with "add to knowledge" drafts a knowledge article from
   * the corrected answer — reviewed and published by a person, never learned
   * automatically.
   */
  async reviewFeedback(actor: AuditActor, messageId: string, status: ReviewStatus, note: string, addToKnowledge: boolean) {
    if (!(REVIEW_STATUSES as readonly string[]).includes(status) || status === 'PENDING') {
      throw new GraphQLError('Choose accept or dismiss', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const clean = String(note ?? '').trim().slice(0, 4000);
    const msg = await AskDuncitMessageModel.findOneAndUpdate(
      { _id: messageId, feedback: { $ne: null } },
      { $set: { 'feedback.review_status': status, 'feedback.reviewed_by': actor.user_id, 'feedback.reviewed_at': new Date(), 'feedback.review_note': clean } },
      { new: true }
    ).lean<IAskDuncitMessage>();
    if (!msg) throw new GraphQLError('Feedback not found', { extensions: { code: 'NOT_FOUND' } });
    let draftId: string | null = null;
    if (status === 'ACCEPTED' && addToKnowledge && clean.length >= 10) {
      const question = await AskDuncitMessageModel.findOne({ conversation_id: msg.conversation_id, role: 'user', created_at: { $lte: msg.created_at } })
        .sort({ created_at: -1 })
        .select('content')
        .lean<Pick<IAskDuncitMessage, 'content'>>();
      const draft = await askDuncitKnowledge.create(
        { title: maskSensitiveText(question?.content || 'Reviewed answer', 180).padEnd(3, '.'), body: clean, kind: 'ARTICLE', status: 'DRAFT', tags: ['from-feedback'] },
        actor
      );
      draftId = String(draft._id);
    }
    await recordAudit({ type: 'FEEDBACK_REVIEWED', actor, message_id: messageId, conversation_id: String(msg.conversation_id), reason: clean, detail: { status, knowledge_draft: draftId } });
    return { ...pubFeedbackRow(msg), knowledge_draft_id: draftId };
  },
};

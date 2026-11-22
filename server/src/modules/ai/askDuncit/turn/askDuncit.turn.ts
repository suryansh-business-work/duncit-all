import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import type { ViolationKind } from '../audit/askDuncitAudit.model';
import { recordAudit } from '../audit/askDuncitAudit.service';
import { AskDuncitConversationModel, type IAskDuncitConversation } from '../conversation/askDuncitConversation.model';
import { AskDuncitMessageModel } from '../conversation/askDuncitMessage.model';
import { prepareAttachments, type AttachmentInput, type PreparedAttachments } from '../files/askDuncit.files';
import { flagIds, inspectUserInput } from '../guard/askDuncit.guard';
import { supportsAttachments } from '../llm/askDuncit.providers';
import { askDuncitQuota, type QuotaRefusal } from '../quota/askDuncit.quota';
import { buildTurnContext, unavailableReason, type ContextInput, type TurnContext } from './askDuncit.context';
import { finishTurn } from './askDuncit.finish';
import { emitToUser } from './askDuncit.stream';

/**
 * Start one Ask Duncit turn. Everything that can refuse the message happens
 * here, before any model call and in this order: availability (kill switches,
 * flags) → role escalation → input → quota → injection guard → attachments.
 * The answer itself is produced after this returns (finishTurn) and streamed.
 */

export interface StartTurnInput extends ContextInput {
  message: string;
  conversationId?: string | null;
  attachments?: AttachmentInput[] | null;
}

export interface StartTurnResult {
  conversation_id: string;
  user_message_id: string;
  message_id: string;
  role_key: string;
  status: 'STREAMING' | 'BLOCKED';
}

const fail = (code: string, message: string, extra: Record<string, unknown> = {}) =>
  new GraphQLError(message, { extensions: { code, ...extra } });

export const STALE_TURN_MS = 3 * 60 * 1000;

const QUOTA_VIOLATION: Readonly<Record<QuotaRefusal, ViolationKind>> = {
  RATE_LIMIT: 'RATE_LIMIT',
  DAILY_MESSAGES: 'QUOTA_EXCEEDED',
  DAILY_TOKENS: 'QUOTA_EXCEEDED',
};

async function violation(ctx: TurnContext, kind: ViolationKind, extra: Record<string, unknown> = {}) {
  await recordAudit({ type: 'VIOLATION', violation_kind: kind, actor: ctx.actor, status: 'BLOCKED', ...extra });
}

/** The person's conversation, claimed for this turn (one answer at a time per conversation). */
async function claimConversation(ctx: TurnContext, conversationId: string | null | undefined, question: string) {
  if (conversationId) {
    if (!Types.ObjectId.isValid(conversationId)) throw fail('NOT_FOUND', 'Conversation not found');
    // A turn that died with the process leaves `generating` set; after a few
    // minutes the conversation is free again rather than locked forever.
    const stale = new Date(Date.now() - STALE_TURN_MS);
    const claimed = await AskDuncitConversationModel.findOneAndUpdate(
      { _id: conversationId, user_id: ctx.user.id, deleted_at: null, $or: [{ generating: false }, { updated_at: { $lt: stale } }] },
      { $set: { generating: true, role_key: ctx.role, surface: ctx.surface, locale: ctx.locale, page_route: ctx.page.route, entity_type: ctx.page.entity_type, entity_id: ctx.page.entity_id } },
      { new: true }
    ).lean<IAskDuncitConversation>();
    if (claimed) return claimed;
    const exists = await AskDuncitConversationModel.exists({ _id: conversationId, user_id: ctx.user.id, deleted_at: null });
    throw exists ? fail('CONFLICT', 'Wait for the current answer to finish') : fail('NOT_FOUND', 'Conversation not found');
  }
  const doc = await AskDuncitConversationModel.create({
    user_id: ctx.user.id,
    role_key: ctx.role,
    title: question.slice(0, 60),
    surface: ctx.surface,
    locale: ctx.locale,
    page_route: ctx.page.route,
    entity_type: ctx.page.entity_type,
    entity_id: ctx.page.entity_id,
    generating: true,
  });
  return doc.toObject() as IAskDuncitConversation;
}

function validateInput(ctx: TurnContext, message: string, attachments: readonly AttachmentInput[]) {
  const text = String(message ?? '').trim();
  if (!text && !attachments.length) throw fail('BAD_USER_INPUT', 'Type a message');
  if (text.length > ctx.settings.max_input_chars) {
    throw fail('BAD_USER_INPUT', `Keep the message under ${ctx.settings.max_input_chars} characters`, { reason: 'TOO_LONG' });
  }
  if (attachments.length && !ctx.settings.features.uploads) throw fail('FEATURE_DISABLED', 'Attachments are switched off');
  const model = ctx.policy.model || ctx.settings.default_model;
  if (attachments.length && !supportsAttachments(model)) throw fail('BAD_USER_INPUT', 'This assistant cannot read files right now');
  return { text, model };
}

export async function startTurn(input: StartTurnInput): Promise<StartTurnResult> {
  const ctx = await buildTurnContext(input);
  const unavailable = unavailableReason(ctx.settings, ctx.policy, ctx.flagEnabled);
  if (unavailable) throw fail('ASK_DUNCIT_UNAVAILABLE', 'Ask Duncit is unavailable right now', { reason: unavailable });
  if (ctx.roleResolution.escalation) {
    await violation(ctx, 'PRIVILEGE_ESCALATION', { severity: 'CRITICAL', status: 'DENIED', reason: `Asked for role ${ctx.roleResolution.requested}` });
  }
  const attachmentsIn = input.attachments ?? [];
  const { text, model } = validateInput(ctx, input.message, attachmentsIn);

  const quota = await askDuncitQuota.admit(ctx.user.id, ctx.policy);
  if (quota) {
    await violation(ctx, QUOTA_VIOLATION[quota], { severity: 'WARN', reason: quota });
    throw fail('ASK_DUNCIT_QUOTA', 'You have reached your Ask Duncit limit for now', { reason: quota });
  }

  const verdict = inspectUserInput(text);
  let prepared: PreparedAttachments = { stored: [], parts: [], flags: [] };
  if (!verdict.blocked && attachmentsIn.length) {
    prepared = await prepareAttachments(attachmentsIn, { maxFiles: ctx.settings.max_attachments, maxMb: ctx.settings.max_attachment_mb });
  }
  const conversation = await claimConversation(ctx, input.conversationId, verdict.text);
  const conversationId = String(conversation._id);
  const [userMsg, answer] = await AskDuncitMessageModel.create([
    { conversation_id: conversation._id, user_id: ctx.user.id, role: 'user', content: verdict.text, attachments: prepared.stored, injection_flags: flagIds(verdict.flags) },
    { conversation_id: conversation._id, user_id: ctx.user.id, role: 'assistant', status: verdict.blocked ? 'COMPLETE' : 'STREAMING', error_code: verdict.blocked ? 'INJECTION_BLOCKED' : '' },
  ]);
  const ids = { conversation_id: conversationId, message_id: String(answer._id) };
  await AskDuncitConversationModel.updateOne(
    { _id: conversation._id },
    { $inc: { message_count: 2 }, $set: { last_message_at: new Date(), last_message_preview: verdict.text.slice(0, 140) } }
  );
  await recordAudit({ type: 'QUERY', actor: ctx.actor, ...ids, query: verdict.text, status: verdict.blocked ? 'BLOCKED' : 'OK', detail: prepared.stored.length ? { attachments: prepared.stored.length } : undefined });

  if (verdict.escalation) await violation(ctx, 'PRIVILEGE_ESCALATION', { ...ids, severity: 'WARN', status: 'OK', query: verdict.text, reason: 'Claimed a role in the message' });
  if (prepared.flags.length) await violation(ctx, 'FILE_INJECTION', { ...ids, severity: 'WARN', status: 'OK', detail: { flags: prepared.flags } });
  if (verdict.blocked) {
    await violation(ctx, 'PROMPT_INJECTION', { ...ids, query: verdict.text, detail: { flags: flagIds(verdict.flags) } });
    await AskDuncitConversationModel.updateOne({ _id: conversation._id }, { $set: { generating: false }, $inc: { violation_count: 1 } });
    return { ...ids, user_message_id: String(userMsg._id), role_key: ctx.role, status: 'BLOCKED' };
  }

  emitToUser(ctx.user.id, 'start', ids);
  const userContent = prepared.parts.length ? [{ type: 'text', text: verdict.text || '(see attachment)' }, ...prepared.parts] : verdict.text;
  finishTurn({ ctx, conversation, conversationId, userMessageId: String(userMsg._id), messageId: ids.message_id, question: verdict.text, userContent, model }).catch(
    (error: unknown) => logs.server.error('askDuncit', 'finishTurn', { error, ...ids })
  );
  return { ...ids, user_message_id: String(userMsg._id), role_key: ctx.role, status: 'STREAMING' };
}

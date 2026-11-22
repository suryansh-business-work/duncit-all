import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { priceTokens } from '@modules/ai/openaiUsage/openaiUsage.service';
import { recordAudit } from '../audit/askDuncitAudit.service';
import { askDuncitMemory } from '../conversation/askDuncit.memory';
import { askDuncitConversations } from '../conversation/askDuncit.conversations';
import { AskDuncitConversationModel, type IAskDuncitConversation } from '../conversation/askDuncitConversation.model';
import { AskDuncitMessageModel, type MessageStatus } from '../conversation/askDuncitMessage.model';
import { evaluateAnswer } from '../evaluation/askDuncit.evaluation';
import { sanitizeAnswer } from '../guard/askDuncit.guard';
import { searchKnowledge } from '../knowledge/askDuncit.knowledge';
import { askDuncitQuota } from '../quota/askDuncit.quota';
import type { TurnContext } from './askDuncit.context';
import { runLoop, type LoopOutcome } from './askDuncit.loop';
import { emitToUser, turnRegistry } from './askDuncit.stream';

/**
 * Produce, store and stream one answer, then the after-work (evaluation and
 * memory). Whatever happens — a provider failure, Stop, a crash — the
 * conversation is released (`generating: false`) and the message gets a final
 * status, so the app never shows an answer stuck "typing".
 */

export interface FinishInput {
  ctx: TurnContext;
  conversation: IAskDuncitConversation;
  conversationId: string;
  userMessageId: string;
  messageId: string;
  question: string;
  userContent: unknown;
  model: string;
}

function statusOf(out: LoopOutcome): MessageStatus {
  if (out.aborted) return 'STOPPED';
  if (out.errorCode && !out.content) return 'FAILED';
  return 'COMPLETE';
}

async function persist(input: FinishInput, out: LoopOutcome, startedAt: number) {
  const { ctx, conversationId, messageId } = input;
  const { text, removed } = sanitizeAnswer(out.content);
  const status = statusOf(out);
  const { cost_usd } = await priceTokens(out.model, out.promptTokens, out.completionTokens);
  const outOfContext = Boolean(out.effects.outOfContextReason);
  await AskDuncitMessageModel.updateOne(
    { _id: new Types.ObjectId(messageId) },
    {
      $set: {
        content: text,
        status,
        tool_calls: out.toolCalls,
        action_ids: out.actionIds,
        knowledge_refs: out.knowledge.map((k) => ({ id: k.id, title: k.title })),
        model: out.model,
        prompt_tokens: out.promptTokens,
        completion_tokens: out.completionTokens,
        cost_usd,
        latency_ms: Date.now() - startedAt,
        first_token_ms: out.firstTokenMs,
        out_of_context: outOfContext,
        error_code: status === 'FAILED' ? out.errorCode ?? 'ERROR' : '',
      },
    }
  );
  await AskDuncitConversationModel.updateOne(
    { _id: new Types.ObjectId(conversationId) },
    {
      $set: { generating: false, last_message_at: new Date(), last_message_preview: (text || input.question).slice(0, 140) },
      $inc: { total_tokens: out.promptTokens + out.completionTokens, cost_usd, out_of_context_count: outOfContext ? 1 : 0 },
    }
  );
  await askDuncitQuota.addTokens(ctx.user.id, out.promptTokens + out.completionTokens);
  const ids = { conversation_id: conversationId, message_id: messageId };
  await recordAudit({
    type: status === 'FAILED' ? 'ERROR' : 'RESPONSE',
    actor: ctx.actor,
    ...ids,
    status: status === 'FAILED' ? 'FAILED' : 'OK',
    query: input.question,
    response: text,
    model: out.model,
    prompt_tokens: out.promptTokens,
    completion_tokens: out.completionTokens,
    latency_ms: Date.now() - startedAt,
    error_code: out.errorCode ?? '',
    error_message: out.errorMessage ?? '',
    detail: { tools: out.toolCalls.map((c) => `${c.name}:${c.status}`), actions: out.actionIds, stopped: out.aborted, removed_links: removed },
  });
  if (outOfContext) {
    await recordAudit({ type: 'OUT_OF_CONTEXT', actor: ctx.actor, ...ids, query: input.question, reason: out.effects.outOfContextReason });
  }
  return { status, text, outOfContext };
}

export async function finishTurn(input: FinishInput): Promise<void> {
  const { ctx, conversationId, messageId } = input;
  const startedAt = Date.now();
  const controller = turnRegistry.start(messageId, ctx.user.id);
  try {
    const knowledge = ctx.settings.features.knowledge_base ? await searchKnowledge(input.question, ctx.role, 3) : [];
    const out = await runLoop({ ...input, knowledge, signal: controller.signal });
    const { status, text, outOfContext } = await persist(input, out, startedAt);
    const message = await askDuncitConversations.message(ctx.user.id, messageId);
    if (status === 'FAILED') emitToUser(ctx.user.id, 'error', { message_id: messageId, conversation_id: conversationId, code: out.errorCode, message });
    else emitToUser(ctx.user.id, 'done', { message_id: messageId, conversation_id: conversationId, message });

    if (ctx.settings.features.evaluation && text) {
      await evaluateAnswer({
        question: input.question,
        answerId: messageId,
        conversationId,
        model: ctx.settings.evaluator_model,
        threshold: ctx.settings.low_confidence_threshold,
        flaggedByModel: outOfContext,
        actor: ctx.actor,
      });
    }
    await askDuncitMemory.maintain(conversationId, ctx.settings.history_turns);
  } catch (error) {
    logs.server.error('askDuncit', 'turn', { error, conversationId, messageId });
    await AskDuncitMessageModel.updateOne({ _id: new Types.ObjectId(messageId), status: 'STREAMING' }, { $set: { status: 'FAILED', error_code: 'INTERNAL' } });
    await recordAudit({ type: 'ERROR', actor: ctx.actor, conversation_id: conversationId, message_id: messageId, status: 'FAILED', error_code: 'INTERNAL', error_message: error instanceof Error ? error.message : String(error) });
    emitToUser(ctx.user.id, 'error', { message_id: messageId, conversation_id: conversationId, code: 'INTERNAL' });
  } finally {
    turnRegistry.finish(messageId);
    await AskDuncitConversationModel.updateOne({ _id: new Types.ObjectId(conversationId) }, { $set: { generating: false } });
  }
}

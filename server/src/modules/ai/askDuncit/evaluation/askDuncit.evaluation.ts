import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { recordAudit, type AuditActor } from '../audit/askDuncitAudit.service';
import { AskDuncitConversationModel } from '../conversation/askDuncitConversation.model';
import { AskDuncitMessageModel, type IAskDuncitMessage } from '../conversation/askDuncitMessage.model';

/**
 * Response confidence evaluation: after an answer is saved, a small model
 * scores it (0–1), says whether it settled the request, and whether the
 * QUESTION was about Duncit at all. Feeds the low-confidence list, the
 * resolution rate and Out-of-Context Queries. Best-effort and after the fact:
 * the person already has their answer.
 */

export interface Evaluation {
  confidence: number;
  out_of_context: boolean;
  resolved: boolean;
  reason: string;
}

/** The evaluator's JSON, clamped and defaulted. Null when unusable. */
export function parseEvaluation(raw: string): Evaluation | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const confidence = Number(value.confidence);
    if (!Number.isFinite(confidence)) return null;
    return {
      confidence: Math.min(1, Math.max(0, confidence)),
      out_of_context: value.out_of_context === true,
      resolved: value.resolved === true,
      reason: typeof value.reason === 'string' ? value.reason.slice(0, 300) : '',
    };
  } catch {
    return null;
  }
}

export async function evaluateAnswer(input: {
  question: string;
  answerId: string;
  conversationId: string;
  model: string;
  threshold: number;
  flaggedByModel: boolean;
  actor: AuditActor;
}): Promise<void> {
  try {
    const answer = await AskDuncitMessageModel.findById(input.answerId)
      .select('content tool_calls')
      .lean<Pick<IAskDuncitMessage, 'content' | 'tool_calls'>>();
    if (!answer?.content) return;
    const tools = answer.tool_calls.map((c) => `${c.name}: ${c.status}`).join(', ') || 'none';
    const prompt = await resolvePrompt('ask_duncit.evaluate', {
      question: input.question.slice(0, 2000),
      answer: answer.content.slice(0, 3000),
      tools_used: tools,
    });
    const res = await openaiChat({
      task: 'ask_duncit.evaluate',
      model: input.model || prompt.model || undefined,
      json: true,
      temperature: 0,
      max_tokens: 200,
      detail: `message ${input.answerId}`,
      user_id: input.actor.user_id ?? undefined,
      messages: [{ role: 'system', content: prompt.content }],
    });
    if (!res.ok) return;
    const evaluation = parseEvaluation(res.content);
    if (!evaluation) return;
    const outOfContext = evaluation.out_of_context || input.flaggedByModel;
    await AskDuncitMessageModel.updateOne(
      { _id: new Types.ObjectId(input.answerId) },
      {
        $set: {
          confidence: evaluation.confidence,
          low_confidence: evaluation.confidence < input.threshold,
          out_of_context: outOfContext,
          resolved: evaluation.resolved,
          eval_reason: evaluation.reason,
        },
      }
    );
    // The model already reported it during the turn; only a new finding is recorded here.
    if (evaluation.out_of_context && !input.flaggedByModel) {
      await AskDuncitConversationModel.updateOne({ _id: input.conversationId }, { $inc: { out_of_context_count: 1 } });
      await recordAudit({
        type: 'OUT_OF_CONTEXT',
        actor: input.actor,
        conversation_id: input.conversationId,
        message_id: input.answerId,
        query: input.question,
        reason: `Evaluator: ${evaluation.reason}`,
      });
    }
  } catch (error) {
    logs.server.warn('askDuncit', 'evaluate', { error, answerId: input.answerId });
  }
}

import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { HARD_LIMITS } from '../askDuncit.constants';
import { inspectUserInput } from '../guard/askDuncit.guard';
import { AskDuncitConversationModel, type IAskDuncitConversation } from './askDuncitConversation.model';
import { AskDuncitMemoryModel, type MemoryFact } from './askDuncitMemory.model';
import { AskDuncitMessageModel, type IAskDuncitMessage } from './askDuncitMessage.model';

/**
 * Relevant memory, two kinds:
 *  - FACTS the person asked to be remembered, across conversations (theirs to
 *    see and clear in the app);
 *  - the SUMMARY of a long conversation's older turns, so a long thread keeps
 *    its context without replaying every message.
 */

const FACT_MAX_CHARS = 200;
/** Fold older turns into the summary once this many have built up past the replay window. */
const SUMMARY_BATCH = 10;

const pubFact = (f: MemoryFact) => ({ id: f.id, text: f.text, created_at: f.created_at.toISOString() });

export const askDuncitMemory = {
  async facts(userId: string) {
    const doc = await AskDuncitMemoryModel.findOne({ user_id: userId }).lean();
    return (doc?.facts ?? []).map(pubFact);
  },

  /** Save one fact. Refused when it carries an injection signature (stored injection). */
  async remember(userId: string, text: string, conversationId: string | null): Promise<{ ok: boolean; reason?: string }> {
    const verdict = inspectUserInput(String(text ?? '').slice(0, FACT_MAX_CHARS));
    const fact = verdict.text.trim();
    if (!fact) return { ok: false, reason: 'empty' };
    if (verdict.blocked) return { ok: false, reason: 'unsafe' };
    const existing = await this.facts(userId);
    if (existing.some((f) => f.text.toLowerCase() === fact.toLowerCase())) return { ok: true };
    await AskDuncitMemoryModel.updateOne(
      { user_id: userId },
      {
        $push: {
          facts: {
            $each: [{ id: randomUUID(), text: fact, conversation_id: conversationId, created_at: new Date() }],
            $slice: -HARD_LIMITS.maxMemoryFacts,
          },
        },
      },
      { upsert: true }
    );
    return { ok: true };
  },

  async forget(userId: string, factId: string): Promise<boolean> {
    const res = await AskDuncitMemoryModel.updateOne({ user_id: userId }, { $pull: { facts: { id: factId } } });
    return res.modifiedCount > 0;
  },

  async clear(userId: string): Promise<boolean> {
    await AskDuncitMemoryModel.updateOne({ user_id: userId }, { $set: { facts: [] } });
    return true;
  },

  /** The memory block for the system prompt. */
  async promptBlock(userId: string, conversation: Pick<IAskDuncitConversation, 'summary'>, enabled: boolean): Promise<string> {
    const lines: string[] = [];
    if (enabled) {
      for (const fact of await this.facts(userId)) lines.push(`- ${fact.text}`);
    }
    if (conversation.summary) lines.push(`Earlier in this conversation: ${conversation.summary}`);
    return lines.length ? lines.join('\n') : 'Nothing remembered yet.';
  },

  /**
   * Title a new conversation and fold old turns into its summary. Best-effort,
   * after the answer is saved: a failure leaves the first-question title and
   * the plain replay window, and is logged.
   */
  async maintain(conversationId: string, historyTurns: number): Promise<void> {
    try {
      const conv = await AskDuncitConversationModel.findById(conversationId).lean<IAskDuncitConversation>();
      if (!conv) return;
      const pending = conv.message_count - historyTurns - conv.summarized_count;
      const needsTitle = !conv.title || conv.message_count <= 2;
      if (!needsTitle && pending < SUMMARY_BATCH) return;
      const fold = pending >= SUMMARY_BATCH ? pending : 0;
      const messages = await AskDuncitMessageModel.find({ conversation_id: new Types.ObjectId(conversationId) })
        .sort({ created_at: 1 })
        .skip(fold ? conv.summarized_count : 0)
        .limit(fold || 4)
        .select('role content')
        .lean<Array<Pick<IAskDuncitMessage, 'role' | 'content'>>>();
      const transcript = messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 600)}`).join('\n');
      const prompt = await resolvePrompt('ask_duncit.summarize', { previous_summary: conv.summary || 'none', transcript });
      const res = await openaiChat({
        task: 'ask_duncit.summarize',
        model: prompt.model || undefined,
        json: true,
        temperature: 0.2,
        max_tokens: 300,
        detail: `conversation ${conversationId}`,
        user_id: conv.user_id,
        messages: [{ role: 'system', content: prompt.content }],
      });
      if (!res.ok) return;
      const parsed = JSON.parse(res.content || '{}') as { title?: unknown; summary?: unknown };
      const set: Record<string, unknown> = {};
      if (needsTitle && typeof parsed.title === 'string' && parsed.title.trim()) {
        set.title = parsed.title.trim().slice(0, HARD_LIMITS.conversationTitleChars);
      }
      if (fold && typeof parsed.summary === 'string') {
        set.summary = parsed.summary.trim().slice(0, 1500);
        set.summarized_count = conv.summarized_count + fold;
      }
      if (Object.keys(set).length) await AskDuncitConversationModel.updateOne({ _id: conv._id }, { $set: set });
    } catch (error) {
      logs.server.warn('askDuncit', 'memoryMaintain', { error, conversationId });
    }
  },
};

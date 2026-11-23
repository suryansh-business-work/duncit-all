import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { intelOpenAiCredentials } from '../index/intel.openai';
import type { IntelSettings } from '../settings/intelSettings.types';
import { IntelConversationModel } from './intelChat.models';
import { emitIntel } from './intel.stream';

/**
 * Names a new conversation from its first question (small model, after the
 * answer). Falls back to the question's first words when AI is unavailable,
 * and never overwrites a title the person typed.
 */

export const fallbackTitle = (question: string): string => {
  const words = question.replace(/\s+/g, ' ').trim().split(' ').slice(0, 7).join(' ');
  return (words.length > 60 ? `${words.slice(0, 57)}…` : words) || 'New chat';
};

const QUOTES = new Set(['"', "'", '“', '”', '‘', '’']);
const TRAILING = new Set(['.', '!', '?']);
const isSpace = (ch: string) => ch.trim() === '';

/** Strips quotes and spacing from both ends and end punctuation — a linear scan, no backtracking regex. */
export const cleanTitle = (raw: string): string => {
  let start = 0;
  let end = raw.length;
  while (start < end && (QUOTES.has(raw.charAt(start)) || isSpace(raw.charAt(start)))) start += 1;
  while (end > start && (QUOTES.has(raw.charAt(end - 1)) || TRAILING.has(raw.charAt(end - 1)) || isSpace(raw.charAt(end - 1)))) end -= 1;
  return raw.slice(start, end).split(/\s+/).join(' ').slice(0, 80);
};

export async function generateTitle(userId: string, conversationId: string, question: string, settings: IntelSettings): Promise<void> {
  try {
    const prompt = await resolvePrompt('intel.title', { question: question.slice(0, 1000) });
    const res = await openaiChat({ task: 'intel.title', model: prompt.model || 'gpt-4o-mini', temperature: 0.2, max_tokens: 30, user_id: userId, credentials: await intelOpenAiCredentials(settings), messages: [{ role: 'system', content: prompt.content }] });
    const title = (res.ok && cleanTitle(res.content)) || fallbackTitle(question);
    const updated = await IntelConversationModel.findOneAndUpdate({ _id: conversationId, owner_id: userId, title_generated: false }, { $set: { title, title_generated: true } }, { new: true }).lean();
    if (updated) emitIntel(userId, 'title', { conversation_id: conversationId, title });
  } catch (error) {
    logs.server.warn('intel', 'title', { error, conversationId });
  }
}

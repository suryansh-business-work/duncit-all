import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat, type OpenAiMessage } from './openai.client';

/**
 * Thin OpenAI chat-completions wrapper used as the *agent brain* for CRM AI
 * calls (the spoken voice is Servam TTS; Twilio is only the carrier).
 * Credentials come from the Tech-portal OPENAI env entry.
 *
 * The request itself goes through {@link openaiChat}, which is what records the
 * call's tokens and cost against the `crm.call_assistant` task.
 */
export interface OpenAiChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAiChatResult {
  ok: boolean;
  message: string;
  reply?: string;
}

export const openaiService = {
  async chat(input: {
    systemContext: string;
    history?: OpenAiChatTurn[];
    maxTokens?: number;
  }): Promise<OpenAiChatResult> {
    // A bespoke script from Call Prompts wins; the library entry is the default
    // for a call that has none. Either way the model comes from the library, so
    // the AI portal is where it changes.
    const fallback = await resolvePrompt('crm.call_assistant');
    const messages: OpenAiMessage[] = [
      { role: 'system', content: input.systemContext || fallback.content },
      ...(input.history ?? []),
    ];
    const res = await openaiChat({
      task: 'crm.call_assistant',
      messages,
      model: fallback.model,
      temperature: 0.4,
      max_tokens: input.maxTokens ?? 220,
    });
    if (!res.ok) return { ok: false, message: res.message };
    return { ok: true, message: 'ok', reply: res.content.trim() };
  },
};

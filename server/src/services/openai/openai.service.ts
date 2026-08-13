import { getSystemPrompt } from '@modules/ai/prompt/prompt.service';
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
    const messages: OpenAiMessage[] = [
      {
        role: 'system',
        content: input.systemContext || (await getSystemPrompt('crm.call_assistant')),
      },
      ...(input.history ?? []),
    ];
    const res = await openaiChat({
      task: 'crm.call_assistant',
      messages,
      temperature: 0.4,
      max_tokens: input.maxTokens ?? 220,
    });
    if (!res.ok) return { ok: false, message: res.message };
    return { ok: true, message: 'ok', reply: res.content.trim() };
  },
};

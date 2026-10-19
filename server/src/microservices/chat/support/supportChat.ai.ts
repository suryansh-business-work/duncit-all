import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';

/**
 * First-line AI responder for "Chat with Us". The assistant answers common
 * Duncit questions and, when a query is out of its depth (refunds, account
 * disputes, anything needing a human), asks to be handed off to a support
 * executive. Credentials come from the Tech-portal OPENAI env entry.
 *
 * Resolves to `{ reply, handoff }`. If OpenAI is unconfigured or errors, it
 * fails safe to `{ reply: '', handoff: true }` so the chat always reaches a
 * human rather than silently stalling.
 */
export interface SupportAiTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface SupportAiResult {
  reply: string;
  handoff: boolean;
}

const HANDOFF: SupportAiResult = { reply: '', handoff: true };

/** Whether the AI responder can run — i.e. an OpenAI key is configured. */
export async function isOpenAiConfigured(): Promise<boolean> {
  return !!(await getRuntimeEnvValue('OPENAI_API_KEY'));
}

export async function aiSupportReply(history: SupportAiTurn[]): Promise<SupportAiResult> {
  if (history.length === 0) return HANDOFF;

  try {
    // The user turns here are the member's own messages, so only the standing
    // instruction (and the model it runs on) is library-owned.
    const system = await resolvePrompt('support.assistant');
    const res = await openaiChat({
      task: 'support.assistant',
      model: system.model,
      temperature: 0.3,
      max_tokens: 300,
      json: true,
      messages: [{ role: 'system', content: system.content }, ...history],
    });
    if (!res.ok) return HANDOFF;
    const parsed = JSON.parse(res.content) as { reply?: unknown; handoff?: unknown };
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    const handoff = parsed.handoff === true || reply.length === 0;
    return { reply, handoff };
  } catch {
    return HANDOFF;
  }
}

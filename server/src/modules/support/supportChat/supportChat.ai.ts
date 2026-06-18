import { getRuntimeEnvValue } from '@config/runtimeEnv';

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

const SYSTEM_PROMPT = [
  'You are "Duncit Assistant", the first-line support chatbot for Duncit, an app for discovering and joining social events ("pods") at venues and clubs.',
  'Help with general questions: how to find/join pods, bookings, payments and refunds basics, account/profile, the app in general.',
  'Be warm, concise (2-4 sentences), and use simple Indian English.',
  'Hand off to a human support executive when: the user explicitly asks for a human/agent; the issue needs account-specific action you cannot take (refund a payment, cancel a booking, change account data, safety/SOS, legal/abuse); or you cannot confidently resolve it after clarifying.',
  'Reply ONLY as a strict JSON object: {"reply": string, "handoff": boolean}. "reply" is your message to the user (may be empty when handing off). Set "handoff" true when a human should take over.',
].join('\n');

const HANDOFF: SupportAiResult = { reply: '', handoff: true };

/** Whether the AI responder can run — i.e. an OpenAI key is configured. */
export async function isOpenAiConfigured(): Promise<boolean> {
  return !!(await getRuntimeEnvValue('OPENAI_API_KEY'));
}

export async function aiSupportReply(history: SupportAiTurn[]): Promise<SupportAiResult> {
  const [apiKey, baseUrl, model] = await Promise.all([
    getRuntimeEnvValue('OPENAI_API_KEY'),
    getRuntimeEnvValue('OPENAI_BASE_URL'),
    getRuntimeEnvValue('OPENAI_MODEL'),
  ]);
  if (!apiKey || history.length === 0) return HANDOFF;

  const base = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' as const },
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      }),
    });
    if (!res.ok) return HANDOFF;
    const json: any = await res.json();
    const content = String(json?.choices?.[0]?.message?.content ?? '');
    const parsed = JSON.parse(content) as { reply?: unknown; handoff?: unknown };
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    const handoff = parsed.handoff === true || reply.length === 0;
    return { reply, handoff };
  } catch {
    return HANDOFF;
  }
}

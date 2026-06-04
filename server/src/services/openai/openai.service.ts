import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * Thin OpenAI chat-completions wrapper used as the *agent brain* for CRM AI
 * calls (the spoken voice is Servam TTS; Twilio is only the carrier).
 * Credentials come from the Tech-portal OPENAI env entry.
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

const DEFAULT_MODEL = 'gpt-4o-mini';

export const openaiService = {
  async chat(input: { systemContext: string; history?: OpenAiChatTurn[]; maxTokens?: number }): Promise<OpenAiChatResult> {
    const [apiKey, baseUrl, model] = await Promise.all([
      getRuntimeEnvValue('OPENAI_API_KEY'),
      getRuntimeEnvValue('OPENAI_BASE_URL'),
      getRuntimeEnvValue('OPENAI_MODEL'),
    ]);
    if (!apiKey) {
      return { ok: false, message: 'OpenAI is not configured. Set the OPENAI API key in the Tech portal.' };
    }
    const base = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const messages: OpenAiChatTurn[] = [
      { role: 'system', content: input.systemContext || 'You are a helpful Duncit calling assistant.' },
      ...(input.history ?? []),
    ];
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || DEFAULT_MODEL,
          messages,
          temperature: 0.4,
          max_tokens: input.maxTokens ?? 220,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { ok: false, message: `OpenAI chat failed (HTTP ${res.status}): ${txt.slice(0, 200)}` };
      }
      const json: any = await res.json();
      const reply = String(json?.choices?.[0]?.message?.content ?? '').trim();
      if (!reply) return { ok: false, message: 'OpenAI returned an empty reply' };
      return { ok: true, message: 'ok', reply };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'OpenAI chat request failed' };
    }
  },
};

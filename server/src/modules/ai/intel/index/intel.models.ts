import { GraphQLError } from 'graphql';
import { resolveConfig } from '@services/openai/openai.client';
import { fetchJson } from '../connectors/intel.http';
import { intelSettingsService } from '../settings/intelSettings.service';
import { intelOpenAiCredentials } from './intel.openai';

/**
 * The chat models the configured OpenAI key can use — Settings › AI Models'
 * picker. Read live from OpenAI's model list with the same credentials Intel
 * answers with (its own Tech portal entry, else the Tech portal default), so
 * the list is exactly what will work. Audio, image, embedding, moderation and
 * realtime models are left out: they cannot answer a chat turn.
 */

const CHAT_FAMILY = /^(?:gpt-|chatgpt-|o\d)/;
const NOT_CHAT = /(?:audio|realtime|tts|transcribe|image|embedding|moderation|dall-e|whisper|search|instruct)/;

export const isChatModel = (id: string): boolean => CHAT_FAMILY.test(id) && !NOT_CHAT.test(id);

export async function openAiChatModels(): Promise<string[]> {
  const settings = await intelSettingsService.get();
  const own = await intelOpenAiCredentials(settings);
  const fallback = own ? null : await resolveConfig();
  const apiKey = own?.apiKey ?? fallback?.apiKey ?? '';
  const base = own?.base ?? fallback?.base ?? '';
  if (!apiKey) throw new GraphQLError('No OpenAI API key is set. Choose one in Settings › OpenAI API or add one in Tech › Environment › OpenAI.', { extensions: { code: 'FAILED_PRECONDITION' } });
  const res = await fetchJson<{ data?: Array<{ id?: string }> }>(`${base}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeoutMs: 15_000 });
  const ids = (res.data ?? []).map((m) => String(m.id ?? '')).filter(isChatModel);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

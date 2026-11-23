import { resolveEntry } from '../connectors/intel.credentials';
import type { IntelSettings } from '../settings/intelSettings.types';

/**
 * The OpenAI credentials Intel calls with: the Tech portal entry chosen in
 * Intel › Settings › OpenAI API, or null to use the Tech portal's default
 * entry (what every other AI feature uses).
 */
export async function intelOpenAiCredentials(settings: IntelSettings): Promise<{ apiKey: string; base: string } | null> {
  if (!settings.openai.env_entry_id) return null;
  const entry = await resolveEntry('OPENAI', settings.openai.env_entry_id);
  if (!entry?.config.api_key) return null;
  return { apiKey: entry.config.api_key, base: (entry.config.base_url || 'https://api.openai.com/v1').replace(/\/$/, '') };
}

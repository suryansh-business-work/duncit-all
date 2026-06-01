import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { ENV_KEY_MAP } from '@modules/platform/envEntry/envEntry.fields';

/**
 * Resolve a server-side config value for a legacy env key. Order:
 *   1. The active default EnvEntry for the key's category (Tech portal),
 *   2. process.env fallback.
 *
 * Keys not mapped to a category (URLs, dev flags, etc.) read straight from
 * process.env. Keeping this signature means every existing caller
 * (upload/twilio/vobiz/servam/url-configs/google) works unchanged.
 */
export async function getRuntimeEnvValue(key: string): Promise<string> {
  const normalized = key.toUpperCase();
  const mapping = ENV_KEY_MAP[normalized];
  if (mapping) {
    const entry = await EnvEntryModel.findOne({
      category: mapping.category,
      is_active: true,
      is_default: true,
    }).lean();
    const raw = (entry?.config as Record<string, unknown> | undefined)?.[mapping.field];
    if (raw !== undefined && raw !== null && raw !== '') return String(raw);
  }
  return process.env[normalized] ?? '';
}

import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { ENV_KEY_MAP } from '@modules/platform/envEntry/envEntry.fields';

/**
 * Resolve a server-side config value for a legacy env key.
 *
 * For keys that map to a managed category (Email/ImageKit/Pexels/Google/Twilio/
 * AI/Vobiz) the value comes EXCLUSIVELY from the active default EnvEntry — there
 * is no `.env` fallback, since those credentials are owned by the Tech portal.
 *
 * Keys NOT mapped to a category (URLs, dev flags, JWT secret, etc.) still read
 * from process.env, because they aren't part of the env-entry system.
 *
 * Signature is unchanged so every existing caller works as before.
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
    return raw !== undefined && raw !== null ? String(raw) : '';
  }
  return process.env[normalized] ?? '';
}

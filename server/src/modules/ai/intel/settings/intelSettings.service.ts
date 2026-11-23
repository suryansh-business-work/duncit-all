import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { validate } from '@utils/validate';
import { writeAudit } from '../audit/intelAudit.service';
import type { IntelActor } from '../access/intel.access';
import { INTEL_SETTINGS_DEFAULTS } from './intelSettings.defaults';
import { IntelSettingsModel } from './intelSettings.model';
import { SECTION_SCHEMAS, SUPER_ADMIN_SECTIONS, isSettingsSection } from './intelSettings.schema';
import type { IntelRolePolicy, IntelSettings, IntelSettingsSection } from './intelSettings.types';

/**
 * Reads and writes the one settings document. Reads are cached for 10 s (every
 * chat turn reads settings) and the cache is dropped on every save, so a change
 * is live on this process at once and on the others within seconds.
 */

const CACHE_MS = 10_000;
let cache: { value: IntelSettings; revision: number; at: number } | null = null;

function merge(sections: Record<string, unknown> | undefined): IntelSettings {
  const out = structuredClone(INTEL_SETTINGS_DEFAULTS) as unknown as Record<string, unknown>;
  for (const [key, stored] of Object.entries(sections ?? {})) {
    if (!isSettingsSection(key) || stored === null || stored === undefined) continue;
    const base = out[key];
    out[key] = Array.isArray(stored) || typeof base !== 'object' || Array.isArray(base) ? stored : { ...(base as object), ...(stored as object) };
  }
  return out as unknown as IntelSettings;
}

async function load(): Promise<{ value: IntelSettings; revision: number }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const doc = await IntelSettingsModel.findOne({ key: 'default' }).lean();
  cache = { value: merge(doc?.sections), revision: doc?.revision ?? 0, at: Date.now() };
  return cache;
}

export const intelSettingsService = {
  async get(): Promise<IntelSettings> {
    return (await load()).value;
  },

  async getWithRevision() {
    return load();
  },

  /**
   * Replace one section. `revision` is the value the editor loaded: a save made
   * on top of someone else's newer save is refused rather than silently undoing it.
   */
  async update(actor: IntelActor, section: string, value: unknown, revision: number) {
    if (!isSettingsSection(section)) throw new GraphQLError('Unknown settings section', { extensions: { code: 'BAD_USER_INPUT' } });
    if (SUPER_ADMIN_SECTIONS.has(section) && actor.level !== 'SUPER_ADMIN') {
      throw new GraphQLError('Only a Super Admin can change access and security settings.', { extensions: { code: 'FORBIDDEN' } });
    }
    const parsed = await validate(SECTION_SCHEMAS[section] as never, value);
    const updated = await IntelSettingsModel.findOneAndUpdate(
      { key: 'default', revision },
      { $set: { [`sections.${section}`]: parsed, updated_by: new Types.ObjectId(actor.user.id) }, $inc: { revision: 1 } },
      { new: true }
    ).lean();
    if (!updated) {
      const exists = await IntelSettingsModel.exists({ key: 'default' });
      if (exists || revision !== 0) {
        throw new GraphQLError('These settings were changed by someone else. Reload to see the latest values.', { extensions: { code: 'CONFLICT' } });
      }
      await IntelSettingsModel.create({ key: 'default', sections: { [section]: parsed }, revision: 1, updated_by: new Types.ObjectId(actor.user.id) });
    }
    cache = null;
    await writeAudit({ type: 'SETTINGS', action: `settings.${section}.update`, userId: actor.user.id, level: actor.level, target: section, detail: JSON.stringify(parsed).slice(0, 2000) });
    return load();
  },

  /** The policy for a level. SUPER_ADMIN gets everything. */
  policyFor(settings: IntelSettings, level: IntelActor['level']): IntelRolePolicy {
    if (level === 'SUPER_ADMIN') {
      return { environments: ['STAGING', 'PRODUCTION'], sources: ['MONGODB', 'MCP', 'GITHUB', 'SLACK', 'GMAIL', 'MEDIA'], can_request_writes: true, messages_per_day: 100_000 };
    }
    return level === 'ADMIN' ? settings.access.admin : settings.access.employee;
  },

  enabledModels(settings: IntelSettings) {
    return settings.models.filter((m) => m.enabled);
  },

  defaultModel(settings: IntelSettings): string {
    return settings.models.find((m) => m.enabled && m.is_default)?.id ?? settings.models.find((m) => m.enabled)?.id ?? 'gpt-4o';
  },

  /** For tests: forget the cached document. */
  resetCache() {
    cache = null;
  },
};

export type { IntelSettings, IntelSettingsSection };

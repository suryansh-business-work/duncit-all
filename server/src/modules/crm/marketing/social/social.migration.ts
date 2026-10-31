import { logs } from '@observability/log';
import { EnvEntryModel, type EnvCategory } from '@modules/platform/envEntry/envEntry.model';
import { CATEGORY_LABELS } from '@modules/platform/envEntry/envEntry.fields';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import { SocialAccountModel } from './social.model';

/**
 * One-time moves from the days of a single "Social apps" entry and a single
 * Meta app covering Facebook and Instagram. Safe to run on every boot: each
 * step finds nothing to do once it has run.
 *
 * - The combined SOCIAL_APPS entry is split into one entry per network
 *   (Facebook, LinkedIn, X, YouTube — whichever of them had both keys), each
 *   in its own category, keeping the old entry's default/active flags and
 *   portal assignments. Instagram and Threads start empty: they are separate
 *   apps with their own IDs now, so nothing from the old entry fits them.
 * - Accounts stored with provider META become provider FACEBOOK — their
 *   tokens are Page tokens, which the Facebook app keeps serving.
 */
const LEGACY_CATEGORY = 'SOCIAL_APPS';
const LEGACY_PROVIDER = 'META';

interface Move {
  category: EnvCategory;
  field: string;
}

/** Old combined field → the per-network category and field it moves to. */
const FIELD_MOVES: Readonly<Record<string, Move>> = {
  meta_app_id: { category: 'SOCIAL_FACEBOOK', field: 'app_id' },
  meta_app_secret: { category: 'SOCIAL_FACEBOOK', field: 'app_secret' },
  meta_graph_version: { category: 'SOCIAL_FACEBOOK', field: 'graph_version' },
  linkedin_client_id: { category: 'SOCIAL_LINKEDIN', field: 'client_id' },
  linkedin_client_secret: { category: 'SOCIAL_LINKEDIN', field: 'client_secret' },
  linkedin_api_version: { category: 'SOCIAL_LINKEDIN', field: 'api_version' },
  x_client_id: { category: 'SOCIAL_X', field: 'client_id' },
  x_client_secret: { category: 'SOCIAL_X', field: 'client_secret' },
  youtube_client_id: { category: 'SOCIAL_YOUTUBE', field: 'client_id' },
  youtube_client_secret: { category: 'SOCIAL_YOUTUBE', field: 'client_secret' },
};

/** The id and secret field a network's new entry must have before it is worth creating. */
const REQUIRED: Readonly<Record<string, readonly [string, string]>> = {
  SOCIAL_FACEBOOK: ['app_id', 'app_secret'],
  SOCIAL_LINKEDIN: ['client_id', 'client_secret'],
  SOCIAL_X: ['client_id', 'client_secret'],
  SOCIAL_YOUTUBE: ['client_id', 'client_secret'],
};

interface LegacyEntry {
  _id: unknown;
  name: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  assigned_portals?: string[];
  config?: Record<string, unknown>;
}

const text = (value: unknown): string => (value === undefined || value === null ? '' : String(value).trim());

/** The per-network configs one legacy entry holds, keyed by their new category. */
export function splitLegacyConfig(config: Record<string, unknown> | undefined): Map<EnvCategory, Record<string, string>> {
  const byCategory = new Map<EnvCategory, Record<string, string>>();
  for (const [field, move] of Object.entries(FIELD_MOVES)) {
    const value = text(config?.[field]);
    if (!value) continue;
    const target = byCategory.get(move.category) ?? {};
    target[move.field] = value;
    byCategory.set(move.category, target);
  }
  for (const [category, values] of byCategory) {
    const [id, secret] = REQUIRED[category];
    if (!values[id] || !values[secret]) byCategory.delete(category);
  }
  return byCategory;
}

async function splitEntry(entry: LegacyEntry): Promise<number> {
  let created = 0;
  for (const [category, config] of splitLegacyConfig(entry.config)) {
    // A network that already has its own entry keeps it; the old keys are not worth a second row.
    const exists = await EnvEntryModel.exists({ category });
    if (exists) continue;
    await envEntryService.create({
      name: `${entry.name} · ${CATEGORY_LABELS[category]}`,
      category,
      description: entry.description ?? '',
      is_default: entry.is_default ?? false,
      is_active: entry.is_active !== false,
      config,
      assigned_portals: entry.assigned_portals ?? [],
    });
    created += 1;
  }
  await EnvEntryModel.deleteOne({ _id: entry._id });
  return created;
}

/** Split every legacy "Social apps" entry; returns how many per-network entries were created. */
export async function migrateSocialAppEntries(): Promise<number> {
  const legacy = await EnvEntryModel.find({ category: LEGACY_CATEGORY as never }).lean<LegacyEntry[]>();
  let created = 0;
  for (const entry of legacy) created += await splitEntry(entry);
  if (legacy.length > 0) {
    logs.server.info('social-accounts', 'migrateSocialAppEntries', { legacy_entries: legacy.length, created });
  }
  return created;
}

/** Accounts connected through the old shared Meta app now belong to the Facebook app. */
export async function migrateSocialProviders(): Promise<number> {
  const result = await SocialAccountModel.updateMany({ provider: LEGACY_PROVIDER as never }, { $set: { provider: 'FACEBOOK' } });
  if (result.modifiedCount > 0) {
    logs.server.info('social-accounts', 'migrateSocialProviders', { accounts: result.modifiedCount });
  }
  return result.modifiedCount;
}

/** Both moves, in the order the boot runs them. */
export async function migrateSocialApps(): Promise<{ entries: number; accounts: number }> {
  const entries = await migrateSocialAppEntries();
  const accounts = await migrateSocialProviders();
  return { entries, accounts };
}

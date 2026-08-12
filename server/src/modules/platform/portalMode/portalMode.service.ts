import { GraphQLError } from 'graphql';
import { PortalModeModel, PORTAL_MODES, type PortalMode } from './portalMode.model';
import { PORTAL_REGISTRY } from './portalMode.registry';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

/** Public URL per portal key — kept in the registry (single source of truth). */
const URL_BY_KEY = new Map(PORTAL_REGISTRY.map((e) => [e.key, e.url]));

/** Allowlists for the shared table engine (portalModesTable — DUNCIT TABLE CONTRACT v1). */
const PORTAL_MODE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'key'],
  sortFields: {
    name: 'name',
    key: 'key',
    kind: 'kind',
    mode: 'mode',
    updated_at: 'updated_at',
  },
  filterFields: {
    kind: { type: 'enum' },
    mode: { type: 'enum' },
  },
  defaultSort: { kind: 1, name: 1 },
};

const pub = (doc: any) => ({
  id: String(doc._id),
  key: doc.key,
  name: doc.name,
  kind: doc.kind ?? 'PORTAL',
  mode: (doc.mode ?? 'LIVE') as PortalMode,
  // A row written before these fields existed has neither, and it kept both
  // features — so an absent value reads as on, not off.
  chat_enabled: doc.chat_enabled !== false,
  apps_enabled: doc.apps_enabled !== false,
  note: doc.note ?? '',
  url: URL_BY_KEY.get(doc.key) ?? null,
  updated_at: iso(doc.updated_at),
});

export const portalModeService = {
  /** Seed one row per registry entry (idempotent — keeps existing modes). */
  async seedDefaults() {
    for (const entry of PORTAL_REGISTRY) {
      await PortalModeModel.updateOne(
        { key: entry.key },
        { $setOnInsert: { key: entry.key, name: entry.name, kind: entry.kind, mode: 'LIVE' } },
        { upsert: true }
      );
    }
  },

  async list() {
    await this.seedDefaults();
    const docs = await PortalModeModel.find().sort({ kind: 1, name: 1 });
    return docs.map(pub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the portalModesTable query. */
  async table(input?: TableQueryInput | null) {
    await this.seedDefaults();
    const { docs, total, page, page_size } = await runTableQuery(
      PortalModeModel,
      {},
      input,
      PORTAL_MODE_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  /**
   * Public, unauthenticated read used by every app's gate and by the shell
   * chrome. Fails open on every field: an unregistered key is LIVE with both
   * header features on, exactly as a portal behaves with no row at all.
   */
  async getPublic(key: string) {
    const doc = await PortalModeModel.findOne({ key: key.trim() }).lean();
    return {
      key: key.trim(),
      mode: (doc?.mode ?? 'LIVE') as PortalMode,
      chat_enabled: doc?.chat_enabled !== false,
      apps_enabled: doc?.apps_enabled !== false,
    };
  },

  async setMode(key: string, mode: PortalMode, note: string | null, updatedBy?: string | null) {
    if (!PORTAL_MODES.includes(mode)) {
      throw new GraphQLError('Unsupported portal mode', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const known = PORTAL_REGISTRY.find((entry) => entry.key === key.trim());
    if (!known) {
      throw new GraphQLError('Unknown portal key', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PortalModeModel.findOneAndUpdate(
      { key: known.key },
      { $set: { mode, note: note ?? '', updated_by: updatedBy || null, name: known.name, kind: known.kind } },
      { new: true, upsert: true }
    );
    return pub(doc);
  },

  /**
   * Header features for one console. Only the flags passed are written, so the
   * Admin table can flip one switch per request without echoing the other back
   * and overwriting a change made from another tab in between.
   */
  async setAppFeatures(
    key: string,
    features: { chat_enabled?: boolean | null; apps_enabled?: boolean | null },
    updatedBy?: string | null
  ) {
    const known = PORTAL_REGISTRY.find((entry) => entry.key === key.trim());
    if (!known) {
      throw new GraphQLError('Unknown portal key', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const $set: Record<string, unknown> = {
      updated_by: updatedBy || null,
      name: known.name,
      kind: known.kind,
    };
    if (typeof features.chat_enabled === 'boolean') $set.chat_enabled = features.chat_enabled;
    if (typeof features.apps_enabled === 'boolean') $set.apps_enabled = features.apps_enabled;
    const doc = await PortalModeModel.findOneAndUpdate(
      { key: known.key },
      { $set },
      { new: true, upsert: true }
    );
    return pub(doc);
  },
};

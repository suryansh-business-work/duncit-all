import { GraphQLError } from 'graphql';
import { PortalModeModel, PORTAL_MODES, type PortalMode } from './portalMode.model';
import { PORTAL_REGISTRY } from './portalMode.registry';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any) => ({
  id: String(doc._id),
  key: doc.key,
  name: doc.name,
  kind: doc.kind ?? 'PORTAL',
  mode: (doc.mode ?? 'LIVE') as PortalMode,
  note: doc.note ?? '',
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

  /** Public, unauthenticated read used by every app's gate. Fails open to LIVE. */
  async getPublic(key: string) {
    const doc = await PortalModeModel.findOne({ key: key.trim() }).lean();
    return { key: key.trim(), mode: (doc?.mode ?? 'LIVE') as PortalMode };
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
};

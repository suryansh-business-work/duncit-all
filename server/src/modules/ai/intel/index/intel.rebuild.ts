import type { IntelActor } from '../access/intel.access';
import { writeAudit } from '../audit/intelAudit.service';
import { IntelConnectorModel } from '../connectors/intelConnector.model';
import { INDEX_SCOPES, type IndexScope } from '../intel.constants';
import { IntelMediaModel } from '../media/intelMedia.model';
import { intelSettingsService } from '../settings/intelSettings.service';
import { scheduleMediaIndex, scheduleSync } from '../sync/intelSync.queue';
import { IntelDocumentModel } from './intelDocument.model';
import { collectionOf, qdrant } from './qdrant.client';

/**
 * Rebuilds an index scope from scratch: the collection is dropped and created
 * with the current embedding dimensions, the registry is reset, and every
 * connector writing to that scope (and, for SHARED, every file) is re-synced.
 * Needed after changing the embedding model or dimensions.
 */
export async function rebuildIndex(actor: IntelActor, scope: IndexScope | null): Promise<number> {
  const settings = await intelSettingsService.get();
  const scopes = scope ? [scope] : [...INDEX_SCOPES];
  let queued = 0;
  for (const s of scopes) {
    const name = collectionOf(s);
    if (await qdrant.info(name)) await qdrant.drop(name);
    await qdrant.create(name, settings.embeddings.dimensions);
    await IntelDocumentModel.updateMany({ scope: s }, { $set: { status: 'DELETED', content_hash: '', chunk_count: 0 } });
    const environments = s === 'SHARED' ? ['BOTH'] : [s];
    const connectors = await IntelConnectorModel.find({ enabled: true, environment: { $in: environments }, kind: { $ne: 'MCP' } }).lean();
    for (const c of connectors) {
      await scheduleSync(c, 'FULL', 'REBUILD', actor.user.id);
      queued += 1;
    }
    if (s === 'SHARED') {
      const files = await IntelMediaModel.find({ deleted_at: null, archived: false }, { _id: 1 }).lean();
      for (const f of files) scheduleMediaIndex(String(f._id));
      queued += files.length;
    }
  }
  await writeAudit({ type: 'SYNC', action: 'index.rebuild', userId: actor.user.id, level: actor.level, target: scopes.join(', '), detail: `${queued} sync(s)/file(s) queued` });
  return queued;
}

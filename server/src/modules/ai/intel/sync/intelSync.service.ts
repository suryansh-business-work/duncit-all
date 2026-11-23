import { logs } from '@observability/log';
import { writeAudit } from '../audit/intelAudit.service';
import { resolveEntry } from '../connectors/intel.credentials';
import { scopeOf, type SyncContext, type SyncMode } from '../connectors/intel.driver';
import { IntelConnectorModel, type IIntelConnector } from '../connectors/intelConnector.model';
import { CONNECTOR_ENV_CATEGORY } from '../intel.constants';
import { countIndexed, documentKey, ensureCollections, indexDocument, pruneUnseen, removeDocument } from '../index/intel.indexer';
import { intelSettingsService } from '../settings/intelSettings.service';
import { DRIVERS } from './intel.drivers';
import { IntelSyncRunModel, type IIntelSyncRun, type SyncRunStatus } from './intelSyncRun.model';

/**
 * Runs one sync. A connector syncs at most once at a time (a lease on the
 * connector row, so two server processes or a double click cannot overlap),
 * pauses are honoured between documents, and the incremental cursor is saved
 * only when the run succeeds — a failed run is simply repeated next time.
 */

const LEASE_MS = 2 * 60 * 60 * 1000;
const MAX_LOG = 200;

async function finish(run: IIntelSyncRun, status: SyncRunStatus, error = '') {
  await IntelSyncRunModel.updateOne({ _id: run._id }, { $set: { status, error: error.slice(0, 1000), stats: run.stats, log: run.log.slice(-MAX_LOG), finished_at: new Date() } });
}

async function acquire(connectorId: string): Promise<IIntelConnector | null> {
  const now = new Date();
  return IntelConnectorModel.findOneAndUpdate(
    { _id: connectorId, $or: [{ lock_until: null }, { lock_until: { $lt: now } }] },
    { $set: { lock_until: new Date(now.getTime() + LEASE_MS), status: 'SYNCING' } },
    { new: true }
  ).lean();
}

async function isPaused(connectorId: string): Promise<boolean> {
  const [settings, connector] = await Promise.all([intelSettingsService.get(), IntelConnectorModel.findById(connectorId, { sync_paused: 1, enabled: 1 }).lean()]);
  return settings.sync.paused || !connector || connector.sync_paused || !connector.enabled;
}

function buildContext(run: IIntelSyncRun, connector: IIntelConnector, entry: NonNullable<Awaited<ReturnType<typeof resolveEntry>>>, settings: Awaited<ReturnType<typeof intelSettingsService.get>>, state: { stopped: boolean }): SyncContext {
  const scope = scopeOf(connector.environment);
  const runId = String(run._id);
  const connectorId = String(connector._id);
  return {
    connector,
    entry,
    mode: run.mode,
    settings,
    runId,
    scope,
    cursor: { ...(connector.cursor ?? {}) },
    log: (line) => {
      run.log.push(`${new Date().toISOString()} ${line}`.slice(0, 500));
    },
    remove: async (externalId) => {
      await removeDocument(documentKey({ source: connector.kind, connector_id: connectorId, external_id: externalId }));
      run.stats.deleted += 1;
    },
    emit: async (doc) => {
      if (run.stats.seen >= settings.sync.max_items_per_run || (run.stats.seen % 25 === 0 && (await isPaused(connectorId)))) {
        state.stopped = true;
        return false;
      }
      run.stats.seen += 1;
      const outcome = await indexDocument({ ...doc, source: connector.kind, connector_id: connectorId, scope }, settings, runId);
      if (outcome === 'FAILED') run.stats.failed += 1;
      else if (outcome === 'UNCHANGED') run.stats.unchanged += 1;
      else run.stats.indexed += 1;
      return true;
    },
  };
}

export async function runSync(runId: string): Promise<void> {
  const run = await IntelSyncRunModel.findById(runId).lean();
  if (!run || run.status !== 'QUEUED') return;
  if (await isPaused(run.connector_id)) return finish(run, 'SKIPPED', 'Sync is paused or the connector is disabled.');
  const connector = await acquire(run.connector_id);
  if (!connector) return finish(run, 'SKIPPED', 'Another sync of this connector is still running.');
  await IntelSyncRunModel.updateOne({ _id: run._id }, { $set: { status: 'RUNNING', started_at: new Date() } });
  const state = { stopped: false };
  try {
    const entry = await resolveEntry(CONNECTOR_ENV_CATEGORY[connector.kind], connector.env_entry_id);
    if (!entry) throw new Error('The Tech portal entry this connector uses is missing or inactive.');
    const settings = await intelSettingsService.get();
    if (connector.kind !== 'MCP' && !(await ensureCollections(settings))) throw new Error('The knowledge index (Qdrant) is not reachable.');
    const ctx = buildContext(run, connector, entry, settings, state);
    await DRIVERS[connector.kind].sync(ctx);
    if (run.mode === 'FULL' && !state.stopped && connector.kind !== 'MCP') run.stats.deleted += await pruneUnseen(String(connector._id), String(run._id));
    const status: SyncRunStatus = state.stopped || run.stats.failed > 0 ? 'PARTIAL' : 'SUCCESS';
    await IntelConnectorModel.updateOne(
      { _id: connector._id },
      { $set: { status: 'OK', last_sync_at: new Date(), last_success_at: new Date(), last_error: '', cursor: ctx.cursor, indexed_count: await countIndexed(String(connector._id)), lock_until: null } }
    );
    await finish(run, status);
    await writeAudit({ type: 'SYNC', action: `sync.${run.mode.toLowerCase()}`, userId: run.started_by || null, target: connector.name, environment: connector.environment, detail: JSON.stringify(run.stats) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.server.warn('intel', 'sync', { error, connector: run.connector_id });
    await IntelConnectorModel.updateOne({ _id: connector._id }, { $set: { status: 'ERROR', last_sync_at: new Date(), last_error: message.slice(0, 500), lock_until: null } });
    await finish(run, 'FAILED', message);
    await writeAudit({ type: 'SYNC', action: `sync.${run.mode.toLowerCase()}`, status: 'FAILED', userId: run.started_by || null, target: connector.name, detail: message });
  }
}

export async function createRun(connector: Pick<IIntelConnector, '_id' | 'name' | 'kind'>, mode: SyncMode, trigger: IIntelSyncRun['trigger'], startedBy = ''): Promise<string> {
  const run = await IntelSyncRunModel.create({ connector_id: String(connector._id), connector_name: connector.name, kind: connector.kind, mode, trigger, started_by: startedBy });
  return String(run._id);
}

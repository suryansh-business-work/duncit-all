import { enqueue, startWorker } from '@config/queue';
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import type { SyncMode } from '../connectors/intel.driver';
import { IntelConnectorModel, type IIntelConnector } from '../connectors/intelConnector.model';
import { indexMedia } from '../media/intelMedia.indexing';
import { intelSettingsService } from '../settings/intelSettings.service';
import { createRun, runSync } from './intelSync.service';
import type { IIntelSyncRun } from './intelSyncRun.model';

/**
 * The Intel sync queue (BullMQ, `intel-sync`). Connector syncs and file
 * indexing go through it so a burst of uploads or a big repository never
 * blocks a request; retries come from the queue's own backoff. Without the
 * queue Redis (local dev, an outage) the work runs in the background of this
 * process instead — never lost, never silently skipped.
 *
 * The reconciliation job re-syncs every enabled connector whose last sync is
 * older than the configured interval (incremental), and does a full sync once
 * a day so deletions upstream are caught.
 */

const QUEUE = 'intel-sync';
type Job = { kind: 'sync'; runId: string } | { kind: 'media'; mediaId: string };

async function processJob(job: Job): Promise<void> {
  if (job.kind === 'sync') await runSync(job.runId);
  else await indexMedia(job.mediaId);
}

function dispatch(job: Job): void {
  enqueue<Job>(QUEUE, [{ name: job.kind, data: job }])
    .then((queued) => {
      if (!queued) return processJob(job);
      return undefined;
    })
    .catch((error) => logs.server.error('intel', 'queue.dispatch', { error, job: job.kind }));
}

export function scheduleMediaIndex(mediaId: string): void {
  dispatch({ kind: 'media', mediaId });
}

export async function scheduleSync(connector: Pick<IIntelConnector, '_id' | 'name' | 'kind'>, mode: SyncMode, trigger: IIntelSyncRun['trigger'], startedBy = ''): Promise<string> {
  const runId = await createRun(connector, mode, trigger, startedBy);
  dispatch({ kind: 'sync', runId });
  return runId;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function reconcile(now = Date.now()): Promise<number> {
  const settings = await intelSettingsService.get();
  if (settings.sync.paused || !settings.general.auto_sync) return 0;
  const due = new Date(now - settings.sync.interval_minutes * 60_000);
  const connectors = await IntelConnectorModel.find({ enabled: true, sync_paused: false, $or: [{ last_sync_at: null }, { last_sync_at: { $lt: due } }] }).lean();
  for (const c of connectors) {
    const fullDue = !c.last_success_at || now - c.last_success_at.getTime() > DAY_MS;
    await scheduleSync(c, fullDue ? 'FULL' : 'INCREMENTAL', 'SCHEDULE');
  }
  return connectors.length;
}

export function startIntelSync(): () => void {
  startWorker<Job>(QUEUE, (job) => processJob(job.data), { globalConcurrency: 2 });
  return startClusterJob({ component: 'intel', operation: 'reconcile', firstDelayMs: 120_000, intervalMs: 5 * 60_000, run: reconcile });
}

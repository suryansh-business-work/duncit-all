import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { readAppleInsightsConfig, readPlayInsightsConfig, type ConfigRead } from './appInsights.config';
import { newCounter, type SyncCounter } from './appInsights.http';
import { AppInsightStateModel, AppInsightSyncLogModel, type AppInsightSyncTrigger } from './appInsights.model';
import { APP_INSIGHT_STORES, type AppInsightStore } from './appInsights.metrics';
import { syncGooglePlay, type StoreSyncResult } from './googlePlay.sync';
import { syncAppStore } from './appStore.sync';

/**
 * Running a sync, for the schedule and for the Sync now button alike.
 *
 * One store syncs at a time across the cluster: the state document is the
 * lock, taken with a single conditional update, so two presses, two pods or a
 * press during the scheduled run never read the same reports twice at once. A
 * lock left by a process that died is taken over after SYNC_STALE_MS. Every
 * run writes a sync log row, and whatever went wrong is stored without any
 * credential in it.
 */

export const SYNC_STALE_MS = 30 * 60_000;
/** A manual sync this soon after the last attempt is refused — the stores publish daily. */
export const MANUAL_COOLDOWN_MS = 5 * 60_000;
/** The schedule syncs a store whose last success is older than this. */
export const DAILY_MS = 24 * 60 * 60_000;
/** After a failure the schedule waits this long before trying again. */
export const RETRY_AFTER_FAILURE_MS = 60 * 60_000;

type Runner = (counter: SyncCounter) => Promise<StoreSyncResult>;

/** The store's sync bound to its credentials, or null while they are not configured. */
const prepared =
  <T>(read: () => Promise<ConfigRead<T>>, sync: (config: T, counter: SyncCounter) => Promise<StoreSyncResult>) =>
  async (): Promise<Runner | null> => {
    const { config } = await read();
    return config ? (counter) => sync(config, counter) : null;
  };

const STORE_SYNCS: Record<AppInsightStore, () => Promise<Runner | null>> = {
  GOOGLE_PLAY: prepared(readPlayInsightsConfig, syncGooglePlay),
  APP_STORE: prepared(readAppleInsightsConfig, syncAppStore),
};

const PEM_BLOCK = /-----BEGIN[^-]*-----[\s\S]*?-----END[^-]*-----/g;
const BEARER = /Bearer\s+[\w.~+/=-]+/gi;
const MAX_MESSAGE = 500;

/** An error as one line safe to store and show: no key material, no token, bounded length. */
export function safeMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const clean = raw.replaceAll(PEM_BLOCK, '[key removed]').replaceAll(BEARER, 'Bearer [removed]').replaceAll(/\s+/g, ' ').trim();
  return clean.length > MAX_MESSAGE ? `${clean.slice(0, MAX_MESSAGE - 1)}…` : clean || 'Unknown error';
}

const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

/** Takes the store's sync lock. False while another live sync holds it. */
export async function acquireLock(store: AppInsightStore, now = new Date()): Promise<boolean> {
  try {
    await AppInsightStateModel.updateOne({ store }, { $setOnInsert: { store } }, { upsert: true });
  } catch (err) {
    // Two first-ever syncs raced to create the document; the other one made it.
    if (!isDuplicateKey(err)) throw err;
  }
  const taken = await AppInsightStateModel.findOneAndUpdate(
    {
      store,
      $or: [{ syncing: false }, { sync_started_at: null }, { sync_started_at: { $lt: new Date(now.getTime() - SYNC_STALE_MS) } }],
    },
    { $set: { syncing: true, sync_started_at: now, last_attempt_at: now } },
    { new: true }
  );
  return Boolean(taken);
}

/** One store's sync from lock to log. Never throws: the outcome is in the log and on the state. */
export async function runStoreSync(store: AppInsightStore, trigger: AppInsightSyncTrigger, by = ''): Promise<void> {
  const run = await STORE_SYNCS[store]();
  if (!run) return;
  if (!(await acquireLock(store))) return;
  const started = new Date();
  const log = await AppInsightSyncLogModel.create({ store, trigger, outcome: 'RUNNING', by, started_at: started });
  const counter = newCounter();
  try {
    const result = await run(counter);
    const finished = new Date();
    await AppInsightStateModel.updateOne({ store }, { $set: { last_success_at: finished, last_error: '' } });
    await AppInsightSyncLogModel.updateOne(
      { _id: log._id },
      {
        $set: {
          outcome: 'SUCCESS',
          finished_at: finished,
          sources_read: result.read,
          sources_skipped: result.skipped,
          rows_written: result.rows,
          api_calls: counter.calls,
          retries: counter.retries,
          message: result.message,
        },
      }
    );
    logs.server.info('appInsights', 'sync', { store, trigger, rows: result.rows, calls: counter.calls });
  } catch (err) {
    const message = safeMessage(err);
    await AppInsightStateModel.updateOne({ store }, { $set: { last_error: message } });
    await AppInsightSyncLogModel.updateOne(
      { _id: log._id },
      { $set: { outcome: 'FAILED', finished_at: new Date(), api_calls: counter.calls, retries: counter.retries, message } }
    );
    logs.server.warn('appInsights', 'sync', { store, trigger, msg: message });
  } finally {
    await AppInsightStateModel.updateOne({ store }, { $set: { syncing: false, sync_started_at: null } });
  }
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const background = (store: AppInsightStore, by: string) => {
  runStoreSync(store, 'MANUAL', by).catch((error) => logs.server.error('appInsights', 'manualSync', { error, store }));
};

/**
 * Sync now: starts each configured store that is neither syncing nor synced
 * moments ago, in the background (a first sync can outlast the request), and
 * returns at once. Refuses with the reason when nothing could start.
 */
export async function startManualSync(stores: readonly AppInsightStore[], by: string, now = new Date()): Promise<void> {
  const reasons: string[] = [];
  let started = 0;
  for (const store of stores) {
    if (!(await STORE_SYNCS[store]())) {
      reasons.push(`${store} is not configured`);
      continue;
    }
    const state = await AppInsightStateModel.findOne({ store }).lean();
    const fresh = state?.syncing && state.sync_started_at && now.getTime() - state.sync_started_at.getTime() < SYNC_STALE_MS;
    if (fresh) {
      reasons.push(`${store} is already syncing`);
      continue;
    }
    const last = state?.last_attempt_at?.getTime() ?? 0;
    if (now.getTime() - last < MANUAL_COOLDOWN_MS) {
      const minutes = Math.ceil((MANUAL_COOLDOWN_MS - (now.getTime() - last)) / 60_000);
      reasons.push(`${store} synced moments ago; try again in ${minutes} minute(s)`);
      continue;
    }
    background(store, by);
    started += 1;
  }
  if (started === 0) throw badInput(`Nothing to sync: ${reasons.join('; ')}.`);
}

/** Whether the schedule should sync a store now: a day since the last success, an hour since a failure. */
export function isDue(
  state: { last_success_at: Date | null; last_attempt_at: Date | null; last_error: string } | null,
  now: Date
): boolean {
  if (!state?.last_success_at) {
    const lastTry = state?.last_attempt_at?.getTime() ?? 0;
    return now.getTime() - lastTry >= RETRY_AFTER_FAILURE_MS;
  }
  const sinceSuccess = now.getTime() - state.last_success_at.getTime();
  if (sinceSuccess < DAILY_MS) return false;
  const lastTry = state.last_attempt_at?.getTime() ?? 0;
  return !state.last_error || now.getTime() - lastTry >= RETRY_AFTER_FAILURE_MS;
}

/** The scheduler's tick: each store that is due, one after the other. */
export async function scheduledSync(now = new Date()): Promise<void> {
  for (const store of APP_INSIGHT_STORES) {
    const state = await AppInsightStateModel.findOne({ store }).lean();
    if (isDue(state, now)) await runStoreSync(store, 'SCHEDULE');
  }
}

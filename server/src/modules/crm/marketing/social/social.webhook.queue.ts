import { enqueue, startWorker } from '@config/queue';
import { logs } from '@observability/log';
import { SocialWebhookDeliveryModel, type SocialWebhookDeliveryDoc, type WebhookOutcome } from './social.webhook.delivery.model';
import { processMetaWebhookOutcome } from './social.webhook.process';

/**
 * Meta's webhook deliveries as jobs. The route stores each signed delivery
 * (recordDelivery), answers 200, and hands its id here; the work then runs on
 * the `social-webhook` queue, or in the background of this process when the
 * queue Redis is not there (local dev, an outage). Meta re-delivers and so do
 * we: every event is stored once by its network id, so running a delivery
 * twice is safe.
 *
 * A delivery is claimed before it runs, so two workers never take the same
 * one. One that failed, was never dispatched (a crash right after the 200) or
 * was left half-run is picked up again by the sweep, up to MAX_ATTEMPTS.
 */
const QUEUE = 'social-webhook';
const COMPONENT = 'social-webhook';
export const MAX_ATTEMPTS = 5;
/** A delivery untouched for this long was never dispatched, or its run died. */
const STALE_MS = 2 * 60_000;
const SWEEP_LIMIT = 20;
const RECENT_DEFAULT = 50;

interface RawEntry {
  id?: unknown;
  messaging?: unknown;
  changes?: { field?: unknown }[];
}

/** What a delivery is about, for the log and the delivery list: the object, the accounts and the fields. */
export function summarizeDelivery(payload: unknown): { object: string; entry_ids: string[]; fields: string[] } {
  const body = (payload && typeof payload === 'object' ? payload : {}) as { object?: unknown; entry?: unknown };
  const entries = (Array.isArray(body.entry) ? body.entry : []) as RawEntry[];
  const fields = entries.flatMap((entry) => [
    ...(Array.isArray(entry?.messaging) && entry.messaging.length > 0 ? ['messaging'] : []),
    ...(Array.isArray(entry?.changes) ? entry.changes.map((change) => (typeof change?.field === 'string' ? change.field : '')) : []),
  ]);
  return {
    object: typeof body.object === 'string' ? body.object : '',
    entry_ids: [...new Set(entries.map((entry) => (typeof entry?.id === 'string' || typeof entry?.id === 'number' ? String(entry.id) : '')).filter(Boolean))],
    fields: [...new Set(fields.filter(Boolean))],
  };
}

/** Keep the delivery before anything else; null when the database refused it (the caller then processes it in memory). */
export async function recordDelivery(body: string, payload: unknown): Promise<string | null> {
  const summary = summarizeDelivery(payload);
  try {
    const doc = await SocialWebhookDeliveryModel.create({ ...summary, body });
    logs.server.info(COMPONENT, 'received', { ...summary, delivery_id: String(doc._id) });
    return String(doc._id);
  } catch (error) {
    logs.server.error(COMPONENT, 'record', { error, ...summary, msg: 'webhook delivery could not be stored; processing it in memory' });
    return null;
  }
}

/** Totals across attempts: what earlier attempts stored stays counted, the rest is what the last one found. */
function mergedOutcome(previous: WebhookOutcome | null | undefined, current: WebhookOutcome): WebhookOutcome {
  const stored = (previous?.stored ?? 0) + current.stored;
  const echoes = (previous?.echoes ?? 0) + current.echoes;
  const duplicates = Math.max(0, current.events - stored - echoes - current.failed - current.unknown_account);
  return { ...current, stored, echoes, duplicates };
}

const claimFilter = (now: number) => ({
  $or: [
    { status: 'RECEIVED' },
    { status: 'FAILED', attempts: { $lt: MAX_ATTEMPTS } },
    { status: 'PROCESSING', processing_at: { $lt: new Date(now - STALE_MS) } },
  ],
});

/** Run one stored delivery. Never throws: the outcome, or the failure, is kept on the delivery. */
export async function processDelivery(id: string, now = Date.now()): Promise<void> {
  const delivery = await SocialWebhookDeliveryModel.findOneAndUpdate(
    { _id: id, ...claimFilter(now) },
    { $set: { status: 'PROCESSING', processing_at: new Date(now) }, $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  ).lean();
  if (!delivery) return;
  const context = { delivery_id: id, object: delivery.object, entry_ids: delivery.entry_ids, attempt: delivery.attempts };
  try {
    const result = await processMetaWebhookOutcome(JSON.parse(delivery.body));
    const outcome = mergedOutcome(delivery.attempts > 1 ? delivery.outcome : null, result);
    const status = result.failed > 0 ? 'FAILED' : 'PROCESSED';
    await SocialWebhookDeliveryModel.updateOne({ _id: id }, { $set: { status, outcome, error: '', processed_at: new Date() } });
    logs.server.info(COMPONENT, 'processed', { ...context, status, ...outcome });
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    await SocialWebhookDeliveryModel.updateOne({ _id: id }, { $set: { status: 'FAILED', error: message, processed_at: new Date() } });
    logs.server.error(COMPONENT, 'process', { ...context, error });
  }
}

/** Hand a delivery to the queue, or run it here when there is none. */
export function dispatchDelivery(id: string): void {
  enqueue<{ delivery_id: string }>(QUEUE, [{ name: 'delivery', data: { delivery_id: id } }])
    .then((queued) => (queued ? undefined : processDelivery(id)))
    .catch((error: unknown) => logs.server.error(COMPONENT, 'dispatch', { error, delivery_id: id }));
}

/** The sweep: deliveries never dispatched, failed, or abandoned mid-run, oldest first, one at a time. */
export async function retryPendingDeliveries(now = Date.now()): Promise<number> {
  const due = await SocialWebhookDeliveryModel.find({ received_at: { $lt: new Date(now - STALE_MS) }, ...claimFilter(now) })
    .sort({ received_at: 1 })
    .limit(SWEEP_LIMIT)
    .select('_id')
    .lean();
  for (const delivery of due) await processDelivery(String(delivery._id), now);
  return due.length;
}

export function startWebhookWorker(): void {
  startWorker<{ delivery_id: string }>(QUEUE, (job) => processDelivery(job.data.delivery_id));
}

/** The latest deliveries, newest first, for Social Accounts › Webhooks. */
export function recentDeliveries(limit = RECENT_DEFAULT) {
  const size = Math.min(Math.max(Math.trunc(limit) || RECENT_DEFAULT, 1), RECENT_DEFAULT);
  return SocialWebhookDeliveryModel.find().sort({ received_at: -1 }).limit(size).lean<SocialWebhookDeliveryDoc[]>();
}

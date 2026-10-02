import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import mongoose, { Schema } from 'mongoose';
import { logs } from '@observability/log';

/**
 * Which server process runs the background jobs.
 *
 * Every scheduler used to run in every process. With one container that is one
 * run; with two, every sweep runs twice — two auto-cancel passes refunding the
 * same pod, two WhatsApp reminders, two nightly backups. So exactly one process
 * holds a lease document in Mongo, renews it every 30 seconds, and only that
 * process runs the cluster-wide jobs (see clusterJob.ts). If it dies, the lease
 * expires after 90 seconds and the next process to renew takes over.
 *
 * Mongo, not Redis: Redis is optional here (the response cache degrades without
 * it), Mongo is not — a lock in Redis would stop every job when Redis is away.
 */
interface ISchedulerLease {
  _id: string;
  owner: string;
  expires_at: Date;
}

const SchedulerLeaseModel = mongoose.model<ISchedulerLease>(
  'SchedulerLease',
  new Schema<ISchedulerLease>(
    {
      _id: { type: String, required: true },
      owner: { type: String, required: true },
      expires_at: { type: Date, required: true },
    },
    { collection: 'schedulerleases', versionKey: false }
  )
);

const LEASE_ID = 'scheduler-leader';
const RENEW_MS = 30_000;
const LEASE_MS = 90_000;
const DUPLICATE_KEY = 11000;

/** This process, distinct even from a restart of itself on the same host. */
const OWNER = `${hostname()}:${process.pid}:${randomBytes(4).toString('hex')}`;

let leader = false;

/**
 * Take or renew the lease. True when this process now holds it. The filter only
 * matches a lease that is ours or expired; when someone else holds a live one,
 * the upsert collides with its `_id` and that collision is the "no".
 */
export async function claimSchedulerLease(now: Date = new Date()): Promise<boolean> {
  try {
    await SchedulerLeaseModel.updateOne(
      { _id: LEASE_ID, $or: [{ owner: OWNER }, { expires_at: { $lt: now } }] },
      { $set: { owner: OWNER, expires_at: new Date(now.getTime() + LEASE_MS) } },
      { upsert: true }
    );
    return true;
  } catch (error) {
    if ((error as { code?: number })?.code === DUPLICATE_KEY) return false;
    throw error;
  }
}

/** Whether this process should run cluster-wide jobs right now. */
export const isSchedulerLeader = (): boolean => leader;

/** Start renewing the lease. After a redeploy the new container takes over once
 * the old one's lease runs out (at most 90 seconds), so at most one tick of each
 * job is skipped — never run twice. */
export function startSchedulerLease(): void {
  if (process.env.NODE_ENV === 'test') return;
  const renew = () => {
    claimSchedulerLease()
      .then((won) => {
        if (won !== leader) logs.server.info('scheduler-leader', 'lease', { leader: won, owner: OWNER });
        leader = won;
      })
      .catch((error) => {
        // Unknown whether the lease is still ours: stand down. Nobody else can
        // take it before it expires, so the worst case is one skipped tick.
        leader = false;
        logs.server.error('scheduler-leader', 'lease', { error, owner: OWNER });
      });
  };
  renew();
  setInterval(renew, RENEW_MS).unref?.();
}

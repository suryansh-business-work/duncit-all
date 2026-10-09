/**
 * Background job queues (BullMQ), gated on REDIS_QUEUE_URL.
 *
 * A SEPARATE Redis from the response cache on purpose. The cache runs with
 * `allkeys-lru`, which is right for a cache and fatal for a queue: under memory
 * pressure Redis would evict waiting jobs and nobody would ever hear of them.
 * The `redis-queue` compose service runs `noeviction` + AOF instead.
 *
 * Unset (local dev, tests) = no queue. `enqueue` then answers false and the
 * caller does the work inline, exactly as it did before queues existed — so the
 * server never NEEDS this Redis to boot or to serve a request, and removing the
 * variable is the rollback.
 */
import { Queue, Worker, type Job, type JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { logs } from '../observability/log';

/**
 * Applied to every job. `notifyEvent` and friends never throw, so the retries
 * only ever cover an unexpected throw; completed jobs are trimmed after a day so
 * the queue's Redis holds no message payloads longer than that.
 */
const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 5_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

const queues = new Map<string, Queue>();
let producer: Redis | null = null;
/** One warning per outage, never one per fan-out while it lasts. */
let outageReported = false;

const queueUrl = (): string => process.env.REDIS_QUEUE_URL?.trim() ?? '';

/**
 * The connection every producer queue shares, so `enqueue` can ask whether it
 * is up BEFORE adding. It has to ask: BullMQ waits for a connection to become
 * ready before running a command, offline queue or not, so an `add` against a
 * dead Redis never settles — and one that a timeout gave up on would still run
 * after a reconnect, sending every message a second time.
 */
function producerConnection(url: string): Redis {
  if (!producer) {
    const connection = new Redis(url, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 500, 10_000),
    });
    connection.on('ready', () => {
      outageReported = false;
    });
    // Reconnect noise; the outage itself is reported once, by `enqueue`.
    connection.on('error', () => undefined);
    producer = connection;
  }
  return producer;
}

function queueFor(name: string): Queue | null {
  const url = queueUrl();
  if (!url) return null;
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: producerConnection(url), defaultJobOptions: DEFAULT_JOB_OPTIONS });
    queue.on('error', (error) => logs.server.warn('queue', 'producer', { error, queue: name }));
    queues.set(name, queue);
  }
  return queue;
}

/**
 * Put jobs on a queue. True when they are queued; false when there is no queue,
 * its Redis is down, or it refused them — the caller must then do the work itself.
 */
export async function enqueue<T>(
  name: string,
  jobs: readonly { name: string; data: T }[]
): Promise<boolean> {
  const queue = queueFor(name);
  if (!queue || jobs.length === 0) return false;
  if (producer?.status !== 'ready') {
    if (!outageReported) {
      outageReported = true;
      logs.server.warn('queue', 'enqueue', { msg: 'Queue Redis not ready — working inline', queue: name });
    }
    return false;
  }
  try {
    await queue.addBulk(jobs.map((job) => ({ name: job.name, data: job.data })));
    return true;
  } catch (error) {
    logs.server.warn('queue', 'enqueue', { error, queue: name, count: jobs.length });
    return false;
  }
}

/**
 * Consume a queue in this process. A no-op without REDIS_QUEUE_URL.
 *
 * `globalConcurrency` caps jobs in flight across EVERY process consuming the
 * queue, not just this one — a provider that wants one request at a time still
 * gets one when the server runs as two containers.
 */
export function startWorker<T>(
  name: string,
  processor: (job: Job<T>) => Promise<unknown>,
  options: { globalConcurrency?: number } = {}
): void {
  const url = queueUrl();
  if (!url) return;
  // A worker blocks on Redis between jobs, so it must retry forever rather
  // than give up on a request (BullMQ requires `maxRetriesPerRequest: null`).
  const worker = new Worker<T>(name, processor, { connection: { url, maxRetriesPerRequest: null } });
  worker.on('failed', (job, error) =>
    logs.server.error('queue', 'job', { error, queue: name, job: job?.name, attempts: job?.attemptsMade })
  );
  worker.on('error', (error) => logs.server.warn('queue', 'worker', { error, queue: name }));
  const { globalConcurrency } = options;
  if (globalConcurrency) {
    queueFor(name)
      ?.setGlobalConcurrency(globalConcurrency)
      .catch((error: unknown) => logs.server.warn('queue', 'concurrency', { error, queue: name }));
  }
  logs.server.info('queue', 'worker', { msg: 'Worker started', queue: name });
}

import mongoose, { type ClientSession } from 'mongoose';
import { logs } from '@observability/log';

/**
 * Run work inside a Mongo transaction when the topology supports one.
 *
 * Atlas (production, staging) is a replica set and does; a standalone mongod
 * (local dev, mongodb-memory-server) does not, and answers any command carrying
 * a transaction number with IllegalOperation — "Transaction numbers are only
 * allowed on a replica set member or mongos".
 *
 * Support is probed ONCE per process and cached, so the same step sequence runs
 * either way and only the session handle differs. Two code paths for "with" and
 * "without" a transaction would mean the path production runs is not the path
 * anyone develops against.
 */

/** null until the first probe; then the answer for the life of the process. */
let transactionsSupported: boolean | null = null;

/** Read target for the probe. Reading a collection that does not exist is legal
 * inside a transaction, so the probe never depends on what is in the database. */
const PROBE_COLLECTION = 'txn_support_probe';

/** Error codes a topology WITHOUT transactions answers with. Anything else — a
 * stepdown, an election, a socket timeout — says nothing about the topology. */
const NO_TRANSACTION_CODES = new Set([
  20, // IllegalOperation — "Transaction numbers are only allowed on a replica set member or mongos"
  263, // OperationNotSupportedInTransaction
]);
const NO_TRANSACTION_MESSAGE = 'Transaction numbers are only allowed on a replica set';

/** True only when the failure IS the topology's answer, and so safe to cache. */
function isTopologyAnswer(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e?.code === 'number' && NO_TRANSACTION_CODES.has(e.code)) return true;
  return typeof e?.message === 'string' && e.message.includes(NO_TRANSACTION_MESSAGE);
}

/** @returns true/false when the topology answered, null when the probe could not
 * get an answer at all — an inconclusive probe must never be cached as "no". */
async function probeTransactionSupport(): Promise<boolean | null> {
  const db = mongoose.connection.db;
  if (!db) return null;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    // The probe has to issue a REAL command. `startTransaction()` is bookkeeping
    // inside the driver, and aborting a transaction that never sent anything is
    // resolved locally too — so a standalone mongod would sail through a probe
    // that only starts and aborts. A read is the cheapest command that carries
    // the transaction number the standalone rejects.
    await db.collection(PROBE_COLLECTION).findOne({}, { session });
    await session.abortTransaction();
    return true;
  } catch (error) {
    return isTopologyAnswer(error) ? false : null;
  } finally {
    await session.endSession();
  }
}

/** Probe + the one log line that says which mode this process is running in. */
async function detectTransactionSupport(): Promise<boolean | null> {
  const supported = await probeTransactionSupport();
  if (supported === true) {
    logs.server.info('db', 'withTransaction', {
      msg: 'Mongo transactions available — the payment finalize core commits atomically',
      supported,
    });
    return true;
  }
  if (supported === false) {
    logs.server.warn('db', 'withTransaction', {
      msg: 'Mongo transactions unavailable (standalone mongod) — the finalize core runs without a session',
      supported,
    });
    return false;
  }
  // Not an answer, a failure. Degrading the whole process to non-atomic
  // finalization off a transient error is how a payment silently loses its
  // rollback, so this stays uncached and is retried on the next call.
  logs.server.error('db', 'withTransaction', {
    msg: 'Mongo transaction support probe was inconclusive — assuming transactions and re-probing next call',
  });
  return null;
}

/**
 * Execute `fn` with a transaction session, or with `undefined` when the
 * topology has none. Callers thread the handle into every read and write they
 * perform; `{ session: undefined }` and `.session(null)` are no-ops for
 * Mongoose, so nothing has to branch on it.
 */
export async function withTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  transactionsSupported ??= await detectTransactionSupport();
  // ONLY a definite "this topology has none" runs the sequence unsessioned. An
  // inconclusive probe leaves the cache null (so the next call re-probes) and
  // still takes the transactional path — a replica set simply works, and a
  // topology that truly cannot will fail loudly instead of committing halfway.
  if (transactionsSupported === false) return fn(undefined);

  const session = await mongoose.startSession();
  try {
    // withTransaction retries the callback on TransientTransactionError and
    // WriteConflict. Everything the callback wrote is rolled back before a
    // retry, so a re-run starts from exactly the state the first attempt saw.
    return await session.withTransaction(fn, {
      writeConcern: { w: 'majority' },
      readPreference: 'primary',
    });
  } finally {
    await session.endSession();
  }
}

/** Test/bootstrap hook only — forces the next call to probe the topology again. */
export function resetTransactionSupportProbe(): void {
  transactionsSupported = null;
}

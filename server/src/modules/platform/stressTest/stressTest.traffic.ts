import { createHash, createHmac } from 'node:crypto';
import type { Request } from 'express';

/**
 * Which requests belong to a stress run.
 *
 * Every request a stress bot sends carries `x-duncit-stress: <key>`. The key is
 * minted per run, handed to the runner ONCE when it claims the run, and only
 * its hash is ever stored — so the header proves the request came from a run
 * this server started, and a person cannot borrow it to skip the rate limiter.
 *
 * Deliberately free of Mongoose and of any module import: the pulse middleware
 * and the rate limiter both ask this on every request, and the set is refreshed
 * by the stress sampler, which owns the database side.
 */
export const STRESS_HEADER = 'x-duncit-stress';

const activeHashes = new Set<string>();

/** Remembered per request, so the pulse and the rate limiter hash it once. */
const verdicts = new WeakMap<Request, boolean>();

export function hashTrafficKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * The run's traffic key, derived rather than stored.
 *
 * Every shard of a run claims it separately and each needs the same key, but a
 * stored key is a stored secret. Deriving it from the server's own signing
 * secret and the run's dispatch id gives every shard the same answer while the
 * database holds only its hash.
 */
export function trafficKeyFor(dispatchId: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return createHmac('sha256', secret).update(`stress-traffic:${dispatchId}`).digest('hex');
}

/** Replace the set of keys whose traffic is currently accepted as a stress run's. */
export function setActiveTrafficKeys(hashes: readonly string[]): void {
  activeHashes.clear();
  for (const hash of hashes) {
    if (hash) activeHashes.add(hash);
  }
}

export function isStressTraffic(req: Request): boolean {
  const known = verdicts.get(req);
  if (known !== undefined) return known;
  const raw = req.headers[STRESS_HEADER];
  const key = Array.isArray(raw) ? raw[0] : raw;
  const verdict = Boolean(key) && activeHashes.size > 0 && activeHashes.has(hashTrafficKey(String(key)));
  verdicts.set(req, verdict);
  return verdict;
}

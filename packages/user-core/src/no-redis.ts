/**
 * The `?noRedis=true` debug flag.
 *
 * Any portal or mWeb URL can carry `?noRedis=true|false`. The verdict is
 * sticky for the tab (sessionStorage) and every GraphQL request then sends
 * `x-no-redis: true`, which makes the server skip its Redis response cache and
 * answer straight from Mongo. `?noRedis=false` clears the stickiness.
 *
 * Lives here because both Apollo clients (the shell's and mWeb's) already
 * build their request headers from this package (see `getOrCreateDuid`).
 */

/** Same key on every surface — one browser tab is one debugging session. */
export const NO_REDIS_STORAGE_KEY = 'duncit_no_redis';

/** The header the server's redisResponseCache plugin reads. */
export const NO_REDIS_HEADER = 'x-no-redis';

/** Whether this tab asked for cache-bypassed responses. */
export function resolveNoRedisFlag(): boolean {
  if (globalThis.window === undefined) return false;
  try {
    const param = new URLSearchParams(globalThis.window.location.search).get('noRedis');
    if (param === 'true') {
      globalThis.sessionStorage.setItem(NO_REDIS_STORAGE_KEY, 'true');
    } else if (param === 'false') {
      globalThis.sessionStorage.removeItem(NO_REDIS_STORAGE_KEY);
    }
    return globalThis.sessionStorage.getItem(NO_REDIS_STORAGE_KEY) === 'true';
  } catch {
    // Private mode / disabled storage: no stickiness, honour only the URL.
    return false;
  }
}

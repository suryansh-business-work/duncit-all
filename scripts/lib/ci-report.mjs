/**
 * The transport every CI reporter shares: how to reach the Duncit GraphQL API
 * from a GitHub runner, how to authenticate as CI, and how to survive the
 * server being briefly absent.
 *
 * It lives here because two reporters need exactly this and nothing more —
 * `report-app-build.mjs` records a mobile build, `report-e2e-run.mjs` records an
 * end-to-end run — and a second copy would be a second place for the retry
 * window, the transient-status set and the credential fallback to drift. What
 * stays in each reporter is what makes it that reporter: which mutation it
 * calls and what it puts in it.
 *
 * Zero dependencies, on purpose. A reporter runs on a bare runner, often after
 * a failure, and `npm install` is one more thing that can be the reason a
 * finished job cannot say what it did.
 */
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * `fetch` reports every network-level failure as the same three words —
 * "fetch failed" — and hides the errno that says which failure it was on
 * `cause`. Printing only the message turns a DNS miss, a refused connection and
 * a connect timeout into one indistinguishable line, which is how a job can
 * fail twenty-eight times over without anyone learning what it could not reach.
 */
export function describeError(err) {
  const seen = [];
  let current = err;
  while (current && seen.length < 4) {
    const message = current instanceof Error ? current.message : String(current);
    if (message && !seen.includes(message)) seen.push(message);
    current = current.cause;
  }
  return seen.join(': ') || 'unknown error';
}

/** What nginx answers with while the container behind it is coming back up. */
const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Transient means "the server is not answering right now", which is worth
 * asking again. An ANSWER is not transient however unwelcome it is: a GraphQL
 * error or any other 4xx says the request itself is wrong, and repetition does
 * not improve it — retrying a schema mismatch would just take ten minutes to
 * report the same thing.
 */
export function isTransient(err) {
  if (err?.graphQLErrors) return false;
  if (typeof err?.status === 'number') return TRANSIENT_STATUS.has(err.status);
  // Everything undici raises for "could not complete the round trip" — refused,
  // timed out, reset, DNS — arrives as a TypeError carrying the errno on cause.
  return err instanceof TypeError;
}

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

/** What a reporter prints when it has no way to authenticate. */
export const MISSING_CREDENTIALS = [
  'no Duncit credentials — nothing can be recorded.',
  'Add ONE of these as GitHub Actions repo secrets:',
  '  • DUNCIT_RELEASE_TOKEN=<SUPER_ADMIN / TECH_MANAGER JWT>',
  '  • DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD (a TECH_MANAGER account)',
].join('\n');

/**
 * A GraphQL client for one endpoint, with ONE retry deadline fixed when it is
 * created.
 *
 * The deadline is shared rather than granted afresh to every call, because the
 * only thing that ever spends it is an unreachable server — and a server is
 * unreachable for all of them at once. A per-call window pays for one outage
 * three times over and still ends with the work thrown away; a shared one
 * spends that wall-clock once, and lets whichever call is in flight ride out
 * the whole of it.
 *
 * `retryWindowMs: 0` means no retry at all, which is the honest setting for a
 * cosmetic progress ping.
 */
export function createCiClient({ url, retryWindowMs = 0 }) {
  const deadline = Date.now() + retryWindowMs;

  async function gqlOnce(query, variables, token) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json().catch(() => ({}));
    if (json.errors?.length) {
      const err = new Error(json.errors[0].message || 'GraphQL error');
      err.graphQLErrors = json.errors;
      throw err;
    }
    if (!res.ok) {
      // Carried so isTransient can tell a gateway that is restarting from a
      // request the server has understood and rejected.
      const err = new Error(`GraphQL HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  /**
   * Try again, backing off, and give up only once the outage has outlived the
   * deadline rather than on the first refusal. A deadline already in the past
   * is how a caller asks for no retry at all.
   */
  async function withRetry(label, run, giveUpAt = deadline) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await run();
      } catch (err) {
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        if (!isTransient(err) || Date.now() + delay >= giveUpAt) throw err;
        console.warn(`⚠ ${label}: ${describeError(err)} — retrying in ${delay / 1000}s`);
        await sleep(delay);
      }
    }
  }

  const gql = (query, variables, token, giveUpAt) =>
    withRetry('server request failed', () => gqlOnce(query, variables, token), giveUpAt);

  /** The CI credential: a ready-made JWT, or an email/password pair to swap for one. */
  async function resolveToken() {
    if (process.env.DUNCIT_RELEASE_TOKEN) return process.env.DUNCIT_RELEASE_TOKEN;
    const email = process.env.DUNCIT_RELEASE_EMAIL;
    const password = process.env.DUNCIT_RELEASE_PASSWORD;
    if (!email || !password) return null;
    // undefined (not null): JSON.stringify drops the key, and the server's yup
    // schema rejects an explicit null portal_key.
    const data = await gql(
      'mutation($input: LoginInput!){ login(input:$input){ token } }',
      { input: { email, password, portal_key: process.env.DUNCIT_RELEASE_PORTAL_KEY || undefined } }
    );
    return data?.login?.token || null;
  }

  return { url, gql, gqlOnce, withRetry, resolveToken };
}

import { logs } from '@observability/log';

/**
 * The transport half of the server's WhatsApp gateway: HTTP, retries, timeouts
 * and redaction. It knows nothing about WhatsApp, AiSensy or GraphQL — the
 * vendor's field names and its idea of success live in `aisensy.gateway.ts`.
 *
 * This mirrors `packages/communication/src/transport.ts` deliberately.
 * `server/src` imports zero `@duncit/*` packages (project rule 40) because it
 * runs compiled `dist` on plain Node, so the shared package cannot resolve
 * here — the same reason `@duncit/slack` has a server-side twin. Change one,
 * change the other.
 */

/** Doubling backoff, capped. Five attempts across ~4s is a vendor blip, not an outage. */
const ATTEMPTS = 3;
const BACKOFF_MS = 300;
const MAX_BACKOFF_MS = 4000;
const TIMEOUT_MS = 15_000;

/** Fields never written to a log line. AiSensy carries its key in the BODY. */
const SECRET_KEYS = new Set(['apikey', 'api_key', 'authorization', 'token', 'password']);

export interface JsonResponse {
  status: number;
  ok: boolean;
  data: Record<string, any>;
}

/** A copy of `value` with every secret replaced, however deeply it is nested. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(entry);
  }
  return out;
}

/**
 * Worth trying again: the request never really landed (408), we were throttled
 * (429), or the vendor broke (5xx). A 4xx repeats identically — retrying it
 * only burns the rate limit.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Why the wire failed, in words a log row can carry.
 *
 * Node's `fetch` reports every connection-level failure as the same
 * `TypeError: fetch failed` and puts the actual reason — DNS, a refused
 * socket, undici's own connect timeout — on `cause`. Our abort arrives as an
 * `AbortError`. Three rows that said only "fetch failed" were the whole of
 * what the console had to say about an AiSensy outage.
 */
export function describeFetchError(error: unknown): string {
  const err = error as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (err?.name === 'AbortError') return `no answer within ${TIMEOUT_MS / 1000}s`;
  const cause = err?.cause;
  // Both when both exist: the code is what a reader greps for, the message is
  // where Node puts the host and port ("getaddrinfo ENOTFOUND backend.aisensy.com").
  if (cause?.code && cause.message) return `${cause.code} (${cause.message})`;
  if (cause?.code) return cause.code;
  if (cause?.message) return cause.message;
  return err?.message || String(error);
}

/** One attempt, abandoned if the vendor never answers. */
async function attemptOnce(url: string, body: Record<string, unknown>): Promise<JsonResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // A gateway error page is HTML, not JSON; the status still has to survive.
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    return { status: res.status, ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST JSON with retries. Returns the vendor's answer as-is — judging it is the
 * gateway's job, because "success" is vendor vocabulary.
 */
export async function postJson(url: string, body: Record<string, unknown>): Promise<JsonResponse> {
  const safeBody = redact(body);
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await attemptOnce(url, body);
      logs.server.debug('aisensy', 'transport', {
        attempt,
        status: response.status,
        durationMs: Date.now() - startedAt,
        body: safeBody,
      });
      if (!isRetryableStatus(response.status) || attempt === ATTEMPTS) return response;
    } catch (error) {
      lastError = error;
      logs.server.warn('aisensy', 'transport', {
        attempt,
        error,
        body: safeBody,
      });
      if (attempt === ATTEMPTS) break;
    }
    await wait(Math.min(BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS));
  }

  // Only reachable when every attempt threw — a returned response, retryable or
  // not, leaves through the loop above. The message is what the log row
  // records as the reason, so it says which failure and how many times, not
  // the bare "fetch failed" Node hands over.
  throw new Error(
    `Could not reach AiSensy after ${ATTEMPTS} attempt(s): ${describeFetchError(lastError)}`,
    { cause: lastError }
  );
}

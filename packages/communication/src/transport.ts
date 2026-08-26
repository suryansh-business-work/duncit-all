import { CommunicationProviderError } from './errors';
import type { CommunicationLogger } from './types';

/**
 * The wire, and nothing else.
 *
 * Kept apart from every provider on purpose: retries, timeouts, logging and
 * "which failures are worth trying again" are the same questions for AiSensy,
 * Twilio and Meta, and a provider that owned its own HTTP would answer them
 * three different ways. A provider decides WHAT to send; this decides how it
 * gets there and what to do when it does not arrive.
 */

export interface RetryPolicy {
  /** Total attempts, including the first. 1 disables retrying. */
  attempts: number;
  /** Delay before the first retry. Doubles each time. */
  backoffMs: number;
  /** Ceiling for the doubling, so a long retry chain cannot stall a request. */
  maxBackoffMs: number;
}

export const DEFAULT_RETRY: RetryPolicy = {
  attempts: 3,
  backoffMs: 300,
  maxBackoffMs: 4000,
};

export interface HttpRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  /**
   * Lower-cased response headers. Carried because a 429 says how long to wait
   * in `retry-after`, and that answer is not in the body.
   */
  headers: Record<string, string>;
}

export interface TransportOptions {
  /** Injectable so tests never touch the network and a host can supply its own. */
  fetchImpl?: typeof fetch;
  retry?: Partial<RetryPolicy>;
  /** Abort an attempt that never answers. Applies per attempt, not overall. */
  timeoutMs?: number;
  logger?: CommunicationLogger;
  /** Names this transport in errors and logs. */
  provider: string;
}

/** Keys whose values must never reach a log line. */
const SECRET_KEYS = new Set(['apikey', 'api_key', 'authorization', 'token', 'password']);

/**
 * A copy of the body with secrets replaced. Logging the request is how anyone
 * debugs a template mismatch at 2am; logging the API key with it is how the key
 * ends up in a support ticket.
 */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(inner);
  }
  return out;
}

/**
 * Worth trying again? A 429 or a 5xx is the provider having a moment; a 400 or
 * a 401 is the request itself, and repeating it just burns the rate limit.
 * A transport-level throw (DNS, socket, timeout) never reached the provider at
 * all, so it is always worth one more go.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Why the wire failed, in words a log row can carry.
 *
 * `fetch` reports every connection-level failure as the same
 * `TypeError: fetch failed` and puts the actual reason — DNS, a refused
 * socket, the runtime's own connect timeout — on `cause`. An abort from the
 * per-attempt timer arrives as an `AbortError`. Mirrored in the server's
 * `aisensy.transport.ts`; change one, change the other.
 */
export function describeFetchError(error: unknown, timeoutMs: number): string {
  const err = error as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (err?.name === 'AbortError') return `no answer within ${timeoutMs / 1000}s`;
  const cause = err?.cause;
  if (cause?.code) return cause.code;
  if (cause?.message) return cause.message;
  return err?.message || String(error);
}

/**
 * Response headers as a plain lower-cased object. A stubbed fetch in a test
 * rarely bothers with a `Headers` instance, and a missing header set must not
 * be the thing that breaks a send.
 */
function readHeaders(res: { headers?: unknown }): Record<string, string> {
  const source = res.headers;
  const out: Record<string, string> = {};
  if (!source || typeof (source as Headers).forEach !== 'function') return out;
  (source as Headers).forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

export class HttpTransport {
  private readonly fetchImpl: typeof fetch;
  private readonly retry: RetryPolicy;
  private readonly timeoutMs: number;
  private readonly logger?: CommunicationLogger;
  private readonly provider: string;

  constructor(options: TransportOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.retry = { ...DEFAULT_RETRY, ...options.retry };
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.logger = options.logger;
    this.provider = options.provider;
  }

  /** A logger that throws must not take the send down with it. */
  private log(event: Parameters<CommunicationLogger>[0]): void {
    try {
      this.logger?.(event);
    } catch {
      // Observability is never worth a failed message.
    }
  }

  /**
   * Send one request, retrying transient failures with exponential backoff.
   * Resolves with the response whatever its status — deciding what a body
   * MEANS is the provider's job, not the wire's.
   */
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retry.attempts; attempt += 1) {
      const startedAt = Date.now();
      this.log({
        provider: this.provider,
        phase: 'request',
        attempt,
        detail: {
          url: req.url,
          method: req.method ?? 'POST',
          body: redact(req.body),
        },
      });

      try {
        const response = await this.fetchOnce<T>(req);
        const durationMs = Date.now() - startedAt;

        // A retryable status with attempts left goes round again; anything else
        // is handed back for the provider to interpret.
        if (!response.ok && isRetryableStatus(response.status) && attempt < this.retry.attempts) {
          this.log({
            provider: this.provider,
            phase: 'error',
            attempt,
            durationMs,
            detail: { status: response.status, willRetry: true },
          });
          await wait(this.backoffFor(attempt));
          continue;
        }

        this.log({
          provider: this.provider,
          phase: 'response',
          attempt,
          durationMs,
          detail: { status: response.status },
        });
        return response;
      } catch (error) {
        lastError = error;
        this.log({
          provider: this.provider,
          phase: 'error',
          attempt,
          durationMs: Date.now() - startedAt,
          detail: {
            message: String(error),
            willRetry: attempt < this.retry.attempts,
          },
        });
        if (attempt < this.retry.attempts) await wait(this.backoffFor(attempt));
      }
    }

    // Every attempt threw before the provider answered.
    throw new CommunicationProviderError(
      `${this.provider} could not be reached after ${this.retry.attempts} attempt(s): ${describeFetchError(lastError, this.timeoutMs)}`,
      { provider: this.provider, retryable: true, cause: lastError },
    );
  }

  private backoffFor(attempt: number): number {
    return Math.min(this.retry.backoffMs * 2 ** (attempt - 1), this.retry.maxBackoffMs);
  }

  private async fetchOnce<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(req.url, {
        method: req.method ?? 'POST',
        headers: { 'Content-Type': 'application/json', ...req.headers },
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal: controller.signal,
      });
      // A provider that answers with HTML on an outage must not crash the parse.
      const data = (await res.json().catch(() => ({}))) as T;
      return { status: res.status, ok: res.ok, data, headers: readHeaders(res) };
    } finally {
      clearTimeout(timer);
    }
  }
}

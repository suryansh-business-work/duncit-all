import { GraphQLError } from 'graphql';
import { outboundFetch } from '@utils/outboundFetch';

/**
 * Every App Insights call to Google or Apple, with the retry and rate-limit
 * rules in one place.
 *
 * A read is retried when the far end said it is busy (429) or broken (5xx), or
 * when the connection dropped: waiting the time the store asked for
 * (Retry-After), or 1 s, 2 s, 4 s otherwise. Anything else — a refused
 * credential, a missing file — fails at once, since asking again would be
 * refused the same way. Writes (Apple's report request) are retried only on
 * 429, which means "not done, come back".
 */

/** Counts what one sync spent, for its log line. */
export interface SyncCounter {
  calls: number;
  retries: number;
}

export const newCounter = (): SyncCounter => ({ calls: 0, retries: 0 });

/** A store answered with an error. `status` says whether the answer might change. */
export class StoreHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'StoreHttpError';
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
export const MAX_ATTEMPTS = 4;
const BASE_WAIT_MS = 1_000;
/** A Retry-After longer than this is capped — a sync never sleeps for minutes. */
const MAX_WAIT_MS = 30_000;
const TIMEOUT_MS = 120_000;

/** How long to wait before attempt `attempt + 1`: what the store asked for, or doubling from 1 s. */
export function retryDelayMs(attempt: number, retryAfter: string | null): number {
  const asked = retryAfter === null ? Number.NaN : Number(retryAfter);
  const base = Number.isFinite(asked) && asked >= 0 ? asked * 1000 : BASE_WAIT_MS * 2 ** (attempt - 1);
  return Math.min(MAX_WAIT_MS, base);
}

/** The connection never completed or dropped — outboundFetch throws those as BAD_GATEWAY. */
const isTransport = (err: unknown): boolean => err instanceof GraphQLError && err.extensions?.code === 'BAD_GATEWAY';

export interface StoreRequest {
  service: string;
  url: string;
  init?: RequestInit;
  counter: SyncCounter;
  /** True for a write: retried only on 429. */
  write?: boolean;
  /** Test seam; the real sleep otherwise. */
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function canRetry(status: number, write: boolean): boolean {
  return write ? status === 429 : RETRYABLE_STATUS.has(status);
}

interface ErrorBody {
  errors?: Array<{ detail?: unknown; title?: unknown }>;
  error?: unknown;
  error_description?: unknown;
}

const firstText = (...values: unknown[]): string => {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
};

/** Apple's `errors[0]`, Google's `error.message` / `error_description` / `error` — the first that is text. */
export function errorReason(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as ErrorBody;
  const apple = Array.isArray(b.errors) ? b.errors[0] : undefined;
  const nested = b.error && typeof b.error === 'object' ? (b.error as { message?: unknown }).message : undefined;
  return firstText(apple?.detail, apple?.title, nested, b.error_description, b.error);
}

/** What the store said went wrong, in one line, without echoing anything we sent. */
async function reasonOf(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  return errorReason(body) || res.statusText || 'no reason given';
}

/** A successful response, after the retries the rules allow. Throws StoreHttpError with the store's words otherwise. */
export async function storeFetch(req: StoreRequest): Promise<Response> {
  const sleep = req.sleep ?? realSleep;
  const write = req.write ?? false;
  for (let attempt = 1; ; attempt += 1) {
    req.counter.calls += 1;
    let res: Response;
    try {
      res = await outboundFetch(req.service, req.url, { ...req.init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      if (write || !isTransport(err) || attempt >= MAX_ATTEMPTS) throw err;
      req.counter.retries += 1;
      await sleep(retryDelayMs(attempt, null));
      continue;
    }
    if (res.ok) return res;
    if (canRetry(res.status, write) && attempt < MAX_ATTEMPTS) {
      req.counter.retries += 1;
      await sleep(retryDelayMs(attempt, res.headers.get('retry-after')));
      continue;
    }
    throw new StoreHttpError(res.status, `${req.service} refused the request (HTTP ${res.status}): ${await reasonOf(res)}`);
  }
}

/** The response body as JSON. */
export async function storeJson<T = Record<string, unknown>>(req: StoreRequest): Promise<T> {
  const res = await storeFetch(req);
  return res.json().catch(() => ({})) as Promise<T>;
}

/** Report files are small for one app; anything past this is refused rather than held in memory. */
export const MAX_REPORT_BYTES = 200 * 1024 * 1024;

/** The response body as bytes, refusing one larger than MAX_REPORT_BYTES. */
export async function storeBytes(req: StoreRequest): Promise<Uint8Array> {
  const res = await storeFetch(req);
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_REPORT_BYTES) throw new Error(`${req.service} report is too large to read (${declared} bytes).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_REPORT_BYTES) {
    throw new Error(`${req.service} report is too large to read (${bytes.byteLength} bytes).`);
  }
  return bytes;
}

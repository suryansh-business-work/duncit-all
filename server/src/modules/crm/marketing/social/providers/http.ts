import { outboundFetch } from '@utils/outboundFetch';

/**
 * The one way this module talks to a social network: plain `fetch` through
 * `outboundFetch` (so a transport failure says what broke), JSON back, and a
 * non-2xx turned into a {@link SocialApiError} whose message is the provider's
 * own words rather than "HTTP 400".
 */

/** Meta's code for an access token that is invalid, expired or revoked. */
const META_INVALID_TOKEN = 190;

export class SocialApiError extends Error {
  readonly status: number;
  /** The token is dead: a person must reconnect before anything else works. */
  readonly expired: boolean;

  constructor(service: string, status: number, detail: string, expired: boolean) {
    super(`${service}: ${detail}`);
    this.name = 'SocialApiError';
    this.status = status;
    this.expired = expired;
  }
}

type ErrorBody = {
  error?: string | { message?: string; code?: number };
  error_description?: string;
  message?: string;
  detail?: string;
  title?: string;
  errors?: Array<{ message?: string }>;
};

/** Each provider nests its reason differently; the first one present wins. */
function reasonOf(body: ErrorBody): string {
  const nested = typeof body.error === 'object' ? body.error?.message : undefined;
  const flat = typeof body.error === 'string' ? body.error : undefined;
  return (
    nested ||
    body.error_description ||
    body.message ||
    body.detail ||
    body.errors?.[0]?.message ||
    body.title ||
    flat ||
    ''
  );
}

function isExpired(status: number, body: ErrorBody): boolean {
  if (status === 401) return true;
  return typeof body.error === 'object' && body.error?.code === META_INVALID_TOKEN;
}

/** A JSON call whose headers matter too (LinkedIn names a new post only in `x-restli-id`). */
export async function socialFetch<T>(service: string, url: string, init?: RequestInit): Promise<{ body: T; headers: Headers }> {
  const res = await outboundFetch(service, url, init);
  const body = (await res.json().catch(() => ({}))) as T & ErrorBody;
  if (!res.ok) {
    throw new SocialApiError(service, res.status, reasonOf(body) || `HTTP ${res.status}`, isExpired(res.status, body));
  }
  return { body, headers: res.headers };
}

export async function socialJson<T>(service: string, url: string, init?: RequestInit): Promise<T> {
  return (await socialFetch<T>(service, url, init)).body;
}

/** A JSON body POST with the caller's auth headers. */
export function postJson<T>(service: string, url: string, body: unknown, headers: Record<string, string>) {
  return socialFetch<T>(service, url, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * An image's bytes, for the networks that take an upload rather than a URL
 * (LinkedIn, X). Capped: a network's image limit is well under this, and a
 * mistyped video URL must not be read into memory whole.
 */
export async function downloadImage(service: string, url: string): Promise<{ bytes: ArrayBuffer; type: string }> {
  const res = await outboundFetch(service, url);
  if (!res.ok) throw new SocialApiError(service, res.status, `could not read the image (HTTP ${res.status})`, false);
  const size = Number(res.headers.get('content-length') ?? 0);
  if (size > MAX_IMAGE_BYTES) throw new SocialApiError(service, 413, 'the image is larger than 20 MB', false);
  const bytes = await res.arrayBuffer();
  return { bytes, type: res.headers.get('content-type') ?? 'image/jpeg' };
}

const PROBE_TIMEOUT_MS = 12_000;

/**
 * Hand a provider's token endpoint the app's keys and a code that cannot be
 * real. Every provider judges the CLIENT before the code, so "bad code" means
 * the keys were accepted and "bad client" means they were not — no person has
 * to sign in and nothing is created.
 */
export async function probeClient(
  url: string,
  init: RequestInit,
  clientRejected: (status: number, error: string) => boolean
): Promise<{ accepted: boolean; detail: string }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  const error = typeof body.error === 'string' ? body.error : '';
  if (res.ok) return { accepted: true, detail: '' };
  return { accepted: !clientRejected(res.status, error), detail: reasonOf(body) || `HTTP ${res.status}` };
}

/** The code handed to {@link probeClient} — plainly not one a provider issued. */
export const PROBE_CODE = 'duncit-connection-test';

/** An `application/x-www-form-urlencoded` POST — every OAuth token endpoint. */
export function postForm<T>(
  service: string,
  url: string,
  form: Record<string, string>,
  headers: Record<string, string> = {}
): Promise<T> {
  return socialJson<T>(service, url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(form).toString(),
  });
}

export const bearer = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

/** A token's expiry from its `expires_in` seconds; null when none was given. */
export const expiresAt = (seconds?: number | null): Date | null =>
  seconds ? new Date(Date.now() + seconds * 1000) : null;

/** A URL with its query built from `params`, leaving out empty values. */
export function withQuery(base: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return `${base}?${query.toString()}`;
}

/** A count the provider may send as a string, or leave out. */
export const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** The first `limit` characters of a post, for a comment's context line. */
export const firstLine = (text: string, limit = 140): string => text.replaceAll(/\s+/g, ' ').trim().slice(0, limit);

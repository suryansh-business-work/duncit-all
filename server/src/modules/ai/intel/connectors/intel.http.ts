import { describeFetchFailure } from '@utils/outboundFetch';

/**
 * Outbound JSON calls for the Slack, Gmail and GitHub connectors: a timeout on
 * every request, and a bounded wait-and-retry when the provider rate-limits
 * (429, or Slack's `ratelimited`) instead of failing the whole sync.
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRIES = 3;

export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeoutMs ?? 30_000) });
  } catch (err) {
    throw new ProviderError(describeFetchFailure(err) ?? 'The request failed', 0);
  }
  if (res.status === 429 && attempt < MAX_RETRIES) {
    const wait = Number(res.headers.get('retry-after') ?? '5');
    await sleep(Math.min(Math.max(wait, 1), 60) * 1000);
    return fetchJson<T>(url, init, attempt + 1);
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text.slice(0, 300) };
  }
  if (!res.ok) {
    const b = body as { message?: string; error?: { message?: string } | string } | null;
    const message = typeof b?.error === 'string' ? b.error : (b?.error?.message ?? b?.message ?? `HTTP ${res.status}`);
    throw new ProviderError(message, res.status);
  }
  return body as T;
}

/** Strips tags and collapses whitespace — email bodies that only came as HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

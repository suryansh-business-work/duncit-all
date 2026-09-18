import { API_TIMEOUT_MS, API_TTL_MS, GRAPHQL_URL } from './config';

/**
 * The server's only reach into the API: a POST with a hard timeout, answers
 * remembered for a minute. Any failure — slow, down, an error in the payload —
 * is `null`, and the caller falls back to the plain page.
 */
interface Remembered {
  at: number;
  data: unknown;
}

const memory = new Map<string, Remembered>();
const MEMORY_LIMIT = 500;

async function post<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-duncit-surface': 'WEBSITE', 'x-duncit-app': 'ecomm' },
      body: JSON.stringify({ query, variables }),
      signal: abort.signal,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: T | null; errors?: unknown[] };
    return body.errors?.length ? null : (body.data ?? null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function askApi<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  const key = JSON.stringify([query, variables]);
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < API_TTL_MS) return hit.data as T | null;
  const data = await post<T>(query, variables);
  if (memory.size >= MEMORY_LIMIT) memory.clear();
  memory.set(key, { at: Date.now(), data });
  return data;
}

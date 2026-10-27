import { GraphQLError, print, type DocumentNode } from 'graphql';
import { getUrlConfigs } from '@config/url-configs';
import { outboundFetch } from '@utils/outboundFetch';
import { LITE_ASSERTION_HEADER, liteSecret, signCallAssertion, signSchemaAssertion, type LiteCaller } from './lite.assertion';

/** No call to Lite waits longer than this; an AI client is waiting on the answer. */
const TIMEOUT_MS = 20_000;
const SERVICE = 'Duncit Lite';

const liteError = (message: string, code = 'LITE_UNAVAILABLE') => new GraphQLError(message, { extensions: { code } });

/** The configured Lite address without trailing slashes (a loop, not a backtracking pattern). */
export function trimSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

async function liteBase(): Promise<string> {
  return trimSlashes((await getUrlConfigs()).liteUrl);
}

/** Lite's whole schema as SDL — what the connector turns into tools. */
export async function fetchLiteSdl(): Promise<string> {
  const secret = await liteSecret();
  if (!secret) throw liteError('The Duncit Lite connector is off: LITE_MCP_SECRET is not set', 'LITE_NOT_CONFIGURED');
  const res = await outboundFetch(SERVICE, `${await liteBase()}/mcp/schema`, {
    headers: { [LITE_ASSERTION_HEADER]: signSchemaAssertion(secret), accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => ({}))) as { sdl?: unknown; error?: unknown };
  if (!res.ok || typeof body.sdl !== 'string') throw liteError(`Duncit Lite did not return its schema (HTTP ${res.status})`);
  return body.sdl;
}

/**
 * Run one Lite operation as `caller`. Lite's own resolvers decide what the
 * account may do; its errors come back as the tool's error, word for word.
 */
export async function runLiteOperation(document: DocumentNode, operationName: string, variables: Record<string, unknown>, caller: LiteCaller): Promise<unknown> {
  const secret = await liteSecret();
  if (!secret) throw liteError('The Duncit Lite connector is off: LITE_MCP_SECRET is not set', 'LITE_NOT_CONFIGURED');
  const res = await outboundFetch(SERVICE, `${await liteBase()}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', [LITE_ASSERTION_HEADER]: signCallAssertion(secret, caller) },
    body: JSON.stringify({ query: print(document), operationName, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown> | null; errors?: { message?: string; extensions?: { code?: string } }[] };
  const first = body.errors?.[0];
  if (first) throw liteError(first.message ?? 'Duncit Lite refused the call', first.extensions?.code ?? 'LITE_ERROR');
  if (!res.ok || !body.data) throw liteError(`Duncit Lite could not answer (HTTP ${res.status})`);
  return body.data;
}

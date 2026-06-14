import { ClientError, GraphQLClient, type Variables } from 'graphql-request';
import type { DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

import { config } from '@/constants/config';
import { ApiError } from '@/utils/errors';
import { getAuthToken } from '@/services/auth-token';

/**
 * Up to 2 retries (3 attempts) for transient transport failures on read-only
 * queries — the RN twin of mWeb's Apollo RetryLink, so the brief 5xx window
 * while the API container restarts during a deploy never surfaces a hard error.
 * Mutations are NEVER retried: they may not be idempotent, so a retry after a
 * blip (when the write may already have succeeded) could duplicate a charge.
 */
const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 400;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Only `query` operations are safe to retry (no server-side side effects). */
function isQuery(document: DocumentNode): boolean {
  return document.definitions.some(
    (def) => def.kind === 'OperationDefinition' && def.operation === 'query',
  );
}

/** Transient = transport/offline error or a 5xx server response. A timeout
 * (AbortError) and GraphQL / 4xx errors are surfaced at once, never retried. */
function isTransient(error: unknown): boolean {
  if (error instanceof ClientError) return error.response.status >= 500;
  if (error instanceof Error && error.name === 'AbortError') return false;
  return true;
}

/** Normalise any failure into an {@link ApiError} with a user-facing message. */
function toApiError(error: unknown): ApiError {
  // NB: check `Error` + name, NOT `instanceof DOMException` — React Native
  // (Hermes) has no `DOMException` global, so referencing it crashes.
  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError('The request timed out. Please try again.');
  }
  if (error instanceof ClientError) {
    const message = error.response.errors?.[0]?.message ?? 'Request failed.';
    return new ApiError(message, error.response.status);
  }
  return new ApiError('Network error. Check your connection and try again.');
}

/** One attempt with its own abort controller + timeout, so each retry gets a
 * fresh deadline rather than sharing one that may already have fired. */
async function attempt<TResult>(
  document: TypedDocumentNode<TResult, Variables> | DocumentNode,
  variables: Variables | undefined,
  headers: Record<string, string>,
): Promise<TResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const client = new GraphQLClient(`${config.apiUrl}/graphql`, {
      headers,
      signal: controller.signal,
    });
    return await client.request<TResult, Variables>(
      document as TypedDocumentNode<TResult, Variables>,
      variables,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Typed GraphQL client built on `graphql-request`. Posts codegen-produced
 * TypedDocumentNodes to the same server mWeb uses, attaches the bearer token
 * when `auth` is set, enforces a per-attempt timeout, retries transient query
 * failures, and normalises every failure into an {@link ApiError}.
 */
export async function graphqlRequest<TResult, TVars extends object = Record<string, never>>(
  document: TypedDocumentNode<TResult, TVars> | DocumentNode,
  variables?: TVars,
  options: { auth?: boolean } = {},
): Promise<TResult> {
  const headers: Record<string, string> = {};
  if (options.auth) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const canRetry = isQuery(document as DocumentNode);
  let lastError: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      return await attempt<TResult>(document, variables as Variables | undefined, headers);
    } catch (error) {
      lastError = error;
      const hasNextAttempt = i < MAX_ATTEMPTS - 1;
      if (!canRetry || !isTransient(error) || !hasNextAttempt) break;
      await sleep(BASE_RETRY_DELAY_MS * 3 ** i); // 400ms, then 1200ms
    }
  }
  throw toApiError(lastError);
}

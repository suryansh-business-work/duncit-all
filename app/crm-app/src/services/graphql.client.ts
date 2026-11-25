import { Platform } from 'react-native';
import { ClientError, GraphQLClient, type Variables } from 'graphql-request';
import type { DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { APP_HEADER, SURFACE_HEADER, nativePlatformHeaders } from '@duncit/user-core';

import { config } from '@/constants/config';
import { ApiError } from '@/utils/errors';
import { getToken } from '@/services/session';

/**
 * Typed GraphQL over graphql-request, the member app's pattern: codegen
 * documents, the bearer token, a per-attempt timeout, retries for read-only
 * queries on transport failures, and every failure as an ApiError. Mutations
 * are never retried — a call log or a reminder must not be written twice
 * because an answer was lost.
 */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

/** Headers that tell the server which system this is: the native CRM app. */
export const CLIENT_HEADERS: Record<string, string> = {
  [SURFACE_HEADER]: 'NATIVE',
  [APP_HEADER]: 'crm-app',
  ...nativePlatformHeaders(Platform.OS),
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const isQuery = (document: DocumentNode): boolean =>
  document.definitions.some((d) => d.kind === 'OperationDefinition' && d.operation === 'query');

/** Transport failures and 5xx are worth another try; GraphQL errors, 4xx and timeouts are not. */
export function isTransient(error: unknown): boolean {
  if (error instanceof ClientError) return error.response.status >= 500;
  return !(error instanceof Error && error.name === 'AbortError');
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof Error && error.name === 'AbortError')
    return new ApiError('The request timed out. Please try again.');
  if (error instanceof ClientError) {
    const first = error.response.errors?.[0];
    return new ApiError(
      first?.message ?? 'Request failed.',
      error.response.status,
      first?.extensions,
    );
  }
  return new ApiError('Network error. Check your connection and try again.');
}

async function attempt<T>(
  document: DocumentNode,
  variables: Variables | undefined,
  headers: Record<string, string>,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const client = new GraphQLClient(`${config.apiUrl}/graphql`, {
      headers,
      signal: controller.signal,
    });
    return await client.request<T, Variables>(
      document as TypedDocumentNode<T, Variables>,
      variables,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Run one typed operation as the signed-in user (or anonymously with `auth: false`). */
export async function gqlRequest<TResult, TVars extends object = Record<string, never>>(
  document: TypedDocumentNode<TResult, TVars>,
  variables?: TVars,
  options: { auth?: boolean; token?: string } = {},
): Promise<TResult> {
  const headers: Record<string, string> = { ...CLIENT_HEADERS };
  const token = options.token ?? (options.auth === false ? null : await getToken());
  if (token) headers.Authorization = `Bearer ${token}`;
  const tries = isQuery(document) ? MAX_ATTEMPTS : 1;
  let last: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      return await attempt<TResult>(document, variables as Variables | undefined, headers);
    } catch (error) {
      last = error;
      if (!isTransient(error) || i === tries - 1) break;
      await sleep(RETRY_DELAY_MS * (i + 1));
    }
  }
  throw toApiError(last);
}

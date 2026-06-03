import { ClientError, GraphQLClient, type Variables } from 'graphql-request';
import type { DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

import { config } from '@/constants/config';
import { ApiError } from '@/utils/errors';
import { getAuthToken } from '@/services/auth-token';

/**
 * Typed GraphQL client built on `graphql-request`. Posts codegen-produced
 * TypedDocumentNodes to the same server mWeb uses, attaches the bearer token
 * when `auth` is set, enforces a timeout, and normalises every failure into an
 * {@link ApiError}. Single responsibility — no business logic.
 */
export async function graphqlRequest<TResult, TVars extends object = Record<string, never>>(
  document: TypedDocumentNode<TResult, TVars> | DocumentNode,
  variables?: TVars,
  options: { auth?: boolean } = {},
): Promise<TResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const headers: Record<string, string> = {};
    if (options.auth) {
      const token = await getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const client = new GraphQLClient(`${config.apiUrl}/graphql`, {
      headers,
      signal: controller.signal,
    });
    return await client.request<TResult, Variables>(
      document as TypedDocumentNode<TResult, Variables>,
      variables as Variables | undefined,
    );
  } catch (error) {
    // NB: check `Error` + name, NOT `instanceof DOMException` — React Native
    // (Hermes) has no `DOMException` global, so referencing it crashes.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.');
    }
    if (error instanceof ClientError) {
      const message = error.response.errors?.[0]?.message ?? 'Request failed.';
      throw new ApiError(message, error.response.status);
    }
    throw new ApiError('Network error. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

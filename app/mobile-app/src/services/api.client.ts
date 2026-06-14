import { config } from '@/constants/config';
import { ApiError } from '@/utils/errors';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Thin fetch wrapper: JSON (de)serialisation, timeout, and typed error surface.
 * Single responsibility — no business logic lives here.
 */
export async function apiRequest<TResponse>(
  path: string,
  { body, headers, ...init }: RequestOptions = {},
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}.`, response.status);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    // NB: check `Error` + name, NOT `instanceof DOMException` — React Native
    // (Hermes) has no `DOMException` global, so referencing it throws and the
    // friendly timeout message is never reached. Mirrors `graphql.client.ts`.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

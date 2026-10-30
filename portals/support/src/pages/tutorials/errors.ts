import { firstGraphQLError } from '@duncit/utils';

const SELF_EXPLAINING = new Set(['BAD_USER_INPUT', 'CONFLICT']);

/**
 * A refused write (a bad link, a duplicate topic key, a topic still in use)
 * explains itself; anything else gets the console's own sentence rather than a
 * transport message.
 */
export function saveErrorMessage(cause: unknown, fallback: string): string {
  const gqlError = firstGraphQLError(cause);
  const code = gqlError?.extensions?.code;
  if (typeof code === 'string' && SELF_EXPLAINING.has(code) && gqlError?.message) return gqlError.message;
  return fallback;
}

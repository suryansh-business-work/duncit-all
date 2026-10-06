import { firstGraphQLError } from '@duncit/utils';

/** Codes whose server message is written for the person who caused it. */
const SPEAKS_FOR_ITSELF = new Set(['BAD_USER_INPUT', 'CONFLICT', 'NOT_FOUND']);

/**
 * What to tell the editor when a CMS call fails: the server's own sentence for
 * a refusal they can act on (a taken path, a stale draft), and the console's
 * fallback for anything else — never a transport message.
 */
export function cmsErrorMessage(error: unknown, fallback: string): string {
  const gqlError = firstGraphQLError(error);
  const code = gqlError?.extensions?.code;
  return typeof code === 'string' && SPEAKS_FOR_ITSELF.has(code) && gqlError?.message ? gqlError.message : fallback;
}

/** True when the server refused a save because someone else saved first. */
export const isConflict = (error: unknown) => firstGraphQLError(error)?.extensions?.code === 'CONFLICT';

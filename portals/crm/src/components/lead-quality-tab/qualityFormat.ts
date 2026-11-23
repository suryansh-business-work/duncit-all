import { firstGraphQLError, parseApiError } from '@duncit/utils';

const POINTS = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

/** Points and scores as the breakdown prints them: whole numbers stay whole, halves keep one decimal. */
export const formatPoints = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? POINTS.format(value) : '—';

/**
 * Why the server refused a write. A refused evidence decision comes back as
 * BAD_USER_INPUT with every problem in `extensions.errors`; anything else
 * (network, permission) is one message.
 */
export function refusalMessages(err: unknown): string[] {
  const listed = firstGraphQLError(err)?.extensions?.errors;
  if (Array.isArray(listed)) {
    const messages = listed.filter((message): message is string => typeof message === 'string' && message.trim() !== '');
    if (messages.length > 0) return messages;
  }
  return [parseApiError(err)];
}

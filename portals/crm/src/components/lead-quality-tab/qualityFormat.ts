import { crmFormatPoints, crmListedRefusals, firstGraphQLError, parseApiError } from '@duncit/utils';

/** Points and scores as the breakdown prints them (shared with the Duncit CRM app in @duncit/utils). */
export const formatPoints = crmFormatPoints;

/**
 * Why the server refused a write. A refused evidence decision comes back as
 * BAD_USER_INPUT with every problem in `extensions.errors`; anything else
 * (network, permission) is one message.
 */
export function refusalMessages(err: unknown): string[] {
  return crmListedRefusals(firstGraphQLError(err)?.extensions) ?? [parseApiError(err)];
}

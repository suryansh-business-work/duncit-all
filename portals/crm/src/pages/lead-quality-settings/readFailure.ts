import { leadQualityFailure, type LeadQualityFailure } from '@duncit/forms/schemas';
import { firstGraphQLError, parseApiError } from '@duncit/utils';

/** What a refused settings write means for the page (shared with the Duncit CRM app). */
export type SettingsFailure = LeadQualityFailure;

/** Reads a thrown save/publish/restore error: its code and, when the server listed them, the issues. */
export function readFailure(error: unknown): SettingsFailure {
  return leadQualityFailure(firstGraphQLError(error)?.extensions, parseApiError(error));
}

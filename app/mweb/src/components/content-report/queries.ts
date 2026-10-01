import { gql } from '@apollo/client';
import { REPORT_CATEGORIES_SDL, REPORT_POST_SDL } from '@duncit/utils';

/**
 * The report operations. Their source is single-sourced from @duncit/utils so
 * this app and the native one send exactly the same documents (rule 27).
 */

/** The reasons the report dialog offers, as Legal has arranged them. */
export const REPORT_CATEGORIES = gql(REPORT_CATEGORIES_SDL);

/** Flag a post or a story for the Legal team. Open to any signed-in viewer. */
export const REPORT_POST = gql(REPORT_POST_SDL);

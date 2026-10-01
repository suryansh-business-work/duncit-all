import gql from 'graphql-tag';
import { REPORT_CATEGORIES_SDL, REPORT_POST_SDL } from '@duncit/utils';

/**
 * The report operations. Their source is single-sourced from @duncit/utils so
 * mWeb and this app send exactly the same documents (rule 27).
 */

/** The reasons the report sheet offers, as Legal has arranged them. */
export const ReportCategoriesDocument = gql(REPORT_CATEGORIES_SDL);

/** Flag a post or a story for the Legal team. Open to any signed-in viewer. */
export const ReportPostDocument = gql(REPORT_POST_SDL);

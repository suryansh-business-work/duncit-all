import gql from 'graphql-tag';
import {
  BLOCK_USER_SDL,
  REPORT_CATEGORIES_SDL,
  REPORT_POST_SDL,
  REPORT_PROFILE_SDL,
  UNBLOCK_USER_SDL,
} from '@duncit/utils';

/**
 * The report and block operations. Their source is single-sourced from
 * @duncit/utils so mWeb and this app send exactly the same documents (rule 27).
 */

/** The reasons the report sheet offers, as Legal has arranged them. */
export const ReportCategoriesDocument = gql(REPORT_CATEGORIES_SDL);

/** Flag a post or a story for the Legal team. Open to any signed-in viewer. */
export const ReportPostDocument = gql(REPORT_POST_SDL);

/** Flag a member's profile for the Legal team. */
export const ReportProfileDocument = gql(REPORT_PROFILE_SDL);

/** Block / unblock a member from their profile. */
export const BlockUserDocument = gql(BLOCK_USER_SDL);
export const UnblockUserDocument = gql(UNBLOCK_USER_SDL);

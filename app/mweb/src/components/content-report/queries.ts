import { gql } from '@apollo/client';
import {
  BLOCK_USER_SDL,
  MY_OPEN_REPORT_SDL,
  REPORT_CATEGORIES_SDL,
  REPORT_CHAT_MESSAGE_SDL,
  REPORT_POST_SDL,
  REPORT_PROFILE_SDL,
  UNBLOCK_USER_SDL,
  type ReportDialogKind,
} from '@duncit/utils';

/**
 * The report and block operations. Their source is single-sourced from
 * @duncit/utils so this app and the native one send exactly the same
 * documents (rule 27).
 */

/** The reasons the report dialog offers, as Legal has arranged them. */
export const REPORT_CATEGORIES = gql(REPORT_CATEGORIES_SDL);

/** The viewer's own still-open report on the thing, or null. */
export const MY_OPEN_REPORT = gql(MY_OPEN_REPORT_SDL);

/** Flag a post or a story for the Legal team. Open to any signed-in viewer. */
export const REPORT_POST = gql(REPORT_POST_SDL);

/** Flag a member's profile for the Legal team. */
export const REPORT_PROFILE = gql(REPORT_PROFILE_SDL);

/** Flag a line in a pod's or club's chat for the Legal team. */
export const REPORT_CHAT_MESSAGE = gql(REPORT_CHAT_MESSAGE_SDL);

/** The mutation each report kind files through; posts and stories share one. */
export const REPORT_MUTATION_OF: Record<ReportDialogKind, typeof REPORT_POST> = {
  STORY: REPORT_POST,
  POST: REPORT_POST,
  PROFILE: REPORT_PROFILE,
  MESSAGE: REPORT_CHAT_MESSAGE,
};

/** Block / unblock a member from their profile. */
export const BLOCK_USER = gql(BLOCK_USER_SDL);
export const UNBLOCK_USER = gql(UNBLOCK_USER_SDL);

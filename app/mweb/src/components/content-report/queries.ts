import { gql } from '@apollo/client';
import {
  BLOCK_USER_SDL,
  REPORT_CATEGORIES_SDL,
  REPORT_POST_SDL,
  REPORT_PROFILE_SDL,
  UNBLOCK_USER_SDL,
} from '@duncit/utils';

/**
 * The report and block operations. Their source is single-sourced from
 * @duncit/utils so this app and the native one send exactly the same
 * documents (rule 27).
 */

/** The reasons the report dialog offers, as Legal has arranged them. */
export const REPORT_CATEGORIES = gql(REPORT_CATEGORIES_SDL);

/** Flag a post or a story for the Legal team. Open to any signed-in viewer. */
export const REPORT_POST = gql(REPORT_POST_SDL);

/** Flag a member's profile for the Legal team. */
export const REPORT_PROFILE = gql(REPORT_PROFILE_SDL);

/** Block / unblock a member from their profile. */
export const BLOCK_USER = gql(BLOCK_USER_SDL);
export const UNBLOCK_USER = gql(UNBLOCK_USER_SDL);

/**
 * Club Admin host engagement & performance (Admin > Pods > Pod Settings >
 * "Host engagement & performance"): the ranges the Pod Settings cards accept.
 *
 * The server keeps the same numbers as twins (it has no @duncit deps) and
 * clamps anything outside them, so a card refusing a value here is a card that
 * never saves a number the server would quietly change.
 */

/** Days without a completed pod before a host is flagged inactive. */
export const DEFAULT_HOST_INACTIVITY_DAYS = 14;
export const MIN_HOST_INACTIVITY_DAYS = 1;
export const MAX_HOST_INACTIVITY_DAYS = 90;

/** Completed pods per calendar month that score a host 100%. */
export const DEFAULT_HOST_MONTHLY_POD_TARGET = 8;
export const MIN_HOST_MONTHLY_POD_TARGET = 1;
export const MAX_HOST_MONTHLY_POD_TARGET = 100;

/** Day of the month the monthly performance messages go out (28 so every month has it). */
export const DEFAULT_HOST_PERFORMANCE_NOTIFY_DAY = 1;
export const MIN_HOST_PERFORMANCE_NOTIFY_DAY = 1;
export const MAX_HOST_PERFORMANCE_NOTIFY_DAY = 28;

/** A host scoring below this percent of the target is "underperforming" (100 = any miss). */
export const DEFAULT_HOST_UNDERPERFORM_THRESHOLD_PCT = 100;
export const MIN_HOST_UNDERPERFORM_THRESHOLD_PCT = 1;
export const MAX_HOST_UNDERPERFORM_THRESHOLD_PCT = 100;

/** The most engagement statuses an admin may configure. */
export const MAX_HOST_ENGAGEMENT_STATUSES = 20;
/** The longest a status label may be. */
export const MAX_HOST_ENGAGEMENT_LABEL_LENGTH = 40;

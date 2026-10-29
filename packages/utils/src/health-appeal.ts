/**
 * Appealing an account- or venue-health deduction — the enums and the
 * enum→copy tables.
 *
 * mWeb and the native app render the Appeal button and its status on the
 * health history, and the Legal portal renders the same reasons and statuses
 * in its queue, so they live here once (rule 40). Dependency-free on purpose:
 * the native app imports it the same way the MUI surfaces do.
 *
 * The tables map an enum the SERVER stores to a translation KEY, never to
 * English. The literal key strings below are what the shipped-key gate greps
 * for, and what `t()` is called with at each call site.
 */

/** Why the person says a deduction should be lifted. Mirrors `HealthAppealReason`. */
export type HealthAppealReason = 'WONT_HAPPEN_AGAIN' | 'INCORRECT';

/** Where Legal has taken it. Mirrors `HealthAppealStatus`. */
export type HealthAppealStatus = 'PENDING' | 'ACCEPTED' | 'DENIED';

/** The reasons, in the order the appeal form offers them. */
export const HEALTH_APPEAL_REASONS: readonly HealthAppealReason[] = ['WONT_HAPPEN_AGAIN', 'INCORRECT'];

export const HEALTH_APPEAL_STATUSES: readonly HealthAppealStatus[] = ['PENDING', 'ACCEPTED', 'DENIED'];

/** The longest explanation the server stores; the form stops at the same length. */
export const HEALTH_APPEAL_MESSAGE_MAX = 1000;

const REASON_VALUES: readonly string[] = HEALTH_APPEAL_REASONS;

/** True for a reason the server accepts — what narrows a form's string to the enum. */
export function isHealthAppealReason(value: string): value is HealthAppealReason {
  return REASON_VALUES.includes(value);
}

export const HEALTH_APPEAL_REASON_KEY: Record<HealthAppealReason, string> = {
  WONT_HAPPEN_AGAIN: 'healthAppeal.reason.wontHappenAgain',
  INCORRECT: 'healthAppeal.reason.incorrect',
};

export const HEALTH_APPEAL_STATUS_KEY: Record<HealthAppealStatus, string> = {
  PENDING: 'healthAppeal.status.pending',
  ACCEPTED: 'healthAppeal.status.accepted',
  DENIED: 'healthAppeal.status.denied',
};

/** MUI chip colour per status; the native app maps the same three tones. */
export const HEALTH_APPEAL_STATUS_COLOR: Record<HealthAppealStatus, 'warning' | 'success' | 'default'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DENIED: 'default',
};

/** The fields of one health history row this module reads. */
export interface AppealableAdjustment {
  delta: number;
  waived: boolean;
  appeal_status?: HealthAppealStatus | null;
}

/**
 * What a health history row shows about appeals: the Appeal button, the status
 * of the appeal already filed, or nothing.
 *
 * Only a deduction that still counts can be appealed, and only once — the
 * server refuses anything else, and this keeps the button off rows it would
 * refuse. A bonus never offers one.
 */
export function healthAppealStateOf(row: AppealableAdjustment): 'APPEALABLE' | HealthAppealStatus | null {
  if (row.appeal_status) return row.appeal_status;
  if (row.delta < 0 && !row.waived) return 'APPEALABLE';
  return null;
}

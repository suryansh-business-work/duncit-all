/**
 * The names `freeJustificationFields` (`@duncit/forms/schemas`) gives the
 * justification's three fields — Create Pod and the resubmit sheet both hold
 * them under these, so either binds FreeArrangementFields with this one map.
 */
export const FREE_JUSTIFICATION_NAMES = {
  reason: 'free_reason',
  details: 'free_details',
  accepted: 'free_accepted',
} as const;

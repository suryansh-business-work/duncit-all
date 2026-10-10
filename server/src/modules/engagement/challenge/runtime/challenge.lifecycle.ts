import { GraphQLError } from 'graphql';

/**
 * The pod-challenge lifecycle, as the only place transitions are decided.
 *
 *   DRAFT → SCHEDULED → LIVE ⇄ PAUSED → COMPLETED → ARCHIVED
 *   (any open state) → CANCELLED → ARCHIVED
 *
 * A COMPLETED challenge is frozen for scoring; publishing its result does not
 * change the status, so a correction can republish without reopening play.
 */

export const CHALLENGE_STATUSES = ['DRAFT', 'SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const CHALLENGE_ACTIONS = ['SCHEDULE', 'UNSCHEDULE', 'START', 'PAUSE', 'RESUME', 'COMPLETE', 'CANCEL', 'ARCHIVE'] as const;
export type ChallengeAction = (typeof CHALLENGE_ACTIONS)[number];

const TRANSITIONS: Record<ChallengeAction, { from: readonly ChallengeStatus[]; to: ChallengeStatus }> = {
  SCHEDULE: { from: ['DRAFT'], to: 'SCHEDULED' },
  UNSCHEDULE: { from: ['SCHEDULED'], to: 'DRAFT' },
  START: { from: ['DRAFT', 'SCHEDULED'], to: 'LIVE' },
  PAUSE: { from: ['LIVE'], to: 'PAUSED' },
  RESUME: { from: ['PAUSED'], to: 'LIVE' },
  COMPLETE: { from: ['LIVE', 'PAUSED'], to: 'COMPLETED' },
  CANCEL: { from: ['DRAFT', 'SCHEDULED', 'LIVE', 'PAUSED'], to: 'CANCELLED' },
  ARCHIVE: { from: ['COMPLETED', 'CANCELLED'], to: 'ARCHIVED' },
};

export function nextStatus(current: string, action: ChallengeAction): ChallengeStatus {
  const rule = TRANSITIONS[action];
  if (!rule?.from.includes(current as ChallengeStatus)) {
    throw new GraphQLError(`Cannot ${action.toLowerCase()} a ${current.toLowerCase()} challenge`, {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  return rule.to;
}

/** Actions the given status allows, for the host's controls. */
export function allowedActions(current: string): ChallengeAction[] {
  return CHALLENGE_ACTIONS.filter((a) => TRANSITIONS[a].from.includes(current as ChallengeStatus));
}

/** Statuses a non-manager may ever see (drafts and cancelled ones stay with the host). */
export const VIEWABLE_STATUSES: readonly ChallengeStatus[] = ['SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];


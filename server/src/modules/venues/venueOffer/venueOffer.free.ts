/**
 * The justification a host gives for a free arrangement — a FREE venue offer or
 * a FREE pod. Duncit allows free only for initiatives, promotions and approved
 * campaigns, so the host names the reason, explains it when it is "other", and
 * accepts the free policy; the server stamps who accepted it and when, and
 * Duncit monitors every one (Pods portal > Free Arrangements). The details are
 * shown to the venue, so they pass the chat's content rules.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { moderateText } from '@modules/moderation/moderation.rules';
import { FREE_REASONS, type FreeJustification, type FreeJustificationInput, type FreeReason } from './venueOffer.types';

/** Bounds on the details a host writes. */
export const FREE_DETAILS_LIMITS = { min: 3, max: 300 } as const;

const bad = (message: string, reason: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', reason, field: 'free_justification' } });

const isFreeReason = (value: unknown): value is FreeReason => (FREE_REASONS as readonly unknown[]).includes(value);

/**
 * The justification checked and stamped: a known reason, details within bounds
 * (required for OTHER), the policy accepted. `userId` is who accepted it.
 */
export function cleanFreeJustification(
  raw: FreeJustificationInput | null | undefined,
  userId: string,
  at = new Date()
): FreeJustification {
  if (!isFreeReason(raw?.reason)) {
    throw bad('Pick why this is free: an initiative, a promotion, a campaign or another reason', 'FREE_REASON_REQUIRED');
  }
  const details = String(raw?.details ?? '').replaceAll(/\s+/g, ' ').trim();
  if (details.length > FREE_DETAILS_LIMITS.max) {
    throw bad(`Keep the reason under ${FREE_DETAILS_LIMITS.max} characters`, 'FREE_DETAILS_TOO_LONG');
  }
  if (raw.reason === 'OTHER' && details.length < FREE_DETAILS_LIMITS.min) {
    throw bad('Tell Duncit why this is free', 'FREE_DETAILS_REQUIRED');
  }
  if (details) {
    const [first] = moderateText('free_justification', details);
    if (first) throw bad(first.message, 'MODERATION_BLOCKED');
  }
  if (raw?.accepted !== true) {
    throw bad("Accept Duncit's policy for free pods and venues to continue", 'FREE_POLICY_NOT_ACCEPTED');
  }
  if (!Types.ObjectId.isValid(userId)) throw bad('Sign in to make this free', 'FREE_POLICY_NOT_ACCEPTED');
  return { reason: raw.reason, details, accepted_at: at, accepted_by: new Types.ObjectId(userId) };
}

/** A stored justification as the API shows it (who accepted it stays server-side). */
export const freeJustificationOut = (j: FreeJustification | null | undefined) =>
  j ? { reason: j.reason, details: j.details ?? '', accepted_at: j.accepted_at ? new Date(j.accepted_at).toISOString() : null } : null;

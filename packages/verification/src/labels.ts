import type { VerificationStatus, VerificationTone, VerificationType } from './types';

/**
 * Localization keys for the three verification types (CLAUDE.md rule 38).
 *
 * The package ships keys, never sentences: mWeb rendered `'Identity'` as a
 * literal while the partner console already resolved the same word through the
 * catalogue, so one surface translated and the other did not.
 */
export const VERIFICATION_LABEL_KEYS: Record<VerificationType, string> = {
  IDENTITY: 'verification.typeIdentity',
  ADDRESS: 'verification.typeAddress',
  EMAIL: 'verification.typeEmail',
};

/** Status chip copy and weight — one table, read by every surface. */
export const STATUS_META: Record<
  VerificationStatus,
  { labelKey: string; tone: VerificationTone }
> = {
  NOT_SUBMITTED: { labelKey: 'verification.statusNotSubmitted', tone: 'neutral' },
  PENDING: { labelKey: 'verification.statusPending', tone: 'pending' },
  APPROVED: { labelKey: 'verification.statusApproved', tone: 'success' },
  REJECTED: { labelKey: 'verification.statusRejected', tone: 'error' },
  VERIFIED_BY_APP: { labelKey: 'verification.statusVerifiedByApp', tone: 'success' },
};

/** Tone → MUI `<Chip color>`, for mWeb and the portals. */
export const TONE_CHIP_COLOR: Record<VerificationTone, 'default' | 'warning' | 'success' | 'error'> =
  {
    neutral: 'default',
    pending: 'warning',
    success: 'success',
    error: 'error',
  };

/** Tone → the hex the native chip fills with, matching the app's semantic palette. */
export const TONE_HEX: Record<VerificationTone, string> = {
  neutral: '#9aa0a6',
  pending: '#fb8c00',
  success: '#22c55e',
  error: '#e53935',
};

/** Statuses that mean the verification is finished and the tick turns on. */
const SETTLED = new Set<VerificationStatus>(['APPROVED', 'VERIFIED_BY_APP']);

/**
 * Statuses that take the action control away.
 *
 * Approved is finished; under review is somebody else's turn. Replacing the
 * document or the address mid-review means an admin approves one submission
 * having read another, so the control is gone until there is a verdict — the
 * server refuses the second submission either way.
 */
const LOCKED = new Set<VerificationStatus>(['APPROVED', 'PENDING']);

/** True once the verification is settled — the surface shows a filled tick. */
export function isVerificationSettled(status: VerificationStatus): boolean {
  return SETTLED.has(status);
}

/** True while the user may not submit again — approved, or already under review. */
export function isVerificationLocked(status: VerificationStatus): boolean {
  return LOCKED.has(status);
}

/**
 * The reject reason worth showing: only a REJECTED row carries one.
 *
 * `reject_reason` is optional here because each surface's GraphQL codegen marks
 * selected fields differently — the native app's generated row has it optional.
 * The package accepts what the callers actually hold rather than making three
 * call sites cast.
 */
export function rejectReasonOf(
  item: Readonly<{ status: VerificationStatus; reject_reason?: string | null }>,
): string | null {
  if (item.status !== 'REJECTED') return null;
  return item.reject_reason ?? null;
}

/** The upload button's idle copy — first submission reads differently to a replacement. */
export function uploadLabelKey(status: VerificationStatus): string {
  if (status === 'NOT_SUBMITTED') return 'verification.upload';
  return 'verification.reupload';
}

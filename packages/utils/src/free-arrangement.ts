/**
 * Free arrangements — a FREE pod, or a FREE venue booking (the venue gives the
 * window for nothing). Duncit allows them only for initiatives, promotions and
 * approved campaigns, so whoever picks "Free" says why and accepts the free
 * policy; the venue still approves (accept or decline — nobody counters a free
 * booking), and Duncit audits every one. Shared by mWeb, the native app, the
 * Partners and Pods consoles (rules 29 + 56): the reasons, their keys, the
 * policy's keys and the input the server takes (`FreeJustificationInput`).
 */

/** Why something is free (`FreeArrangementReason`), in the order the pickers list them. */
export const FREE_REASONS = ['INITIATIVE', 'PROMOTIONAL', 'CAMPAIGN', 'OTHER'] as const;
export type FreeReason = (typeof FREE_REASONS)[number];

/** Each reason's label key. */
export const FREE_REASON_KEY: Readonly<Record<FreeReason, string>> = {
  INITIATIVE: 'availability.freeArrangement.reason.initiative',
  PROMOTIONAL: 'availability.freeArrangement.reason.promotional',
  CAMPAIGN: 'availability.freeArrangement.reason.campaign',
  OTHER: 'availability.freeArrangement.reason.other',
};

/** Whether a plain string (either app's generated enum value) is a reason. */
export const isFreeReason = (value: string | null | undefined): value is FreeReason =>
  !!value && (FREE_REASONS as readonly string[]).includes(value);

/** The reason's label key, or '' for one this client does not know. */
export const freeReasonKey = (value: string | null | undefined): string => (isFreeReason(value) ? FREE_REASON_KEY[value] : '');

/** The server's bounds on the details (venueOffer.free `FREE_DETAILS_LIMITS`). */
export const FREE_DETAILS_LIMITS = { min: 3, max: 300 } as const;

/**
 * The free policy's copy, in reading order: the notice beside "Free", the
 * dialog "More details" opens, the acceptance, and the warning on misuse.
 */
export const FREE_POLICY_KEYS = {
  title: 'availability.freeArrangement.policy.title',
  paragraphs: [
    'availability.freeArrangement.policy.permitted',
    'availability.freeArrangement.policy.venueApproval',
    'availability.freeArrangement.policy.transparency',
  ],
  moreDetails: 'availability.freeArrangement.policy.moreDetails',
  detailsTitle: 'availability.freeArrangement.policy.detailsTitle',
  detailsPoints: [
    'availability.freeArrangement.policy.detailsReasons',
    'availability.freeArrangement.policy.detailsVenue',
    'availability.freeArrangement.policy.detailsNoCounter',
    'availability.freeArrangement.policy.detailsAudit',
    'availability.freeArrangement.policy.detailsRevoke',
  ],
  close: 'availability.freeArrangement.policy.close',
  accept: 'availability.freeArrangement.policy.accept',
  warning: 'availability.freeArrangement.policy.warning',
  reasonLabel: 'availability.freeArrangement.reasonLabel',
  detailsLabel: 'availability.freeArrangement.detailsLabel',
  detailsHelp: 'availability.freeArrangement.detailsHelp',
} as const;

/** The validation messages a free justification can fail with. */
export const FREE_VALIDATION_KEYS = {
  reason: 'availability.freeArrangement.validation.reason',
  details: 'availability.freeArrangement.validation.details',
  detailsTooLong: 'availability.freeArrangement.validation.detailsTooLong',
  accept: 'availability.freeArrangement.validation.accept',
} as const;

/** What a pod or a venue offer sends (`FreeJustificationInput`). */
export interface FreeJustificationInput {
  reason: FreeReason;
  details: string;
  accepted: boolean;
}

/** What a form holds for one. */
export interface FreeJustificationSource {
  reason: string | null | undefined;
  details?: string | null;
  accepted?: boolean | null;
}

/** The details as the server keeps them: one line, trimmed. */
export const freeDetailsOf = (details: string | null | undefined): string => String(details ?? '').split(/\s+/).filter(Boolean).join(' ');

/** Which message a justification fails with, or null when it can be sent. Mirrors the server's checks. */
export function freeJustificationProblem(source: Readonly<FreeJustificationSource>): keyof typeof FREE_VALIDATION_KEYS | null {
  if (!isFreeReason(source.reason)) return 'reason';
  const details = freeDetailsOf(source.details);
  if (details.length > FREE_DETAILS_LIMITS.max) return 'detailsTooLong';
  if (source.reason === 'OTHER' && details.length < FREE_DETAILS_LIMITS.min) return 'details';
  if (source.accepted !== true) return 'accept';
  return null;
}

/** The input to send, or null until the form holds a complete, accepted justification. */
export function freeJustificationInput(source: Readonly<FreeJustificationSource>): FreeJustificationInput | null {
  if (freeJustificationProblem(source) !== null || !isFreeReason(source.reason)) return null;
  return { reason: source.reason, details: freeDetailsOf(source.details), accepted: true };
}

/**
 * A free venue (model FREE) or a free pod: the venue accepts or declines it and
 * neither side counters — the server answers `counters_per_side: 0`, so the
 * surfaces say "free bookings are accepted or declined" instead of "no counters left".
 */
export const isFreeArrangement = (offer: { model?: string | null; free_pod?: boolean | null } | null | undefined): boolean =>
  offer?.model === 'FREE' || !!offer?.free_pod;

/** The justification fields a query selects beside an offer or a pod. */
export const FREE_JUSTIFICATION_FIELDS = `
      free_justification {
        reason
        details
        accepted_at
      }`;

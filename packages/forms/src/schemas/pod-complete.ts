import { z } from 'zod';
import { firstMediaUrl, type VenueBillLabels } from '@duncit/utils';

/** The host's "Complete Pod" form: the venue's final bill and what it charged beyond the agreed amount. */
export interface PodCompleteValues {
  /** The total on the venue's final bill, as typed. Required on a paid venue pod. */
  venue_bill_amount: string;
  /** The uploaded bill — the surface's media picker value (newline-separated). */
  venue_bill_media: string;
  /** Charges on the bill beyond the agreed amount, as typed. Empty = none. */
  venue_extra_amount: string;
  /** Guests the venue charged for, for a per-guest booking. Empty = the server's own count. */
  venue_pax: string;
  /** Hours the pod ran past its slot. Empty = none. */
  overtime_hours: string;
}

export const blankPodCompleteValues: PodCompleteValues = {
  venue_bill_amount: '',
  venue_bill_media: '',
  venue_extra_amount: '',
  venue_pax: '',
  overtime_hours: '',
};

/** What the form sends — the venue-bill part of the server's CompletePodInput. */
export interface PodCompleteInput {
  pod_id: string;
  venue_bill_amount: number;
  venue_bill_url?: string;
  venue_extra_amount?: number;
  venue_pax?: number;
  overtime_hours?: number;
}

/** The server's own bounds for the venue's usage at completion (settlement venueUsageOf). */
export const VENUE_USAGE_LIMITS = { paxMax: 10_000, overtimeMax: 48, extraMax: 1_000_000 } as const;

const isWholeIn = (raw: string, max: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= max;
};
const isNumberIn = (raw: string, max: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= max;
};

/**
 * The venue's usage, checked against the server's bounds: an entered guest count
 * is a whole number, entered overtime a number of hours. Empty is always fine.
 * Shared with the Admin console's completion schema.
 */
export function addVenueUsageIssues(
  values: { venue_pax: string; overtime_hours: string },
  ctx: z.RefinementCtx,
  labels: Pick<VenueBillLabels, 'paxInvalid' | 'overtimeInvalid'>,
) {
  const pax = values.venue_pax.trim();
  const hours = values.overtime_hours.trim();
  if (pax !== '' && !isWholeIn(pax, VENUE_USAGE_LIMITS.paxMax)) {
    ctx.addIssue({ code: 'custom', path: ['venue_pax'], message: labels.paxInvalid });
  }
  if (hours !== '' && !isNumberIn(hours, VENUE_USAGE_LIMITS.overtimeMax)) {
    ctx.addIssue({ code: 'custom', path: ['overtime_hours'], message: labels.overtimeInvalid });
  }
}

/** The labels the bill's rules speak with. */
export type VenueBillRuleLabels = Pick<
  VenueBillLabels,
  'amountInvalid' | 'billRequired' | 'billUploadRequired' | 'extraInvalid' | 'paxInvalid' | 'overtimeInvalid'
>;

/**
 * The venue's final bill on a paid venue pod: its total and the bill itself are
 * both required — it is the proof Finance approves the agreed amount against —
 * and any extra charges are a number within the server's bound. Shared with the
 * Admin console's completion schema.
 */
export function addVenueBillIssues(
  values: { venue_bill_amount: string; venue_bill_media: string; venue_extra_amount: string },
  ctx: z.RefinementCtx,
  labels: Pick<VenueBillRuleLabels, 'amountInvalid' | 'billRequired' | 'billUploadRequired' | 'extraInvalid'>,
) {
  const amount = values.venue_bill_amount.trim();
  const total = Number(amount);
  if (amount === '') {
    ctx.addIssue({ code: 'custom', path: ['venue_bill_amount'], message: labels.billRequired });
  } else if (!Number.isFinite(total) || total <= 0) {
    ctx.addIssue({ code: 'custom', path: ['venue_bill_amount'], message: labels.amountInvalid });
  }
  if (!firstMediaUrl(values.venue_bill_media)) {
    ctx.addIssue({ code: 'custom', path: ['venue_bill_media'], message: labels.billUploadRequired });
  }
  const extra = values.venue_extra_amount.trim();
  if (extra !== '' && !isNumberIn(extra, VENUE_USAGE_LIMITS.extraMax)) {
    ctx.addIssue({ code: 'custom', path: ['venue_extra_amount'], message: labels.extraInvalid });
  }
}

/**
 * The Complete Pod contract mWeb, the Partners console and the native app
 * share.
 *
 * A paid pod at a venue completes against the amount agreed with the venue,
 * and the venue's final bill is its proof: the bill's total and the bill itself
 * are required. Anything the venue charged beyond the agreed amount is entered
 * as extra charges, paid on top once Finance approves it against the bill. The
 * server enforces the same rule for every build that sends the extra charges.
 * `hasVenue` is false for a pod with no venue and for a free pod, whose host
 * settles the venue directly — neither has a bill to ask for.
 *
 * Media is NOT asked for here — it belongs to the pod, uploaded on its own
 * page, and a pod that took money still owes its host that money whether or
 * not anybody photographed the evening.
 */
export const makePodCompleteSchema = (hasVenue: boolean, labels: VenueBillRuleLabels) =>
  z
    .object({
      venue_bill_amount: z.string().trim(),
      venue_bill_media: z.string(),
      venue_extra_amount: z.string().trim(),
      venue_pax: z.string().trim(),
      overtime_hours: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (!hasVenue) return;
      addVenueUsageIssues(values, ctx, labels);
      addVenueBillIssues(values, ctx, labels);
    });

/** The extra charges as the server takes them: 0 when empty or outside the bound. */
export function venueExtraAmountOf(raw: string): number {
  const extra = raw.trim();
  return extra !== '' && isNumberIn(extra, VENUE_USAGE_LIMITS.extraMax) ? Number(extra) : 0;
}

/**
 * Maps the validated values onto the server's CompletePodInput.
 *
 * No `evidence_media`: the release carries the pod's OWN media, which the
 * server reads off the pod rather than taking from whoever completes it. With a
 * bill the extra charges are ALWAYS sent (0 included) and the old slot-price
 * choice never is: that is how the server knows this build completes against
 * the agreed amount, with the bill as its proof. Without a bill (a pod with no
 * venue) neither means anything.
 */
export function buildPodCompleteInput(values: PodCompleteValues, podId: string): PodCompleteInput {
  const amount = Number(values.venue_bill_amount) || 0;
  const bill: PodCompleteInput =
    amount > 0
      ? {
          pod_id: podId,
          venue_bill_amount: amount,
          venue_bill_url: firstMediaUrl(values.venue_bill_media),
          venue_extra_amount: venueExtraAmountOf(values.venue_extra_amount),
        }
      : { pod_id: podId, venue_bill_amount: 0 };
  return { ...bill, ...venueUsageInput(values) };
}

/**
 * The venue's usage, as the completion and its preview send it: pax only when
 * entered (empty = the server counts the people who came on a per-guest offer,
 * everyone booked on an older per-guest slot), overtime only when above zero.
 * Either stands without a bill — they price the booking, not the bill.
 */
export function venueUsageInput(values: Pick<PodCompleteValues, 'venue_pax' | 'overtime_hours'>) {
  const usage: { venue_pax?: number; overtime_hours?: number } = {};
  const pax = values.venue_pax.trim();
  if (pax !== '' && isWholeIn(pax, VENUE_USAGE_LIMITS.paxMax)) usage.venue_pax = Number(pax);
  const hours = Number(values.overtime_hours);
  if (hours > 0 && hours <= VENUE_USAGE_LIMITS.overtimeMax) usage.overtime_hours = hours;
  return usage;
}

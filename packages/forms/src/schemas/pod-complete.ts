import { z } from 'zod';
import { firstMediaUrl, type VenueBillLabels } from '@duncit/utils';

/** The host's "Complete Pod" form: the venue's final bill, and nothing else. */
export interface PodCompleteValues {
  /** The venue's final bill, as typed. Empty = the booked slot price stands. */
  venue_bill_amount: string;
  /** The uploaded bill — the surface's media picker value (newline-separated). */
  venue_bill_media: string;
  /** Pay the bill on top of the booked slot price rather than instead of it. */
  include_slot_price: boolean;
  /** Guests the venue charged for, for a per-guest slot. Empty = everyone booked. */
  venue_pax: string;
  /** Hours the pod ran past its slot. Empty = none. */
  overtime_hours: string;
}

export const blankPodCompleteValues: PodCompleteValues = {
  venue_bill_amount: '',
  venue_bill_media: '',
  include_slot_price: false,
  venue_pax: '',
  overtime_hours: '',
};

/** What the form sends — the venue-bill part of the server's CompletePodInput. */
export interface PodCompleteInput {
  pod_id: string;
  venue_bill_amount: number;
  venue_bill_url?: string;
  include_slot_price?: boolean;
  venue_pax?: number;
  overtime_hours?: number;
}

/** The bill amount a value stands for: 0 when empty, NaN when not a number. */
const billAmountOf = (raw: string) => (raw.trim() === '' ? 0 : Number(raw));

/** The server's own bounds for the venue's usage at completion (settlement venueUsageOf). */
export const VENUE_USAGE_LIMITS = { paxMax: 10_000, overtimeMax: 48 } as const;

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

/**
 * The Complete Pod contract mWeb, the Partners console and the native app
 * share.
 *
 * The venue bill is optional — without one the venue is paid its booked slot
 * price. With one, the bill itself has to be uploaded: the amount changes what
 * the venue is paid and Finance approves it against the document. The server
 * enforces the same rule.
 *
 * Media is NOT asked for here — it belongs to the pod, uploaded on its own
 * page, and a pod that took money still owes its host that money whether or
 * not anybody photographed the evening.
 */
export const makePodCompleteSchema = (
  hasVenue: boolean,
  labels: Pick<VenueBillLabels, 'amountInvalid' | 'uploadRequired' | 'paxInvalid' | 'overtimeInvalid'>,
) =>
  z
    .object({
      venue_bill_amount: z.string().trim(),
      venue_bill_media: z.string(),
      include_slot_price: z.boolean(),
      venue_pax: z.string().trim(),
      overtime_hours: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (!hasVenue) return;
      addVenueUsageIssues(values, ctx, labels);
      const amount = billAmountOf(values.venue_bill_amount);
      if (!Number.isFinite(amount) || amount < 0) {
        ctx.addIssue({ code: 'custom', path: ['venue_bill_amount'], message: labels.amountInvalid });
        return;
      }
      if (amount > 0 && !firstMediaUrl(values.venue_bill_media)) {
        ctx.addIssue({ code: 'custom', path: ['venue_bill_media'], message: labels.uploadRequired });
      }
    });

/**
 * Maps the validated values onto the server's CompletePodInput.
 *
 * No `evidence_media`: the release carries the pod's OWN media, which the
 * server reads off the pod rather than taking from whoever completes it. The
 * bill's file and the slot-price choice ride only with an amount — without one
 * neither means anything. With one, the choice is ALWAYS sent: leaving it out
 * is how an older build says its bill is evidence only.
 */
export function buildPodCompleteInput(values: PodCompleteValues, podId: string): PodCompleteInput {
  const amount = Number(values.venue_bill_amount) || 0;
  const bill: PodCompleteInput =
    amount > 0
      ? {
          pod_id: podId,
          venue_bill_amount: amount,
          venue_bill_url: firstMediaUrl(values.venue_bill_media),
          include_slot_price: values.include_slot_price,
        }
      : { pod_id: podId, venue_bill_amount: 0 };
  return { ...bill, ...venueUsageInput(values) };
}

/**
 * The venue's usage, as the completion and its preview send it: pax only when
 * entered (empty = the server counts everyone booked), overtime only when above
 * zero. Either stands without a bill — they price the slot, not the bill.
 */
export function venueUsageInput(values: Pick<PodCompleteValues, 'venue_pax' | 'overtime_hours'>) {
  const usage: { venue_pax?: number; overtime_hours?: number } = {};
  const pax = values.venue_pax.trim();
  if (pax !== '' && isWholeIn(pax, VENUE_USAGE_LIMITS.paxMax)) usage.venue_pax = Number(pax);
  const hours = Number(values.overtime_hours);
  if (hours > 0 && hours <= VENUE_USAGE_LIMITS.overtimeMax) usage.overtime_hours = hours;
  return usage;
}

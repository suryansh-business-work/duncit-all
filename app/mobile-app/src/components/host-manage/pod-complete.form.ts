import { z } from 'zod';

import { type CompletePodInput } from '@/generated/graphql/graphql';

/** Shapes for the host's "Complete Pod" flow (the venue bill amount). */
export interface PodCompleteValues {
  venue_bill_amount: string;
}

export interface HostPodForComplete {
  id: string;
  pod_title: string;
  venue_id?: string | null;
}

export const blankPodCompleteValues: PodCompleteValues = {
  venue_bill_amount: '',
};

/**
 * Schema depends on whether the pod has a venue: only then is the bill amount
 * required. Media is NOT asked for here — it belongs to the pod, uploaded on
 * its own screen by the host and by the guests who came, and a pod that took
 * money still owes its host that money whether or not anybody photographed the
 * evening.
 */
export const buildPodCompleteSchema = (hasVenue: boolean) =>
  z
    .object({
      venue_bill_amount: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (!hasVenue) return;
      const amount = Number(values.venue_bill_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['venue_bill_amount'],
          message: 'Enter the venue bill amount',
        });
      }
    });

/**
 * Maps the validated values onto the server's CompletePodInput.
 *
 * No `evidence_media`: the release carries the pod's OWN media, which the
 * server reads off the pod rather than taking from whoever completes it.
 */
export function buildCompleteInput(values: PodCompleteValues, podId: string): CompletePodInput {
  return {
    pod_id: podId,
    venue_bill_amount: Number(values.venue_bill_amount) || 0,
  };
}

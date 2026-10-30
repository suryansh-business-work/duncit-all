import {
  addVenueBillIssues,
  addVenueUsageIssues,
  buildPodCompleteInput,
  makePodCompleteSchema,
  type PodCompleteValues,
  type VenueBillRuleLabels,
} from '@duncit/forms/schemas';

import { type CompletePodInput } from '@/generated/graphql/graphql';

/**
 * The host's "Complete Pod" form. The contract — the venue's final bill a paid
 * venue pod must carry as proof (its total and the file), the extra charges
 * paid on top, the input it maps to — is `@duncit/forms/schemas`'
 * `pod-complete`, shared with mWeb (rule 27); this file only names the pod,
 * ties the input to the generated GraphQL type, and relaxes the bill for a free
 * venue the way the server does.
 */
export { blankPodCompleteValues } from '@duncit/forms/schemas';
export type { PodCompleteValues };

/**
 * A FREE venue (its booking was offered free) is owed nothing for the booking,
 * so its bill is owed only once the host enters a total or extra charges the
 * venue made — the bill then proves them (the server's `venueBillFor`).
 */
export const freeVenueBillOwed = (
  values: Pick<PodCompleteValues, 'venue_bill_amount' | 'venue_extra_amount'>,
): boolean =>
  values.venue_bill_amount.trim() !== '' || Number(values.venue_extra_amount.trim()) !== 0;

/** The shared rules, with a free venue's bill asked only when it is owed (`freeVenueBillOwed`). */
export function buildPodCompleteSchema(
  hasVenue: boolean,
  labels: VenueBillRuleLabels,
  freeVenue = false,
) {
  if (!hasVenue || !freeVenue) return makePodCompleteSchema(hasVenue, labels);
  return makePodCompleteSchema(false, labels).superRefine((values, ctx) => {
    addVenueUsageIssues(values, ctx, labels);
    if (freeVenueBillOwed(values)) addVenueBillIssues(values, ctx, labels);
  });
}

export interface HostPodForComplete {
  id: string;
  pod_title: string;
  venue_id?: string | null;
  /** FREE / PAID — a free pod asks for no venue bill: its host settles the venue directly. */
  pod_type?: string | null;
}

/** Typed against the server's input, so a field the schema drops fails here. */
export const buildCompleteInput = (values: PodCompleteValues, podId: string): CompletePodInput =>
  buildPodCompleteInput(values, podId);

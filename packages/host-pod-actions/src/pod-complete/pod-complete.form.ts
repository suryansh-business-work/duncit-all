import {
  addVenueBillIssues,
  addVenueUsageIssues,
  makePodCompleteSchema,
  type PodCompleteValues,
} from '@duncit/forms/schemas';
import type { HostPodActionLabels } from '../labels';

/**
 * The Complete Pod form. The contract itself — the venue's final bill a paid
 * venue pod must carry as proof, the extra charges paid on top, the input it
 * maps to — is `@duncit/forms/schemas`' `pod-complete`, shared with the native
 * app; this only hands it the dialog's own labels.
 */
export {
  blankPodCompleteValues,
  buildPodCompleteInput as buildCompleteInput,
  type PodCompleteValues,
} from '@duncit/forms/schemas';

/**
 * A free venue (its offer was FREE) is owed nothing for the booking, so its
 * bill is asked for only once it charged extras — or a bill total is entered
 * anyway, which then needs the bill itself. The server's `venueBillFor`.
 */
const freeVenueBillOwed = (values: Readonly<Pick<PodCompleteValues, 'venue_bill_amount' | 'venue_extra_amount'>>) => {
  const extra = values.venue_extra_amount.trim();
  return values.venue_bill_amount.trim() !== '' || (extra !== '' && Number(extra) !== 0);
};

/**
 * `hasVenue` is true only for a paid pod at a venue — a free pod's host settles
 * the venue directly. `freeVenue`: that venue gave the booking free, so its
 * usage is still checked but its bill only when it is owed.
 */
export const buildPodCompleteSchema = (hasVenue: boolean, labels: HostPodActionLabels, freeVenue = false) => {
  if (!hasVenue || !freeVenue) return makePodCompleteSchema(hasVenue, labels.venueBill);
  return makePodCompleteSchema(false, labels.venueBill).superRefine((values, ctx) => {
    addVenueUsageIssues(values, ctx, labels.venueBill);
    if (freeVenueBillOwed(values)) addVenueBillIssues(values, ctx, labels.venueBill);
  });
};

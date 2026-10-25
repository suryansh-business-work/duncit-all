import { makePodCompleteSchema } from '@duncit/forms/schemas';
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

/** `hasVenue` is true only for a paid pod at a venue — a free pod's host settles the venue directly. */
export const buildPodCompleteSchema = (hasVenue: boolean, labels: HostPodActionLabels) =>
  makePodCompleteSchema(hasVenue, labels.venueBill);

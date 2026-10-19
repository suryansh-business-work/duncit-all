import { makePodCompleteSchema } from '@duncit/forms/schemas';
import type { HostPodActionLabels } from '../labels';

/**
 * The Complete Pod form. The contract itself — the optional venue bill, the
 * upload it needs, the input it maps to — is `@duncit/forms/schemas`'
 * `pod-complete`, shared with the native app; this only hands it the dialog's
 * own labels.
 */
export {
  blankPodCompleteValues,
  buildPodCompleteInput as buildCompleteInput,
  type PodCompleteValues,
} from '@duncit/forms/schemas';

export const buildPodCompleteSchema = (hasVenue: boolean, labels: HostPodActionLabels) =>
  makePodCompleteSchema(hasVenue, labels.venueBill);

import { podListingMethods } from './pod.listing';
import { podWriteMethods } from './pod.write';
import { podCancellationMethods } from './pod.cancellation';
import { podEngagementMethods } from './pod.engagement';

export { podNotificationLink, mapPodToPublic, loadPodClubSlugMap } from './pod.shared';
export {
  validateFutureDates,
  validateMeetingDetails,
  validateHasImage,
  podContentOf,
  assertActiveHost,
  findHostedPod,
} from './pod.validation';
export { resolveVenueLocation } from './pod.venue';
export { buildProductRequests } from './pod.products';
export { POD_DELETE_REASON_SUBJECTS } from './pod.cancellation';

/**
 * The pod service. Each area lives in its own `pod.<area>.ts` sibling and is
 * spread in here, so `podService` stays ONE object: a method that calls a
 * sibling through `this` resolves it on this object at call time, exactly as
 * when they were written in one literal.
 */
export const podService = {
  ...podListingMethods,
  ...podWriteMethods,
  ...podCancellationMethods,
  ...podEngagementMethods,
};

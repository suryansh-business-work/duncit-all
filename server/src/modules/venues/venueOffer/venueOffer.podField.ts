import { Types } from 'mongoose';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';

/**
 * `Pod.venue_offer_status` (schema: venueOfferPod.schema). Only a pod still
 * waiting for its venue (PENDING) has a live offer, so every other pod answers
 * null without a read; the read itself is one indexed lookup
 * (`booked_by_pod_id`). Host Manage lists only the host's own pods, so the
 * PENDING ones are few.
 */
interface PodParent {
  id?: string | null;
  venue_approval_status?: string | null;
}

export const podVenueOfferResolvers = {
  Pod: {
    venue_offer_status: async (pod: PodParent): Promise<string | null> => {
      if (pod.venue_approval_status !== 'PENDING' || !pod.id || !Types.ObjectId.isValid(pod.id)) return null;
      const slot = await VenueSlotModel.findOne({ booked_by_pod_id: new Types.ObjectId(pod.id), offer: { $ne: null } })
        .select('offer.status')
        .lean<{ offer?: { status?: string | null } | null }>();
      return slot?.offer?.status ?? null;
    },
  },
};

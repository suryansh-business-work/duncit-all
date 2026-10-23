import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueSlotModel } from './venueSlot.model';

const conflict = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'CONFLICT' } });
};

/**
 * The request id whose held slot `userId` may see among a venue's open slots:
 * only the request's own host, only once both sides confirmed it (Create Pod
 * step 3). Anyone else gets null and sees just the AVAILABLE slots.
 */
export async function heldRequestFor(userId: string, requestId: string): Promise<string | null> {
  if (!Types.ObjectId.isValid(requestId) || !Types.ObjectId.isValid(userId)) return null;
  const { PodPartnerRequestModel } = await import('@modules/venues/podPartnerRequest/podPartnerRequest.model');
  const ok = await PodPartnerRequestModel.exists({
    _id: new Types.ObjectId(requestId),
    host_user_id: new Types.ObjectId(userId),
    status: 'SLOT_CONFIRMED',
  });
  return ok ? requestId : null;
}

/**
 * Lets go of the hold THIS request has — matched on both ids, so it can never
 * touch another booking. A window proposed for the request was made for it and
 * is deleted; a published slot picked before (legacy) goes back on sale.
 */
export async function releasePartnerRequestSlot(slotId: string, requestId: string): Promise<void> {
  const own = { _id: new Types.ObjectId(slotId), booked_by_partner_request_id: new Types.ObjectId(requestId) };
  const deleted = await VenueSlotModel.deleteOne({ ...own, requested_by_host: true });
  if (deleted.deletedCount > 0) return;
  await VenueSlotModel.updateOne(own, { $set: { status: 'AVAILABLE', booked_by_partner_request_id: null } });
}

/**
 * Hands the held booking to the pod the host just created, in one conditional
 * write — never AVAILABLE in between. Stamped APPROVED: the venue confirmed this
 * slot inside the request, which is the approval.
 */
export async function transferPartnerRequestHold(slotId: string, requestId: string, podId: string): Promise<void> {
  const moved = await VenueSlotModel.findOneAndUpdate(
    { _id: new Types.ObjectId(slotId), booked_by_partner_request_id: new Types.ObjectId(requestId) },
    {
      $set: {
        status: 'BOOKED',
        booked_by_pod_id: new Types.ObjectId(podId),
        booked_by_partner_request_id: null,
        decision: 'APPROVED',
        decided_at: new Date(),
        decided_pod_id: new Types.ObjectId(podId),
      },
    },
    { new: true }
  );
  if (!moved) conflict('This slot is no longer held for that request.');
}

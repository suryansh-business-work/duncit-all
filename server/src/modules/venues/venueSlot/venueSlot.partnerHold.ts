import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel, type IVenueSlot } from './venueSlot.model';

const conflict = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'CONFLICT' } });
};

/**
 * A host↔venue Pod Request holds the slot its picker chose: AVAILABLE →
 * BOOKED under `booked_by_partner_request_id`, in one conditional write, so the
 * slot cannot be sold twice between the pick and the pod. Refuses a slot that
 * has started or falls on one of the venue's holidays — the same two rules an
 * ordinary booking faces.
 */
export async function holdSlotForPartnerRequest(slotId: string, venueId: string, requestId: string): Promise<IVenueSlot> {
  if (!Types.ObjectId.isValid(slotId)) {
    throw new GraphQLError('Invalid slot_id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const slot = await VenueSlotModel.findOne({ _id: slotId, venue_id: venueId }).select('start_at status').lean();
  if (!slot || slot.status !== 'AVAILABLE') return conflict('This slot is no longer available. Pick another slot.');
  if (slot.start_at.getTime() <= Date.now()) return conflict('This slot has already started. Pick a later one.');
  const venue = await VenueModel.findById(venueId).select('settings.holidays').lean();
  const { venueLocalYmd } = await import('@modules/venues/autoExtend/slotGenerator');
  if ((venue?.settings?.holidays ?? []).includes(venueLocalYmd(slot.start_at))) {
    return conflict('The venue is on leave on this date. Pick another slot.');
  }
  const held = await VenueSlotModel.findOneAndUpdate(
    { _id: new Types.ObjectId(slotId), venue_id: new Types.ObjectId(venueId), status: 'AVAILABLE' },
    { $set: { status: 'BOOKED', booked_by_partner_request_id: new Types.ObjectId(requestId) } },
    { new: true }
  );
  if (!held) return conflict('This slot is no longer available. Pick another slot.');
  return held;
}

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

/** Frees the slot THIS request holds — matched on both ids, so it can never free another booking. */
export async function releasePartnerRequestSlot(slotId: string, requestId: string): Promise<void> {
  await VenueSlotModel.updateOne(
    { _id: new Types.ObjectId(slotId), booked_by_partner_request_id: new Types.ObjectId(requestId) },
    { $set: { status: 'AVAILABLE', booked_by_partner_request_id: null } }
  );
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

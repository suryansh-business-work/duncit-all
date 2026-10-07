import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { releasePartnerRequestSlot } from '@modules/venues/venueSlot/venueSlot.partnerHold';
import { PodPartnerRequestModel } from './podPartnerRequest.model';
import { notifyPartner } from './podPartnerRequest.notify';

/**
 * Create Pod, arriving from a request: only the request's host, only once both
 * sides confirmed the slot, and only on that slot. Returns what the pod funnel
 * needs to adopt the held booking instead of claiming a fresh one.
 */
export async function assertRequestReadyForPod(hostUserId: string, requestId: string, slotId: string | null | undefined) {
  if (!Types.ObjectId.isValid(requestId)) {
    throw new GraphQLError('Invalid Pod Request', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const doc = await PodPartnerRequestModel.findById(requestId).select('host_user_id status slot_id').lean();
  if (!doc || String(doc.host_user_id) !== hostUserId) {
    throw new GraphQLError('Pod Request not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (doc.status !== 'SLOT_CONFIRMED' || !doc.slot_id) {
    throw new GraphQLError('This Pod Request has no confirmed slot to create a pod on', { extensions: { code: 'CONFLICT' } });
  }
  if (slotId && String(doc.slot_id) !== String(slotId)) {
    throw new GraphQLError('Use the slot confirmed on the Pod Request', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return { requestId, slotId: String(doc.slot_id) };
}

/** The pod exists: close the request on it and tell both sides (contact is now shared on it). */
export async function markPartnerRequestPodCreated(requestId: string, podId: string) {
  const doc = await PodPartnerRequestModel.findOneAndUpdate(
    { _id: new Types.ObjectId(requestId), status: 'SLOT_CONFIRMED' },
    { $set: { status: 'POD_CREATED', is_open: false, pod_id: new Types.ObjectId(podId) } },
    { new: true }
  );
  if (!doc) {
    logs.server.warn('pod-partner-request', 'markPodCreated', { request_id: requestId, msg: 'request was not SLOT_CONFIRMED' });
    return;
  }
  await Promise.all([notifyPartner(doc, 'POD_CREATED', 'HOST'), notifyPartner(doc, 'POD_CREATED', 'VENUE')]);
}

/**
 * A held slot that has started with no pod frees itself: the request becomes
 * EXPIRED and the venue can sell the time again. Each move is conditional on
 * the status it read, so a pod created at the same moment wins and the sweep
 * is safe to run on every tick.
 */
export async function runPartnerRequestExpirySweep(now = new Date()): Promise<number> {
  const stale = await PodPartnerRequestModel.find({
    status: { $in: ['SLOT_REQUESTED', 'SLOT_CONFIRMED'] },
    slot_start_at: { $lte: now },
  })
    .select('status slot_id')
    .limit(500)
    .lean();
  let expired = 0;
  for (const row of stale) {
    const moved = await PodPartnerRequestModel.updateOne(
      { _id: row._id, status: row.status },
      { $set: { status: 'EXPIRED', is_open: false } }
    );
    if (moved.modifiedCount === 0) continue;
    if (row.slot_id) await releasePartnerRequestSlot(String(row.slot_id), String(row._id));
    expired += 1;
  }
  if (expired) logs.server.info('pod-partner-request', 'expirySweep', { expired });
  return expired;
}

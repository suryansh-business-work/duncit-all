import crypto from 'node:crypto';
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podLiveEnd } from '@modules/pods/pod/pod.lifecycle';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';
import { RentalBookingModel } from './rentalBooking.model';
import { rentalLifecycleService } from './rentalLifecycle.service';

/**
 * The venue's rental money, handed to Finance as a VENUE_RENTAL payout.
 *
 * It does not wait for the pod's completion: rent is the venue's whatever the
 * pod's ticket waterfall comes to. Each closed booking carries the amount it
 * earned the venue (rent less Duncit's commission, plus any deposit kept), and
 * is stamped with the payout that carried it, so no booking is ever paid twice
 * — a damage claim recorded days later simply rides the next payout.
 */

const MINUTE_MS = 60_000;
const SWEEP_INTERVAL_MS = 60 * MINUTE_MS;
const FIRST_SWEEP_DELAY_MS = 3 * MINUTE_MS;
const EARNING_STATUSES = ['RETURNED', 'DAMAGED', 'RELEASED'];

const releaseId = () => `rel_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Raise one payout for a pod's settled rentals. Null when nothing was owed or the venue cannot be paid yet. */
async function payoutForPod(podId: unknown) {
  const pod = await PodModel.findById(podId)
    .setOptions({ includeDeleted: true })
    .select('pod_title venue_id pod_date_time pod_end_date_time')
    .lean();
  const ended = pod ? (podLiveEnd(pod)?.getTime() ?? Number.POSITIVE_INFINITY) <= Date.now() : false;
  if (!pod || !ended) return null;
  const sample = await RentalBookingModel.findOne({ pod_id: pod._id }).select('venue_id').lean();
  const venue = sample ? await VenueModel.findById(sample.venue_id).select('venue_name owner_name owner_email').lean() : null;
  if (!venue?.owner_email) {
    // Left unsettled, so the next sweep pays it once the venue record is fixed.
    logs.server.warn('rentalPayout', 'payoutForPod', { pod_id: String(pod._id), msg: 'venue has no owner email — rental payout waits' });
    return null;
  }
  // Claim first, sum second: the bookings this payout carries are exactly the
  // ones it stamped, so two sweeps can never both pay the same booking.
  const id = releaseId();
  await RentalBookingModel.updateMany(
    { pod_id: pod._id, status: { $in: EARNING_STATUSES }, venue_amount: { $gt: 0 }, release_id: null },
    { $set: { release_id: id } }
  );
  const carried = await RentalBookingModel.find({ release_id: id }).select('venue_amount').lean();
  const amount = round2(carried.reduce((sum, b) => sum + b.venue_amount, 0));
  if (amount <= 0) return null;
  try {
    return await PaymentReleaseModel.create({
      release_id: id,
      kind: 'VENUE_RENTAL',
      pod_id: pod._id,
      pod_title: pod.pod_title,
      venue_id: venue._id,
      host_user_id: null,
      beneficiary_name: venue.venue_name || venue.owner_name || 'Venue',
      beneficiary_email: venue.owner_email,
      amount_requested: amount,
      notes: `Rented items: ${carried.length} booking${carried.length === 1 ? '' : 's'}`,
      requested_by: null,
      requested_at: new Date(),
    });
  } catch (error) {
    // The payout did not land: hand the bookings back for the next sweep.
    await RentalBookingModel.updateMany({ release_id: id }, { $set: { release_id: null } });
    throw error;
  }
}

/** Raise every payout owed: one per pod with settled, unpaid rental money. */
export async function runRentalPayoutSweep(): Promise<number> {
  const podIds = await RentalBookingModel.distinct('pod_id', {
    status: { $in: EARNING_STATUSES },
    venue_amount: { $gt: 0 },
    release_id: null,
  });
  let raised = 0;
  for (const podId of podIds) {
    try {
      if (await payoutForPod(podId)) raised += 1;
    } catch (error) {
      logs.server.error('rentalPayout', 'runRentalPayoutSweep', { error, pod_id: String(podId) });
    }
  }
  return raised;
}

/** Hourly, on the scheduler leader: close unmarked deposits, then pay the venues what is settled. */
export function startRentalScheduler(): () => void {
  return startClusterJob({
    component: 'rentals',
    operation: 'deposit release + payouts',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: async () => {
      await rentalLifecycleService.runDepositAutoRelease();
      await runRentalPayoutSweep();
    },
  });
}

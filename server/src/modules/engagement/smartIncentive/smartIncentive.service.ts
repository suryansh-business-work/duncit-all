import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { isFreePod, PodModel } from '@modules/pods/pod/pod.model';
import { maxSeatsForBooking } from '@modules/pods/pod/pod.seats';
import { isPodHidden } from '@utils/hidden';
import { SmartIncentiveOfferModel } from './smartIncentive.model';
import { smartIncentiveSettingsService } from './smartIncentive.settings.service';

/**
 * The member's side of Smart Incentive: whether a pod page should count down to
 * an offer, recording the offer when it shows, and the percentage checkout
 * takes off. The dwell itself is timed by the client — anyone may wait the
 * seconds out, so the server's job is only to decide who may be offered what.
 */

/** A pod page's offer for one member. */
export interface PodSmartIncentiveState {
  pod_id: string;
  /** The offer's frozen % once unlocked; until then the pod's current %. */
  discount_pct: number;
  /** How long the page waits before showing the offer (Loyalty settings). */
  delay_seconds: number;
  /** True once the offer was shown — checkout applies it, and the page shows it as unlocked. */
  unlocked: boolean;
}

/** What a pod must carry to offer the incentive, and to still be sellable. */
interface IncentivePod {
  _id: Types.ObjectId;
  pod_type?: string | null;
  pod_amount?: number | null;
  smart_incentive_enabled?: boolean | null;
  smart_incentive_pct?: number | null;
}

interface SellablePod extends IncentivePod {
  pod_hosts_id?: unknown[] | null;
  co_hosts?: { user_id?: unknown; status?: string | null }[] | null;
  pod_date_time?: Date | null;
  is_active?: boolean | null;
  is_hidden?: boolean | null;
  hidden_by_club?: boolean | null;
  series_role?: string | null;
  venue_approval_status?: string | null;
  no_of_spots?: number | null;
  pod_attendees?: unknown[] | null;
  extra_seats?: number | null;
}

const POD_FIELDS = [
  'pod_type',
  'pod_amount',
  'smart_incentive_enabled',
  'smart_incentive_pct',
  'pod_hosts_id',
  'co_hosts',
  'pod_date_time',
  'is_active',
  'is_hidden',
  'hidden_by_club',
  'series_role',
  'venue_approval_status',
  'no_of_spots',
  'pod_attendees',
  'extra_seats',
].join(' ');

/** A paid pod whose host switched the incentive on. */
export function podOffersIncentive(pod: IncentivePod | null | undefined): boolean {
  return (
    !!pod &&
    !isFreePod(pod) &&
    Number(pod.pod_amount) > 0 &&
    !!pod.smart_incentive_enabled &&
    Number(pod.smart_incentive_pct) > 0
  );
}

/** Whether someone new could still book this pod — the only kind of pod worth a nudge. */
function podStillSelling(pod: SellablePod): boolean {
  if (pod.is_active === false || isPodHidden(pod)) return false;
  if (pod.pod_date_time && new Date(pod.pod_date_time).getTime() < Date.now()) return false;
  const awaitingVenue = pod.venue_approval_status === 'PENDING' || pod.venue_approval_status === 'DECLINED';
  if (pod.series_role === 'DATE' && awaitingVenue) return false;
  return maxSeatsForBooking(pod) > 0;
}

/** Hosts run the pod and members already hold a seat: neither is offered a discount on it. */
async function viewerMayBeOffered(pod: SellablePod, userId: string): Promise<boolean> {
  if ((pod.pod_hosts_id ?? []).some((id) => String(id) === userId)) return false;
  const coHost = (pod.co_hosts ?? []).some((c) => String(c.user_id) === userId && c.status === 'ACCEPTED');
  if (coHost) return false;
  const { PodMemberModel } = await import('@modules/pods/podMember/podMember.model');
  const booked = await PodMemberModel.exists({
    pod_id: pod._id,
    user_id: new Types.ObjectId(userId),
    status: { $in: ['JOINED', 'BACKOUT_IN_PROCESS'] },
  });
  return !booked;
}

const offerKey = (podId: Types.ObjectId, userId: string) => ({
  user_id: new Types.ObjectId(userId),
  pod_id: podId,
});

export const smartIncentiveService = {
  /**
   * The pod page's offer for this member, or null when there is nothing to
   * count down to: the programme is off, the pod does not offer it or can no
   * longer be booked, or the member hosts it or already holds a seat.
   */
  async stateForPod(podDocId: string, userId: string): Promise<PodSmartIncentiveState | null> {
    if (!Types.ObjectId.isValid(podDocId)) return null;
    const settings = await smartIncentiveSettingsService.get();
    if (!settings.enabled) return null;
    const pod = await PodModel.findById(podDocId).select(POD_FIELDS).lean<SellablePod>();
    if (!pod || !podOffersIncentive(pod) || !podStillSelling(pod)) return null;
    if (!(await viewerMayBeOffered(pod, userId))) return null;
    const offer = await SmartIncentiveOfferModel.findOne(offerKey(pod._id, userId)).select('discount_pct').lean();
    return {
      pod_id: String(pod._id),
      discount_pct: offer?.discount_pct ?? Number(pod.smart_incentive_pct),
      delay_seconds: settings.delay_seconds,
      unlocked: !!offer,
    };
  },

  /**
   * The popup showed: record the offer, freezing the percentage it promised.
   * Idempotent — a member who comes back keeps the offer they were first shown,
   * and two tabs racing to unlock it end with one row (the unique index).
   */
  async unlock(podDocId: string, userId: string): Promise<PodSmartIncentiveState> {
    const state = await this.stateForPod(podDocId, userId);
    if (!state) {
      throw new GraphQLError('This pod has no offer for you right now', { extensions: { code: 'BAD_REQUEST' } });
    }
    if (state.unlocked) return state;
    const key = offerKey(new Types.ObjectId(state.pod_id), userId);
    try {
      // The filter's member and pod are written by the upsert itself.
      await SmartIncentiveOfferModel.updateOne(key, { $setOnInsert: { discount_pct: state.discount_pct } }, { upsert: true });
    } catch (error) {
      // The other tab won the insert; its offer is the one this member holds.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    const offer = await SmartIncentiveOfferModel.findOne(key).select('discount_pct').lean();
    return { ...state, discount_pct: offer?.discount_pct ?? state.discount_pct, unlocked: true };
  },

  /**
   * The percentage checkout takes off this member's booking: the frozen % of
   * their unlocked offer, but only while the programme is on and the pod still
   * offers the incentive — switching either off withdraws it, like a coupon
   * that was deactivated. 0 whenever nothing applies.
   */
  async pctForCheckout(pod: IncentivePod | null | undefined, userId: string | null | undefined): Promise<number> {
    if (!pod || !userId || !podOffersIncentive(pod)) return 0;
    const [settings, offer] = await Promise.all([
      smartIncentiveSettingsService.get(),
      SmartIncentiveOfferModel.findOne(offerKey(pod._id, userId)).select('discount_pct').lean(),
    ]);
    if (!settings.enabled || !offer) return 0;
    return offer.discount_pct;
  },
};

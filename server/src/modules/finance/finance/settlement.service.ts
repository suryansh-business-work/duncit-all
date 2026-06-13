import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from './finance.model';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clampPct = (n: number) => Math.min(100, Math.max(0, Number(n) || 0));

// One party's payout statement. The same shape backs both the host's
// "Host Share" lines and the venue owner's payout lines — only the percentages
// and which amount is the final payout differ.
export interface SettlementParty {
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  gst_amount: number;
  duncit_pct: number;
  duncit_amount: number;
  payout_pct: number;
  payout_amount: number;
}

export interface PodSettlement {
  pod_id: string;
  pod_title: string;
  currency_symbol: string;
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  host_share_pct: number;
  host_commission_pct: number;
  venue_share_pct: number;
  venue_commission_pct: number;
  host: SettlementParty;
  venue: SettlementParty | null;
  has_venue: boolean;
}

/** Money a completed pod actually took in = sum of its SUCCESS payments. */
export async function collectedForPod(podId: string | Types.ObjectId): Promise<number> {
  const rows = await PaymentModel.aggregate([
    { $match: { pod_id: new Types.ObjectId(String(podId)), status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return round2(rows[0]?.total ?? 0);
}

// Host statement (two-field "Default Deductions" model): from the money
// collected, deduct the venue bill + GST to get the net pool. The host's gross
// is `share%` of that net; Duncit then takes `commission%` of the host's gross.
// The host is paid the remainder; everything else on the host side is Duncit's.
function computeHostParty(
  collected: number,
  venueBill: number,
  gstPct: number,
  sharePct: number,
  commissionPct: number
): SettlementParty {
  const gstAmount = round2((collected - venueBill) * (gstPct / 100));
  const net = round2(collected - venueBill - gstAmount);
  const hostGross = round2(net * (sharePct / 100));
  const payoutAmount = round2(hostGross - hostGross * (commissionPct / 100));
  const payoutPct = net > 0 ? round2((payoutAmount / net) * 100) : 0;
  return {
    collected_total: collected,
    venue_bill: venueBill,
    gst_pct: gstPct,
    gst_amount: gstAmount,
    duncit_pct: round2(100 - payoutPct),
    duncit_amount: round2(net - payoutAmount),
    payout_pct: payoutPct,
    payout_amount: payoutAmount,
  };
}

// Venue statement: from the venue bill, deduct GST, then Duncit takes its
// commission % of what remains; the venue owner is paid the rest.
function computeVenueParty(collected: number, venueBill: number, gstPct: number, commissionPct: number): SettlementParty {
  const gstAmount = round2(venueBill * (gstPct / 100));
  const afterGst = round2(venueBill - gstAmount);
  const duncitAmount = round2(afterGst * (commissionPct / 100));
  return {
    collected_total: collected,
    venue_bill: venueBill,
    gst_pct: gstPct,
    gst_amount: gstAmount,
    duncit_pct: commissionPct,
    duncit_amount: duncitAmount,
    payout_pct: round2(100 - commissionPct),
    payout_amount: round2(afterGst - duncitAmount),
  };
}

/**
 * Compute the full host + venue settlement for a pod given the venue bill the
 * host entered. Percentages come from the host's / venue's per-entity overrides,
 * each falling back to the matching global "Default Deductions" when unset (0).
 * GST % is the global finance GST rate.
 */
export async function computePodSettlement(podDocId: string, venueBillAmount: number): Promise<PodSettlement> {
  if (!Types.ObjectId.isValid(podDocId)) {
    throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const pod = await PodModel.findById(podDocId);
  if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

  const fs = await getFinanceSettings();
  const gstPct = clampPct(fs.gst_pct);
  const collected = await collectedForPod(pod._id);
  const venueBill = Math.max(0, round2(venueBillAmount));
  if (venueBill > collected) {
    throw new GraphQLError('Venue bill cannot exceed the amount collected for this pod', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const hostId = pod.pod_hosts_id?.[0];
  const hostUser = hostId
    ? await UserModel.findById(hostId).select('finance.host_share_pct finance.host_commission_pct')
    : null;
  const hostSharePct = clampPct(hostUser?.finance?.host_share_pct || fs.default_host_share_pct);
  const hostCommissionPct = clampPct(hostUser?.finance?.host_commission_pct || fs.default_host_commission_pct);

  const hasVenue = !!pod.venue_id && venueBill > 0;
  let venueSharePct = 0;
  let venueCommissionPct = 0;
  let venue: SettlementParty | null = null;
  if (hasVenue) {
    const venueDoc = await VenueModel.findById(pod.venue_id).select('venue_share_pct venue_commission_pct');
    venueSharePct = clampPct(venueDoc?.venue_share_pct || fs.default_venue_share_pct);
    venueCommissionPct = clampPct(venueDoc?.venue_commission_pct || fs.default_venue_commission_pct);
    venue = computeVenueParty(collected, venueBill, gstPct, venueCommissionPct);
  }

  return {
    pod_id: String(pod._id),
    pod_title: pod.pod_title,
    currency_symbol: fs.currency_symbol,
    collected_total: collected,
    venue_bill: venueBill,
    gst_pct: gstPct,
    host_share_pct: hostSharePct,
    host_commission_pct: hostCommissionPct,
    venue_share_pct: venueSharePct,
    venue_commission_pct: venueCommissionPct,
    host: computeHostParty(collected, venueBill, gstPct, hostSharePct, hostCommissionPct),
    venue,
    has_venue: hasVenue,
  };
}

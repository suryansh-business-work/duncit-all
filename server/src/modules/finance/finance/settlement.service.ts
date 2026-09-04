import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from './finance.model';
import { podCompleteDeadline } from '@modules/pods/ticket/attendance.service';
import {
  computePodFinanceBreakdown,
  type BreakdownOptions,
  type BreakdownRates,
  type PodFinanceBreakdown,
} from './breakdown.math';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clampPct = (n: number) => Math.min(100, Math.max(0, Number(n) || 0));
const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);
const toRupees = (paise: number) => round2(paise / 100);

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

/** The full waterfall in rupees — GraphQL-ready mirror of the paise engine
 * output. version identifies the engine that produced it (2 = venue slot price
 * off the pool, host keeps the remainder). */
export interface SettlementWaterfall {
  version: number;
  amount: number;
  gst_pct: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  /** Club-admin cut % + amount taken off the pool after GST + platform fee. */
  club_admin_pct: number;
  club_admin_amount: number;
  /** The venue's booked slot price (Partners portal) — taken in FULL; neither
   * settlement nor the previews clamp it to the pool any more, so a shortfall
   * shows as a negative host amount instead of quietly shrinking this. */
  venue_amount: number;
  venue_commission_pct: number;
  venue_commission_amount: number;
  venue_receives: number;
  /** The host's remainder: pool − venue amount. */
  host_amount: number;
  host_commission_pct: number;
  host_commission_amount: number;
  host_receives: number;
  duncit_revenue: number;
  host_earn_pct: number;
}

export interface PodSettlement {
  pod_id: string;
  pod_title: string;
  currency_symbol: string;
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  host_commission_pct: number;
  venue_commission_pct: number;
  host: SettlementParty;
  venue: SettlementParty | null;
  has_venue: boolean;
  waterfall: SettlementWaterfall;
  /** SEATS the settlement was computed on — the ones a host scanned in. Kept
   * under its original name for older consumers; `attended_seats` is the same
   * number under the name that now describes it. */
  paying_attendees: number;
  /** Seats a host scanned in. The settlement basis. */
  attended_seats: number;
  /** Seats booked on the pod, attended or not — the denominator beside it. */
  booked_seats: number;
  /** Money from the attended bookings: what the waterfall was computed from. */
  attended_total: number;
  /** Every JOINED booking, attended first — the completion roster. */
  attendees: SettlementAttendee[];
  /** When the host's window to complete this pod runs out (ISO), or null when
   * the pod has no usable start. Admin > Pods > Pod Settings sets the length. */
  complete_deadline: string | null;
  /** True once that window has passed with the pod still uncompleted. */
  complete_expired: boolean;
  /** What the host is ACTUALLY paid on completion: the floored host remainder,
   * or zero once the window has expired. The waterfall above still states the
   * computed split — this is the amount the release carries, so a preview and a
   * completion can never quote different money. */
  host_payout_amount: number;
}

/** Engine version stamped on new settlement snapshots — v2 = venue slot price
 * off the pool + host remainder; v1 (venue-bill reimbursement + host share %)
 * exists only in historical PaymentRelease.breakdown docs and is never
 * recomputed. */
export const SETTLEMENT_ENGINE_VERSION = 2;

/**
 * The pod-settlement share of one payment: its total minus the one-off product
 * add-on money (metadata.product_cost_total — product rupees settle to sellers
 * via product invoices, never through the pod waterfall) and minus anything
 * already refunded back to the buyer (a partial backout leaves the payment
 * SUCCESS and records the returned money in metadata.refunded_amount).
 */
const ticketMoneyOf = (p: { total?: number; metadata?: any }) => {
  const products = Number(p.metadata?.product_cost_total) || 0;
  const refunded = Number(p.metadata?.refunded_amount) || 0;
  return Math.max(0, (Number(p.total) || 0) - products - refunded);
};

/** The same netting as `ticketMoneyOf`, as a Mongo aggregation expression. */
const TICKET_MONEY_EXPR = {
  $max: [
    0,
    {
      $subtract: [
        { $ifNull: ['$total', 0] },
        {
          $add: [
            { $ifNull: ['$metadata.product_cost_total', 0] },
            { $ifNull: ['$metadata.refunded_amount', 0] },
          ],
        },
      ],
    },
  ],
};

/** TICKET money a pod actually took in = sum of its SUCCESS payments net of
 * product add-ons and partial-backout refunds (see `ticketMoneyOf`). This is
 * the pod's own money — never product rupees, never money already returned. */
export async function collectedForPod(podId: string | Types.ObjectId): Promise<number> {
  const rows = await PaymentModel.aggregate([
    { $match: { pod_id: new Types.ObjectId(String(podId)), status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: TICKET_MONEY_EXPR } } },
  ]);
  return round2(rows[0]?.total ?? 0);
}

/** One booking on the completion roster: who, how many seats, whether a host
 * scanned them in, and what that booking paid. */
export interface SettlementAttendee {
  membership_id: string;
  user_id: string;
  name: string;
  seats: number;
  attended: boolean;
  attended_at: string | null;
  /** What this booking paid. Zero for a free pod or an unpaid legacy row. */
  amount: number;
}

export interface PodAttendanceRoster {
  rows: SettlementAttendee[];
  attended_seats: number;
  booked_seats: number;
  /** Ticket money from bookings a host scanned in — the settlement basis. */
  attended_total: number;
  /** Ticket money from every successful payment on the pod, attended or not
   * (net of product add-ons and partial-backout refunds). */
  collected_total: number;
}

/**
 * Who turned up, and what their bookings paid.
 *
 * Attendance is NOT stored on the membership: it happens when a host scans a
 * ticket at the door, so the EventTicket is the only record of it (the same
 * source `attendanceForMembership` reads for a member's own history). A booking
 * counts as attended when its ticket reads CHECKED_IN.
 *
 * Seats, not people: one booking can admit several, and the money it paid is
 * priced per seat — so a roster counted in people could never reconcile against
 * the amount collected.
 */
export async function podAttendanceRoster(podDocId: string): Promise<PodAttendanceRoster> {
  const podId = new Types.ObjectId(String(podDocId));
  const { PodMemberModel } = await import('@modules/pods/podMember/podMember.model');
  const { TicketModel } = await import('@modules/pods/ticket/ticket.model');

  // BACKED_OUT bookings are gone from the pod and were refunded on their own
  // path — they are neither owed a seat here nor part of what completion pays.
  const members = await PodMemberModel.find({ pod_id: podId, status: 'JOINED' })
    .select('_id user_id seats payment_id')
    .lean();

  const memberIds = members.map((m: any) => m._id);
  const [tickets, payments, users] = await Promise.all([
    TicketModel.find({ membership_id: { $in: memberIds }, status: 'CHECKED_IN' })
      .select('membership_id checked_in_at')
      .lean(),
    PaymentModel.find({ pod_id: podId, status: 'SUCCESS' }).select('_id total metadata').lean(),
    UserModel.find({ _id: { $in: members.map((m: any) => m.user_id) } })
      .select('_id profile.first_name profile.last_name')
      .lean(),
  ]);

  const checkedIn = new Map(
    tickets.map((t: any) => [String(t.membership_id), t.checked_in_at ?? null])
  );
  // Each booking is worth its TICKET money: product add-ons settle to sellers
  // on their own invoices and partially-refunded seats already went back to the
  // buyer — neither may enter the pod's waterfall (see `ticketMoneyOf`).
  const paidBy = new Map(payments.map((p: any) => [String(p._id), ticketMoneyOf(p)]));
  const nameOf = new Map(
    users.map((u: any) => [
      String(u._id),
      `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
    ])
  );

  let attendedSeats = 0;
  let bookedSeats = 0;
  let attendedTotal = 0;
  const rows: SettlementAttendee[] = members.map((m: any) => {
    const id = String(m._id);
    const seats = Math.max(1, Math.floor(Number(m.seats) || 1));
    const attended = checkedIn.has(id);
    const amount = m.payment_id ? (paidBy.get(String(m.payment_id)) ?? 0) : 0;
    bookedSeats += seats;
    if (attended) {
      attendedSeats += seats;
      attendedTotal += amount;
    }
    return {
      membership_id: id,
      user_id: String(m.user_id),
      name: nameOf.get(String(m.user_id)) || 'Member',
      seats,
      attended,
      attended_at: attended ? (checkedIn.get(id)?.toISOString?.() ?? null) : null,
      amount: round2(amount),
    };
  });

  // Attended first, then the people still to be scanned — the completion screen
  // reads top-down and the unmarked rows are the ones that need an action.
  rows.sort((a, b) => {
    if (a.attended !== b.attended) return a.attended ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    rows,
    attended_seats: attendedSeats,
    booked_seats: bookedSeats,
    attended_total: round2(attendedTotal),
    collected_total: round2(payments.reduce((sum: number, p: any) => sum + ticketMoneyOf(p), 0)),
  };
}

/**
 * Resolves the effective dynamic rates for a host/venue pair: per-entity
 * commission overrides first (User.finance.host_commission_pct,
 * Venue.venue_commission_pct — 0 means "inherit"), falling back to the
 * FinanceSettings "Default Deductions". GST % and platform fee % are global.
 */
export async function resolveEffectiveRates(options: {
  hostUserId?: string | Types.ObjectId | null;
  venueId?: string | Types.ObjectId | null;
}): Promise<BreakdownRates> {
  const fs = await getFinanceSettings();
  const hostUser = options.hostUserId
    ? await UserModel.findById(options.hostUserId).select('finance.host_commission_pct')
    : null;
  const venueDoc = options.venueId
    ? await VenueModel.findById(options.venueId).select('venue_commission_pct')
    : null;

  return {
    gst_percent: clampPct(fs.gst_pct),
    platform_fee_percent: clampPct(fs.platform_fee_pct),
    host_commission_percent: clampPct(
      hostUser?.finance?.host_commission_pct || fs.default_host_commission_pct
    ),
    venue_commission_percent: options.venueId
      ? clampPct(venueDoc?.venue_commission_pct || fs.default_venue_commission_pct)
      : 0,
    club_admin_percent: clampPct(fs.default_club_admin_pct),
  };
}

/** The venue's money for a pod = its booked slot price (Partners portal).
 * Legacy pods without a slot link fall back to the host-entered venue bill. */
export async function venueAmountForPod(
  pod: { venue_id?: Types.ObjectId | null; venue_slot_id?: Types.ObjectId | null },
  venueBill: number
): Promise<number> {
  if (!pod.venue_id) return 0;
  if (pod.venue_slot_id) {
    const slot = await VenueSlotModel.findById(pod.venue_slot_id).select('price');
    if (slot) return round2(slot.price);
  }
  return venueBill;
}

/** Paise engine output → rupee waterfall for GraphQL/persistence. */
export function toWaterfall(b: PodFinanceBreakdown): SettlementWaterfall {
  return {
    version: SETTLEMENT_ENGINE_VERSION,
    amount: toRupees(b.amount_paise),
    gst_pct: b.rates.gst_percent,
    gst_amount: toRupees(b.gst_paise),
    net_amount: toRupees(b.net_paise),
    platform_fee_pct: b.rates.platform_fee_percent,
    platform_fee_amount: toRupees(b.platform_fee_paise),
    pool_amount: toRupees(b.pool_paise),
    club_admin_pct: b.rates.club_admin_percent,
    club_admin_amount: toRupees(b.club_admin_paise),
    venue_amount: toRupees(b.venue_amount_paise),
    venue_commission_pct: b.rates.venue_commission_percent,
    venue_commission_amount: toRupees(b.venue_commission_paise),
    venue_receives: toRupees(b.venue_receives_paise),
    host_amount: toRupees(b.host_amount_paise),
    host_commission_pct: b.rates.host_commission_percent,
    host_commission_amount: toRupees(b.host_commission_paise),
    host_receives: toRupees(b.host_receives_paise),
    duncit_revenue: toRupees(b.duncit_revenue_paise),
    host_earn_pct: b.host_earn_percent,
  };
}

/** Waterfall for an arbitrary GST-inclusive rupee amount + venue slot price at
 * the given rates — powers the create-pod potential-earnings preview, live pod
 * breakdowns and settlement itself. Every caller that quotes or settles real
 * money passes `clampVenueToPool: false`: the venue keeps its full booked
 * price and a shortfall shows as negative host earnings. */
export function waterfallForAmount(
  amountRupees: number,
  venueAmountRupees: number,
  rates: BreakdownRates,
  options?: BreakdownOptions
): SettlementWaterfall {
  return toWaterfall(
    computePodFinanceBreakdown(
      Math.max(0, toPaise(amountRupees)),
      Math.max(0, toPaise(venueAmountRupees)),
      rates,
      options
    )
  );
}

/**
 * Compute the full host + venue settlement for a pod. Engine v2: GST is
 * extracted from the money collected (GST-inclusive), the platform fee comes
 * off the net, the venue's booked slot price (Partners portal) comes off the
 * remaining pool, and the host keeps the remainder — Duncit takes its
 * commission % from each side. The venue bill the host enters is evidence
 * (and the venue-amount fallback for legacy pods without a slot link).
 *
 * `hostUserId` is the host actually being PAID (a pod can have co-hosts and
 * completion picks one) — their commission override must price the settlement,
 * not whichever host happens to be listed first. Defaults to the primary host.
 */
export async function computePodSettlement(
  podDocId: string,
  venueBillAmount: number,
  hostUserId?: string | null
): Promise<PodSettlement> {
  if (!Types.ObjectId.isValid(podDocId)) {
    throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const pod = await PodModel.findById(podDocId);
  if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
  if (hostUserId && !(pod.pod_hosts_id ?? []).some((id: any) => String(id) === String(hostUserId))) {
    throw new GraphQLError('Select a host assigned to this pod', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const fs = await getFinanceSettings();
  // The completion window. A pod already stamped complete is never "expired" —
  // it was settled, whenever that happened — so only a live pod is measured
  // against the deadline.
  const { settingsService } = await import('@modules/platform/settings/settings.service');
  const { timeout_hours } = await settingsService.getPodCompletionSettings();
  const deadline = podCompleteDeadline(pod, timeout_hours);
  const expired = !pod.completed_at && !!deadline && Date.now() > deadline.getTime();
  const roster = await podAttendanceRoster(String(pod._id));
  // THE BASIS IS ATTENDANCE, not what was collected. A pod settles on the
  // bookings a host actually scanned in — money from a no-show is not paid out
  // to the host or the venue, even though it was collected and is not refunded.
  // `collected_total` is still reported so the completion screen can show both
  // and the difference is visible rather than silent.
  const collected = roster.collected_total;
  const basis = roster.attended_total;
  // The bill is evidence (and the legacy venue-amount fallback) — it may
  // legitimately exceed a small pod's collection (offline venue costs).
  const venueBill = Math.max(0, round2(venueBillAmount));

  const hasVenue = !!pod.venue_id;
  const rates = await resolveEffectiveRates({
    hostUserId: hostUserId ?? pod.pod_hosts_id?.[0] ?? null,
    venueId: hasVenue ? pod.venue_id : null,
  });
  const venueAmount = await venueAmountForPod(pod, venueBill);
  const waterfall = toWaterfall(
    computePodFinanceBreakdown(toPaise(basis), Math.max(0, toPaise(venueAmount)), rates, {
      // The venue is owed its BOOKED slot price whatever the pod took at the
      // door — it held the room. Clamping it to the pool is what silently paid a
      // venue less than the price it agreed, and settling on attendance only
      // makes that pool smaller. Unclamped, a shortfall lands where it belongs:
      // on the host's side, shown as a negative host amount rather than quietly
      // taken off the venue.
      clampVenueToPool: false,
    })
  );

  // Legacy party lines, derived from the waterfall so older consumers keep a
  // coherent statement: the host line carries the pod-level GST; the venue line
  // carries none (GST is extracted once, from the customer payment).
  const host: SettlementParty = {
    collected_total: collected,
    venue_bill: venueBill,
    gst_pct: waterfall.gst_pct,
    gst_amount: waterfall.gst_amount,
    duncit_pct: waterfall.host_commission_pct,
    duncit_amount: waterfall.host_commission_amount,
    payout_pct: waterfall.host_earn_pct,
    payout_amount: waterfall.host_receives,
  };
  const venue: SettlementParty | null = hasVenue
    ? {
        collected_total: collected,
        venue_bill: venueBill,
        gst_pct: 0,
        gst_amount: 0,
        duncit_pct: waterfall.venue_commission_pct,
        duncit_amount: waterfall.venue_commission_amount,
        payout_pct: round2(100 - waterfall.venue_commission_pct),
        payout_amount: waterfall.venue_receives,
      }
    : null;

  return {
    pod_id: String(pod._id),
    pod_title: pod.pod_title,
    currency_symbol: fs.currency_symbol,
    collected_total: collected,
    venue_bill: venueBill,
    gst_pct: waterfall.gst_pct,
    host_commission_pct: waterfall.host_commission_pct,
    venue_commission_pct: waterfall.venue_commission_pct,
    host,
    venue,
    has_venue: hasVenue,
    waterfall,
    // The head count behind the settlement. Now the seats a host SCANNED IN,
    // because that is what the waterfall above was computed from — reporting
    // booked seats beside an attendance-based payout is the mismatch that made
    // completion look wrong.
    paying_attendees: roster.attended_seats,
    attended_seats: roster.attended_seats,
    booked_seats: roster.booked_seats,
    attended_total: roster.attended_total,
    attendees: roster.rows,
    complete_deadline: deadline?.toISOString() ?? null,
    complete_expired: expired,
    // Floored, because the venue keeps its full booked price and a shortfall
    // shows as a negative host remainder — a release is money moving out and a
    // negative one would credit a wallet backwards. Zeroed outright once the
    // window has expired: the host had the pod's own length plus the configured
    // hours to settle it, and the seats they never marked are the reason the
    // number could not be trusted afterwards.
    host_payout_amount: expired ? 0 : Math.max(0, host.payout_amount),
  };
}

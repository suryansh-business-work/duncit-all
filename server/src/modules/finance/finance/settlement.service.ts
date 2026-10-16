import { GraphQLError } from 'graphql';
import { slotVenueCharge, type SlotPricingMode } from '@modules/venues/venueSlot/slotCharge';
import { Types } from 'mongoose';
import { isFreePod, PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { roundOffOf } from '@modules/finance/payment/payment.roundoff';
import { getFinanceSettings } from './finance.model';
import { podCompleteDeadline } from '@modules/pods/ticket/attendance.service';
import { addOnMoneyOf } from '@modules/venues/venueRental/rentalLines';
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
  /** The slot's booked price — what the venue was promised before any bill. */
  venue_slot_price: number;
  /** False for a legacy venue pod with no slot link: its bill is its only price. */
  venue_slot_linked: boolean;
  /** True when the bill is being paid on top of the slot price. */
  include_slot_price: boolean;
  /** How the slot is priced, and the pax / overtime its charge used. */
  venue_pricing_mode: SlotPricingMode;
  venue_pax: number;
  venue_overtime_hours: number;
  venue_overtime_amount: number;
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
  /** True for a free pod: nothing is settled on the platform, every money
   * figure above is 0, and clients hide the statement instead of printing it. */
  is_free: boolean;
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
 *
 * `total` is already net of the pod's multi-ticket discount (frozen on the
 * payment at checkout, taken off the ticket money only), so the discount is
 * host-funded by construction — never add `ticket_discount_amount` back here.
 */
const ticketMoneyOf = (p: { total?: number; round_off?: number; metadata?: any }) => {
  // Products and rented items (rent + deposit) settle outside the pod.
  const products = addOnMoneyOf(p.metadata);
  const refunded = Number(p.metadata?.refunded_amount) || 0;
  // What the buyer paid for the tickets, and what of it they still hold.
  const paid = (Number(p.total) || 0) - products;
  const kept = Math.max(0, paid - refunded);
  // The round-off is Duncit's, never the pod's: it comes out before the
  // waterfall sees the money. A part refund gave back its share of it, so only
  // the share still held is taken off. Zero for every payment without one.
  const roundOff = paid > 0 ? (roundOffOf(p) * kept) / paid : 0;
  return Math.max(0, kept - roundOff);
};

/** The same netting as `ticketMoneyOf`, as a Mongo aggregation expression. */
const TICKET_MONEY_EXPR = {
  $let: {
    vars: {
      paid: {
        $subtract: [
          { $ifNull: ['$total', 0] },
          { $add: [{ $ifNull: ['$metadata.product_cost_total', 0] }, { $ifNull: ['$metadata.rental_total', 0] }] },
        ],
      },
      refunded: { $ifNull: ['$metadata.refunded_amount', 0] },
      round_off: { $ifNull: ['$round_off', 0] },
    },
    in: {
      $let: {
        vars: { kept: { $max: [0, { $subtract: ['$$paid', '$$refunded'] }] } },
        in: {
          $max: [
            0,
            {
              $subtract: [
                '$$kept',
                {
                  $cond: [
                    { $gt: ['$$paid', 0] },
                    { $divide: [{ $multiply: ['$$round_off', '$$kept'] }, '$$paid'] },
                    0,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  },
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
    PaymentModel.find({ pod_id: podId, status: 'SUCCESS' }).select('_id total round_off metadata').lean(),
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

/** What a pod owes its venue, and the two figures that answer was built from. */
export interface VenueCharge {
  /** The slot's charge as booked in the Partners portal — by its pricing mode,
   * overtime included (slotCharge.ts). 0 without a slot link. */
  slot_price: number;
  /** How the slot is priced: the whole slot, per hour, or per person. */
  pricing_mode: SlotPricingMode;
  /** People the PER_PAX charge was counted on (0 for the other modes). */
  pax: number;
  /** Hours past the slot's end, and what they cost. */
  overtime_hours: number;
  overtime_amount: number;
  /** A slot is linked, so `slot_price` is a real price and not an absent one. */
  slot_linked: boolean;
  /** The final bill entered at completion. 0 when none was. */
  bill: number;
  /** True when the bill is paid ON TOP of the slot price rather than instead of it. */
  slot_included: boolean;
  /** The venue's money — what the waterfall takes off the pool. */
  amount: number;
}

/** What venueChargeForPod reads off a pod. The seat fields count its people
 * for a PER_PAX slot; a caller holding only ids gets the pod's capacity. */
export interface VenueChargePod {
  venue_id?: Types.ObjectId | null;
  venue_slot_id?: Types.ObjectId | null;
  pod_type?: string | null;
  pod_attendees?: readonly unknown[] | null;
  extra_seats?: number | null;
  no_of_spots?: number | null;
}

/** What the pod actually used, entered at completion: people at a PER_PAX
 * slot (overriding the booked count) and hours past the slot's end. */
export interface VenueUsage {
  pax?: number | null;
  overtimeHours?: number | null;
}

/**
 * The completion's pax and overtime, checked. Left out = the booked seats and
 * no overtime. Both move the venue's money, so both are bounded here and frozen
 * on the release for Finance to see beside the slot price.
 */
export function venueUsageOf(input: { venue_pax?: number | null; overtime_hours?: number | null }): VenueUsage {
  const usage: VenueUsage = {};
  if (input.venue_pax !== undefined && input.venue_pax !== null) {
    if (!Number.isInteger(input.venue_pax) || input.venue_pax < 0 || input.venue_pax > 10_000) {
      throw new GraphQLError('Enter the people at the pod as a whole number from 0 to 10000', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    usage.pax = input.venue_pax;
  }
  if (input.overtime_hours !== undefined && input.overtime_hours !== null) {
    if (!Number.isFinite(input.overtime_hours) || input.overtime_hours < 0 || input.overtime_hours > 48) {
      throw new GraphQLError('Enter overtime as 0 to 48 hours', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    usage.overtimeHours = Math.round(input.overtime_hours * 4) / 4;
  }
  return usage;
}

/** The people a PER_PAX slot is charged for by default: everyone holding a
 * seat (attendees plus their extra seats), or the capacity when unknown. */
function defaultPaxOf(pod: VenueChargePod): number {
  if (Array.isArray(pod.pod_attendees)) return pod.pod_attendees.length + Math.max(0, pod.extra_seats ?? 0);
  return Math.max(0, pod.no_of_spots ?? 0);
}

/**
 * The venue's money for a pod.
 *
 * It starts as the booked slot price (Partners portal). What the venue finally
 * charges can differ from that — extra hours, food, breakage — so whoever
 * completes the pod may enter the venue's final bill:
 *
 *   - no bill          → the booked slot price stands;
 *   - a bill           → the bill REPLACES the slot price (it is the final
 *                        figure for the evening);
 *   - a bill + include → the bill is paid on top of the slot price.
 *
 * A legacy pod with no slot link has no slot price, so its bill is the whole
 * amount either way.
 *
 * `includeSlotPrice` left out (null / undefined) is how a caller says it does
 * not know about any of this: app builds from before the bill could move money
 * REQUIRED an amount and sent it as evidence only, with no document behind it.
 * For those the bill is recorded and the slot price still stands — exactly what
 * they were built against — so an installed build keeps completing pods and
 * can never change a venue's payout with a number nobody can check.
 */
export async function venueChargeForPod(
  pod: VenueChargePod,
  venueBill: number,
  includeSlotPrice?: boolean | null,
  usage?: VenueUsage | null
): Promise<VenueCharge> {
  const none = {
    slot_price: 0,
    pricing_mode: 'FLAT' as const,
    pax: 0,
    overtime_hours: 0,
    overtime_amount: 0,
    slot_linked: false,
    bill: 0,
    slot_included: false,
    amount: 0,
  };
  // A free pod's venue is paid by the host directly, off the platform — the
  // platform owes it nothing, whatever the slot is priced at or a bill says.
  if (!pod.venue_id || isFreePod(pod)) return none;
  const slot = pod.venue_slot_id
    ? await VenueSlotModel.findById(pod.venue_slot_id).select('price pricing_mode overtime_rate start_at end_at')
    : null;
  const pax = usage?.pax ?? defaultPaxOf(pod);
  const overtimeHours = Math.max(0, Number(usage?.overtimeHours) || 0);
  const slotCharge = slot ? slotVenueCharge(slot, { pax, overtimeHours }) : null;
  const slotPrice = slotCharge ? slotCharge.total : 0;
  const bill = Math.max(0, round2(venueBill));
  const base = {
    slot_price: slotPrice,
    pricing_mode: slotCharge?.mode ?? 'FLAT',
    pax: slotCharge?.mode === 'PER_PAX' ? Math.max(0, Math.floor(pax)) : 0,
    overtime_hours: slotCharge ? overtimeHours : 0,
    overtime_amount: slotCharge?.overtime ?? 0,
    slot_linked: !!slot,
    bill,
  };
  const evidenceOnly = includeSlotPrice == null && !!slot;
  if (bill <= 0 || evidenceOnly) return { ...base, slot_included: false, amount: slotPrice };
  const slotIncluded = !!includeSlotPrice && slotPrice > 0;
  return { ...base, slot_included: slotIncluded, amount: slotIncluded ? round2(slotPrice + bill) : bill };
}

/** The venue's money for a pod when only the amount is wanted — the live views
 * and risk checks that run before any bill exists pass 0 and get the booked
 * slot price (a bill passed here is evidence only, so a slot's price wins).
 * One rule, {@link venueChargeForPod}'s. */
export async function venueAmountForPod(pod: VenueChargePod, venueBill: number): Promise<number> {
  return (await venueChargeForPod(pod, venueBill)).amount;
}

const NO_RATES: BreakdownRates = {
  gst_percent: 0,
  platform_fee_percent: 0,
  host_commission_percent: 0,
  venue_commission_percent: 0,
  club_admin_percent: 0,
};

/** The waterfall a free pod reports: every line 0, no venue amount and no
 * negative host figure — there is no platform money to split. */
export function freePodWaterfall(): SettlementWaterfall {
  return waterfallForAmount(0, 0, NO_RATES);
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
 * commission % from each side. The venue's final bill, when one is entered,
 * replaces the slot price (`includeSlotPrice: false`) or is paid on top of it
 * (`true`); left out, the bill is evidence only — see {@link venueChargeForPod}.
 *
 * `hostUserId` is the host actually being PAID (a pod can have co-hosts and
 * completion picks one) — their commission override must price the settlement,
 * not whichever host happens to be listed first. Defaults to the primary host.
 */
export async function computePodSettlement(
  podDocId: string,
  venueBillAmount: number,
  hostUserId?: string | null,
  includeSlotPrice?: boolean | null,
  usage?: VenueUsage | null
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
  // The bill may legitimately exceed a small pod's collection (offline venue
  // costs) — it is never capped to what the pod took.
  // A free pod settles nothing on the platform: no venue party (so no venue
  // bill is asked for), an all-zero waterfall and a zero host payout.
  const free = isFreePod(pod);
  const hasVenue = !free && !!pod.venue_id;
  const rates = await resolveEffectiveRates({
    hostUserId: hostUserId ?? pod.pod_hosts_id?.[0] ?? null,
    venueId: hasVenue ? pod.venue_id : null,
  });
  const charge = await venueChargeForPod(pod, venueBillAmount, includeSlotPrice, usage);
  const venueBill = charge.bill;
  const venueAmount = charge.amount;
  const waterfall = free
    ? freePodWaterfall()
    : toWaterfall(
        computePodFinanceBreakdown(toPaise(basis), Math.max(0, toPaise(venueAmount)), rates, {
          // The venue is owed its BOOKED slot price whatever the pod took at the
          // door — it held the room. Clamping it to the pool is what silently paid
          // a venue less than the price it agreed, and settling on attendance only
          // makes that pool smaller. Unclamped, a shortfall lands where it
          // belongs: on the host's side, shown as a negative host amount rather
          // than quietly taken off the venue.
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
    venue_slot_price: charge.slot_price,
    venue_slot_linked: charge.slot_linked,
    include_slot_price: charge.slot_included,
    venue_pricing_mode: charge.pricing_mode,
    venue_pax: charge.pax,
    venue_overtime_hours: charge.overtime_hours,
    venue_overtime_amount: charge.overtime_amount,
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
    is_free: free,
  };
}

import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { managedVenue } from '@modules/venues/venueFood/venueFoodOrder.shared';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { RentalBookingModel, type IRentalBooking } from './rentalBooking.model';

/**
 * The rental tables (DUNCIT TABLE CONTRACT v1): Finance sees every booking,
 * a venue sees its own (the venue filter is pinned server-side, so no client
 * filter can widen it), and a guest reads their history through the same shape.
 */

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['payment_ref', 'name'],
  sortFields: {
    created_at: 'created_at',
    name: 'name',
    rent_amount: 'rent_amount',
    deposit_amount: 'deposit_amount',
    refund_due: 'refund_due',
    venue_amount: 'venue_amount',
    status: 'status',
    refund_status: 'refund_status',
  },
  filterFields: {
    status: { type: 'enum' },
    refund_status: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export function toRentalBookingPub(b: IRentalBooking, names: { pod: string; guest: string; currency: string }) {
  return {
    id: String(b._id),
    currency_symbol: names.currency,
    payment_ref: b.payment_ref,
    pod_id: String(b.pod_id),
    pod_title: names.pod,
    guest_name: names.guest,
    venue_id: String(b.venue_id),
    item_id: String(b.item_id),
    name: b.name,
    image_url: b.image_url ?? '',
    unit: b.unit,
    rate: b.rate,
    units: b.units,
    quantity: b.quantity,
    rent_amount: b.rent_amount,
    deposit_amount: b.deposit_amount,
    status: b.status,
    damage_claim: b.damage_claim ?? 0,
    damage_note: b.damage_note ?? '',
    refund_due: b.refund_due ?? 0,
    refund_status: b.refund_status ?? 'NONE',
    refund_ref: b.refund_ref ?? '',
    refunded_at: iso(b.refunded_at),
    commission_pct: b.commission_pct ?? 0,
    commission_amount: b.commission_amount ?? 0,
    venue_amount: b.venue_amount ?? 0,
    release_id: b.release_id ?? null,
    marked_at: iso(b.marked_at),
    auto_released: b.auto_released === true,
    created_at: new Date(b.created_at).toISOString(),
  };
}

/** Pod titles and guest names for a page of bookings — two reads, never one per row. */
export async function hydrateRentalBookings(rows: IRentalBooking[]) {
  const podIds = [...new Set(rows.map((r) => String(r.pod_id)))];
  const paymentIds = [...new Set(rows.map((r) => String(r.payment_doc_id)))];
  const [pods, payments, finance] = await Promise.all([
    PodModel.find({ _id: { $in: podIds } }).setOptions({ includeDeleted: true }).select('pod_title').lean(),
    PaymentModel.find({ _id: { $in: paymentIds } }).select('user_name').lean(),
    getFinanceSettings(),
  ]);
  const titles = new Map(pods.map((p) => [String(p._id), p.pod_title ?? '']));
  const guests = new Map(payments.map((p) => [String(p._id), p.user_name ?? '']));
  return rows.map((row) =>
    toRentalBookingPub(row, {
      pod: titles.get(String(row.pod_id)) ?? '',
      guest: guests.get(String(row.payment_doc_id)) ?? '',
      currency: finance.currency_symbol,
    })
  );
}

async function page(filter: Record<string, unknown>, input?: TableQueryInput | null) {
  const { docs, total, page: at, page_size } = await runTableQuery<IRentalBooking>(
    RentalBookingModel,
    filter,
    input,
    TABLE_CONFIG
  );
  return { rows: await hydrateRentalBookings(docs), total, page: at, page_size };
}

/** What a venue's rentals add up to — the Rented Items dashboard's numbers. */
async function venueStats(actor: { userId: string; isAdmin: boolean }, venueId: string) {
  const venue = await managedVenue(actor.userId, actor.isAdmin, venueId);
  const [row] = await RentalBookingModel.aggregate<{
    bookings: number;
    open: number;
    rent_total: number;
    deposits_held: number;
    earned: number;
    paid_out: number;
  }>([
    { $match: { venue_id: new Types.ObjectId(String(venue._id)) } },
    {
      $group: {
        _id: null,
        bookings: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'BOOKED'] }, 1, 0] } },
        rent_total: { $sum: { $cond: [{ $in: ['$status', ['BOOKED', 'RETURNED', 'DAMAGED']] }, '$rent_amount', 0] } },
        deposits_held: { $sum: { $cond: [{ $eq: ['$status', 'BOOKED'] }, '$deposit_amount', 0] } },
        earned: { $sum: '$venue_amount' },
        paid_out: { $sum: { $cond: [{ $ne: ['$release_id', null] }, '$venue_amount', 0] } },
      },
    },
  ]);
  const { currency_symbol } = await getFinanceSettings();
  const totals = row ?? { bookings: 0, open: 0, rent_total: 0, deposits_held: 0, earned: 0, paid_out: 0 };
  return { ...totals, currency_symbol };
}

export const rentalBookingTableService = {
  financeTable: (input?: TableQueryInput | null) => page({}, input),
  async venueTable(actor: { userId: string; isAdmin: boolean }, venueId: string, input?: TableQueryInput | null) {
    const venue = await managedVenue(actor.userId, actor.isAdmin, venueId);
    return page({ venue_id: venue._id }, input);
  },
  venueStats,
};

import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { RentalBookingModel, type IRentalBooking } from './rentalBooking.model';
import { RentalStockModel } from './rentalStock.model';
import { paymentRentalLines, type RentalLine } from './rentalLines';

/**
 * Turn a captured pod payment's rental lines into bookings — the capture leg of
 * a rental, run inside the payment's finalize transaction.
 */

interface Reservation {
  podId: Types.ObjectId;
  itemId: Types.ObjectId;
  quantity: number;
  stock: number;
  holder: string;
}

/**
 * Take `quantity` units of the pod's stock for one booking, or report that
 * there are not enough. Atomic (one conditional `$inc`) and idempotent: the
 * holder key makes a second run find its own units instead of taking more.
 */
export async function reserveRentalStock(r: Reservation, session?: ClientSession): Promise<boolean> {
  const key = { pod_id: r.podId, item_id: r.itemId };
  await RentalStockModel.updateOne(key, { $setOnInsert: { booked: 0, holders: [] } }, { upsert: true, session });
  const taken = await RentalStockModel.updateOne(
    { ...key, holders: { $ne: r.holder }, booked: { $lte: r.stock - r.quantity } },
    { $inc: { booked: r.quantity }, $push: { holders: r.holder } },
    { session }
  );
  if (taken.modifiedCount === 1) return true;
  const mine = await RentalStockModel.exists({ ...key, holders: r.holder }).session(session ?? null);
  return mine !== null;
}

function bookingOf(payment: IPayment, venueId: Types.ObjectId, line: RentalLine, booked: boolean) {
  const owed = booked ? 0 : line.rent + line.deposit;
  return {
    payment_doc_id: payment._id,
    payment_ref: payment.payment_id,
    pod_id: payment.pod_id,
    venue_id: venueId,
    user_id: payment.user_id,
    item_id: line.item_id,
    name: line.name,
    image_url: line.image_url,
    unit: line.unit,
    rate: line.rate,
    units: line.units,
    quantity: line.quantity,
    rent_amount: line.rent,
    deposit_amount: line.deposit,
    status: booked ? 'BOOKED' : 'UNAVAILABLE',
    refund_due: owed,
    refund_status: booked ? 'NONE' : 'DUE',
  };
}

export interface RentalCaptureResult {
  bookings: IRentalBooking[];
  unavailable: number;
}

/**
 * Book every rental line on the payment. An item that sold out (or that the
 * venue withdrew) after checkout does not abort the seat: its line is recorded
 * UNAVAILABLE with its money due back, and the rest still book.
 */
export async function bookRentalsForPayment(
  payment: IPayment,
  session?: ClientSession
): Promise<RentalCaptureResult> {
  const lines = paymentRentalLines(payment.metadata);
  const existing = await RentalBookingModel.find({ payment_doc_id: payment._id }).session(session ?? null);
  if (lines.length === 0 || existing.length > 0) {
    return { bookings: existing, unavailable: existing.filter((b) => b.status === 'UNAVAILABLE').length };
  }
  // Frozen at checkout, so the bookings name the venue that was paid for even
  // if the pod has since moved venues or lost one.
  const venueId = String((payment.metadata as { rental_venue_id?: unknown } | null)?.rental_venue_id ?? '');
  if (!Types.ObjectId.isValid(venueId)) {
    throw new GraphQLError('This payment has rented items but no venue to book them with', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
  const venue = await VenueModel.findById(venueId).select('rental_items').session(session ?? null).lean();
  const items = new Map((venue?.rental_items ?? []).map((item) => [item._id.toHexString(), item]));
  const rows = [];
  for (const line of lines) {
    const item = items.get(line.item_id);
    const booked =
      !!item &&
      !!payment.pod_id &&
      item.is_available !== false &&
      (await reserveRentalStock(
        {
          podId: payment.pod_id,
          itemId: item._id,
          quantity: line.quantity,
          stock: item.stock,
          holder: `${String(payment._id)}:${line.item_id}`,
        },
        session
      ));
    rows.push(bookingOf(payment, new Types.ObjectId(venueId), line, booked));
  }
  const bookings = await RentalBookingModel.create(rows, { session, ordered: true });
  return { bookings, unavailable: bookings.filter((b) => b.status === 'UNAVAILABLE').length };
}

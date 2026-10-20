import { Schema, model, Types } from 'mongoose';

/**
 * One row per venue, bumped inside every instant-booking transaction. Two
 * hosts booking the same venue at once both write this row, so the database
 * aborts one of them (write conflict); its retry re-reads the calendar, sees
 * the other booking and refuses an overlap. A time range cannot be made
 * unique by an index — this row is what serialises the check-then-write.
 */
export interface IVenueBookingLock {
  venue_id: Types.ObjectId;
  version: number;
}

const venueBookingLockSchema = new Schema<IVenueBookingLock>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, unique: true },
    version: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export const VenueBookingLockModel = model<IVenueBookingLock>('VenueBookingLock', venueBookingLockSchema);

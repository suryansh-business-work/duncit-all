import { Schema, model, Types, type Document } from 'mongoose';

/** PENDING = a hold placed by a host's pod that is waiting for the venue
 * owner's approval; it books into BOOKED or releases back to AVAILABLE. */
export type VenueSlotStatus = 'AVAILABLE' | 'PENDING' | 'BOOKED' | 'BLOCKED';

export interface IVenueSlot extends Document {
  venue_id: Types.ObjectId;
  owner_user_id: Types.ObjectId;
  start_at: Date;
  end_at: Date;
  price: number;
  /** The venue space/capacity-item this slot is for ('' = whole venue). Slots in
   * different spaces may share the same time window. */
  space_label: string;
  /** Guests this slot can hold — the space's capacity (0 = unset/whole venue). */
  capacity: number;
  status: VenueSlotStatus;
  booked_by_pod_id: Types.ObjectId | null;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

const venueSlotSchema = new Schema<IVenueSlot>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    start_at: { type: Date, required: true, index: true },
    end_at: { type: Date, required: true },
    price: { type: Number, default: 0, min: 0, max: 1_000_000 },
    space_label: { type: String, default: '', trim: true, maxlength: 120 },
    capacity: { type: Number, default: 0, min: 0, max: 100_000 },
    status: {
      type: String,
      enum: ['AVAILABLE', 'PENDING', 'BOOKED', 'BLOCKED'],
      default: 'AVAILABLE',
      index: true,
    },
    booked_by_pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    notes: { type: String, default: '', trim: true, maxlength: 280 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

venueSlotSchema.index({ venue_id: 1, start_at: 1 });
venueSlotSchema.index({ venue_id: 1, status: 1, start_at: 1 });

export const VenueSlotModel = model<IVenueSlot>('VenueSlot', venueSlotSchema);

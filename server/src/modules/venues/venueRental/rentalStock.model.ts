import { Schema, model, type Types } from 'mongoose';

/**
 * How many units of one rented item are booked for one pod. Every pod at the
 * venue gets the item's full stock, so the counter is per (pod, item).
 *
 * `holders` names every booking that took units, so taking them is idempotent:
 * a capture that runs twice finds its own key and takes nothing more. It never
 * grows past the item's stock (at most 1,000 units, one key per booking).
 */
export interface IRentalStock {
  pod_id: Types.ObjectId;
  item_id: Types.ObjectId;
  booked: number;
  holders: string[];
}

const rentalStockSchema = new Schema<IRentalStock>(
  {
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    item_id: { type: Schema.Types.ObjectId, required: true },
    booked: { type: Number, default: 0, min: 0 },
    holders: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

rentalStockSchema.index({ pod_id: 1, item_id: 1 }, { unique: true });

export const RentalStockModel = model<IRentalStock>('RentalStock', rentalStockSchema);

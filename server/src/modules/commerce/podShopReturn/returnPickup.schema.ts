import { Schema } from 'mongoose';

/**
 * The courier leg of a pod-shop return — a ShipRocket reverse pickup from the
 * buyer to the brand's warehouse. The pet store keeps its own (StoreReturn);
 * the two shops share no return code (rule 65).
 */

/** Where the reverse-pickup parcel is. */
export type ReturnPickupStatus = '' | 'BOOKED' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'FAILED';

export interface IReturnPickupEvent {
  status: string;
  location: string;
  note: string;
  at: Date;
}

/** The courier leg of a return: collected from the buyer, delivered to the warehouse. */
export interface IReturnPickup {
  sr_order_id: string;
  shipment_id: string;
  awb: string;
  courier_name: string;
  status: ReturnPickupStatus;
  tracking_status: string;
  last_error: string;
  last_synced_at: Date | null;
  events: IReturnPickupEvent[];
}

export const returnPickupSchema = new Schema<IReturnPickup>(
  {
    sr_order_id: { type: String, default: '' },
    shipment_id: { type: String, default: '' },
    awb: { type: String, default: '', index: true },
    courier_name: { type: String, default: '' },
    status: {
      type: String,
      enum: ['', 'BOOKED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED'],
      default: '',
    },
    tracking_status: { type: String, default: '' },
    last_error: { type: String, default: '' },
    last_synced_at: { type: Date, default: null },
    events: {
      type: [
        new Schema<IReturnPickupEvent>(
          {
            status: { type: String, default: '' },
            location: { type: String, default: '' },
            note: { type: String, default: '' },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

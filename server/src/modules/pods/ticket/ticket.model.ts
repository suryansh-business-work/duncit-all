import { Schema, model, Types, type Document } from 'mongoose';

export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'CANCELLED';

/** A self-contained event ticket for one confirmed pod membership. Pod/venue/
 * attendee details are snapshotted so the ticket + QR stay correct even if the
 * pod is later edited. One ticket per membership (unique). */
export interface ITicket extends Document {
  ticket_code: string;
  membership_id: Types.ObjectId;
  pod_id: Types.ObjectId;
  user_id: Types.ObjectId;
  payment_id: Types.ObjectId | null;
  status: TicketStatus;
  checked_in_at: Date | null;
  checked_in_by: Types.ObjectId | null;
  qr_token: string;
  snapshot: {
    pod_title: string;
    pod_date_time: string | null;
    pod_end_date_time: string | null;
    pod_mode: string;
    meeting_platform: string | null;
    venue_name: string | null;
    venue_address: string | null;
    zone_name: string | null;
    user_name: string;
    user_email: string;
  };
  created_at: Date;
  updated_at: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticket_code: { type: String, required: true, unique: true, index: true },
    membership_id: { type: Schema.Types.ObjectId, ref: 'PodMember', required: true, unique: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    status: { type: String, enum: ['VALID', 'CHECKED_IN', 'CANCELLED'], default: 'VALID', index: true },
    checked_in_at: { type: Date, default: null },
    checked_in_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    qr_token: { type: String, default: '' },
    snapshot: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TicketModel = model<ITicket>('EventTicket', ticketSchema);

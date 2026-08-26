import { Schema, model, Types, type Document } from 'mongoose';

export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'CANCELLED';

/**
 * How a ticket came to be marked present.
 *
 * Attendance decides what the host is paid, so "who said so" is part of the
 * record rather than something to reconstruct from timestamps later. A scan is
 * proof the person was at the door; the other three are somebody vouching.
 */
export const ATTENDANCE_METHODS = [
  'HOST_SCAN',
  'HOST_MANUAL',
  'CLUB_ADMIN_FORCE',
  'ADMIN',
  // A virtual pod has no door. A JOINED member opening the meeting link from
  // the pod page, inside the pod's window, is the online equivalent of the
  // scan — and without it a paid virtual pod settled its host at zero.
  'VIRTUAL_JOIN',
] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];

/** The one-time-code proof behind a by-hand mark, when one was required. */
export interface ITicketAttendanceVerification {
  medium: string;
  phone_extension: string;
  phone_number: string;
  name: string;
  verified_at: Date;
  challenge_id: string;
}

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
  /** People this one ticket admits — the seats its booking holds. */
  seats: number;
  checked_in_at: Date | null;
  checked_in_by: Types.ObjectId | null;
  /** Null on every ticket marked before the method was recorded. */
  checked_in_method: AttendanceMethod | null;
  /** Null when nothing was proved — a scan, or an admin override. */
  attendance_verification: ITicketAttendanceVerification | null;
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
    // Legacy tickets predate multi-seat booking and all admit one.
    seats: { type: Number, default: 1, min: 1 },
    checked_in_at: { type: Date, default: null },
    checked_in_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    checked_in_method: { type: String, enum: ATTENDANCE_METHODS, default: null },
    attendance_verification: { type: Schema.Types.Mixed, default: null },
    qr_token: { type: String, default: '' },
    snapshot: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TicketModel = model<ITicket>('EventTicket', ticketSchema);

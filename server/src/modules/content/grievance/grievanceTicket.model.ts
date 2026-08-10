import mongoose, { Schema, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/**
 * Where a grievance is in its redressal.
 *
 * Deliberately shorter than a support ticket's life: a grievance is a legal
 * record with a clock on it, not a conversation. It is received, someone is
 * working on it, and then it is either resolved or explained away — and the
 * complainant is told which.
 */
export type GrievanceStatus = 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export const GRIEVANCE_STATUSES: GrievanceStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
];

/** Which surface the grievance was raised from. */
export type GrievanceSource = 'APP' | 'WEBSITE' | 'PORTAL';
export const GRIEVANCE_SOURCES: GrievanceSource[] = ['APP', 'WEBSITE', 'PORTAL'];

export interface IGrievanceTicket extends Document {
  /**
   * The permanent handle: GRV-000001.
   *
   * A grievance is quoted back in acknowledgements, escalations and, if it
   * ever comes to it, in front of a regulator. It is minted from a counter
   * that only counts up, so a deleted grievance's number is never given to
   * another one — a reused id makes every older reference to it a lie.
   */
  grievance_no: string | null;
  /** Set when a signed-in user raised it; null for a website visitor. */
  user_id: Types.ObjectId | null;
  source: GrievanceSource;
  /** Who is complaining. Kept on the record even for a signed-in user, because
   *  the details they gave at the time are what the grievance was filed under. */
  name: string;
  email: string;
  phone: string;
  /** Optional — a grievance is answerable by email; a postal address is not required. */
  address: string;
  subject: string;
  description: string;
  status: GrievanceStatus;
  /** What the legal team did about it, shown to nobody but staff. */
  resolution: string;
  resolved_at: Date | null;
  handled_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const grievanceTicketSchema = new Schema<IGrievanceTicket>(
  {
    grievance_no: { type: String, default: null, unique: true, sparse: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    source: { type: String, enum: GRIEVANCE_SOURCES, default: 'APP', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200, index: true },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: GRIEVANCE_STATUSES, default: 'RECEIVED', index: true },
    resolution: { type: String, default: '', trim: true, maxlength: 5000 },
    resolved_at: { type: Date, default: null },
    handled_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The queue view: open grievances, oldest first — the clock runs on the oldest.
grievanceTicketSchema.index({ status: 1, created_at: 1 });

// Minted on insert only, so the id never changes once anyone has seen it.
grievanceTicketSchema.pre('save', async function (next) {
  if (this.isNew && !this.grievance_no) {
    this.grievance_no = await nextEntityNo('GRV', 'grievance');
  }
  next();
});

export const GrievanceTicketModel =
  (mongoose.models.GrievanceTicket as mongoose.Model<IGrievanceTicket>) ||
  mongoose.model<IGrievanceTicket>('GrievanceTicket', grievanceTicketSchema);

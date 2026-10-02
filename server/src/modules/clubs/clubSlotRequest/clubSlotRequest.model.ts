import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ClubSlotRequestStatus = 'OPEN' | 'RESOLVED';

/**
 * A host's "this club has no open venue slots" request to the club's admins.
 *
 * Raised from Create Pod step 1 when the picked club's venues have nothing
 * bookable. The admins hear about it on WhatsApp and email; the row is what the
 * Clubs console lists, so staff can see which clubs keep turning hosts away and
 * close a request once the venues have published slots.
 *
 * Club and host names are copied at request time — the list must read the same
 * after a club is renamed or a host leaves.
 */
export interface IClubSlotRequest extends Document {
  club_id: Types.ObjectId;
  club_name: string;
  host_user_id: Types.ObjectId;
  host_name: string;
  /** '+919876543210', else the host's email — what the admin was sent. */
  host_contact: string;
  /** How many club admins were messaged (0 when the club has none). */
  notified: number;
  status: ClubSlotRequestStatus;
  resolved_at: Date | null;
  resolved_by_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const clubSlotRequestSchema = new Schema<IClubSlotRequest>(
  {
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    club_name: { type: String, default: '', trim: true },
    host_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    host_name: { type: String, default: '', trim: true },
    host_contact: { type: String, default: '', trim: true },
    notified: { type: Number, default: 0 },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN', index: true },
    resolved_at: { type: Date, default: null },
    resolved_by_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The repeat guard: this host's recent request for this club.
clubSlotRequestSchema.index({ club_id: 1, host_user_id: 1, created_at: -1 });

export const ClubSlotRequestModel =
  (mongoose.models.ClubSlotRequest as mongoose.Model<IClubSlotRequest>) ||
  mongoose.model<IClubSlotRequest>('ClubSlotRequest', clubSlotRequestSchema);

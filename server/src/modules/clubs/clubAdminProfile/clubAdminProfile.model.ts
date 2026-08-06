import mongoose, { Schema, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/**
 * The onboarded Club Admin record.
 *
 * Host, Venue Partner and E-Commerce Brand each get an entity drafted the
 * moment their onboarding meeting is approved — an id, a status, a commission,
 * a review trail. Club Admin was the one kind that got only a role, so it had
 * nothing to show in a table and nothing to review. This is that missing half.
 *
 * The clubs a Club Admin runs are NOT stored here: `Club.admin_user_ids` has
 * always been that answer, and a second copy would be a second thing to keep
 * right. Assigning from the Review dialog writes there.
 */

export const CLUB_ADMIN_STATUSES = ['DRAFT', 'APPROVED', 'REJECTED'] as const;
export type ClubAdminStatus = (typeof CLUB_ADMIN_STATUSES)[number];

export interface IClubAdminProfile extends Document {
  /** Immutable public id, e.g. `CADM-000001`. Minted once and never reused. */
  club_admin_no: string | null;
  user_id: Types.ObjectId;
  /**
   * Contact details, copied from the user account when the record is drafted.
   *
   * Denormalised for the same reason the Host record denormalises them: the
   * table searches and sorts on name, email and phone, and joining a second
   * collection to do that would cost a query per page. Editable here, so
   * onboarding can correct a typo without touching the login account.
   */
  full_name: string;
  email: string;
  phone: string;
  /** The taxonomy the applicant chose in the onboarding gate. */
  super_category_id: Types.ObjectId | null;
  category_id: Types.ObjectId | null;
  sub_category_id: Types.ObjectId | null;
  status: ClubAdminStatus;
  /**
   * Separate from `status` on purpose, exactly as it is for the other three:
   * REJECTED is a review outcome, `is_active: false` is a switch an admin can
   * flip back. The table shows one Status column derived from both.
   */
  is_active: boolean;
  /** Null or 0 inherits the platform default; a number is this admin's rate. */
  commission_pct: number | null;
  /** When onboarding completed — the approval that granted the role. */
  joined_at: Date | null;
  reviewer_notes: string | null;
  /** The meeting request this came from, for the audit trail. */
  request_no: string | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const clubAdminProfileSchema = new Schema<IClubAdminProfile>(
  {
    club_admin_no: { type: String, default: null, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    full_name: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    status: { type: String, enum: CLUB_ADMIN_STATUSES, default: 'DRAFT', index: true },
    is_active: { type: Boolean, default: true },
    commission_pct: { type: Number, default: null },
    joined_at: { type: Date, default: null },
    reviewer_notes: { type: String, default: null },
    request_no: { type: String, default: null },
    approved_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Minted on insert only, so an id never changes once it has been shown to
// anyone — the same contract host_no / venue_no / brand_no carry.
clubAdminProfileSchema.pre('save', async function (next) {
  if (this.isNew && !this.club_admin_no) {
    this.club_admin_no = await nextEntityNo('CADM', 'club_admin');
  }
  next();
});

export const ClubAdminProfileModel =
  (mongoose.models.ClubAdminProfile as mongoose.Model<IClubAdminProfile>) ||
  mongoose.model<IClubAdminProfile>('ClubAdminProfile', clubAdminProfileSchema);

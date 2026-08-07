import mongoose, { Schema, type Document } from 'mongoose';

export interface IGrievanceOfficer extends Document {
  /** Fixed key — there is one officer, so there is one row. */
  key: string;
  name: string;
  email: string;
  phone: string;
  /** Optional: the officer is reachable by email and phone without one. */
  address: string;
  updated_at: Date;
  created_at: Date;
}

/**
 * The Grievance Officer Duncit publishes.
 *
 * A singleton, because it is one set of contact details that the app, the
 * website and the acknowledgement email must all quote identically — three
 * copies of a phone number is three chances to publish a stale one. Kept as a
 * row rather than a setting so it is edited on a page of its own with proper
 * validation, and so a blank one is visibly blank rather than silently absent.
 */
const grievanceOfficerSchema = new Schema<IGrievanceOfficer>(
  {
    key: { type: String, default: 'default', unique: true, index: true },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const GrievanceOfficerModel =
  (mongoose.models.GrievanceOfficer as mongoose.Model<IGrievanceOfficer>) ||
  mongoose.model<IGrievanceOfficer>('GrievanceOfficer', grievanceOfficerSchema);

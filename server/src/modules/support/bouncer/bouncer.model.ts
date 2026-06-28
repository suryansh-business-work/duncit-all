import { Schema, model, Types, type Document } from 'mongoose';

export type BouncerSosStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type BouncerCallbackStatus = 'PENDING' | 'CONTACTED' | 'CLOSED';
export type BouncerFeedbackCategory = 'VENUE' | 'HOST' | 'SAFETY' | 'FOOD' | 'OTHER';

interface IBouncerGeo {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

const geoSchema = new Schema<IBouncerGeo>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number, default: null },
  },
  { _id: false }
);

export interface IBouncerSosAlert extends Document {
  ticket_no: string;
  user_id: Types.ObjectId;
  pod_id: Types.ObjectId;
  host_id: Types.ObjectId | null;
  venue_id: Types.ObjectId | null;
  club_id: Types.ObjectId | null;
  location: IBouncerGeo | null;
  message: string;
  contact_phone: string;
  status: BouncerSosStatus;
  acknowledged_by: Types.ObjectId | null;
  acknowledged_at: Date | null;
  resolved_by: Types.ObjectId | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const sosSchema = new Schema<IBouncerSosAlert>(
  {
    ticket_no: { type: String, default: '', trim: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    host_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', default: null },
    location: { type: geoSchema, default: null },
    message: { type: String, default: '', trim: true, maxlength: 500 },
    contact_phone: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    acknowledged_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledged_at: { type: Date, default: null },
    resolved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const BouncerSosAlertModel = model<IBouncerSosAlert>('BouncerSosAlert', sosSchema);

export interface IBouncerCallbackRequest extends Document {
  ticket_no: string;
  user_id: Types.ObjectId;
  pod_id: Types.ObjectId | null;
  host_id: Types.ObjectId | null;
  contact_phone: string;
  reason: string;
  status: BouncerCallbackStatus;
  contacted_by: Types.ObjectId | null;
  contacted_at: Date | null;
  /** Outcome recorded by the agent on the call: how long it ran and how it ended. */
  duration_seconds: number | null;
  conclusion: string;
  created_at: Date;
  updated_at: Date;
}

const callbackSchema = new Schema<IBouncerCallbackRequest>(
  {
    ticket_no: { type: String, default: '', trim: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
    host_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    contact_phone: { type: String, required: true, trim: true },
    reason: { type: String, default: '', trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['PENDING', 'CONTACTED', 'CLOSED'],
      default: 'PENDING',
      index: true,
    },
    contacted_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    contacted_at: { type: Date, default: null },
    duration_seconds: { type: Number, default: null },
    conclusion: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const BouncerCallbackRequestModel = model<IBouncerCallbackRequest>(
  'BouncerCallbackRequest',
  callbackSchema
);

export interface IBouncerFeedback extends Document {
  user_id: Types.ObjectId;
  pod_id: Types.ObjectId;
  host_id: Types.ObjectId | null;
  rating: number;
  category: BouncerFeedbackCategory;
  message: string;
  created_at: Date;
  updated_at: Date;
}

const feedbackSchema = new Schema<IBouncerFeedback>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    host_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    category: {
      type: String,
      enum: ['VENUE', 'HOST', 'SAFETY', 'FOOD', 'OTHER'],
      default: 'OTHER',
      index: true,
    },
    message: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const BouncerFeedbackModel = model<IBouncerFeedback>('BouncerFeedback', feedbackSchema);

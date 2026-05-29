import { Schema, model, type Document, Types } from 'mongoose';

export type UserContactActionType = 'CALL' | 'EMAIL';

export interface IUserContactAction extends Document {
  user_id: Types.ObjectId;
  created_by: Types.ObjectId | null;
  type: UserContactActionType;
  target: string;
  subject: string;
  notes: string;
  status: string;
  duration_seconds: number;
  twilio_call_sid: string;
  recording_sid: string;
  recording_url: string;
  created_at: Date;
  updated_at: Date;
}

const userContactActionSchema = new Schema<IUserContactAction>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: { type: String, enum: ['CALL', 'EMAIL'], required: true, index: true },
    target: { type: String, required: true, trim: true },
    subject: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
    status: { type: String, default: 'LOGGED', trim: true },
    duration_seconds: { type: Number, default: 0, min: 0 },
    twilio_call_sid: { type: String, default: '', trim: true, index: true },
    recording_sid: { type: String, default: '', trim: true },
    recording_url: { type: String, default: '', trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const UserContactActionModel = model<IUserContactAction>(
  'UserContactAction',
  userContactActionSchema
);
import { Schema, model, type Types } from 'mongoose';

/**
 * A Gmail mailbox connected to Intel with "Connect with Google" (read-only
 * scope). The refresh token is sealed at rest (AES-256-GCM, social.tokens) and
 * never selected unless a sync needs it. One account per address; connecting
 * the same address again replaces its token.
 */

export interface IIntelGmailAccount {
  _id: Types.ObjectId;
  email: string;
  google_sub: string;
  refresh_token: string;
  connected_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const intelGmailAccountSchema = new Schema<IIntelGmailAccount>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    google_sub: { type: String, default: '' },
    refresh_token: { type: String, required: true, select: false },
    connected_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const IntelGmailAccountModel = model<IIntelGmailAccount>('IntelGmailAccount', intelGmailAccountSchema, 'intel_gmail_accounts');

import { Schema, model, Types, type Document } from 'mongoose';

/** Default scopes every new developer key gets — the full public venue API. */
export const DEFAULT_API_KEY_SCOPES = ['venues:read', 'slots:read', 'bookings:write'];

export interface IApiKey extends Document {
  name: string;
  /** SHA-256 hex of the raw key — the raw key itself is never stored. */
  key_hash: string;
  /** First characters of the raw key, kept only for display in key lists. */
  key_prefix: string;
  owner_user_id: Types.ObjectId;
  scopes: string[];
  last_used_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    key_hash: { type: String, required: true, unique: true, index: true },
    key_prefix: { type: String, required: true },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scopes: { type: [String], default: () => [...DEFAULT_API_KEY_SCOPES] },
    last_used_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ApiKeyModel = model<IApiKey>('ApiKey', apiKeySchema);

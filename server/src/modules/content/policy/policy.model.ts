import { Schema, model, type Document } from 'mongoose';

export interface IPolicy extends Document {
  slug: string;
  title: string;
  /**
   * What kind of policy this is — the grouping the dashboard counts by.
   *
   * A free string with a curated list offered in the portal, exactly like a
   * legal document's `document_type`: the catalogue grows without a migration,
   * and a policy written before this existed simply has none. The aggregate
   * buckets those under "Other" rather than dropping them.
   */
  policy_type: string;
  content: string; // HTML produced by the rich-text editor
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const policySchema = new Schema<IPolicy>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true },
    policy_type: { type: String, default: '', trim: true, index: true },
    content: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const PolicyModel = model<IPolicy>('Policy', policySchema);

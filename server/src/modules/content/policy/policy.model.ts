import { Schema, model, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

export interface IPolicy extends Document {
  /** The permanent handle: POL-000001. Minted on insert, never reused. */
  policy_no: string | null;
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
  /**
   * Whether accepting this is a condition of creating an account.
   *
   * Defaults TRUE so every active policy gates signup from the day the gate
   * ships; the flag exists so Legal can narrow the list later without a deploy.
   */
  requires_signup_acceptance: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const policySchema = new Schema<IPolicy>(
  {
    policy_no: { type: String, default: null, unique: true, sparse: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true },
    policy_type: { type: String, default: '', trim: true, index: true },
    content: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
    requires_signup_acceptance: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Minted on insert only — the same contract every other entity id carries.
policySchema.pre('save', async function (next) {
  if (this.isNew && !this.policy_no) {
    this.policy_no = await nextEntityNo('POL', 'policy');
  }
  next();
});

export const PolicyModel = model<IPolicy>('Policy', policySchema);

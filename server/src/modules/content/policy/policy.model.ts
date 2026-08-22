import { Schema, model, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/**
 * One earlier wording of a policy, kept forever.
 *
 * Written BEFORE an edit is applied, so the array holds every state the policy
 * has been in EXCEPT the current one — the same arrangement legal documents
 * use, and the reason `policyVersionHistory` appends the live document as the
 * newest entry rather than storing it twice.
 *
 * `content_hash` is the whole point of keeping these. The acceptance log stores
 * the sha256 of the wording each person agreed to and nothing else; without a
 * matching hash on the history there is no way back from a row in that log to
 * the words behind it, which is exactly the question an auditor arrives with.
 */
export interface IPolicyVersion {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  policy_type: string;
  content: string;
  /** sha256 of `content` — the same value the acceptance log records. */
  content_hash: string;
  updated_by: Types.ObjectId | null;
  created_at: Date;
}

const policyVersionSchema = new Schema<IPolicyVersion>(
  {
    title: { type: String, default: '' },
    slug: { type: String, default: '' },
    policy_type: { type: String, default: '' },
    content: { type: String, default: '' },
    content_hash: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export interface IPolicy extends Document {
  /** Narrowed from Document's `unknown` so serialising the id is type-safe. */
  _id: Types.ObjectId;
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
  /**
   * Who last wrote the CURRENT wording.
   *
   * Tracked so the version history can name the author of each wording rather
   * than the person who replaced it: a snapshot copies this value across as it
   * freezes the text, so version N carries whoever actually wrote version N.
   * Null for anything written before this was recorded, which reads honestly as
   * "editor not recorded".
   */
  updated_by: Types.ObjectId | null;
  is_active: boolean;
  /**
   * Whether accepting this is a condition of creating an account.
   *
   * Defaults TRUE so every active policy gates signup from the day the gate
   * ships; the flag exists so Legal can narrow the list later without a deploy.
   */
  requires_signup_acceptance: boolean;
  sort_order: number;
  /** Every earlier wording, oldest first. Never trimmed below the cap. */
  versions: Types.DocumentArray<IPolicyVersion>;
  /** When Legal last emailed everyone who had accepted this policy. */
  last_notified_at: Date | null;
  /** How many accounts that notice reached. */
  last_notified_count: number;
  /** Which wording the notice was about, so a repeat send is visible as one. */
  last_notified_hash: string;
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
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    is_active: { type: Boolean, default: true, index: true },
    requires_signup_acceptance: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },
    versions: { type: [policyVersionSchema], default: [] },
    last_notified_at: { type: Date, default: null },
    last_notified_count: { type: Number, default: 0 },
    last_notified_hash: { type: String, default: '' },
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

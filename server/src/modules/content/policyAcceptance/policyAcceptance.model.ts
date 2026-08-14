import { createHash } from 'node:crypto';
import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Append-only record of a person accepting a policy.
 *
 * Its own collection rather than an array on the policy or the user: acceptance
 * is unbounded (every account × every policy), and the legalDocument signatory
 * array — the only comparable thing in the repo — is bounded, embedded, and
 * FREEZES its document once signed. A policy must stay editable forever.
 *
 * Nothing ever updates or deletes a row. The one write path upserts on
 * (user_id, policy_id, content_hash) so accepting the same wording twice is not
 * two facts, and so the gate can read "already answered" exactly.
 */

/** How the acceptance was given. */
export type PolicyAcceptanceMethod = 'SIGNUP_FORM' | 'GOOGLE_SIGNUP' | 'ACCOUNT';
export const POLICY_ACCEPTANCE_METHODS: PolicyAcceptanceMethod[] = [
  'SIGNUP_FORM',
  'GOOGLE_SIGNUP',
  'ACCOUNT',
];

/** Which app it was given in. UNKNOWN when the caller did not say. */
export type PolicyAcceptanceSurface = 'MWEB' | 'APP' | 'PORTAL' | 'WEBSITE' | 'UNKNOWN';
export const POLICY_ACCEPTANCE_SURFACES: PolicyAcceptanceSurface[] = [
  'MWEB',
  'APP',
  'PORTAL',
  'WEBSITE',
  'UNKNOWN',
];

export interface IPolicyAcceptance extends Document {
  /** Narrowed from Document's `unknown` so serialising the id is type-safe. */
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  policy_id: Types.ObjectId;
  /**
   * The policy's identity, copied at write time.
   *
   * `deletePolicy` is a HARD delete, so a row holding only `policy_id` becomes
   * an orphan pointing at nothing and the Legal log renders a blank where the
   * thing they accepted should be.
   */
  policy_no: string;
  policy_slug: string;
  policy_title: string;
  /** sha256 of the policy's content as it read when they accepted it. */
  content_hash: string;
  /** The policy's own `updated_at` at that moment. */
  policy_updated_at: Date;
  method: PolicyAcceptanceMethod;
  surface: PolicyAcceptanceSurface;
  accepted_at: Date;
}

/** What a signup door hands the recorder: what was ticked, and where. */
export interface PolicyAcceptanceIntent {
  policy_ids: string[];
  surface: PolicyAcceptanceSurface;
}

/**
 * The identity of a policy's TEXT.
 *
 * The Policy model has no version field and `update()` overwrites `content` in
 * place, so this hash is the only thing that can tell "they accepted this" from
 * "they accepted what it used to say". It is also what makes re-asking after an
 * edit fall out for free: outstanding means "no row whose hash is this one".
 */
export function policyContentHash(content: string): string {
  return createHash('sha256').update(content ?? '').digest('hex');
}

const policyAcceptanceSchema = new Schema<IPolicyAcceptance>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    policy_id: { type: Schema.Types.ObjectId, ref: 'Policy', required: true },
    policy_no: { type: String, default: '' },
    policy_slug: { type: String, default: '' },
    policy_title: { type: String, default: '' },
    content_hash: { type: String, required: true },
    policy_updated_at: { type: Date, required: true },
    method: { type: String, enum: POLICY_ACCEPTANCE_METHODS, required: true, index: true },
    surface: { type: String, enum: POLICY_ACCEPTANCE_SURFACES, default: 'UNKNOWN', index: true },
    // Set explicitly on every insert rather than through schema timestamps: the
    // one write path is an upsert, and the moment of acceptance is the whole
    // record — it must not depend on what the driver adds for us.
    accepted_at: { type: Date, required: true },
  },
  { timestamps: false }
);

// Everything this user accepted — the gate's read, on every authenticated boot.
policyAcceptanceSchema.index({ user_id: 1, accepted_at: -1 });
// The Legal portal's log, newest first.
policyAcceptanceSchema.index({ accepted_at: -1 });
// One row per (person, policy, wording). Accepting text you have already
// accepted is not a new fact, and a duplicate would double every count.
policyAcceptanceSchema.index({ user_id: 1, policy_id: 1, content_hash: 1 }, { unique: true });

export const PolicyAcceptanceModel = model<IPolicyAcceptance>(
  'PolicyAcceptance',
  policyAcceptanceSchema
);

import { Schema, model, Types, type Document } from 'mongoose';

/**
 * The membership tier catalogue and the comparison matrix the apps render.
 *
 * Deliberately TWO collections rather than a features array on each plan (the
 * shape PodPlan uses): a pricing table is read ROW-wise — "Early booking
 * window" has to line up across every column — and a per-plan string list
 * cannot guarantee that. A benefit therefore owns its own row and carries one
 * cell per plan, so adding a tier never rewrites the rows, and editing what a
 * row promises is one edit in one place.
 *
 * Nothing here bills anybody. The tiers ship as "coming soon" — the plan's CTA
 * is disabled on every surface — so this module is the catalogue plus the
 * notify-me list, and no payment path reads it.
 */

export interface IMembershipPlan extends Document {
  key: string;
  name: string;
  /** One line under the name — who the tier is for. */
  tagline: string;
  /** The headline price as text ("₹1,499"), never a number: a tier can read
   * "Free" or "Invite only", and the currency is part of what admin edits. */
  price_label: string;
  /** The qualifier under the price ("/ year · or ₹199 / mo"). */
  price_note: string;
  /** Ribbon on the card ("Most popular"). Empty = no ribbon. */
  badge_label: string;
  /** Hex accent for the card's top rule and name. Empty = the app's primary. */
  accent_color: string;
  /** Label on the (currently disabled) call to action. */
  cta_label: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    tagline: { type: String, default: '', trim: true, maxlength: 200 },
    price_label: { type: String, default: '', trim: true, maxlength: 40 },
    price_note: { type: String, default: '', trim: true, maxlength: 80 },
    badge_label: { type: String, default: '', trim: true, maxlength: 40 },
    accent_color: { type: String, default: '', trim: true, maxlength: 20 },
    cta_label: { type: String, default: '', trim: true, maxlength: 40 },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

membershipPlanSchema.index({ sort_order: 1, name: 1 });

export const MembershipPlanModel = model<IMembershipPlan>('MembershipPlan', membershipPlanSchema);

/** One plan's cell on a benefit row. `value` is free text so a cell can read
 * "12h", "10%", "✓" or "—" without a type per shape. */
export interface IMembershipBenefitValue {
  plan_key: string;
  value: string;
}

export interface IMembershipBenefit extends Document {
  /** Section heading the row sits under ("Getting a spot"). Rows are grouped by
   * this in `sort_order` order, so the group needs no document of its own. */
  group: string;
  label: string;
  values: IMembershipBenefitValue[];
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const benefitValueSchema = new Schema<IMembershipBenefitValue>(
  {
    plan_key: { type: String, required: true, lowercase: true, trim: true },
    value: { type: String, default: '', trim: true, maxlength: 60 },
  },
  { _id: false }
);

const membershipBenefitSchema = new Schema<IMembershipBenefit>(
  {
    group: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    values: { type: [benefitValueSchema], default: [] },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Every read is "active rows, in display order" — one index serves the apps and
// the admin table alike.
membershipBenefitSchema.index({ sort_order: 1, label: 1 });

// A row is identified by its label inside its group, which is what the boot
// seed upserts on. Without this two seeds (or an admin duplicating a label)
// would silently render the same row twice.
membershipBenefitSchema.index({ group: 1, label: 1 }, { unique: true });

export const MembershipBenefitModel = model<IMembershipBenefit>(
  'MembershipBenefit',
  membershipBenefitSchema
);

/**
 * Somebody who asked to be told when membership opens.
 *
 * The email is stamped from the signed-in profile rather than typed, so this
 * list can never collect an address its owner did not authenticate — and the
 * unique user index means tapping the button twice is a no-op, not a duplicate.
 */
export interface IMembershipNewsSubscriber extends Document {
  user_id: Types.ObjectId;
  email: string;
  name: string;
  created_at: Date;
}

const membershipNewsSubscriberSchema = new Schema<IMembershipNewsSubscriber>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: '', trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

membershipNewsSubscriberSchema.index({ created_at: -1 });

export const MembershipNewsSubscriberModel = model<IMembershipNewsSubscriber>(
  'MembershipNewsSubscriber',
  membershipNewsSubscriberSchema
);

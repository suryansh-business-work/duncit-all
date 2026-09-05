import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Which tab of the Pod Profit Calculator saved this.
 *
 * One collection for both, because a single-pod calculation IS a comparison
 * with one pod in it — same fields, same maths, same PDF. The kind only decides
 * which list it appears in, so the two tables stay separate without a second
 * model that would drift from this one (rule 34).
 */
export const POD_CALCULATOR_KINDS = ['SINGLE', 'MULTI'] as const;
export type PodCalculatorKind = (typeof POD_CALCULATOR_KINDS)[number];

/**
 * One pod inside a saved calculation.
 *
 * The field names mirror `PodProfitInputs` in the Finance portal one-for-one so
 * a saved pod maps onto the calculator with no translation layer in between —
 * a renamed input on either side then fails typecheck instead of silently
 * saving a zero.
 *
 * Every number carries a default: the pod list is read back into a GraphQL type
 * whose fields are all non-null, and a document written before a field existed
 * would otherwise resolve null and take the whole query down with it.
 */
export interface IPodCalculatorPod {
  /** Stable per-row key, minted by the client so React keys survive a save. */
  pod_key: string;
  name: string;
  pod_amount: number;
  no_of_spots: number;
  /** How many identical pods this row stands for — the projection multiplier. */
  pod_count: number;
  gst_percent: number;
  platform_fee_percent: number;
  venue_amount: number;
  host_commission_percent: number;
  venue_commission_percent: number;
  club_admin_percent: number;
}

export interface IPodCalculator extends Document {
  _id: Types.ObjectId;
  name: string;
  kind: PodCalculatorKind;
  pods: IPodCalculatorPod[];
  created_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const podSchema = new Schema<IPodCalculatorPod>(
  {
    pod_key: { type: String, required: true },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    pod_amount: { type: Number, default: 0, min: 0 },
    no_of_spots: { type: Number, default: 0, min: 0 },
    pod_count: { type: Number, default: 1, min: 0 },
    gst_percent: { type: Number, default: 0, min: 0, max: 100 },
    platform_fee_percent: { type: Number, default: 0, min: 0, max: 100 },
    venue_amount: { type: Number, default: 0, min: 0 },
    host_commission_percent: { type: Number, default: 0, min: 0, max: 100 },
    venue_commission_percent: { type: Number, default: 0, min: 0, max: 100 },
    club_admin_percent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const podCalculatorSchema = new Schema<IPodCalculator>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    kind: { type: String, enum: POD_CALCULATOR_KINDS, default: 'MULTI', index: true },
    pods: { type: [podSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podCalculatorSchema.index({ kind: 1, updated_at: -1 });

export const PodCalculatorModel = model<IPodCalculator>('PodCalculator', podCalculatorSchema);

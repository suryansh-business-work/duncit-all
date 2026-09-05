import { Schema, model, Types, type Document } from 'mongoose';

/**
 * One pod inside a saved comparison.
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
export interface IMultiPodCalculatorPod {
  /** Stable per-row key, minted by the client so React keys survive a save. */
  pod_key: string;
  name: string;
  pod_amount: number;
  no_of_spots: number;
  gst_percent: number;
  platform_fee_percent: number;
  venue_amount: number;
  host_commission_percent: number;
  venue_commission_percent: number;
  club_admin_percent: number;
}

export interface IMultiPodCalculator extends Document {
  name: string;
  pods: IMultiPodCalculatorPod[];
  created_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const podSchema = new Schema<IMultiPodCalculatorPod>(
  {
    pod_key: { type: String, required: true },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    pod_amount: { type: Number, default: 0, min: 0 },
    no_of_spots: { type: Number, default: 0, min: 0 },
    gst_percent: { type: Number, default: 0, min: 0, max: 100 },
    platform_fee_percent: { type: Number, default: 0, min: 0, max: 100 },
    venue_amount: { type: Number, default: 0, min: 0 },
    host_commission_percent: { type: Number, default: 0, min: 0, max: 100 },
    venue_commission_percent: { type: Number, default: 0, min: 0, max: 100 },
    club_admin_percent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const multiPodCalculatorSchema = new Schema<IMultiPodCalculator>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    pods: { type: [podSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

multiPodCalculatorSchema.index({ updated_at: -1 });

export const MultiPodCalculatorModel = model<IMultiPodCalculator>(
  'MultiPodCalculator',
  multiPodCalculatorSchema
);

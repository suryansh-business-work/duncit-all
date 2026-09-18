import { Schema, model, type Document } from 'mongoose';

/**
 * A goal set against one Analytics tile — "500 pods held a month", "cancellation
 * rate under 5%". One per dashboard tile; the tile shows how close it is.
 *
 * A count or an amount that happens over time (pods held, money collected) is
 * a MONTHLY goal and is scaled to whatever period the page shows; a rate, an
 * average or a live count is compared as it is.
 */
export interface IAnalyticsTarget extends Document {
  entity: string;
  kpi_key: string;
  value: number;
  set_by: string;
  created_at: Date;
  updated_at: Date;
}

const targetSchema = new Schema<IAnalyticsTarget>(
  {
    entity: { type: String, required: true },
    kpi_key: { type: String, required: true },
    value: { type: Number, required: true },
    set_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

targetSchema.index({ entity: 1, kpi_key: 1 }, { unique: true });

export const AnalyticsTargetModel = model<IAnalyticsTarget>('AnalyticsTarget', targetSchema);

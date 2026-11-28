import mongoose, { Schema, type Types } from 'mongoose';
import { actorSchema, type IHrActor } from './employee.model';
import { HR_COMPENSATION_REASONS, HR_PAY_COMPONENT_TYPES, type CompensationTotals, type PayLine } from './employee.rules';

export interface IHrCompensation {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  currency: string;
  /** `YYYY-MM-DD` — the revision is in force from this day until the next one starts. */
  effective_from: string;
  reason: (typeof HR_COMPENSATION_REASONS)[number];
  note: string | null;
  components: PayLine[];
  /** Derived from the components when written, so a list never re-adds them. */
  totals: CompensationTotals;
  created_by: IHrActor;
  created_at: Date;
  updated_at: Date;
}

const lineSchema = new Schema<PayLine>(
  {
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: HR_PAY_COMPONENT_TYPES, required: true },
    monthly_paise: { type: Number, required: true, min: 0 },
    target_linked: { type: Boolean, default: false },
  },
  { _id: false }
);

const totalsSchema = new Schema<CompensationTotals>(
  {
    gross_monthly_paise: { type: Number, required: true },
    fixed_gross_monthly_paise: { type: Number, required: true },
    variable_monthly_paise: { type: Number, required: true },
    deductions_monthly_paise: { type: Number, required: true },
    employer_monthly_paise: { type: Number, required: true },
    net_monthly_paise: { type: Number, required: true },
    annual_ctc_paise: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Effective-dated pay. A revision is never edited: a raise is a new revision
 * from its date, so the payroll for any past month reads exactly the pay that
 * was in force then. Only a revision that has not started yet may be removed.
 */
const compensationSchema = new Schema<IHrCompensation>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', required: true },
    currency: { type: String, required: true, uppercase: true },
    effective_from: { type: String, required: true },
    reason: { type: String, enum: HR_COMPENSATION_REASONS, required: true },
    note: { type: String, default: null },
    components: { type: [lineSchema], default: [] },
    totals: { type: totalsSchema, required: true },
    created_by: { type: actorSchema, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'hr_compensations' }
);

// One revision per employee per day — two on the same day would leave "which one is in force" a coin toss.
compensationSchema.index({ employee_id: 1, effective_from: 1 }, { unique: true });

export const HrCompensationModel =
  (mongoose.models.HrCompensation as mongoose.Model<IHrCompensation>) ||
  mongoose.model<IHrCompensation>('HrCompensation', compensationSchema);

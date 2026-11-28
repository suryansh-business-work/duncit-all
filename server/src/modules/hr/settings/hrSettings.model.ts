import mongoose, { Schema } from 'mongoose';
import { HR_PAY_COMPONENT_TYPES, HR_TEMPLATE_CALCS, type HrPayComponentType, type HrTemplateCalc } from '@modules/hr/hr.constants';

export { HR_TEMPLATE_CALCS, type HrTemplateCalc } from '@modules/hr/hr.constants';

export interface IHrTemplateLine {
  label: string;
  type: HrPayComponentType;
  calc: HrTemplateCalc;
  value: number;
  target_linked: boolean;
}

export interface IHrSettings {
  singleton_key: string;
  employee_code_prefix: string;
  employee_code_digits: number;
  /** The last number handed out; only ever moved by an atomic $inc. */
  employee_code_seq: number;
  default_currency: string;
  default_notice_period_days: number;
  default_probation_months: number;
  departments: string[];
  work_locations: string[];
  salary_template: IHrTemplateLine[];
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

const templateLineSchema = new Schema<IHrTemplateLine>(
  {
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: HR_PAY_COMPONENT_TYPES, required: true },
    calc: { type: String, enum: HR_TEMPLATE_CALCS, required: true },
    value: { type: Number, default: 0, min: 0 },
    target_linked: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * HR > Settings. Its own singleton, like Targets' reminder settings: these are
 * the HR desk's calls, not Tech's AppSettings.
 */
const settingsSchema = new Schema<IHrSettings>(
  {
    singleton_key: { type: String, required: true, unique: true },
    employee_code_prefix: { type: String, default: 'EMP' },
    employee_code_digits: { type: Number, default: 4 },
    employee_code_seq: { type: Number, default: 0 },
    default_currency: { type: String, default: 'INR' },
    default_notice_period_days: { type: Number, default: 30 },
    default_probation_months: { type: Number, default: 3 },
    departments: { type: [String], default: [] },
    work_locations: { type: [String], default: [] },
    salary_template: { type: [templateLineSchema], default: [] },
    updated_by: { type: String, default: '' },
  },
  { collection: 'hr_settings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const HrSettingsModel =
  (mongoose.models.HrSettings as mongoose.Model<IHrSettings>) ||
  mongoose.model<IHrSettings>('HrSettings', settingsSchema);

import { Schema, model, Types, type Document } from 'mongoose';

export type RecurrenceKind = 'WEEKLY' | 'MONTHLY' | 'SPECIFIC_DATES';

export interface IVenueTimeslotTemplate extends Document {
  venue_id: Types.ObjectId;
  label: string;
  duration_minutes: number;
  capacity: number;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  recurrence_kind: RecurrenceKind;
  weekdays: number[]; // 0..6 (Sun..Sat)
  month_days: number[]; // 1..31
  month_nth_weekday: { nth: number; weekday: number } | null;
  specific_dates: Date[];
  valid_from: Date | null;
  valid_until: Date | null;
  timezone: string;
  is_active: boolean;
  created_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const monthNthWeekdaySchema = new Schema(
  { nth: { type: Number, min: -1, max: 5 }, weekday: { type: Number, min: 0, max: 6 } },
  { _id: false },
);

const templateSchema = new Schema<IVenueTimeslotTemplate>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    label: { type: String, default: '' },
    duration_minutes: { type: Number, required: true, min: 15, max: 720 },
    capacity: { type: Number, required: true, min: 1, max: 10000 },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    recurrence_kind: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY', 'SPECIFIC_DATES'],
      required: true,
    },
    weekdays: { type: [Number], default: [] },
    month_days: { type: [Number], default: [] },
    month_nth_weekday: { type: monthNthWeekdaySchema, default: null },
    specific_dates: { type: [Date], default: [] },
    valid_from: { type: Date, default: null },
    valid_until: { type: Date, default: null },
    timezone: { type: String, default: 'Asia/Kolkata' },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const VenueTimeslotTemplateModel = model<IVenueTimeslotTemplate>(
  'VenueTimeslotTemplate',
  templateSchema,
);

export interface IVenueTimeslotBlock extends Document {
  venue_id: Types.ObjectId;
  template_id: Types.ObjectId | null;
  from: Date;
  to: Date;
  reason: string;
  created_by: Types.ObjectId | null;
  created_at: Date;
}

const blockSchema = new Schema<IVenueTimeslotBlock>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    template_id: { type: Schema.Types.ObjectId, ref: 'VenueTimeslotTemplate', default: null },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    reason: { type: String, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

export const VenueTimeslotBlockModel = model<IVenueTimeslotBlock>(
  'VenueTimeslotBlock',
  blockSchema,
);

export interface IVenueTimeslotOverride extends Document {
  venue_id: Types.ObjectId;
  template_id: Types.ObjectId;
  occurrence_date: Date;
  capacity_override: number | null;
  is_cancelled: boolean;
  note: string;
  created_at: Date;
  updated_at: Date;
}

const overrideSchema = new Schema<IVenueTimeslotOverride>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    template_id: { type: Schema.Types.ObjectId, ref: 'VenueTimeslotTemplate', required: true },
    occurrence_date: { type: Date, required: true },
    capacity_override: { type: Number, default: null, min: 0, max: 10000 },
    is_cancelled: { type: Boolean, default: false },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

overrideSchema.index({ template_id: 1, occurrence_date: 1 }, { unique: true });

export const VenueTimeslotOverrideModel = model<IVenueTimeslotOverride>(
  'VenueTimeslotOverride',
  overrideSchema,
);

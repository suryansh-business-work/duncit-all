import * as yup from 'yup';
import type {
  RecurrenceKind,
  SlotTemplateFormValues,
  VenueTimeslotTemplateInput,
} from './slot-template.types';

const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const hhmmToMinutes = (value: string): number => {
  const [hh, mm] = value.split(':').map((p) => parseInt(p, 10));
  return hh * 60 + mm;
};

export const RECURRENCE_KINDS: Array<{ value: RecurrenceKind; label: string }> = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SPECIFIC_DATES', label: 'Specific dates' },
];

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240];

export const slotTemplateInitialValues: SlotTemplateFormValues = {
  label: '',
  duration_minutes: 60,
  capacity: 10,
  start_time: '09:00',
  end_time: '10:00',
  recurrence_kind: 'WEEKLY',
  weekdays: [1, 2, 3, 4, 5],
  month_days: [],
  month_nth_weekday: null,
  specific_dates: [],
  valid_from: '',
  valid_until: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  is_active: true,
};

export const slotTemplateSchema: yup.ObjectSchema<SlotTemplateFormValues> = yup.object({
  label: yup.string().trim().max(80, 'Label must be 80 characters or fewer').default(''),
  duration_minutes: yup
    .number()
    .integer('Duration must be a whole number')
    .min(15, 'Duration must be at least 15 minutes')
    .max(720, 'Duration cannot exceed 12 hours')
    .test('multiple-of-5', 'Duration must be in 5-minute increments', (value) =>
      typeof value === 'number' && value % 5 === 0,
    )
    .required('Duration is required'),
  capacity: yup
    .number()
    .integer('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(10000, 'Capacity cannot exceed 10000')
    .required('Capacity is required'),
  start_time: yup
    .string()
    .matches(TIME_HHMM, 'Start time must be HH:mm')
    .required('Start time is required'),
  end_time: yup
    .string()
    .matches(TIME_HHMM, 'End time must be HH:mm')
    .required('End time is required')
    .test('after-start', 'End time must be after start time', function endAfterStart(value) {
      const { start_time } = this.parent as SlotTemplateFormValues;
      if (!value || !start_time) return true;
      return hhmmToMinutes(value) > hhmmToMinutes(start_time);
    }),
  recurrence_kind: yup
    .mixed<RecurrenceKind>()
    .oneOf(['WEEKLY', 'MONTHLY', 'SPECIFIC_DATES'], 'Select a valid recurrence')
    .required('Recurrence is required'),
  weekdays: yup
    .array(yup.number().integer().min(0).max(6).required())
    .default([])
    .when('recurrence_kind', {
      is: 'WEEKLY',
      then: (schema) => schema.min(1, 'Pick at least one weekday'),
    }),
  month_days: yup
    .array(yup.number().integer().min(1).max(31).required())
    .default([])
    .when(['recurrence_kind', 'month_nth_weekday'], {
      is: (kind: RecurrenceKind, nth: any) => kind === 'MONTHLY' && !nth,
      then: (schema) =>
        schema.min(1, 'Pick at least one day of month or use nth-weekday option'),
    }),
  month_nth_weekday: yup
    .object({
      nth: yup.number().integer().min(-1).max(5).required(),
      weekday: yup.number().integer().min(0).max(6).required(),
    })
    .nullable()
    .default(null),
  specific_dates: yup
    .array(yup.string().required())
    .default([])
    .when('recurrence_kind', {
      is: 'SPECIFIC_DATES',
      then: (schema) =>
        schema
          .min(1, 'Add at least one date')
          .max(200, 'You can configure up to 200 specific dates'),
    }),
  valid_from: yup.string().default(''),
  valid_until: yup
    .string()
    .default('')
    .test('after-from', 'Valid until must be after valid from', function afterFrom(value) {
      const { valid_from } = this.parent as SlotTemplateFormValues;
      if (!value || !valid_from) return true;
      return new Date(value) > new Date(valid_from);
    }),
  timezone: yup.string().trim().default('Asia/Kolkata'),
  is_active: yup.boolean().required(),
});

export function toTemplateInput(values: SlotTemplateFormValues): VenueTimeslotTemplateInput {
  const cast = slotTemplateSchema.cast(values, { stripUnknown: true });
  return {
    label: cast.label,
    duration_minutes: cast.duration_minutes,
    capacity: cast.capacity,
    start_time: cast.start_time,
    end_time: cast.end_time,
    recurrence_kind: cast.recurrence_kind,
    weekdays: cast.recurrence_kind === 'WEEKLY' ? cast.weekdays : [],
    month_days:
      cast.recurrence_kind === 'MONTHLY' && !cast.month_nth_weekday ? cast.month_days : [],
    month_nth_weekday:
      cast.recurrence_kind === 'MONTHLY' ? cast.month_nth_weekday ?? null : null,
    specific_dates:
      cast.recurrence_kind === 'SPECIFIC_DATES'
        ? cast.specific_dates.map((d) => new Date(d).toISOString())
        : [],
    valid_from: cast.valid_from ? new Date(cast.valid_from).toISOString() : null,
    valid_until: cast.valid_until ? new Date(cast.valid_until).toISOString() : null,
    timezone: cast.timezone,
    is_active: cast.is_active,
  };
}

export function templateToFormValues(
  template: Partial<SlotTemplateFormValues> & {
    specific_dates?: string[];
    valid_from?: string | null;
    valid_until?: string | null;
  } | null,
): SlotTemplateFormValues {
  if (!template) return { ...slotTemplateInitialValues };
  return {
    ...slotTemplateInitialValues,
    ...template,
    weekdays: template.weekdays ?? [],
    month_days: template.month_days ?? [],
    month_nth_weekday: template.month_nth_weekday ?? null,
    specific_dates: template.specific_dates ?? [],
    valid_from: template.valid_from ?? '',
    valid_until: template.valid_until ?? '',
  };
}

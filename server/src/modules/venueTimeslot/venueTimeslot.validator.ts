import * as yup from 'yup';

const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const minutesFromHHMM = (value: string): number => {
  const [hh, mm] = value.split(':').map((part) => parseInt(part, 10));
  return hh * 60 + mm;
};

export const templateInputSchema = yup.object({
  label: yup.string().trim().max(80, 'Label must be 80 characters or fewer').default(''),
  duration_minutes: yup
    .number()
    .integer('Duration must be a whole number')
    .min(15, 'Duration must be at least 15 minutes')
    .max(720, 'Duration cannot exceed 720 minutes (12h)')
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
      const { start_time } = this.parent;
      if (!value || !start_time) return true;
      return minutesFromHHMM(value) > minutesFromHHMM(start_time);
    }),
  recurrence_kind: yup
    .string()
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
    .default([]),
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
  valid_from: yup.string().nullable().default(null),
  valid_until: yup
    .string()
    .nullable()
    .default(null)
    .test('after-from', 'Valid until must be after valid from', function afterFrom(value) {
      const { valid_from } = this.parent;
      if (!value || !valid_from) return true;
      return new Date(value) > new Date(valid_from);
    }),
  timezone: yup.string().trim().default('Asia/Kolkata'),
  is_active: yup.boolean().default(true),
});

export const blockInputSchema = yup.object({
  template_id: yup.string().trim().nullable().default(null),
  from: yup.string().required('From is required'),
  to: yup
    .string()
    .required('To is required')
    .test('after-from', 'To must be after From', function afterFrom(value) {
      const { from } = this.parent;
      if (!value || !from) return true;
      return new Date(value) > new Date(from);
    }),
  reason: yup
    .string()
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must be 500 characters or fewer')
    .required('Reason is required'),
});

export const overrideInputSchema = yup.object({
  template_id: yup.string().trim().required('Template is required'),
  occurrence_date: yup.string().required('Occurrence date is required'),
  capacity_override: yup
    .number()
    .integer('Capacity must be a whole number')
    .min(0, 'Capacity must be 0 or greater')
    .max(10000, 'Capacity cannot exceed 10000')
    .nullable()
    .default(null),
  is_cancelled: yup.boolean().default(false),
  note: yup.string().trim().max(280, 'Note must be 280 characters or fewer').default(''),
});

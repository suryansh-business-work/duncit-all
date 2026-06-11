import * as yup from 'yup';

export const INTERVIEW_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export interface InterviewFormValues {
  status: InterviewStatus;
  pickedSlotIdx: number;
  customStart: string;
  customEnd: string;
  meetingLink: string;
  notes: string;
}

const httpsUrl = yup
  .string()
  .trim()
  .default('')
  .test('http-url', 'Meeting link must be a valid http(s) URL', (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });

const datetime = (label: string) =>
  yup
    .string()
    .default('')
    .test('valid-date', `${label} is not a valid date`, (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime());
    });

export const interviewFormSchema: yup.ObjectSchema<InterviewFormValues> = yup.object({
  status: yup
    .mixed<InterviewStatus>()
    .oneOf([...INTERVIEW_STATUSES], 'Select a valid status')
    .required('Status is required'),
  pickedSlotIdx: yup.number().integer().min(-1).required(),
  customStart: datetime('Start').when('status', {
    is: (status: InterviewStatus) => status === 'SCHEDULED' || status === 'APPROVED',
    then: (schema) => schema.required('Start time is required'),
  }),
  customEnd: datetime('End')
    .when('status', {
      is: (status: InterviewStatus) => status === 'SCHEDULED' || status === 'APPROVED',
      then: (schema) => schema.required('End time is required'),
    })
    .test('after-start', 'End must be after start', function endAfter(value) {
      const { customStart, status } = this.parent as InterviewFormValues;
      if (status !== 'SCHEDULED' && status !== 'APPROVED') return true;
      if (!value || !customStart) return true;
      return new Date(value) > new Date(customStart);
    }),
  meetingLink: httpsUrl,
  notes: yup
    .string()
    .trim()
    .max(2000, 'Notes must be 2000 characters or fewer')
    .default(''),
});

export interface UpdateInterviewInput {
  status: InterviewStatus;
  meeting_link: string | null;
  admin_notes: string | null;
  scheduled_slot?: { start: string; end: string };
}

export function toUpdateInterviewInput(values: InterviewFormValues): UpdateInterviewInput {
  const cast = interviewFormSchema.cast(values, { stripUnknown: true });
  const input: UpdateInterviewInput = {
    status: cast.status,
    meeting_link: cast.meetingLink ? cast.meetingLink : null,
    admin_notes: cast.notes ? cast.notes : null,
  };
  if (cast.status === 'SCHEDULED' || cast.status === 'APPROVED') {
    input.scheduled_slot = {
      start: new Date(cast.customStart).toISOString(),
      end: new Date(cast.customEnd).toISOString(),
    };
  }
  return input;
}

export function interviewInitialValues(interview: any | null): InterviewFormValues {
  if (!interview) {
    return {
      status: 'SCHEDULED',
      pickedSlotIdx: -1,
      customStart: '',
      customEnd: '',
      meetingLink: '',
      notes: '',
    };
  }
  const scheduled = interview.scheduled_slot;
  const firstSlot = interview.preferred_slots?.[0];
  const start = scheduled?.start ?? firstSlot?.start ?? '';
  const end = scheduled?.end ?? firstSlot?.end ?? '';
  return {
    status: (interview.status === 'PENDING' ? 'SCHEDULED' : interview.status) as InterviewStatus,
    pickedSlotIdx: scheduled ? -1 : firstSlot ? 0 : -1,
    customStart: start,
    customEnd: end,
    meetingLink: interview.meeting_link ?? '',
    notes: interview.admin_notes ?? '',
  };
}

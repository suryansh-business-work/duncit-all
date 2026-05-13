import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';

export const INTERVIEW_BOOKING_TYPES = ['HOST', 'VENUE'] as const;
export type InterviewBookingType = (typeof INTERVIEW_BOOKING_TYPES)[number];

const slotSchema = yup.object({
  start: yup
    .string()
    .required('Start time is required')
    .test('valid', 'Start time must be a valid date', (value) => !!value && !Number.isNaN(new Date(value).getTime())),
  end: yup
    .string()
    .required('End time is required')
    .test('valid', 'End time must be a valid date', (value) => !!value && !Number.isNaN(new Date(value).getTime()))
    .test('after-start', 'End must be after start', function endAfter(value) {
      const { start } = this.parent;
      if (!value || !start) return true;
      return new Date(value) > new Date(start);
    }),
});

export const interviewBookingFormSchema = yup.object({
  type: yup
    .mixed<InterviewBookingType>()
    .oneOf([...INTERVIEW_BOOKING_TYPES], 'Select a valid type')
    .required('Type is required'),
  applicant_name: validationRules.personName('Your name'),
  applicant_email: validationRules.email('Email'),
  applicant_phone: validationRules.phoneNumber('Phone'),
  business_name: yup.string().trim().max(120).default(''),
  business_address: yup.string().trim().max(500).default(''),
  city: yup.string().trim().max(80).default(''),
  zone: yup.string().trim().max(80).default(''),
  about: yup
    .string()
    .trim()
    .min(10, 'Tell us a bit more (10+ characters)')
    .max(2000, 'About must be 2000 characters or fewer')
    .required('About is required'),
  preferred_slots: yup
    .array(slotSchema)
    .min(1, 'Pick at least one preferred slot')
    .max(5, 'Up to 5 slots')
    .required(),
});

export type InterviewBookingFormValues = yup.InferType<typeof interviewBookingFormSchema>;

export function toInterviewBookingInput(values: InterviewBookingFormValues) {
  const cast = interviewBookingFormSchema.cast(values, { stripUnknown: true });
  return {
    type: cast.type,
    applicant_name: cast.applicant_name,
    applicant_email: cast.applicant_email,
    applicant_phone: cast.applicant_phone,
    business_name: cast.business_name || null,
    business_address: cast.business_address || null,
    city: cast.city || null,
    zone: cast.zone || null,
    about: cast.about,
    preferred_slots: cast.preferred_slots.map((slot) => ({
      start: new Date(slot.start).toISOString(),
      end: new Date(slot.end).toISOString(),
    })),
  };
}

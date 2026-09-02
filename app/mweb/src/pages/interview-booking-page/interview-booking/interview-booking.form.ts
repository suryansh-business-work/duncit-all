import { z } from 'zod';
import { DIAL_CODE, EMAIL, PERSON_NAME, PHONE_INTL } from '@duncit/regex';
import { fallbackT, type Translate } from '../../../i18n/fallback';

export const INTERVIEW_BOOKING_TYPES = ['HOST', 'VENUE'] as const;
export type InterviewBookingType = (typeof INTERVIEW_BOOKING_TYPES)[number];

const isDate = (value: string) => !!value && !Number.isNaN(new Date(value).getTime());

/**
 * The boxes the applicant fills in — React Hook Form + Zod (rule 10), migrated
 * from Yup.
 *
 * The name, the dial code and the number take their shapes from
 * @duncit/regex (rule 40), so this page asks for exactly what signup and Edit
 * profile do rather than a fourth opinion; the email is the package's `EMAIL`
 * for the same reason. Every message is a catalogue key (rule 38) because the
 * page now shows them under the field as it is typed into, not as one sentence
 * in an alert after Submit.
 */
export const makeInterviewDetailsSchema = (t: Translate = fallbackT) =>
  z.object({
    applicant_name: z
      .string()
      .trim()
      .min(1, t('mweb.interviewBooking.yourNameIsRequired'))
      .max(80)
      .refine((v) => PERSON_NAME.test(v), t('mweb.interviewBooking.nameInvalid')),
    applicant_email: z
      .string()
      .trim()
      .min(1, t('mweb.interviewBooking.emailIsRequired'))
      .max(254)
      .refine((v) => EMAIL.test(v), t('mweb.interviewBooking.emailInvalid')),
    applicant_phone_extension: z
      .string()
      .trim()
      .refine((v) => DIAL_CODE.test(v), t('mweb.interviewBooking.phoneCodeIsInvalid')),
    applicant_phone_number: z
      .string()
      .trim()
      .min(1, t('mweb.interviewBooking.phoneIsRequired'))
      .refine((v) => PHONE_INTL.test(v), t('mweb.interviewBooking.phoneMustContainOnlyDigits6')),
    business_name: z.string().trim().max(120, t('mweb.interviewBooking.venueNameMax')),
    business_address: z.string().trim().max(500, t('mweb.interviewBooking.venueAddressMax')),
    city: z.string().trim().max(80, t('mweb.interviewBooking.cityMax')),
    zone: z.string().trim().max(80, t('mweb.interviewBooking.zoneMax')),
    about: z
      .string()
      .trim()
      .min(10, t('mweb.interviewBooking.aboutRequired'))
      .max(2000, t('mweb.interviewBooking.aboutMax')),
  });

/** What the form holds — the calendar's slots are picked separately. */
export type InterviewDetailsValues = z.infer<ReturnType<typeof makeInterviewDetailsSchema>>;

/** The empty form. Only the dial code opens on a value. */
export const interviewDetailsDefaults: InterviewDetailsValues = {
  applicant_name: '',
  applicant_email: '',
  applicant_phone_extension: '+91',
  applicant_phone_number: '',
  business_name: '',
  business_address: '',
  city: '',
  zone: '',
  about: '',
};

const makeSlotSchema = (t: Translate) =>
  z
    .object({
      start: z.string().refine(isDate, t('mweb.interviewBooking.slotStartInvalid')),
      end: z.string().refine(isDate, t('mweb.interviewBooking.slotEndInvalid')),
    })
    .refine((slot) => new Date(slot.end) > new Date(slot.start), {
      message: t('mweb.interviewBooking.slotEndBeforeStart'),
      path: ['end'],
    });

/** The whole request: the applicant's details, plus the times they picked. */
export const makeInterviewBookingSchema = (t: Translate = fallbackT) =>
  makeInterviewDetailsSchema(t).extend({
    type: z.enum(INTERVIEW_BOOKING_TYPES, { message: t('mweb.interviewBooking.typeInvalid') }),
    preferred_slots: z
      .array(makeSlotSchema(t))
      .min(1, t('mweb.interviewBooking.pickAtLeastOnePreferredTime'))
      .max(5, t('mweb.interviewBooking.slotsMax')),
  });

export const interviewBookingFormSchema = makeInterviewBookingSchema();

export type InterviewBookingFormValues = z.infer<typeof interviewBookingFormSchema>;

export function toInterviewBookingInput(values: InterviewBookingFormValues) {
  return {
    type: values.type,
    applicant_name: values.applicant_name.trim(),
    applicant_email: values.applicant_email.trim().toLowerCase(),
    applicant_phone: `${values.applicant_phone_extension.trim()} ${values.applicant_phone_number.trim()}`,
    business_name: values.business_name.trim() || null,
    business_address: values.business_address.trim() || null,
    city: values.city.trim() || null,
    zone: values.zone.trim() || null,
    about: values.about.trim(),
    preferred_slots: values.preferred_slots.map((slot) => ({
      start: new Date(slot.start).toISOString(),
      end: new Date(slot.end).toISOString(),
    })),
  };
}

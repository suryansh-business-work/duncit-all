import { z } from 'zod';
import { DIAL_CODE, EMAIL, PHONE_INTL } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * An employee's contact details and emergency contact — what the Employee
 * console lets a person change about themselves, and the contact half of the
 * HR console's personal-details form. One set of rules for both, matching the
 * server's `contactSchema` (server/src/modules/hr/employee/employee.rules.ts).
 */
export interface HrContactValues {
  personal_email: string;
  phone_extension: string;
  phone_number: string;
  current_address: string;
  permanent_address: string;
  emergency_name: string;
  emergency_relation: string;
  emergency_phone_extension: string;
  emergency_phone_number: string;
}

/** The API's HrContactInput. */
export interface HrContactOutput {
  personal_email: string | null;
  phone_number: string | null;
  phone_extension: string | null;
  current_address: string | null;
  permanent_address: string | null;
  emergency_contact: { name: string; relation: string | null; phone_number: string; phone_extension: string } | null;
}

export const HR_CONTACT_LIMITS = { nameMax: 60, relationMax: 40, addressMax: 500 } as const;

export const hrContactDefaults: HrContactValues = {
  personal_email: '',
  phone_extension: '+91',
  phone_number: '',
  current_address: '',
  permanent_address: '',
  emergency_name: '',
  emergency_relation: '',
  emergency_phone_extension: '+91',
  emergency_phone_number: '',
};

const blankToNull = (value: string): string | null => value.trim() || null;

/** The contact fields' shape, for embedding in a bigger form (the HR personal form). */
export function makeHrContactShape(t: Translate) {
  const tooLong = (max: number) => t('hrEmployee.form.tooLong', { vars: { max } });
  const L = HR_CONTACT_LIMITS;
  return {
    personal_email: z.string().trim().refine((v) => !v || EMAIL.test(v), t('hrEmployee.form.emailInvalid')),
    phone_extension: z.string().trim().refine((v) => DIAL_CODE.test(v), t('hrEmployee.form.dialCodeInvalid')),
    phone_number: z.string().trim().refine((v) => !v || PHONE_INTL.test(v), t('hrEmployee.form.phoneInvalid')),
    current_address: z.string().trim().max(L.addressMax, tooLong(L.addressMax)),
    permanent_address: z.string().trim().max(L.addressMax, tooLong(L.addressMax)),
    emergency_name: z.string().trim().max(L.nameMax, tooLong(L.nameMax)),
    emergency_relation: z.string().trim().max(L.relationMax, tooLong(L.relationMax)),
    emergency_phone_extension: z.string().trim().refine((v) => DIAL_CODE.test(v), t('hrEmployee.form.dialCodeInvalid')),
    emergency_phone_number: z.string().trim().refine((v) => !v || PHONE_INTL.test(v), t('hrEmployee.form.phoneInvalid')),
  };
}

/** An emergency contact is all or nothing: a name without a number (or the reverse) is refused. */
export function refineHrEmergency(t: Translate) {
  return (values: Pick<HrContactValues, 'emergency_name' | 'emergency_phone_number'>, ctx: z.RefinementCtx) => {
    const name = values.emergency_name.trim();
    const phone = values.emergency_phone_number.trim();
    if (name && !phone) ctx.addIssue({ code: 'custom', path: ['emergency_phone_number'], message: t('hrEmployee.form.emergencyPhoneRequired') });
    if (phone && !name) ctx.addIssue({ code: 'custom', path: ['emergency_name'], message: t('hrEmployee.form.emergencyNameRequired') });
  };
}

/** Form values → the API's contact input: blanks become null, the emergency contact null when empty. */
export function toHrContactOutput(values: HrContactValues): HrContactOutput {
  const name = values.emergency_name.trim();
  return {
    personal_email: blankToNull(values.personal_email),
    phone_number: blankToNull(values.phone_number),
    phone_extension: blankToNull(values.phone_extension),
    current_address: blankToNull(values.current_address),
    permanent_address: blankToNull(values.permanent_address),
    emergency_contact: name
      ? {
          name,
          relation: blankToNull(values.emergency_relation),
          phone_number: values.emergency_phone_number.trim(),
          phone_extension: values.emergency_phone_extension.trim(),
        }
      : null,
  };
}

/** A stored record → the form's strings. */
export function hrContactValuesFrom(personal: Partial<{
  personal_email: string | null;
  phone_number: string | null;
  phone_extension: string | null;
  current_address: string | null;
  permanent_address: string | null;
  emergency_contact: { name: string; relation: string | null; phone_number: string; phone_extension: string } | null;
}>): HrContactValues {
  const e = personal.emergency_contact;
  return {
    personal_email: personal.personal_email ?? '',
    phone_extension: personal.phone_extension ?? hrContactDefaults.phone_extension,
    phone_number: personal.phone_number ?? '',
    current_address: personal.current_address ?? '',
    permanent_address: personal.permanent_address ?? '',
    emergency_name: e?.name ?? '',
    emergency_relation: e?.relation ?? '',
    emergency_phone_extension: e?.phone_extension ?? hrContactDefaults.emergency_phone_extension,
    emergency_phone_number: e?.phone_number ?? '',
  };
}

/** The Employee console's "My contact details" form. */
export function makeHrContactSchema(t: Translate) {
  return z
    .object(makeHrContactShape(t))
    .superRefine(refineHrEmergency(t))
    .transform(toHrContactOutput);
}

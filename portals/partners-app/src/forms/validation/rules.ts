import { z } from 'zod';
import { OTP_PATTERN, zodRules } from '@duncit/forms';

const optionalText = (label: string, max: number) => zodRules.optionalText(label, max, { defaultEmpty: true });

const optionalUrl = (label: string, allowRelative = false) =>
  zodRules.optionalUrl(label, allowRelative, { defaultEmpty: true });

const isAtLeast13 = (value: Date) => {
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 13);
  return value <= minDate;
};

const birthDate = (label = 'Birth year') =>
  z.preprocess(
    // `new Date(null)` is the epoch, so a cleared date must not reach the coercion.
    (value) => value ?? undefined,
    z.coerce
      .date({ error: `${label} is required` })
      .max(new Date(), `${label} must be in the past`)
      .refine(isAtLeast13, 'You must be at least 13 years old'),
  );

export const validationRules = {
  personName: zodRules.personName,
  optionalText,
  requiredText: zodRules.requiredText,
  email: zodRules.email,
  phoneNumber: zodRules.phoneNumber,
  phoneExtension: zodRules.phoneExtension,
  otp: () => z.string({ error: 'OTP is required' }).trim().regex(OTP_PATTERN, 'Enter the OTP we sent'),
  birthDate,
  optionalUrl,
};

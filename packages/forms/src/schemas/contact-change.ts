import { z } from 'zod';
import { EMAIL, OTP_6, PHONE_INTL } from '@duncit/regex';
import { isPhoneChannel, type ContactChannel, type ContactDraft } from '@duncit/utils';

import type { Translate } from './translate';

const EXTENSION_PATTERN = /^\+?\d{1,5}$/;

/** Step one's values — the shared draft shape, so nothing converts. */
export type ContactValueValues = ContactDraft;

/** The two boxes the current channel is not asking about. */
const anyString = z.string();

/**
 * The value being asked for, per channel.
 *
 * Built per channel rather than as one schema with every field optional: the
 * form only ever shows one channel at a time, and a schema that accepts a blank
 * number because the caller might have meant an email is a schema that lets
 * "Send code" through with nothing typed.
 *
 * Typed as `z.ZodType<ContactValueValues>` so both branches present ONE type to
 * `useForm` — a raw union of two object schemas gives react-hook-form a union to
 * resolve field paths against, which it cannot do.
 */
export function makeContactValueSchema(
  channel: ContactChannel,
  t: Translate,
  // zod 4 dropped the middle `ZodTypeDef` parameter: ZodType is <Output, Input>.
  // Both sides are the draft shape — the refinements only trim — and naming the
  // input is what lets zodResolver accept it: it requires field values, and
  // `unknown` is not an object it can resolve paths against.
): z.ZodType<ContactValueValues, ContactValueValues> {
  const emailValue = z
    .string()
    .trim()
    .max(254, t('mweb.contactChange.validation.emailTooLong'))
    .refine((v) => EMAIL.test(v), t('mweb.contactChange.validation.emailInvalid'));

  const extensionValue = z
    .string()
    .trim()
    .refine(
      (v) => EXTENSION_PATTERN.test(v),
      t('mweb.contactChange.validation.extensionInvalid'),
    );

  // The international range the server accepts, not the 10-digit Indian one:
  // there is a country-code picker beside this box, so a rule that only fits
  // +91 would refuse numbers the picker itself offers.
  const numberValue = z
    .string()
    .trim()
    .refine((v) => PHONE_INTL.test(v), t('mweb.contactChange.validation.phoneInvalid'));

  if (isPhoneChannel(channel)) {
    return z.object({ email: anyString, extension: extensionValue, number: numberValue });
  }
  return z.object({ email: emailValue, extension: anyString, number: anyString });
}

/** The code that proves the value above. Six digits, nothing else. */
export function makeContactOtpSchema(t: Translate) {
  return z.object({
    otp: z
      .string()
      .trim()
      .refine((v) => OTP_6.test(v), t('mweb.contactChange.validation.otpInvalid')),
  });
}

export type ContactOtpValues = z.infer<ReturnType<typeof makeContactOtpSchema>>;

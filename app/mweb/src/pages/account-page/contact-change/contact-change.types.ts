import { z } from 'zod';
import { EMAIL, OTP_6, PHONE_INTL } from '@duncit/regex';
import { isPhoneChannel, type ContactChannel, type ContactDraft } from '@duncit/utils';

const EXTENSION_PATTERN = /^\+?\d{1,5}$/;

/** The dialog's step-one values — the shared draft shape, so nothing converts. */
export type ContactValueValues = ContactDraft;

const anyString = z.string();

const emailValue = z
  .string()
  .trim()
  .max(254, 'That address is too long')
  .refine((v) => EMAIL.test(v), 'Enter a valid email address');

const extensionValue = z
  .string()
  .trim()
  .refine((v) => EXTENSION_PATTERN.test(v), 'Pick a country code');

/*
  The international range the server accepts, not the 10-digit Indian one:
  there is a country-code picker beside this box, so a rule that only fits +91
  would refuse numbers the picker itself offers.
*/
const numberValue = z
  .string()
  .trim()
  .refine((v) => PHONE_INTL.test(v), 'Enter a valid phone number');

/**
 * The value being asked for, per channel.
 *
 * Built per channel rather than as one schema with every field optional: the
 * dialog only ever shows one channel at a time, and a schema that accepts a
 * blank number because the caller might have meant an email is a schema that
 * lets Send code through with nothing typed.
 *
 * Typed as `z.ZodType<ContactValueValues>` so both branches present ONE type to
 * `useForm` — a raw union of two object schemas gives react-hook-form a union
 * to resolve field paths against, which it cannot do.
 */
export const makeContactValueSchema = (
  channel: ContactChannel,
): z.ZodType<ContactValueValues, z.ZodTypeDef, unknown> =>
  isPhoneChannel(channel)
    ? z.object({ email: anyString, extension: extensionValue, number: numberValue })
    : z.object({ email: emailValue, extension: anyString, number: anyString });

/** The code that proves the value above. Six digits, nothing else. */
export const contactOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .refine((v) => OTP_6.test(v), 'Enter the 6-digit code'),
});

export type ContactOtpValues = z.infer<typeof contactOtpSchema>;

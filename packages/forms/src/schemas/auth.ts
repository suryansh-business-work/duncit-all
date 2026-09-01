import { z } from 'zod';
import { DIAL_CODE, PHONE_INTL } from '@duncit/regex';

import { makePasswordWithOtpSchema } from './password-with-otp';
import type { Translate } from './translate';

/** The longest address RFC 5321 allows, and what the server stores. */
const EMAIL_MAX = 254;

/** The two things a password can be proved against. The server's own enum. */
export const LOGIN_CHANNELS = ['EMAIL', 'PHONE'] as const;
export type LoginChannel = (typeof LOGIN_CHANNELS)[number];

/**
 * The boxes the current channel is not asking about.
 *
 * Optional with a blank default rather than a bare string, so a caller holding
 * only the one identifier it offers — a console posting an address and a
 * password — parses without supplying empty boxes for a channel it never shows.
 */
const anyString = z.string().optional().default('');

/** Every box the sign-in form holds, whichever channel is showing. */
export interface LoginFormValues {
  email: string;
  phoneExtension: string;
  phoneNumber: string;
  password: string;
}

/**
 * What a caller may HAND the schema, as opposed to what it gets back.
 *
 * Only the password is asked for unconditionally: the boxes belonging to the
 * channel that is not showing default to blank, so a console holding an address
 * and a password parses without inventing empty phone fields. Both branches are
 * assignable to this — a required box is assignable to an optional one.
 */
export interface LoginFormInput {
  email?: string;
  phoneExtension?: string;
  phoneNumber?: string;
  password: string;
}

/**
 * Sign-in contract — a destination plus the 8-character password the server
 * enforces.
 *
 * mWeb and the app had written this twice and already disagreed: the app's copy
 * validated `.email()` alone, so a blank box failed with "Enter a valid email"
 * where mWeb said "Email is required", and the app never applied the 254-char
 * ceiling the server does. This is mWeb's (correct) version.
 *
 * Built PER CHANNEL rather than as one schema with everything optional, exactly
 * as `makeContactValueSchema` next door is: the form shows one channel at a
 * time, and a schema that tolerates a blank number because the caller might
 * have meant an email is one that lets Sign in through with nothing typed. The
 * channel itself lives with the screen and remounts the form, so it is not a
 * form value — the same shape the recovery step uses.
 */
export function makeLoginSchema(
  t: Translate,
  channel: LoginChannel = 'EMAIL',
  // Annotated rather than inferred: the two branches are two different object
  // schemas, and a raw union gives react-hook-form a union to resolve field
  // paths against, which it cannot do. Same reason, same shape as
  // makeContactValueSchema next door.
): z.ZodType<LoginFormValues, LoginFormInput> {
  const email = z
    .string()
    .trim()
    .min(1, t('mweb.auth.validation.emailRequired'))
    .email(t('mweb.auth.validation.emailInvalid'))
    .max(EMAIL_MAX);

  const phoneExtension = z
    .string()
    .trim()
    .min(1, t('mweb.signup.validation.codeRequired'))
    .refine((v) => DIAL_CODE.test(v), t('mweb.signup.validation.codeInvalid'));

  // The international range the server accepts, not the 10-digit Indian one:
  // there is a country-code picker beside this box.
  const phoneNumber = z
    .string()
    .trim()
    .min(1, t('mweb.signup.validation.phoneRequired'))
    .refine((v) => PHONE_INTL.test(v), t('mweb.signup.validation.phoneInvalid'));

  const password = z.string().min(8, t('mweb.auth.validation.passwordMin'));

  if (channel === 'PHONE') {
    return z.object({ email: anyString, phoneExtension, phoneNumber, password });
  }
  return z.object({ email, phoneExtension: anyString, phoneNumber: anyString, password });
}

export const loginDefaults: LoginFormValues = {
  email: '',
  // Same default dial as every other phone row in both apps.
  phoneExtension: '+91',
  phoneNumber: '',
  password: '',
};

/** Forgot-password — just the address the reset code is sent to. */
export function makeForgotPasswordSchema(t: Translate) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('mweb.auth.validation.emailRequired'))
      .email(t('mweb.auth.validation.emailInvalid'))
      .max(EMAIL_MAX),
  });
}

export type ForgotPasswordValues = z.infer<ReturnType<typeof makeForgotPasswordSchema>>;

export const forgotPasswordDefaults: ForgotPasswordValues = { email: '' };

/**
 * Reset-password — the emailed code plus a new password typed twice.
 *
 * The same contract the signed-in change-password flow commits with: one set of
 * rules, reached from two screens — see `makePasswordWithOtpSchema`.
 */
export const makeResetPasswordSchema = makePasswordWithOtpSchema;

export type ResetPasswordValues = z.infer<ReturnType<typeof makeResetPasswordSchema>>;

export { passwordWithOtpDefaults as resetPasswordDefaults } from './password-with-otp';

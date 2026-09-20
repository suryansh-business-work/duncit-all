import { z } from 'zod';
import { DIAL_CODE, EMAIL, OTP_6, PHONE_INTL, PHONE_NUMBER_IN } from '@duncit/regex';
import {
  contactNumberIsCurrent,
  isPhoneChannel,
  type ContactChannel,
  type ContactDraft,
  type ContactSnapshot,
} from '@duncit/utils';

import type { Translate } from './translate';

/** Step one's values — the shared draft shape, so nothing converts. */
export type ContactValueValues = ContactDraft;

/** The two boxes the current channel is not asking about. */
const anyString = z.string();

/** The dial code the country picker defaults to — the only one whose numbers
 * are checked against the stricter 10-digit Indian shape below. */
const INDIA_DIAL_CODE = '+91';

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
  /** What the account holds now: its own number typed back is refused before
   * its shape is even looked at — there is nothing to change. */
  current?: Readonly<ContactSnapshot>,
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
    .refine((v) => DIAL_CODE.test(v), t('mweb.contactChange.validation.extensionInvalid'));

  if (isPhoneChannel(channel)) {
    // Every rule about the number runs in ONE place so the box shows one line
    // and the first refusal wins — a field-level regex would be reported ahead
    // of anything the object then says (see `phoneNumberIssue`).
    return z
      .object({ email: anyString, extension: extensionValue, number: z.string().trim() })
      .superRefine((values, ctx) => {
        const message = phoneNumberIssue(channel, t, values, current);
        if (message) {
          ctx.addIssue({ code: 'custom', message, path: ['number'] });
        }
      });
  }
  return z.object({ email: emailValue, extension: anyString, number: anyString });
}

/**
 * The one line under the number box, or null when the number may be sent.
 *
 * The account's own number comes first: typed back, it is refused as "the
 * current number" whatever its shape, since a number stored before today's
 * rules can fail them and a shape complaint about a number the person is not
 * changing helps nobody. Then the international range the server accepts, not
 * the 10-digit Indian one — there is a country-code picker beside this box, so
 * a rule that only fits +91 would refuse numbers the picker itself offers. On
 * India's own dial code there is no picker ambiguity left to protect: a
 * 9-digit number is simply short, so it is held to the real 10-digit shape.
 */
function phoneNumberIssue(
  channel: ContactChannel,
  t: Translate,
  values: Readonly<ContactDraft>,
  current?: Readonly<ContactSnapshot>,
): string | null {
  if (current && contactNumberIsCurrent(current, channel, values)) {
    return channel === 'PHONE'
      ? t('mweb.contactChange.phoneCurrent')
      : t('mweb.contactChange.whatsappCurrent');
  }
  const shortForIndia =
    values.extension === INDIA_DIAL_CODE && !PHONE_NUMBER_IN.test(values.number);
  if (!PHONE_INTL.test(values.number) || shortForIndia) {
    return t('mweb.contactChange.validation.phoneInvalid');
  }
  return null;
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

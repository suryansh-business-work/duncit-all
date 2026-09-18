import { z } from 'zod';
import { OTP_6 } from '@duncit/regex';

import { DIAL_CODE } from '../../../config/env';
import type { LoginChannel } from '../../../graphql/account';
import { emailRule, phoneRule } from '../../../lib/validation';

type Translate = (key: string) => string;

/** Step one: where the code goes — an email address, or a mobile number. */
export const makeOtpRequestSchema = (t: Translate, channel: LoginChannel) =>
  z.object({
    contact: channel === 'EMAIL' ? emailRule(t) : phoneRule(t),
  });

/** Step two: the six-digit code that arrived. */
export const makeOtpVerifySchema = (t: Translate) =>
  z.object({
    code: z
      .string()
      .trim()
      .refine((value) => OTP_6.test(value), t('ecommStore.validation.codeInvalid')),
  });

export type OtpRequestValues = z.infer<ReturnType<typeof makeOtpRequestSchema>>;
export type OtpVerifyValues = z.infer<ReturnType<typeof makeOtpVerifySchema>>;

/** The GraphQL input both steps share: the channel and the contact on it. */
export function contactInput(channel: LoginChannel, contact: string) {
  if (channel === 'EMAIL') return { channel, email: contact };
  return { channel, phone_extension: DIAL_CODE, phone_number: contact };
}

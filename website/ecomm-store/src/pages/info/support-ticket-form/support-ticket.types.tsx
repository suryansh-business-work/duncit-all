import { z } from 'zod';
import { PHONE_NUMBER, toDigits } from '@duncit/regex';

import { emailRule, optionalRule, requiredRule } from '../../../lib/validation';

type Translate = (key: string) => string;

/** The kinds of ticket a shopper can tell apart, as the API's own categories. */
export const CATEGORY_VALUES = ['BOOKING', 'GENERAL', 'PAYMENT', 'OTHER'] as const;

export type TicketCategoryValue = (typeof CATEGORY_VALUES)[number];

export const CATEGORY_LABEL_KEYS: Record<TicketCategoryValue, string> = {
  BOOKING: 'ecommStore.contact.catOrder',
  GENERAL: 'ecommStore.contact.catProduct',
  PAYMENT: 'ecommStore.contact.catPayment',
  OTHER: 'ecommStore.contact.catOther',
};

/** A 10-digit mobile number when one is given; blank is fine. */
const optionalPhoneRule = (t: Translate) =>
  z
    .string()
    .transform((value) => (value.trim() === '' ? '' : toDigits(value).slice(-10)))
    .refine((value) => value === '' || PHONE_NUMBER.test(value), t('ecommStore.validation.phoneInvalid'));

export const makeSupportTicketSchema = (t: Translate) =>
  z.object({
    name: requiredRule(t, 'ecommStore.validation.nameRequired', 80),
    email: emailRule(t),
    phone: optionalPhoneRule(t),
    orderNo: optionalRule(t, 40),
    subject: requiredRule(t, 'ecommStore.contact.subjectRequired', 120),
    category: z.enum(CATEGORY_VALUES),
    message: requiredRule(t, 'ecommStore.contact.messageRequired', 2000),
  });

export type SupportTicketValues = z.infer<ReturnType<typeof makeSupportTicketSchema>>;

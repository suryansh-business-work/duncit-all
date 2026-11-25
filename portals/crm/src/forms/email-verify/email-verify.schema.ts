import {
  emailVerifyDefaults as sharedDefaults,
  makeEmailVerifySchema,
  type EmailVerifyValues,
} from '@duncit/forms/schemas';
import type { Translate } from './email-verify.types';

/*
  One address to check now. The rule lives in @duncit/forms/schemas
  (email-verify), shared with the Duncit CRM app; these are the portal's names.
*/
export const emailVerifySchema = (t: Translate) => makeEmailVerifySchema(t);

export type EmailVerifyFormValues = EmailVerifyValues;

export const emailVerifyDefaults: EmailVerifyFormValues = sharedDefaults;

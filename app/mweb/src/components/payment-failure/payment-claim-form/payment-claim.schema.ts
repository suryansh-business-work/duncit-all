import { makePaymentClaimSchema } from '@duncit/forms/schemas';
import { fallbackT, type Translate } from '../../../i18n/fallback';

/** The deducted-payment claim rules — @duncit/forms', the same the native sheet and the server hold. */
export const makePaymentClaimFormSchema = (t: Translate = fallbackT) => makePaymentClaimSchema(t);

export const paymentClaimFormSchema = makePaymentClaimFormSchema();

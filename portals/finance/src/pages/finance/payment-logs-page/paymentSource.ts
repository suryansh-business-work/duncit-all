import type { PaymentSource } from '@duncit/gql-types';
import type { Translator } from '@duncit/app-settings';

export type { PaymentSource };

/**
 * Which checkout a payment came from — pod booking, pod shop cart, pet store,
 * gift card / other — as every Finance screen names it (Round Offs, Failed
 * Payments, Payment Trace). The keys are the server's PaymentSource and only
 * the labels are copy; each key is a literal so the localization gate sees it.
 */
export const paymentSourceLabels = (t: Translator['t']): Record<PaymentSource, string> => ({
  POD_BOOKING: t('finance.roundOffs.sourcePodBooking'),
  POD_SHOP: t('finance.roundOffs.sourcePodShop'),
  ECOMM: t('finance.roundOffs.sourceEcomm'),
  OTHER: t('finance.roundOffs.sourceOther'),
});

export const PAYMENT_SOURCES: PaymentSource[] = ['POD_BOOKING', 'POD_SHOP', 'ECOMM', 'OTHER'];

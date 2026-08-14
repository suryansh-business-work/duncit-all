import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileCheckoutMeDocument, MobilePublicFinanceDocument } from '@/graphql/checkout';
import {
  MobileCreateRazorpayGiftCardOrderDocument,
  MobileDummyGiftCardCheckoutDocument,
} from '@/graphql/gift-cards';
import { graphqlRequest } from '@/services/graphql.client';
import type { CheckoutFormValues } from '@/forms/checkout';
import {
  buildCheckoutBilling,
  buildCheckoutInitialValues,
  useRazorpayVerification,
  type CheckoutMe,
  type FinanceSettings,
  type RazorpayOrder,
} from '@/hooks/useCheckout';
import { downloadPaymentInvoice, maybeSaveMainAddress } from '@/hooks/checkoutRequests';
import type { GiftCardSelection } from '@/utils/gift-cards';

export type GiftCardPayment = ResultOf<
  typeof MobileDummyGiftCardCheckoutDocument
>['dummyGiftCardCheckout'];

/** Where the payment email's "back to checkout" link lands — the deep-link
 * grammar `useCheckout` established, on this flow's own route. */
const GIFT_CARD_CHECKOUT_URL = 'duncit-mobile://gift-cards/checkout';

/**
 * Loads the gift-card checkout context (finance + me) and runs the purchase
 * through the dedicated gift-card payment engine — charged at face value, no
 * coupons, no coins, no fees (stored value must not buy stored value). Verify
 * rides the shared Razorpay verification. RN twin of mWeb's gift-card
 * checkout data layer (rule 27); modeled on useProductCheckout.
 */
export function useGiftCardCheckout(selection: GiftCardSelection) {
  const [finance, setFinance] = useState<FinanceSettings | null>(null);
  const [me, setMe] = useState<CheckoutMe>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { verifyRazorpay, confirmingMessage } = useRazorpayVerification();

  useEffect(() => {
    let active = true;
    Promise.all([
      graphqlRequest(MobilePublicFinanceDocument, undefined, { auth: true }).then(
        (d) => active && setFinance(d.publicFinanceSettings),
      ),
      graphqlRequest(MobileCheckoutMeDocument, undefined, { auth: true }).then(
        (d) => active && setMe(d.me),
      ),
    ])
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const initialValues = useMemo(() => buildCheckoutInitialValues(me), [me]);

  const buildInput = (values: CheckoutFormValues) => ({
    scope_type: selection.scope_type,
    scope_category_id: selection.scope_category_id,
    amount: selection.amount,
    recipient_email: selection.recipient_email || null,
    recipient_name: selection.recipient_name || null,
    message: selection.message || null,
    contact_name: values.full_name.trim(),
    contact_email: values.email,
    contact_phone_extension: values.phone_extension,
    contact_phone_number: values.phone_number,
    billing: buildCheckoutBilling(values, me?.address ?? null),
    checkout_url: GIFT_CARD_CHECKOUT_URL,
  });

  const pay = async (values: CheckoutFormValues): Promise<GiftCardPayment> => {
    await maybeSaveMainAddress(values, me);
    const data = await graphqlRequest(
      MobileDummyGiftCardCheckoutDocument,
      { input: { ...buildInput(values), simulate_failure: values.simulate_failure } },
      { auth: true },
    );
    return data.dummyGiftCardCheckout;
  };

  const createRazorpayGiftCardOrder = async (
    values: CheckoutFormValues,
  ): Promise<RazorpayOrder> => {
    await maybeSaveMainAddress(values, me);
    const data = await graphqlRequest(
      MobileCreateRazorpayGiftCardOrderDocument,
      { input: buildInput(values) },
      { auth: true },
    );
    return data.createRazorpayGiftCardOrder;
  };

  return {
    finance,
    me,
    initialValues,
    isLoading,
    pay,
    createRazorpayGiftCardOrder,
    verifyRazorpay,
    confirmingMessage,
    downloadInvoice: downloadPaymentInvoice,
  };
}

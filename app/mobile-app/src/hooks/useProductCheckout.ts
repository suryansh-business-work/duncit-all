import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileAvailableCouponsDocument,
  MobileCheckoutMeDocument,
  MobilePublicFinanceDocument,
} from '@/graphql/checkout';
import {
  MobileCreateRazorpayProductOrderDocument,
  MobileDummyProductCheckoutDocument,
} from '@/graphql/productCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import type { CheckoutFormValues } from '@/forms/checkout';
import type { ProductCartItemInput } from '@/generated/graphql/graphql';
import {
  buildCheckoutInitialValues,
  useRazorpayVerification,
  type AvailableCoupon,
  type CheckoutMe,
  type FinanceSettings,
  type RazorpayOrder,
} from '@/hooks/useCheckout';
import {
  downloadPaymentInvoice,
  maybeSaveMainAddress,
  previewCouponRequest,
  type CouponPreview,
} from '@/hooks/checkoutRequests';
import { buildProductCheckoutInput, type PickedContact } from '@/utils/product-checkout-input';

export type ProductPayment = ResultOf<
  typeof MobileDummyProductCheckoutDocument
>['dummyProductCheckout'];

/** The whole cart's items being paid, plus the applied coupon. */
export interface ProductPayContext {
  items: ProductCartItemInput[];
  couponCode: string | null;
  /** Contact from the picked address-book entry (the parcel's recipient). */
  pickedContact?: PickedContact | null;
  /** Duncit Coins the buyer applied at checkout (clamped again server-side). */
  redeemCoins?: number;
}

/**
 * Loads the standalone product-checkout context (finance + me + coupons) and
 * runs the product payment via the dedicated product engine — never the pod-join
 * engine. The checkout is cart-wide, so coupons are never pod-scoped here.
 * RN twin of mWeb's product checkout data layer (useCheckoutSession +
 * useProductPayment). Shipping is quoted separately by useProductShippingQuote.
 */
export function useProductCheckout() {
  const [finance, setFinance] = useState<FinanceSettings | null>(null);
  const [me, setMe] = useState<CheckoutMe>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
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
      graphqlRequest(MobileAvailableCouponsDocument, { pod_id: null }, { auth: true })
        .then((d) => active && setAvailableCoupons(d.availableCouponsForPod))
        .catch(() => undefined),
    ])
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const initialValues = useMemo(() => buildCheckoutInitialValues(me), [me]);

  const buildInput = (values: CheckoutFormValues, ctx: ProductPayContext) =>
    buildProductCheckoutInput(values, {
      items: ctx.items,
      mainAddress: me?.address ?? null,
      couponCode: ctx.couponCode,
      pickedContact: ctx.pickedContact,
      redeemCoins: ctx.redeemCoins,
    });

  const payProduct = async (
    values: CheckoutFormValues,
    ctx: ProductPayContext,
  ): Promise<ProductPayment> => {
    await maybeSaveMainAddress(values, me);
    const { input, simulate_failure } = buildInput(values, ctx);
    const data = await graphqlRequest(
      MobileDummyProductCheckoutDocument,
      { input: { ...input, simulate_failure } },
      { auth: true },
    );
    return data.dummyProductCheckout;
  };

  const createRazorpayProductOrder = async (
    values: CheckoutFormValues,
    ctx: ProductPayContext,
  ): Promise<RazorpayOrder> => {
    await maybeSaveMainAddress(values, me);
    const { input } = buildInput(values, ctx);
    const data = await graphqlRequest(
      MobileCreateRazorpayProductOrderDocument,
      { input },
      { auth: true },
    );
    return data.createRazorpayProductOrder;
  };

  const previewCoupon = (code: string, amount: number): Promise<CouponPreview> =>
    previewCouponRequest(code, '', amount);

  return {
    finance,
    me,
    initialValues,
    availableCoupons,
    isLoading,
    payProduct,
    createRazorpayProductOrder,
    verifyRazorpay,
    confirmingMessage,
    previewCoupon,
    downloadInvoice: downloadPaymentInvoice,
  };
}

import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileAvailableCouponsDocument,
  MobileCheckoutMeDocument,
  MobilePublicFinanceDocument,
  MobileVerifyRazorpayDocument,
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
  type AvailableCoupon,
  type CheckoutMe,
  type FinanceSettings,
  type RazorpayOrder,
  type RazorpaySignature,
} from '@/hooks/useCheckout';
import {
  downloadPaymentInvoice,
  maybeSaveMainAddress,
  previewCouponRequest,
  type CouponPreview,
} from '@/hooks/checkoutRequests';
import { buildProductCheckoutInput } from '@/utils/product-checkout-input';

export type ProductPayment = ResultOf<
  typeof MobileDummyProductCheckoutDocument
>['dummyProductCheckout'];

/** The one pod's lines being paid, plus the resolved title + coupon. */
export interface ProductPayContext {
  items: ProductCartItemInput[];
  podTitle: string;
  couponCode: string | null;
}

/**
 * Loads the standalone product-checkout context (finance + me + coupons) and
 * runs the product payment via the dedicated product engine — never the pod-join
 * engine. RN twin of mWeb's product checkout data layer (useCheckoutSession +
 * useProductPayment). Shipping is quoted separately by useProductShippingQuote.
 */
export function useProductCheckout(podId: string) {
  const [finance, setFinance] = useState<FinanceSettings | null>(null);
  const [me, setMe] = useState<CheckoutMe>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      graphqlRequest(MobilePublicFinanceDocument, undefined, { auth: true }).then(
        (d) => active && setFinance(d.publicFinanceSettings),
      ),
      graphqlRequest(MobileCheckoutMeDocument, undefined, { auth: true }).then(
        (d) => active && setMe(d.me),
      ),
      graphqlRequest(MobileAvailableCouponsDocument, { pod_id: podId || null }, { auth: true })
        .then((d) => active && setAvailableCoupons(d.availableCouponsForPod))
        .catch(() => undefined),
    ])
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  const initialValues = useMemo(() => buildCheckoutInitialValues(me), [me]);

  const buildInput = (values: CheckoutFormValues, ctx: ProductPayContext) =>
    buildProductCheckoutInput(values, {
      items: ctx.items,
      podTitle: ctx.podTitle,
      mainAddress: me?.address ?? null,
      couponCode: ctx.couponCode,
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

  const verifyRazorpay = async (
    paymentDocId: string,
    sig: RazorpaySignature,
  ): Promise<ProductPayment> => {
    const data = await graphqlRequest(
      MobileVerifyRazorpayDocument,
      { input: { payment_doc_id: paymentDocId, ...sig } },
      { auth: true },
    );
    return data.verifyRazorpayPayment;
  };

  const previewCoupon = (code: string, amount: number): Promise<CouponPreview> =>
    previewCouponRequest(code, podId, amount);

  return {
    finance,
    me,
    initialValues,
    availableCoupons,
    isLoading,
    payProduct,
    createRazorpayProductOrder,
    verifyRazorpay,
    previewCoupon,
    downloadInvoice: downloadPaymentInvoice,
  };
}

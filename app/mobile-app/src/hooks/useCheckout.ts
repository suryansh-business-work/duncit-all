import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileAvailableCouponsDocument,
  MobileCheckoutMeDocument,
  MobileCheckoutPodDocument,
  MobileCreateRazorpayOrderDocument,
  MobileDummyCheckoutDocument,
  MobilePublicFinanceDocument,
  MobileVerifyRazorpayDocument,
} from '@/graphql/checkout';
import type { CheckoutBillingInput } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import type { CheckoutContact, CheckoutFormValues, CheckoutMainAddress } from '@/forms/checkout';
import {
  downloadPaymentInvoice,
  maybeSaveMainAddress,
  previewCouponRequest,
} from '@/hooks/checkoutRequests';

export type { CouponPreview } from '@/hooks/checkoutRequests';

export type FinanceSettings = ResultOf<typeof MobilePublicFinanceDocument>['publicFinanceSettings'];
export type CheckoutPod = ResultOf<typeof MobileCheckoutPodDocument>['pod'];
export type CheckoutMe = ResultOf<typeof MobileCheckoutMeDocument>['me'];
export type CheckoutPayment = ResultOf<typeof MobileDummyCheckoutDocument>['dummyCheckout'];
export type RazorpayOrder = ResultOf<
  typeof MobileCreateRazorpayOrderDocument
>['createRazorpayOrder'];
export type AvailableCoupon = ResultOf<
  typeof MobileAvailableCouponsDocument
>['availableCouponsForPod'][number];

/** The signature triple Razorpay returns on a successful payment. */
export interface RazorpaySignature {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const CHECKOUT_URL = 'duncit-mobile://checkout';

/** Prefill the checkout form from the loaded user — contact + main-address seed
 * + the "same as my main address" default (on when a main address exists). */
export function buildCheckoutInitialValues(me: CheckoutMe): Partial<CheckoutFormValues> {
  const address = me?.address;
  return {
    full_name: [me?.first_name, me?.last_name].filter(Boolean).join(' '),
    email: me?.email ?? '',
    phone_extension: me?.phone_extension ?? '+91',
    phone_number: me?.phone_number ?? '',
    same_as_main: !!address?.line1,
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    landmark: address?.landmark ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    pincode: address?.pincode ?? '',
    country: address?.country || 'India',
  };
}

/** Read-only contact for the checkout summary, resolved from the loaded user.
 * Returns null until the profile has loaded so the card can show a spinner
 * instead of blanks (the form prefill still supplies what is sent on pay). */
export function buildCheckoutContact(me: CheckoutMe): CheckoutContact | null {
  if (!me) return null;
  return {
    name: [me.first_name, me.last_name].filter(Boolean).join(' '),
    email: me.email ?? '',
    phone_extension: me.phone_extension ?? '',
    phone_number: me.phone_number ?? '',
  };
}

/** Build the structured billing block sent on pay. Uses the saved main address
 * when "same as main" is on, else the entered fields; billing email is sent only
 * when it differs from the contact email, and GSTIN only when non-empty. */
export function buildCheckoutBilling(
  values: CheckoutFormValues,
  mainAddress: CheckoutMainAddress | null,
): CheckoutBillingInput {
  const source = values.same_as_main && mainAddress?.line1 ? mainAddress : values;
  const gstin = values.gstin.trim();
  const billingEmail = values.billing_email.trim();
  const contactEmail = values.email.trim();
  return {
    line1: source.line1,
    line2: source.line2,
    landmark: source.landmark,
    city: source.city,
    state: source.state,
    pincode: source.pincode,
    country: source.country || 'India',
    ...(values.has_gstin && gstin ? { gstin } : {}),
    ...(billingEmail && billingEmail !== contactEmail ? { email: billingEmail } : {}),
  };
}

/** Loads checkout context (finance + pod + me) and runs the dummy payment +
 * invoice download. Pod checkout pays the pod membership (pod_amount) ONLY —
 * products are a separate payment via the standalone product checkout, never
 * mixed in. RN twin of mWeb's CheckoutPage data layer. */
export function useCheckout(podId: string) {
  const [finance, setFinance] = useState<FinanceSettings | null>(null);
  const [pod, setPod] = useState<CheckoutPod>(null);
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
      podId
        ? graphqlRequest(MobileCheckoutPodDocument, { id: podId }, { auth: true }).then(
            (d) => active && setPod(d.pod),
          )
        : Promise.resolve(),
    ])
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  const initialValues = useMemo(() => buildCheckoutInitialValues(me), [me]);

  const contactInput = (
    values: CheckoutFormValues,
    amount: number,
    couponCode?: string | null,
  ) => ({
    pod_id: podId || null,
    amount,
    description: `Pod booking · ${pod?.pod_title ?? 'Booking'}`,
    contact_name: values.full_name.trim(),
    contact_email: values.email,
    contact_phone_extension: values.phone_extension,
    contact_phone_number: values.phone_number,
    billing: buildCheckoutBilling(values, me?.address ?? null),
    checkout_url: CHECKOUT_URL,
    coupon_code: couponCode || null,
  });

  const pay = async (
    values: CheckoutFormValues,
    amount: number,
    couponCode?: string | null,
  ): Promise<CheckoutPayment> => {
    await maybeSaveMainAddress(values, me);
    const data = await graphqlRequest(
      MobileDummyCheckoutDocument,
      {
        input: {
          ...contactInput(values, amount, couponCode),
          simulate_failure: values.simulate_failure,
        },
      },
      { auth: true },
    );
    return data.dummyCheckout;
  };

  const createRazorpayOrder = async (
    values: CheckoutFormValues,
    amount: number,
    couponCode?: string | null,
  ): Promise<RazorpayOrder> => {
    await maybeSaveMainAddress(values, me);
    const data = await graphqlRequest(
      MobileCreateRazorpayOrderDocument,
      { input: contactInput(values, amount, couponCode) },
      { auth: true },
    );
    return data.createRazorpayOrder;
  };

  const previewCoupon = (code: string, amount: number) => previewCouponRequest(code, podId, amount);

  const verifyRazorpay = async (
    paymentDocId: string,
    sig: RazorpaySignature,
  ): Promise<CheckoutPayment> => {
    const data = await graphqlRequest(
      MobileVerifyRazorpayDocument,
      { input: { payment_doc_id: paymentDocId, ...sig } },
      { auth: true },
    );
    return data.verifyRazorpayPayment;
  };

  return {
    finance,
    pod,
    me,
    initialValues,
    availableCoupons,
    isLoading,
    pay,
    createRazorpayOrder,
    verifyRazorpay,
    previewCoupon,
    downloadInvoice: downloadPaymentInvoice,
  };
}

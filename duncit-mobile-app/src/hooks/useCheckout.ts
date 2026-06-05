import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileCheckoutInvoiceDocument,
  MobileCheckoutMeDocument,
  MobileCheckoutPodDocument,
  MobileDummyCheckoutDocument,
  MobilePublicFinanceDocument,
} from '@/graphql/checkout';
import { graphqlRequest } from '@/services/graphql.client';
import type { CheckoutFormValues } from '@/forms/checkout';

export type FinanceSettings = ResultOf<typeof MobilePublicFinanceDocument>['publicFinanceSettings'];
export type CheckoutPod = ResultOf<typeof MobileCheckoutPodDocument>['pod'];
export type CheckoutMe = ResultOf<typeof MobileCheckoutMeDocument>['me'];
export type CheckoutPayment = ResultOf<typeof MobileDummyCheckoutDocument>['dummyCheckout'];

const CHECKOUT_URL = 'duncit-mobile://checkout';

/** Loads checkout context (finance + pod + me) and runs the dummy payment +
 * invoice download. RN twin of mWeb's CheckoutPage data layer. */
export function useCheckout(podId: string) {
  const [finance, setFinance] = useState<FinanceSettings | null>(null);
  const [pod, setPod] = useState<CheckoutPod>(null);
  const [me, setMe] = useState<CheckoutMe>(null);
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

  const pay = async (values: CheckoutFormValues, amount: number): Promise<CheckoutPayment> => {
    const data = await graphqlRequest(
      MobileDummyCheckoutDocument,
      {
        input: {
          pod_id: podId || null,
          amount,
          description: `Pod booking · ${pod?.pod_title ?? 'Booking'}`,
          contact_email: values.email,
          contact_phone_extension: values.phone_extension,
          contact_phone_number: values.phone_number,
          billing_address: values.billing_address,
          checkout_url: CHECKOUT_URL,
          simulate_failure: values.simulate_failure,
        },
      },
      { auth: true },
    );
    return data.dummyCheckout;
  };

  const downloadInvoice = async (paymentDocId: string, invoiceNo: string) => {
    const data = await graphqlRequest(
      MobileCheckoutInvoiceDocument,
      { id: paymentDocId },
      { auth: true },
    );
    const base64 = data.paymentInvoicePdfBase64;
    if (!base64) throw new Error('Invoice not available');
    const safe = invoiceNo.replace(/[^A-Za-z0-9_-]+/g, '-');
    const uri = `${FileSystem.cacheDirectory}invoice-${safe}.pdf`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('Sharing is not available on this device');
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  return { finance, pod, me, isLoading, pay, downloadInvoice };
}

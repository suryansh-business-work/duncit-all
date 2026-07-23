import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileCheckoutInvoiceDocument,
  MobileCheckoutSaveAddressDocument,
  MobilePreviewCouponDocument,
} from '@/graphql/checkout';
import { graphqlRequest } from '@/services/graphql.client';
import type { CheckoutFormValues } from '@/forms/checkout';

export type CouponPreview = ResultOf<typeof MobilePreviewCouponDocument>['previewCoupon'];

/** The single saved-address field the save-on-pay guard needs, kept minimal so
 * this module never depends on the checkout hooks that import it. */
interface SavedAddressHolder {
  address?: { line1?: string | null } | null;
}

/** Persist the entered billing address as the user's main address when opted in.
 * The opt-in only applies when there is no saved main address yet. Shared by the
 * pod-membership and standalone-product checkouts. */
export async function maybeSaveMainAddress(
  values: CheckoutFormValues,
  me: SavedAddressHolder | null | undefined,
): Promise<void> {
  if (!values.save_as_main || me?.address?.line1) return;
  await graphqlRequest(
    MobileCheckoutSaveAddressDocument,
    {
      input: {
        address: {
          line1: values.line1.trim(),
          line2: values.line2.trim(),
          landmark: values.landmark.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          pincode: values.pincode.trim(),
          country: values.country.trim() || 'India',
        },
      },
    },
    { auth: true },
  );
}

/** Preview a coupon for the payment step (drives the strikethrough / Pay X UI). */
export async function previewCouponRequest(
  code: string,
  podId: string,
  amount: number,
): Promise<CouponPreview> {
  const data = await graphqlRequest(
    MobilePreviewCouponDocument,
    { input: { code: code.trim(), pod_id: podId || null, amount } },
    { auth: true },
  );
  return data.previewCoupon;
}

/** Fetch the payment's base64 PDF invoice and hand it to the OS share sheet. */
export async function downloadPaymentInvoice(
  paymentDocId: string,
  invoiceNo: string,
): Promise<void> {
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
}

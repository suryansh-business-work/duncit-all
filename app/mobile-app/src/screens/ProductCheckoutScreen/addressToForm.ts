import type { ResultOf } from '@graphql-typed-document-node/core';

import type { CheckoutFormValues } from '@/forms/checkout';
import type { MyAddressesDocument } from '@/graphql/address-book';

export type CheckoutAddress = ResultOf<typeof MyAddressesDocument>['myAddresses'][number];

/** Merge a picked saved address into the checkout form values — the picked
 * address becomes the (non-"same as main") delivery/billing address, and its
 * pincode drives the live delivery quote via the form's pincode watcher. */
export function addressToForm(
  address: CheckoutAddress,
  base: Partial<CheckoutFormValues>,
): Partial<CheckoutFormValues> {
  return {
    ...base,
    same_as_main: false,
    full_name: address.name || base.full_name,
    line1: address.line1,
    line2: address.line2,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country || 'India',
  };
}

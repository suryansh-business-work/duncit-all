import type { AddressValues } from '../components/address-form';
import { COUNTRY } from '../config/env';
import type { StoreAddressInput } from '../graphql/checkout';

/** Any address the API hands back (saved or on an order), as the form's values. */
export function toAddressValues(address: AddressValues): AddressValues {
  return {
    name: address.name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
  };
}

/** The form's address as the checkout and Autoship mutations take it. */
export function toStoreAddress(values: AddressValues, email?: string): StoreAddressInput {
  return {
    name: values.name,
    phone: values.phone,
    email,
    line1: values.line1,
    line2: values.line2 || undefined,
    landmark: values.landmark || undefined,
    city: values.city,
    state: values.state,
    pincode: values.pincode,
    country: COUNTRY,
  };
}

/** The address to start a form with: the default saved one, else the first. */
export const preferredAddress = <A extends { is_default: boolean }>(addresses: A[] | undefined): A | undefined =>
  addresses?.find((a) => a.is_default) ?? addresses?.[0];

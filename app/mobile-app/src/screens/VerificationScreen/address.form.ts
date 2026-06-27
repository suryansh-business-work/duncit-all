import { z } from 'zod';

import type { AddressInput } from '@/hooks/useVerifications';

export interface AddressValues {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export const blankAddressValues: AddressValues = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: '',
};

/** Address verification schema — line1/city/state/pincode required, line2/country optional. */
export const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Enter your street address'),
  line2: z.string().trim(),
  city: z.string().trim().min(1, 'Enter your city'),
  state: z.string().trim().min(1, 'Enter your state'),
  pincode: z.string().trim().min(1, 'Enter your pincode'),
  country: z.string().trim(),
});

/** Maps validated values onto the submitAddressVerification input (drops blanks). */
export function buildAddressInput(values: AddressValues): AddressInput {
  return {
    line1: values.line1.trim(),
    line2: values.line2.trim() || undefined,
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode.trim(),
    country: values.country.trim() || undefined,
  };
}

import { z } from 'zod';

export type PickupOwnerKind = 'DUNCIT' | 'BRAND';

export const pickupLocationSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(3, 'Nickname must be at least 3 characters')
    .max(60, 'Nickname is too long'),
  contact_name: z.string().trim().min(2, 'Contact name is required').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Enter a valid 10-digit phone number'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Enter a valid email'),
  address_line1: z.string().trim().min(3, 'Address line 1 is required').max(120),
  address_line2: z.string().trim().max(120),
  city: z.string().trim().min(2, 'City is required').max(60),
  state: z.string().trim().min(2, 'State is required').max(60),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  country: z.string().trim().min(2, 'Country is required').max(60),
  is_default: z.boolean(),
});

export type PickupLocationFormValues = z.infer<typeof pickupLocationSchema>;

export const pickupLocationInitialValues: PickupLocationFormValues = {
  nickname: '',
  contact_name: '',
  phone: '',
  email: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  is_default: false,
};

export function toFormValues(location: any): PickupLocationFormValues {
  if (!location) return pickupLocationInitialValues;
  return {
    nickname: location.nickname ?? '',
    contact_name: location.contact_name ?? '',
    phone: location.phone ?? '',
    email: location.email ?? '',
    address_line1: location.address_line1 ?? '',
    address_line2: location.address_line2 ?? '',
    city: location.city ?? '',
    state: location.state ?? '',
    pincode: location.pincode ?? '',
    country: location.country || 'India',
    is_default: location.is_default ?? false,
  };
}

export function toSubmitInput(
  values: PickupLocationFormValues,
  owner: { owner_kind: PickupOwnerKind; brand_id?: string | null },
) {
  return {
    owner_kind: owner.owner_kind,
    brand_id: owner.brand_id ?? null,
    ...values,
  };
}

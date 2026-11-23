import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { Translator } from '@duncit/app-settings';
import type { GiftCardDeliverySettings } from '../queries';

/** The server's bounds — the form says what the server would refuse, before it does. */
export const DELIVERY_LIMITS = {
  maxQuantity: 50,
  pickupMax: 120,
  weightKg: { min: 0.05, max: 50 },
  sideCm: { min: 0.5, max: 300 },
  heightCm: { min: 0.5, max: 120 },
} as const;

/** Numbers stay strings in the form, so an emptied field reads empty, not 0. */
export interface DeliverySettingsValues {
  max_quantity: string;
  physical_enabled: boolean;
  shipping_fee: string;
  pickup_location: string;
  parcel_weight_kg: string;
  parcel_length_cm: string;
  parcel_breadth_cm: string;
  parcel_height_cm: string;
}

export interface DeliverySettingsFormProps {
  settings: GiftCardDeliverySettings | null;
  busy: boolean;
  readOnly?: boolean;
  onSubmit: (input: GiftCardDeliverySettings) => Promise<void> | void;
}

const between = (v: string, min: number, max: number) => {
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) && n >= min && n <= max;
};

const measure = (t: Translator['t'], range: { min: number; max: number }) =>
  z.string().refine((v) => between(v, range.min, range.max), {
    message: t('loyalty.giftSettings.measureInvalid', { vars: { min: range.min, max: range.max } }),
  });

export const makeDeliverySettingsSchema = (t: Translator['t']) =>
  z
    .object({
      max_quantity: z
        .string()
        .trim()
        .regex(DIGITS, t('loyalty.giftSettings.maxQuantityInvalid', { vars: { max: DELIVERY_LIMITS.maxQuantity } }))
        .refine((v) => Number(v) >= 1 && Number(v) <= DELIVERY_LIMITS.maxQuantity, {
          message: t('loyalty.giftSettings.maxQuantityInvalid', { vars: { max: DELIVERY_LIMITS.maxQuantity } }),
        }),
      physical_enabled: z.boolean(),
      shipping_fee: z.string().refine((v) => between(v, 0, 100_000), { message: t('loyalty.giftSettings.feeInvalid') }),
      pickup_location: z
        .string()
        .trim()
        .max(DELIVERY_LIMITS.pickupMax, t('loyalty.giftSettings.pickupMax', { vars: { max: DELIVERY_LIMITS.pickupMax } })),
      parcel_weight_kg: measure(t, DELIVERY_LIMITS.weightKg),
      parcel_length_cm: measure(t, DELIVERY_LIMITS.sideCm),
      parcel_breadth_cm: measure(t, DELIVERY_LIMITS.sideCm),
      parcel_height_cm: measure(t, DELIVERY_LIMITS.heightCm),
    })
    // Delivery is never free: printed cards cannot be switched on without a fee.
    // Only once the fee is a valid number — a blank or negative one already says so on its own.
    .refine((v) => !v.physical_enabled || !between(v.shipping_fee, 0, 100_000) || Number(v.shipping_fee) > 0, {
      path: ['shipping_fee'],
      message: t('loyalty.giftSettings.feeRequired'),
    });

export const BLANK_DELIVERY_SETTINGS: DeliverySettingsValues = {
  max_quantity: '',
  physical_enabled: false,
  shipping_fee: '',
  pickup_location: '',
  parcel_weight_kg: '',
  parcel_length_cm: '',
  parcel_breadth_cm: '',
  parcel_height_cm: '',
};

export function toDeliveryValues(s: GiftCardDeliverySettings | null): DeliverySettingsValues {
  if (!s) return BLANK_DELIVERY_SETTINGS;
  return {
    max_quantity: String(s.max_quantity),
    physical_enabled: s.physical_enabled,
    shipping_fee: String(s.shipping_fee),
    pickup_location: s.pickup_location,
    parcel_weight_kg: String(s.parcel_weight_kg),
    parcel_length_cm: String(s.parcel_length_cm),
    parcel_breadth_cm: String(s.parcel_breadth_cm),
    parcel_height_cm: String(s.parcel_height_cm),
  };
}

export function toDeliveryInput(v: DeliverySettingsValues): GiftCardDeliverySettings {
  return {
    max_quantity: Number.parseInt(v.max_quantity, 10),
    physical_enabled: v.physical_enabled,
    shipping_fee: Number(v.shipping_fee),
    pickup_location: v.pickup_location.trim(),
    parcel_weight_kg: Number(v.parcel_weight_kg),
    parcel_length_cm: Number(v.parcel_length_cm),
    parcel_breadth_cm: Number(v.parcel_breadth_cm),
    parcel_height_cm: Number(v.parcel_height_cm),
  };
}

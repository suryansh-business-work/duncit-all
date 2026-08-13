import { z } from 'zod';
import type { WaPricing } from '../../queries';

/**
 * The rate card: what one WhatsApp message costs, by the category Meta bills
 * on. Rates are typed as text so a half-typed "0." is not silently read as
 * zero, and validated as money on the way out.
 */

const rate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} rate is required`)
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
      message: `${label} rate must be zero or more`,
    });

export const waPricingSchema = z.object({
  marketing_per_msg: rate('Marketing'),
  utility_per_msg: rate('Utility'),
  authentication_per_msg: rate('Authentication'),
  service_per_msg: rate('Service'),
  currency_symbol: z
    .string()
    .trim()
    .min(1, 'Currency symbol is required')
    .max(4, 'Keep the symbol to 4 characters'),
});

export type WaPricingValues = z.infer<typeof waPricingSchema>;

export interface WaPricingFormProps {
  initialValues: WaPricingValues;
  busy: boolean;
  onSubmit: (values: WaPricingValues) => void;
}

export const fromWaPricing = (pricing: WaPricing): WaPricingValues => ({
  marketing_per_msg: String(pricing.marketing_per_msg),
  utility_per_msg: String(pricing.utility_per_msg),
  authentication_per_msg: String(pricing.authentication_per_msg),
  service_per_msg: String(pricing.service_per_msg),
  currency_symbol: pricing.currency_symbol,
});

export const toUpdateWaPricingInput = (values: WaPricingValues) => ({
  marketing_per_msg: Number(values.marketing_per_msg),
  utility_per_msg: Number(values.utility_per_msg),
  authentication_per_msg: Number(values.authentication_per_msg),
  service_per_msg: Number(values.service_per_msg),
  currency_symbol: values.currency_symbol.trim(),
});

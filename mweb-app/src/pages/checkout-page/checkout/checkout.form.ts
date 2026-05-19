import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';
import type { CheckoutForm } from '../queries';

export const CHECKOUT_PAYMENT_METHODS = [
  { value: 'GOOGLE_PAY', label: 'Google Pay' },
  { value: 'APPLE_PAY', label: 'Apple Pay' },
  { value: 'DUMMY_UPI', label: 'UPI (Dummy)' },
  { value: 'DUMMY_CARD', label: 'Credit / Debit Card (Dummy)' },
  { value: 'DUMMY_NETBANKING', label: 'Net Banking (Dummy)' },
] as const;

export const checkoutInitialValues: CheckoutForm = {
  email: '',
  phone_extension: '+91',
  phone_number: '',
  billing_address: '',
  method: 'DUMMY_UPI',
  simulate_failure: false,
};

export const checkoutFormSchema: yup.ObjectSchema<CheckoutForm> = yup.object({
  email: validationRules.email('Email'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  phone_number: validationRules.phoneNumber('Phone'),
  billing_address: validationRules.requiredText('Billing address', 8, 500),
  method: yup
    .string()
    .oneOf(CHECKOUT_PAYMENT_METHODS.map((method) => method.value), 'Select a valid payment method')
    .required('Payment method is required'),
  simulate_failure: yup.boolean().required(),
});

export function toCheckoutContact(values: CheckoutForm) {
  const cast = checkoutFormSchema.cast(values, { stripUnknown: true });
  return {
    contact_email: cast.email,
    contact_phone_extension: cast.phone_extension,
    contact_phone_number: cast.phone_number,
    billing_address: cast.billing_address,
    simulate_failure: cast.simulate_failure,
  };
}

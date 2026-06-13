import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';
import type { CheckoutForm } from '../queries';

export const checkoutInitialValues: CheckoutForm = {
  email: '',
  phone_extension: '+91',
  phone_number: '',
  billing_address: '',
  simulate_failure: false,
};

export const checkoutFormSchema: yup.ObjectSchema<CheckoutForm> = yup.object({
  email: validationRules.email('Email'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  phone_number: validationRules.phoneNumber('Phone'),
  billing_address: validationRules.requiredText('Billing address', 8, 500),
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

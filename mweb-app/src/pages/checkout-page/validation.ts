import * as yup from 'yup';

export const checkoutFormSchema = yup.object({
  email: yup.string().trim().email('Enter a valid email').required('Email is required'),
  phone: yup.string().trim().min(6, 'Phone is too short').max(32).required('Phone is required'),
  billing_address: yup.string().trim().min(8, 'Address is too short').max(500).required('Address is required'),
  method: yup.string().trim().required('Payment method is required'),
  simulate_failure: yup.boolean().required(),
});

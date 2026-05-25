import * as yup from 'yup';

const numeric = (label: string) =>
  yup.string().trim().matches(/^\d*$/, `${label} must be a whole number`);

const contactSchema = yup.object({
  name: yup.string().trim().max(80, 'Name is too long'),
  role: yup.string().trim().max(80, 'Role is too long'),
  mobile_number: yup.string().trim().matches(/^[0-9+\-\s]{0,20}$/, 'Enter a valid mobile number'),
  whatsapp_number: yup.string().trim().matches(/^[0-9+\-\s]{0,20}$/, 'Enter a valid WhatsApp number'),
  email: yup.string().trim().email('Enter a valid email'),
});

export const venueLeadSchema = yup.object({
  venue_name: yup.string().trim().min(2, 'Venue name is too short').max(120).required('Venue name is required'),
  venue_types: yup.array().of(yup.string()).min(1, 'Select at least one venue type'),
  city: yup.string().trim().required('City is required'),
  full_address: yup.string().trim().min(5, 'Address is too short').required('Full address is required'),
  capacity_min: numeric('Minimum capacity'),
  capacity_max: numeric('Maximum capacity'),
  expected_charges: numeric('Expected charges'),
  security_deposit: numeric('Security deposit'),
  map_link: yup.string().trim().max(2048),
  contacts: yup
    .array()
    .of(contactSchema)
    .min(1, 'Add at least one contact')
    .test('primary-mobile', 'Primary contact mobile number is required', (arr) => !!arr?.[0]?.mobile_number?.trim()),
  lead_status: yup.string().required('Lead status is required'),
  priority: yup.string().required('Priority is required'),
});

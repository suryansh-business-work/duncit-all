import * as yup from 'yup';
import type { VenueStep1, VenueStep2, VenueStep3 } from './types';

const pin = /^[0-9A-Za-z -]{3,12}$/;

const step1Schema = yup.object({
  venue_name: yup.string().trim().required('Venue name is required'),
  venue_type: yup.string().trim().required('Venue type is required'),
  capacity: yup.number().min(1, 'Capacity must be at least 1').required('Capacity is required'),
  location_id: yup.string().trim().required('Select a city from available locations'),
  country_code: yup.string().trim().required('Country is required'),
  state: yup.string().trim().required('State is required'),
  city: yup.string().trim().required('City is required'),
  locality: yup.string().trim().required('Locality / area is required'),
  postal_code: yup.string().trim().matches(pin, 'Enter a valid PIN code').required('PIN code is required'),
  address_line1: yup.string().trim().required('Address line 1 is required'),
});

const step2Schema = yup.object({
  documents: yup
    .array()
    .of(yup.object({ type: yup.string().required(), url: yup.string().trim().required() }))
    .test('has-doc', 'Upload at least one document', (docs) => (docs ?? []).some((doc) => doc.type && doc.url)),
  gstin: yup.string().trim().max(30),
  pan: yup.string().trim().max(20),
});

const step3Schema = yup.object({
  owner_name: yup.string().trim().required('Owner name is required'),
  owner_email: yup.string().trim().email('Enter a valid owner email').required('Owner email is required'),
  owner_phone: yup.string().trim().required('Owner phone is required'),
  owner_dob: yup.string().nullable(),
  owner_address: yup.string().trim().max(500),
});

export async function validateStep(
  step: number,
  step1: VenueStep1,
  step2: VenueStep2,
  step3: VenueStep3
) {
  try {
    if (step === 0) await step1Schema.validate(step1, { abortEarly: false });
    if (step === 1) await step2Schema.validate(step2, { abortEarly: false });
    if (step === 2) await step3Schema.validate(step3, { abortEarly: false });
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) return error.errors[0] ?? 'Check required fields';
    return 'Check required fields';
  }
}
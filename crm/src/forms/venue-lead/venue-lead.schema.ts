import * as yup from 'yup';

const numeric = (label: string) =>
  yup.string().trim().matches(/^\d*$/, `${label} must be a whole number`);

const phone = yup.string().trim().matches(/^[0-9+\-\s]{0,20}$/, 'Enter a valid number');

/**
 * Mark name + mobile required only for the primary contact (index 0).
 * Yup runs `of(contactSchema)` per element so we need an outer `.test`
 * to surface the row-level requirement next to the field path Formik
 * uses (`contacts[0].mobile_number`). Returning a ValidationError with
 * `path` ensures the inline error appears under the field.
 */
const contactSchema = yup.object({
  name: yup.string().trim().max(80, 'Name is too long'),
  role: yup.string().trim().max(80, 'Role is too long'),
  mobile_number: phone,
  whatsapp_number: phone,
  email: yup.string().trim().email('Enter a valid email'),
});

const contactsSchema = yup
  .array()
  .of(contactSchema)
  .min(1, 'Add at least one contact')
  .test('primary-required', 'Primary contact details required', function (arr) {
    const ctx = this;
    const primary = arr?.[0];
    const errors: yup.ValidationError[] = [];
    if (!primary?.name?.trim()) {
      errors.push(ctx.createError({ path: 'contacts[0].name', message: 'Primary contact name is required' }));
    }
    if (!primary?.mobile_number?.trim()) {
      errors.push(ctx.createError({ path: 'contacts[0].mobile_number', message: 'Primary contact mobile is required' }));
    }
    if (errors.length) return new yup.ValidationError(errors);
    return true;
  });

const urlish = (label: string) =>
  yup
    .string()
    .trim()
    .max(2048, `${label} is too long`)
    .test('url-shape', `Enter a valid ${label.toLowerCase()}`, (value) => {
      if (!value) return true;
      return /^(https?:\/\/|www\.)/i.test(value);
    });

// A "service" row is valid when the catalogue value is picked; when "Other"
// is picked, a custom_name is required so the row has a meaningful label.
const serviceOfferedSchema = yup.object({
  service: yup.string().trim().required('Pick a service'),
  custom_name: yup.string().trim().when('service', {
    is: 'Other',
    then: (s) => s.required('Enter a custom service name').max(80, 'Name is too long'),
    otherwise: (s) => s.max(80, 'Name is too long'),
  }),
  description: yup.string().trim().max(500, 'Description is too long'),
});

export const venueLeadSchema = yup.object({
  super_category_id: yup.string().trim().required('Super category is required'),
  venue_name: yup.string().trim().min(2, 'Venue name is too short').max(120).required('Venue name is required'),
  venue_types: yup.array().of(yup.string()).min(1, 'Select at least one venue type'),
  city: yup.string().trim().required('City is required'),
  full_address: yup.string().trim().min(5, 'Address is too short').required('Full address is required'),
  capacity_min: numeric('Minimum capacity'),
  capacity_max: numeric('Maximum capacity'),
  expected_charges: numeric('Expected charges'),
  security_deposit: numeric('Security deposit'),
  map_link: yup.string().trim().max(2048),
  website: urlish('Website'),
  services_offered: yup.array().of(serviceOfferedSchema),
  contacts: contactsSchema,
  lead_status: yup.string().required('Lead status is required'),
  priority: yup.string().required('Priority is required'),
});

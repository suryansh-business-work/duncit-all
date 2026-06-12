import * as yup from 'yup';

const phone = yup.string().trim().matches(/^[0-9+\-\s]{0,20}$/, 'Enter a valid number');

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

const serviceOfferedSchema = yup.object({
  service: yup.string().trim().required('Pick a service'),
  custom_name: yup.string().trim().when('service', {
    is: 'Other',
    then: (s) => s.required('Enter a custom service name').max(80, 'Name is too long'),
    otherwise: (s) => s.max(80, 'Name is too long'),
  }),
  description: yup.string().trim().max(500, 'Description is too long'),
});

export const ecommLeadSchema = yup.object({
  super_category_id: yup.string().trim().required('Super category is required'),
  seller_name: yup.string().trim().min(2, 'Seller name is too short').max(120).required('Seller name is required'),
  brand_name: yup.string().trim().max(120, 'Brand name is too long'),
  gst_number: yup.string().trim().max(20, 'GST number is too long'),
  website: urlish('Website'),
  instagram_link: yup.string().trim().max(2048),
  services_offered: yup.array().of(serviceOfferedSchema),
  contacts: contactsSchema,
  lead_status: yup.string().required('Lead status is required'),
  priority: yup.string().required('Priority is required'),
});

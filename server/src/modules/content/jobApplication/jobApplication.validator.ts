import * as yup from 'yup';

const urlOrEmpty = yup
  .string()
  .trim()
  .max(1000)
  .test('url-or-empty', 'Must be an http(s) link', (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  });

export const jobApplicationInputSchema = yup.object({
  role_content_id: yup.string().trim().nullable().default(null),
  role_title: yup.string().trim().required('Role is required').max(160),
  name: yup.string().trim().required('Name is required').min(2).max(120),
  email: yup.string().trim().lowercase().required('Email is required').email('Enter a valid email').max(254),
  phone: yup
    .string()
    .trim()
    .default('')
    .test('phone-or-empty', 'Phone must be digits with optional + prefix', (value) => !value || /^\+?\d{6,15}$/.test(value)),
  resume_url: urlOrEmpty.default(''),
  portfolio_url: urlOrEmpty.default(''),
  cover_note: yup.string().trim().max(4000).default(''),
});

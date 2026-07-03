import * as yup from 'yup';

const navUrl = yup
  .string()
  .trim()
  .required('URL is required')
  .max(1000)
  .test('nav-url', 'Must be an http(s) link, a site-relative path, mailto or tel', (value) => {
    if (!value) return false;
    if (value.startsWith('/')) return true;
    if (/^(mailto:|tel:)/i.test(value)) return true;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  });

export const websiteNavItemInputSchema = yup.object({
  site: yup.string().oneOf(['MAIN', 'PARTNERS', 'ADS', 'EARNWITH']).required(),
  area: yup.string().oneOf(['HEADER', 'FOOTER']).required(),
  group_label: yup.string().trim().max(60).default(''),
  label: yup.string().trim().required('Label is required').max(80),
  url: navUrl,
  sort_order: yup.number().integer().min(0).default(0),
  is_active: yup.boolean().default(true),
});

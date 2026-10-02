import { z } from 'zod';
import { bool, filled, finite, gte, int, maxLen, num, obj, shape, str, trim } from '@utils/zod-fields';

const isNavUrl = (value: string) => {
  if (!value) return false;
  if (value.startsWith('/')) return true;
  if (/^(mailto:|tel:)/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const navUrl = str(
  z
    .string()
    .check(filled('URL is required'), maxLen(1000))
    .refine(isNavUrl, 'Must be an http(s) link, a site-relative path, mailto or tel'),
  { required: 'URL is required', transforms: [trim] }
);

const SITES = ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH'] as const;
const AREAS = ['HEADER', 'FOOTER'] as const;

export const websiteNavItemInputSchema = obj(
  shape({
    site: str(z.enum(SITES), { oneOf: SITES, required: true }),
    area: str(z.enum(AREAS), { oneOf: AREAS, required: true }),
    group_label: str(z.string().check(maxLen(60)), { transforms: [trim], default: '' }),
    label: str(z.string().check(filled('Label is required'), maxLen(80)), {
      required: 'Label is required',
      transforms: [trim],
    }),
    url: navUrl,
    sort_order: num(finite().check(int(), gte(0)), { default: 0 }),
    is_active: bool(z.boolean(), { default: true }),
  })
);

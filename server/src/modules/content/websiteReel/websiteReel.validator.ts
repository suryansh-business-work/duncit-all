import { z } from 'zod';
import { bool, filled, finite, gte, int, maxLen, num, obj, shape, str, trim } from '@utils/zod-fields';

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const SITES = ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH'] as const;

export const websiteReelInputSchema = obj(
  shape({
    site: str(z.enum(SITES), { oneOf: SITES, required: true }),
    title: str(z.string().check(maxLen(80)), { transforms: [trim], default: '' }),
    description: str(z.string().check(maxLen(240)), { transforms: [trim], default: '' }),
    video_url: str(
      z
        .string()
        .check(filled('Upload a reel first'), maxLen(1000))
        .refine(isHttpsUrl, 'The reel must be an https link'),
      { required: 'Upload a reel first', transforms: [trim] }
    ),
    file_size_bytes: num(finite().check(int(), gte(0)), { default: 0 }),
    sort_order: num(finite().check(int(), gte(0)), { default: 0 }),
    is_active: bool(z.boolean(), { default: true }),
  })
);

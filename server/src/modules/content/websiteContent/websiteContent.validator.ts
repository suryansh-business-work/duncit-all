import { z } from 'zod';
import { bool, filled, finite, gte, int, maxLen, num, obj, shape, str, trim } from '@utils/zod-fields';
import { SOLUTION_AUDIENCES, WEBSITE_PAGE_TYPES } from './websiteContent.model';

const isLinkOrEmpty = (value: string) => {
  if (!value) return true;
  if (/^(mailto:|tel:)/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const urlOrEmpty = () =>
  str(z.string().refine(isLinkOrEmpty, 'Must be a URL, mailto, or tel link'), { transforms: [trim], default: '' });

const trimmedUpTo = (max: number) => str(z.string().check(maxLen(max)), { transforms: [trim], default: '' });


export const websiteContentInputSchema = obj(
  shape({
    type: str(z.enum(WEBSITE_PAGE_TYPES), { oneOf: WEBSITE_PAGE_TYPES, required: true }),
    title: str(z.string().check(filled('Title is required'), maxLen(160)), {
      required: 'Title is required',
      transforms: [trim],
    }),
    slug: str(z.string().check(maxLen(180)).optional(), { transforms: [trim] }),
    summary: trimmedUpTo(500),
    body: str(z.string(), { default: '' }),
    category: trimmedUpTo(80),
    image_url: urlOrEmpty(),
    cta_label: trimmedUpTo(60),
    cta_url: urlOrEmpty(),
    published_at: str(z.string().nullable(), { default: null }),
    is_published: bool(z.boolean(), { default: true }),
    sort_order: num(finite().check(int(), gte(0)), { default: 0 }),
    audience: str(z.enum(SOLUTION_AUDIENCES).nullable().optional()),
    coming_soon: bool(z.boolean(), { default: false }),
  }, {
    // A solution is listed under one audience and one category (its URL is
    // /solutions/<category>/<slug>); the other page types carry neither audience.
    tests: [
      { message: 'Choose who this solution is for', test: (v) => v.type !== 'SOLUTIONS' || Boolean(v.audience) },
      { message: 'A solution needs a category', test: (v) => v.type !== 'SOLUTIONS' || String(v.category ?? '').trim() !== '' },
      { message: 'Only a solution has an audience', test: (v) => v.type === 'SOLUTIONS' || !v.audience },
    ],
  })
);

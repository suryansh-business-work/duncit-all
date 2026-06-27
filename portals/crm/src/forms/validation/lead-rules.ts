import { z } from 'zod';

/** Whole-number-or-blank string field (e.g. capacity, community size). */
export const numeric = (label: string) =>
  z.string().trim().regex(/^\d*$/, `${label} must be a whole number`);

/** Lenient phone string (digits, +, -, spaces; up to 20 chars). */
export const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{0,20}$/, 'Enter a valid number');

/** Optional email — empty allowed, otherwise must be a valid email. */
const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email');

/** A single contact row. The primary-row requirements are enforced at the
 * array level so the error path matches the field (`contacts.0.*`). */
export const contactSchema = z.object({
  name: z.string().trim().max(80, 'Name is too long'),
  role: z.string().trim().max(80, 'Role is too long'),
  mobile_number: phone,
  whatsapp_number: phone,
  email: optionalEmail,
});

/** Contacts array: at least one row, with name + mobile required on row 0. */
export const contactsSchema = z
  .array(contactSchema)
  .min(1, 'Add at least one contact')
  .superRefine((arr, ctx) => {
    const primary = arr[0];
    if (!primary?.name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [0, 'name'], message: 'Primary contact name is required' });
    }
    if (!primary?.mobile_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [0, 'mobile_number'],
        message: 'Primary contact mobile is required',
      });
    }
  });

/** A URL-ish string: blank ok, otherwise must look like a URL. */
export const urlish = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, `${label} is too long`)
    .refine((v) => !v || /^(https?:\/\/|www\.)/i.test(v), `Enter a valid ${label.toLowerCase()}`);

/** A "service offered" row: catalogue value required; "Other" needs a custom name. */
export const serviceOfferedSchema = z
  .object({
    service: z.string().trim().min(1, 'Pick a service'),
    custom_name: z.string().trim().max(80, 'Name is too long'),
    description: z.string().trim().max(500, 'Description is too long'),
  })
  .superRefine((row, ctx) => {
    if (row.service === 'Other' && !row.custom_name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['custom_name'],
        message: 'Enter a custom service name',
      });
    }
  });

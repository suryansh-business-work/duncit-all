import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import { CONTACT_KEY_MIN_DIGITS, phoneKey } from '@duncit/utils';

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

/** A single contact row. Every field is optional, the primary row included. */
export const contactSchema = z.object({
  name: z.string().trim().max(80, 'Name is too long'),
  role: z.string().trim().max(80, 'Role is too long'),
  mobile_number: phone,
  whatsapp_number: phone,
  email: optionalEmail,
});

type ContactRow = z.infer<typeof contactSchema>;

/** A phone by its last ten digits, as the server's duplicate check compares it; '' below seven digits. */
const phoneRepeatKey = (value: string): string => {
  const key = phoneKey(value);
  return key.length >= CONTACT_KEY_MIN_DIGITS ? key : '';
};

/** Each contact field one lead may not repeat, how it is compared, and the message. */
const REPEAT_KEYS: ReadonlyArray<readonly [keyof ContactRow, (value: string) => string, string]> = [
  ['mobile_number', phoneRepeatKey, 'crm.duplicates.phoneRepeated'],
  ['email', (value) => value.trim().toLowerCase(), 'crm.duplicates.emailRepeated'],
];

/**
 * Contacts array (row 0 is the primary contact). No field is required, but one
 * lead cannot list the same phone or email on two contacts. The same value on
 * another lead is refused by the server's duplicate check on save.
 */
export const contactsSchemaFor = (t: Translate = fallbackT) =>
  z
    .array(contactSchema)
    .min(1, 'Add at least one contact')
    .superRefine((arr, ctx) => {
      for (const [field, keyOf, messageKey] of REPEAT_KEYS) {
        const seen = new Set<string>();
        arr.forEach((row, index) => {
          const key = keyOf(row[field]);
          if (!key) return;
          if (seen.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, field], message: t(messageKey) });
          seen.add(key);
        });
      }
    });

/** The contacts rules with English messages, for schemas built outside React. */
export const contactsSchema = contactsSchemaFor();

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

import { z } from 'zod';
import { AADHAR_PATTERN, PAN_PATTERN, zodRules } from '@duncit/forms';
import type { Translate } from '../../venues/editor/schema';

/**
 * The host record's validation (rule 30), as a factory over the surface's `t`
 * so its messages are copy rather than English baked into a module (rule 38) —
 * the same shape the venue editor's schema uses.
 *
 * The Aadhaar and PAN patterns come from `@duncit/forms`: they are the ones the
 * server validates against, and a second regex here would be a second answer to
 * "is this a valid PAN" (rule 40).
 */
const optional = (max: number) => z.string().trim().max(max).default('');

const bankSchema = z.object({
  payout_method: optional(30),
  account_holder_name: optional(120),
  account_number: optional(40),
  ifsc_code: optional(20),
  upi_id: optional(120),
});

/**
 * One Super → Category → Sub the host may run.
 *
 * A partial row is ALLOWED here, and that is deliberate. The server stores
 * partial triples — a host seeded from a meeting approved before the sub level
 * was captured has a Super and a Category and no Sub — so requiring all three
 * made an existing record unsaveable: Save blocked on a row the admin never
 * touched, pointing at a picker they would have to guess at.
 *
 * `valuesToHostCategories` drops an incomplete row from the payload instead,
 * because the server refuses a partial triple, and the section says so above the
 * list rather than letting it be a silent drop.
 */
const categorySchema = () =>
  z.object({
    super_id: z.string().trim().default(''),
    super_name: z.string().default(''),
    category_id: z.string().trim().default(''),
    category_name: z.string().default(''),
    sub_id: z.string().trim().default(''),
    sub_name: z.string().default(''),
  });

export function makeHostFormSchema(t: Translate) {
  const required = (field: string) =>
    t('directory.venueEditor.errRequired', { vars: { field } });

  return z.object({
    id: z.string().default(''),
    user_id: z.string().trim().min(1, t('directory.hostEditor.errPickAccount')),

    full_name: zodRules.personName(t('directory.hostEditor.fullName')),
    email: zodRules.email(t('directory.hostEditor.email')),
    phone: zodRules.phoneNumber(t('directory.hostEditor.phone')),
    dob: optional(30),

    aadhar_number: z
      .string()
      .trim()
      .default('')
      .refine(
        (value) => !value || AADHAR_PATTERN.test(value),
        t('directory.hostEditor.errAadhaar'),
      ),
    pan_number: z
      .string()
      .trim()
      .toUpperCase()
      .default('')
      .refine((value) => !value || PAN_PATTERN.test(value), t('directory.venueEditor.errPan')),
    passport_photo_url: optional(1000),
    police_verification_url: optional(1000),
    full_address: z
      .string()
      .trim()
      .min(1, required(t('directory.hostEditor.address')))
      .max(500),

    bank_account: bankSchema,
    tags: z.array(z.string().trim().max(40)).default([]),
    categories: z.array(categorySchema()).default([]),

    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
    is_active: z.boolean(),
    host_commission_pct: z.coerce
      .number({ error: t('directory.venueEditor.errNumber', { vars: { field: t('directory.hostEditor.colCommission') } }) })
      .min(0, t('directory.venueEditor.errMin', { vars: { field: t('directory.hostEditor.colCommission'), min: 0 } }))
      .max(100, t('directory.venueEditor.errMax', { vars: { field: t('directory.hostEditor.colCommission'), max: 100 } })),
  });
}

export type HostFormSchemaValues = z.infer<ReturnType<typeof makeHostFormSchema>>;

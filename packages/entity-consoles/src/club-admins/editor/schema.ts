import { z } from 'zod';
import { zodRules } from '@duncit/forms';
import type { Translate } from '../../venues/editor/schema';

/**
 * The Club Admin record's validation (rule 30), as a factory over the surface's
 * `t` so its messages are copy (rule 38) — the same shape the venue and host
 * editors use.
 *
 * The phone is OPTIONAL here, unlike a host's. A Club Admin record is drafted
 * from an approved onboarding meeting or from a role grant, and neither is
 * guaranteed to carry a number — requiring one would make an existing record
 * unsaveable over a value nobody ever asked its holder for.
 */
export function makeClubAdminFormSchema(t: Translate) {
  return z.object({
    id: z.string().default(''),
    user_id: z.string().trim().min(1, t('directory.clubAdminEditor.errPickAccount')),

    full_name: zodRules.personName(t('directory.hostEditor.fullName')),
    email: zodRules.email(t('directory.clubAdmins.email')),
    phone: zodRules.optionalPhoneNumber(t('directory.clubAdmins.phone')),
    category: z.object({
      super_id: z.string().default(''),
      super_name: z.string().default(''),
      category_id: z.string().default(''),
      category_name: z.string().default(''),
      sub_id: z.string().default(''),
      sub_name: z.string().default(''),
    }),

    status: z.enum(['DRAFT', 'APPROVED', 'REJECTED']),
    is_active: z.boolean(),
    commission_pct: z.coerce
      .number({
        error: t('directory.venueEditor.errNumber', {
          vars: { field: t('directory.clubAdmins.commission') },
        }),
      })
      .min(0, t('directory.venueEditor.errMin', { vars: { field: t('directory.clubAdmins.commission'), min: 0 } }))
      .max(100, t('directory.venueEditor.errMax', { vars: { field: t('directory.clubAdmins.commission'), max: 100 } })),

    club_ids: z.array(z.string().trim()).default([]),
  });
}

export type ClubAdminFormSchemaValues = z.infer<ReturnType<typeof makeClubAdminFormSchema>>;

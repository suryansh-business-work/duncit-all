import { z } from 'zod';

import type { Translate } from './translate';

/** The longest name the CRM keeps for a WhatsApp user lead. */
export const USER_LEAD_NAME_MAX = 120;

/**
 * A WhatsApp user lead added or edited by hand (CRM › User Leads): a phone
 * number with its country code, and an optional name. The server normalises
 * the number and refuses a duplicate, so the form only asks for a number that
 * has digits in it — the portal dialog's own check.
 */
export const makeUserLeadSchema = (t: Translate) =>
  z.object({
    phone: z
      .string()
      .trim()
      .refine((value) => [...value].some((ch) => ch >= '0' && ch <= '9'), t('crm.userLeads.phoneRequired')),
    name: z.string().trim().max(USER_LEAD_NAME_MAX, t('crm.userLeads.nameTooLong')),
  });

export type UserLeadValues = z.infer<ReturnType<typeof makeUserLeadSchema>>;

export const userLeadDefaults: UserLeadValues = { phone: '', name: '' };

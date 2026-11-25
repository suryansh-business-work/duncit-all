import { z } from 'zod';

import type { Translate } from './translate';

/**
 * One entry of a CRM managed list — CRM › Data › Venues › Amenities and Event
 * Suitability: a name (required, trimmed; the server refuses a blank or a
 * duplicate), its place in the list and whether lead forms offer it. A blank
 * place is the top of the list, as the CRM portal saves it. Shared by the CRM
 * portal and the Duncit CRM app.
 */
export const makeManagedOptionSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t('crm.data.optionNameRequired')),
    sort_order: z
      .number({ message: t('crm.data.optionOrderInvalid') })
      .int(t('crm.data.optionOrderInvalid'))
      .min(0, t('crm.data.optionOrderInvalid'))
      .nullable(),
    is_active: z.boolean(),
  });

export type ManagedOptionValues = z.infer<ReturnType<typeof makeManagedOptionSchema>>;

export const managedOptionDefaults: ManagedOptionValues = { name: '', sort_order: null, is_active: true };

/** The values as the create/update mutation takes them (a blank place saves as 0). */
export const toManagedOptionInput = (values: ManagedOptionValues) => ({
  name: values.name.trim(),
  sort_order: values.sort_order ?? 0,
  is_active: values.is_active,
});

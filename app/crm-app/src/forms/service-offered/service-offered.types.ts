import { z } from 'zod';
import {
  crmDefaultServiceTargets,
  crmHasAnyServiceTarget,
  crmPickServiceTargets,
  type CrmServiceTargetFlag,
  type CrmServiceTargets,
} from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/** The five lead-kind switches; `satisfies` keeps this in step with the shared list. */
const targetShape = {
  applies_to_venue: z.boolean(),
  applies_to_host: z.boolean(),
  applies_to_ecomm: z.boolean(),
  applies_to_creator: z.boolean(),
  applies_to_community: z.boolean(),
} satisfies Record<CrmServiceTargetFlag, z.ZodBoolean>;

/** At least one lead form must offer the service — the portal's "Turn on at least one lead type". */
const hasTarget = (values: CrmServiceTargets) =>
  crmHasAnyServiceTarget(crmPickServiceTargets(values));
const targetRule = (t: Translate) => ({
  message: t('crm.data.turnOnAtLeastOneLeadType'),
  path: ['applies_to_venue'],
});

/**
 * Add Service Offered, as the portal's dialog allows it: a super category
 * (category and sub-category optional), one or more titles and at least one
 * lead type. The server trims, de-duplicates and refuses a title already in
 * the same slot.
 */
export const makeAddServiceOfferedSchema = (t: Translate) =>
  z
    .object({
      super_category_id: z.string().min(1, t('crm.prospectLeads.superCategoryRequired')),
      category_id: z.string(),
      sub_category_id: z.string(),
      titles: z.array(z.string()).min(1, t('crmApp.servicesOffered.titlesRequired')),
      ...targetShape,
    })
    .refine(hasTarget, targetRule(t));

export type AddServiceOfferedValues = z.infer<ReturnType<typeof makeAddServiceOfferedSchema>>;

/** A new service starts on for venue and host, the kinds that predate the flags. */
export const addServiceOfferedDefaults = (): AddServiceOfferedValues => ({
  super_category_id: '',
  category_id: '',
  sub_category_id: '',
  titles: [],
  ...crmDefaultServiceTargets(),
});

/** The values as createCrmServicesOffered takes them: an unpicked level is null. */
export const toCreateServicesInput = (values: AddServiceOfferedValues) => ({
  super_category_id: values.super_category_id,
  category_id: values.category_id || null,
  sub_category_id: values.sub_category_id || null,
  ...crmPickServiceTargets(values),
  titles: values.titles,
});

/** Edit Service Offered: its title (required), active and lead types — its slot stays fixed. */
export const makeEditServiceOfferedSchema = (t: Translate) =>
  z
    .object({
      title: z.string().trim().min(1, t('crm.components.titleIsRequired')),
      is_active: z.boolean(),
      ...targetShape,
    })
    .refine(hasTarget, targetRule(t));

export type EditServiceOfferedValues = z.infer<ReturnType<typeof makeEditServiceOfferedSchema>>;

/** The values as updateCrmServiceOffered takes them. */
export const toUpdateServiceInput = (values: EditServiceOfferedValues) => ({
  title: values.title.trim(),
  is_active: values.is_active,
  ...crmPickServiceTargets(values),
});

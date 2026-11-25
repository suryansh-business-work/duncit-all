import { z } from 'zod';

import type { Translate } from '@/i18n/fallback';
import {
  EMPTY_LEAD_FILTERS,
  type LeadListFilters,
  type LeadListSort,
} from '@/features/leads-list/listQuery';

/** The Lead Quality Score's scale, as the portal's Quality Score range filter takes it. */
export const SCORE_RANGE = { min: 0, max: 100 } as const;

/** A listing's filters and order, as the phone's Filters sheet edits them. */
export interface LeadListFilterValues extends LeadListFilters {
  sortField: string;
  sortDir: LeadListSort['dir'];
}

const strings = z.array(z.string());

/** Each range's low end must not pass its high end. */
const ordered = (low: number | Date | null, high: number | Date | null) =>
  low === null || high === null || Number(low) <= Number(high);

/**
 * The Filters sheet's rules: a score from 0 to 100, a distance above 0, and
 * every range the right way round — what the server's table filters accept.
 */
export const makeLeadListFiltersSchema = (t: Translate) => {
  const scoreMessage = t('crmApp.leadList.scoreRange', { vars: SCORE_RANGE });
  const score = z
    .number({ message: scoreMessage })
    .min(SCORE_RANGE.min, scoreMessage)
    .max(SCORE_RANGE.max, scoreMessage)
    .nullable();
  const order = t('crmApp.leadList.rangeOrder');
  return z
    .object({
      statuses: strings,
      priorities: strings,
      assignees: strings,
      superCategories: strings,
      platforms: strings,
      qualifications: strings,
      verifications: strings,
      city: z.string(),
      extra: z.string(),
      scoreMin: score,
      scoreMax: score,
      followUpFrom: z.date().nullable(),
      followUpTo: z.date().nullable(),
      createdFrom: z.date().nullable(),
      createdTo: z.date().nullable(),
      distanceMax: z
        .number({ message: t('crmApp.leadList.distanceInvalid') })
        .positive(t('crmApp.leadList.distanceInvalid'))
        .nullable(),
      sortField: z.string().min(1),
      sortDir: z.enum(['asc', 'desc']),
    })
    .refine((v) => ordered(v.scoreMin, v.scoreMax), { path: ['scoreMax'], message: order })
    .refine((v) => ordered(v.followUpFrom, v.followUpTo), { path: ['followUpTo'], message: order })
    .refine((v) => ordered(v.createdFrom, v.createdTo), { path: ['createdTo'], message: order });
};

export const toFilterValues = (
  filters: LeadListFilters,
  sort: LeadListSort,
): LeadListFilterValues => ({
  ...filters,
  sortField: sort.field,
  sortDir: sort.dir,
});

/** The sheet's values back as the listing's filters and order. */
export function fromFilterValues(values: LeadListFilterValues): {
  filters: LeadListFilters;
  sort: LeadListSort;
} {
  const { sortField, sortDir, ...filters } = values;
  return {
    filters: { ...EMPTY_LEAD_FILTERS, ...filters },
    sort: { field: sortField, dir: sortDir },
  };
}

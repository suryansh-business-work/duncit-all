import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmPickServiceTargets, type CrmServiceTargets } from '@duncit/utils';

import type { CrmAppServicesOfferedTableDocument } from '@/graphql/servicesOffered';

/** One row of the Services Offered list, as the server pages it. */
export type ServiceOfferedRow = ResultOf<
  typeof CrmAppServicesOfferedTableDocument
>['crmServicesOfferedTable']['rows'][number];

/**
 * What the edit screen changes — handed over from the list, as the portal's
 * edit dialog takes its row (the API has no single-service read).
 */
export type EditableService = { id: string; title: string; is_active: boolean } & CrmServiceTargets;

export const toEditableService = (row: ServiceOfferedRow): EditableService => ({
  id: row.id,
  title: row.title,
  is_active: row.is_active,
  ...crmPickServiceTargets(row),
});

/** The columns the portal's table sorts by (the server's allowlist). */
export type ServiceSortField = 'sort_order' | 'title' | 'is_active' | 'created_at';
export interface ServiceSort {
  by: ServiceSortField;
  dir: 'asc' | 'desc';
}

/** The portal table's own order: by place in the list, then by title. */
export const DEFAULT_SERVICE_SORT: ServiceSort = { by: 'sort_order', dir: 'asc' };

/** Each sortable column with its heading (literal keys, so the localization gate sees them). */
export const SERVICE_SORT_FIELDS: readonly { field: ServiceSortField; labelKey: string }[] = [
  { field: 'sort_order', labelKey: 'shell.common.order' },
  { field: 'title', labelKey: 'shell.common.title' },
  { field: 'is_active', labelKey: 'crm.common.active' },
  { field: 'created_at', labelKey: 'shell.common.created' },
];

/** Tapping the sorted column flips its direction; another column sorts ascending, as a table header does. */
export const nextServiceSort = (current: ServiceSort, field: ServiceSortField): ServiceSort => {
  if (current.by !== field) return { by: field, dir: 'asc' };
  return { by: field, dir: current.dir === 'asc' ? 'desc' : 'asc' };
};

/** The table query's sort; the default asks for the server's own order (place, then title). */
export const serviceSortQuery = (sort: ServiceSort) => ({
  sort_by:
    sort.by === DEFAULT_SERVICE_SORT.by && sort.dir === DEFAULT_SERVICE_SORT.dir ? null : sort.by,
  sort_dir: sort.dir,
});

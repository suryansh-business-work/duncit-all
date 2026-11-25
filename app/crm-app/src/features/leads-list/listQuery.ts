import { endOfDay, startOfDay } from 'date-fns';

import type { TableFilterInput, TableQueryInput, TableSortDir } from '@/generated/graphql/graphql';
import type { LeadListKind } from './listKinds';

/**
 * What a lead listing is filtered by — every filter the portal's lead table
 * offers on its columns, held as the phone's filter sheet edits them.
 */
export interface LeadListFilters {
  statuses: string[];
  priorities: string[];
  assignees: string[];
  superCategories: string[];
  /** Devices: the matched Duncit account uses any of these platforms. */
  platforms: string[];
  qualifications: string[];
  verifications: string[];
  city: string;
  /** The kind's extra column (host type, brand, platform, community type) contains this. */
  extra: string;
  scoreMin: number | null;
  scoreMax: number | null;
  followUpFrom: Date | null;
  followUpTo: Date | null;
  createdFrom: Date | null;
  createdTo: Date | null;
  /** Nearby only: no further than this many km. */
  distanceMax: number | null;
}

export interface LeadListSort {
  field: string;
  dir: TableSortDir;
}

export const EMPTY_LEAD_FILTERS: LeadListFilters = {
  statuses: [],
  priorities: [],
  assignees: [],
  superCategories: [],
  platforms: [],
  qualifications: [],
  verifications: [],
  city: '',
  extra: '',
  scoreMin: null,
  scoreMax: null,
  followUpFrom: null,
  followUpTo: null,
  createdFrom: null,
  createdTo: null,
  distanceMax: null,
};

/** The portal's default orders: next follow-up first, or nearest first while a nearby search is on. */
export const FOLLOW_UP_FIRST: LeadListSort = { field: 'next_follow_up_date', dir: 'asc' };
export const NEAREST_FIRST: LeadListSort = { field: 'distance_km', dir: 'asc' };

const inFilter = (field: string, values: string[]): TableFilterInput | null =>
  values.length > 0 ? { field, op: 'in', values } : null;

const containsFilter = (field: string | null, value: string): TableFilterInput | null =>
  field && value.trim() ? { field, op: 'contains', value: value.trim() } : null;

/** A min…max range as the table contract takes it; either end may be open. */
function rangeFilter(
  field: string,
  min: string | null,
  max: string | null,
): TableFilterInput | null {
  if (min && max) return { field, op: 'between', values: [min, max] };
  if (min) return { field, op: 'gte', value: min };
  if (max) return { field, op: 'lte', value: max };
  return null;
}

const numberText = (value: number | null) => (value == null ? null : String(value));

/** Whole days: from local midnight to the last millisecond of the "to" day, as the portal sends them. */
const dayRange = (field: string, from: Date | null, to: Date | null) =>
  rangeFilter(
    field,
    from ? startOfDay(from).toISOString() : null,
    to ? endOfDay(to).toISOString() : null,
  );

/** The `TableQueryInput.filters` a set of listing filters sends (only what is set). */
export function toTableFilters(
  filters: LeadListFilters,
  kind: LeadListKind,
  nearby: boolean,
): TableFilterInput[] {
  const all = [
    inFilter('lead_status', filters.statuses),
    inFilter('priority', filters.priorities),
    inFilter('assigned_to', filters.assignees),
    inFilter('super_category_id', filters.superCategories),
    kind.matchedUser ? inFilter('duncit_platforms', filters.platforms) : null,
    inFilter('quality_qualification', filters.qualifications),
    inFilter('quality_verification', filters.verifications),
    containsFilter('city', filters.city),
    containsFilter(kind.extraField, filters.extra),
    rangeFilter('quality_score', numberText(filters.scoreMin), numberText(filters.scoreMax)),
    dayRange('next_follow_up_date', filters.followUpFrom, filters.followUpTo),
    dayRange('created_at', filters.createdFrom, filters.createdTo),
    nearby ? rangeFilter('distance_km', null, numberText(filters.distanceMax)) : null,
  ];
  return all.filter((filter): filter is TableFilterInput => filter !== null);
}

/** How many filters are applied — the count on the listing's Filters button. */
export const activeFilterCount = (filters: LeadListFilters, kind: LeadListKind, nearby: boolean) =>
  toTableFilters(filters, kind, nearby).length;

/** The `query` variable of a `*LeadsTable` read for one page. */
export function toTableQuery(
  input: {
    search: string;
    filters: LeadListFilters;
    sort: LeadListSort;
    kind: LeadListKind;
    nearby: boolean;
  },
  page: number,
  pageSize: number,
): TableQueryInput {
  return {
    search: input.search.trim() || null,
    page,
    page_size: pageSize,
    sort_by: input.sort.field,
    sort_dir: input.sort.dir,
    filters: toTableFilters(input.filters, input.kind, input.nearby),
  };
}

/** One sortable field of a listing: its server name and the key of its label. */
export interface LeadSortField {
  field: string;
  labelKey: string;
}

/** The fields a listing sorts by — the portal table's sortable columns, as the server allowlists them. */
export function sortFieldsFor(kind: LeadListKind, nearby: boolean): LeadSortField[] {
  const fields: LeadSortField[] = [
    { field: 'next_follow_up_date', labelKey: 'crm.leadList.followUp' },
    { field: kind.nameField, labelKey: kind.copy.nameHeader },
    { field: 'created_at', labelKey: 'shell.common.created' },
    { field: 'quality_score', labelKey: 'crm.leadQuality.columnHeader' },
    { field: 'lead_status', labelKey: 'shell.common.status' },
    { field: 'priority', labelKey: 'crm.common.priority' },
    { field: 'city', labelKey: 'crm.common.city' },
    { field: 'email', labelKey: 'shell.common.email' },
    { field: 'assigned_to', labelKey: 'crm.forms.assignedTo' },
  ];
  if (kind.extraField && kind.copy.extraHeader) {
    fields.push({ field: kind.extraField, labelKey: kind.copy.extraHeader });
  }
  if (nearby) fields.unshift({ field: 'distance_km', labelKey: 'crm.nearby.distance' });
  return fields;
}

/** The order a read uses: nearest-first only means something while a nearby search is on. */
export function effectiveSort(sort: LeadListSort, nearby: boolean): LeadListSort {
  if (nearby || sort.field !== NEAREST_FIRST.field) return sort;
  return FOLLOW_UP_FIRST;
}

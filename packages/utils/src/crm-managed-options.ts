/**
 * CRM › Data › Venues: the Amenities and Event Suitability lists — their order,
 * search and the place a new entry takes. Shared by the CRM portal's managed
 * list and the Duncit CRM app's.
 */

export interface CrmManagedOptionLike {
  name: string;
  sort_order: number;
}

/** By place in the list, then by name. */
export const crmSortManagedOptions = <T extends CrmManagedOptionLike>(rows: readonly T[]): T[] =>
  rows.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

/** The entries whose name contains the search, case-insensitively; all of them for an empty search. */
export function crmFilterManagedOptions<T extends CrmManagedOptionLike>(rows: readonly T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows.slice();
}

/** A new entry goes after the last one (0 for an empty list). */
export const crmNextManagedOrder = (rows: readonly CrmManagedOptionLike[]): number =>
  rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;

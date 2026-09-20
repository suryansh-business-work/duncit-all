import type { AdminCategoryValue, CategoryDoc } from '@duncit/category';
import type { TableFilterValue } from '@duncit/table';

/** The club fields the All Pods filters read — a subset of the AllClubs query. */
export interface PodFilterClub {
  id: string;
  club_name: string;
  super_category_id?: string | null;
  category_id?: string | null;
  location_id?: string | null;
  locality?: string | null;
}

/** The location fields the club option label reads. */
export interface PodFilterLocation {
  id: string;
  city: string;
}

/**
 * A pod has no category of its own — it inherits its club's Super + Sub (a
 * club stores its Sub in `category_id`) — so a category filter on pods is a
 * club filter. The deepest level chosen decides:
 *  - Sub → clubs in that sub-category
 *  - Category → clubs whose sub-category sits under that middle category
 *  - Super → clubs under that super category
 * `null` when nothing is chosen, so the caller adds no club constraint at all.
 */
export function clubIdsInCategory(
  clubs: readonly PodFilterClub[],
  categories: readonly CategoryDoc[],
  value: AdminCategoryValue,
): string[] | null {
  if (value.sub_id) {
    return clubs.filter((c) => c.category_id === value.sub_id).map((c) => c.id);
  }
  if (value.category_id) {
    const subs = new Set(
      categories.filter((c) => c.level === 'SUB' && c.parent_id === value.category_id).map((c) => c.id),
    );
    return clubs.filter((c) => !!c.category_id && subs.has(c.category_id)).map((c) => c.id);
  }
  if (value.super_id) {
    return clubs.filter((c) => c.super_category_id === value.super_id).map((c) => c.id);
  }
  return null;
}

/**
 * The club ids the table may show once the Club select and the category scope
 * are combined. `null` = no constraint; `[]` = nothing can match, which the
 * caller must answer WITHOUT asking the server — the table engine drops an
 * `in` filter with no values instead of matching nothing.
 */
export function scopedClubIds(clubFilter: string, categoryClubIds: string[] | null): string[] | null {
  if (!clubFilter) return categoryClubIds;
  if (categoryClubIds === null || categoryClubIds.includes(clubFilter)) return [clubFilter];
  return [];
}

/** The table filter for a resolved club scope; none when there is no constraint. */
export function clubScopeFilter(ids: string[] | null): TableFilterValue[] | undefined {
  if (ids === null) return undefined;
  if (ids.length === 1) return [{ field: 'club_id', op: 'eq', value: ids[0] }];
  return [{ field: 'club_id', op: 'in', values: ids }];
}

/** "Gomti Nagar, Lucknow" — the club's locality inside its city; '' when it has no city. */
export function clubLocationLabel(club: PodFilterClub, locations: readonly PodFilterLocation[]): string {
  const city = locations.find((l) => l.id === club.location_id)?.city ?? '';
  if (!city) return '';
  return club.locality ? `${club.locality}, ${city}` : city;
}

import type { OccasionRegion, OccasionTheme } from '@duncit/gql-types';
import { REGIONS } from '../copy';

export type RegionFilter = OccasionRegion | 'ALL';

export interface ThemeFilters {
  search: string;
  region: RegionFilter;
  showArchived: boolean;
}

export interface ThemeGroup {
  region: OccasionRegion;
  looks: OccasionTheme[];
}

const matches = (look: OccasionTheme, query: string): boolean =>
  !query || `${look.name} ${look.description} ${look.key}`.toLowerCase().includes(query);

/**
 * The looks the filters keep, grouped by region in catalogue order (the
 * server already sends built-in festivals first). Empty groups are dropped.
 */
export function groupThemes(looks: readonly OccasionTheme[], filters: ThemeFilters): ThemeGroup[] {
  const query = filters.search.trim().toLowerCase();
  const kept = looks.filter(
    (look) =>
      (filters.showArchived || !look.is_archived) &&
      (filters.region === 'ALL' || look.region === filters.region) &&
      matches(look, query),
  );
  return REGIONS.map((region) => ({ region, looks: kept.filter((look) => look.region === region) })).filter(
    (group) => group.looks.length > 0,
  );
}

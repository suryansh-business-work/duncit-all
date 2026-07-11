import { useMemo } from 'react';
import { hasIssue } from '../utils/status';
import type { FilterState } from '../components/StatusFilters';
import type { ServiceGroup, SummaryResponse } from '../types';

/** Apply the search / group / status filters to the service catalog. */
export function useFilteredGroups(
  groups: ServiceGroup[] | null,
  summary: SummaryResponse | null,
  filters: FilterState
): ServiceGroup[] {
  return useMemo(() => {
    if (!groups) return [];
    const query = filters.query.trim().toLowerCase();
    return groups
      .filter((group) => filters.group === 'all' || group.title === filters.group)
      .map((group) => ({
        title: group.title,
        items: group.items.filter((service) => {
          if (query) {
            const haystack = `${service.name} ${service.description}`.toLowerCase();
            if (!haystack.includes(query)) return false;
          }
          if (filters.status !== 'all') {
            const state = summary?.services[service.key]?.state ?? 'operational';
            const issue = hasIssue(state);
            if (filters.status === 'issues' && !issue) return false;
            if (filters.status === 'operational' && issue) return false;
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, summary, filters]);
}

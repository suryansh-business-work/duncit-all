import { useCallback, useMemo, useState } from 'react';
import type { NearbyLeadsValues } from '@duncit/forms/schemas';
import { fireAndForget, logs } from '@duncit/logs';

import {
  fromFilterValues,
  toFilterValues,
  type LeadListFilterValues,
} from '@/forms/lead-list-filters';
import type { LeadKind } from '@/features/leads/leadKinds';
import type { Translate } from '@/i18n/fallback';
import { LEAD_LIST_KINDS } from './listKinds';
import {
  EMPTY_LEAD_FILTERS,
  FOLLOW_UP_FIRST,
  NEAREST_FIRST,
  activeFilterCount,
  effectiveSort,
  type LeadListFilters,
  type LeadListSort,
} from './listQuery';
import { useLeadList } from './useLeadList';
import { useNearbySearch } from './useNearbySearch';

/** "Within 5 km of you" / "Within 5 km of Bandra, Mumbai" — the portal's nearby chip. */
export function nearbyLabel(search: NearbyLeadsValues, t: Translate): string {
  const km = search.radius_km;
  if (search.source === 'me') return t('crm.nearby.chipMine', { vars: { km } });
  const place = search.area ? `${search.area}, ${search.city}` : search.city;
  return t('crm.nearby.chipPlace', { vars: { km, place } });
}

/**
 * Everything one kind's lead listing holds — search, filters, order and a
 * Nearby leads search — and the listing read they drive.
 */
export function useLeadListState(kind: LeadKind, t: Translate) {
  const definition = LEAD_LIST_KINDS[kind];
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<LeadListFilters>(EMPTY_LEAD_FILTERS);
  const [sort, setSort] = useState<LeadListSort>(FOLLOW_UP_FIRST);
  const nearby = useNearbySearch();
  const nearbyOn = Boolean(nearby.near);
  const list = useLeadList(
    { kind, search, filters, sort: effectiveSort(sort, nearbyOn), near: nearby.near },
    t('crmApp.common.loadFailed'),
  );
  const { start, clear } = nearby;
  const seq = list.summary.seq;

  const startNearby = useCallback(
    (values: NearbyLeadsValues) => {
      // A nearby search lists nearest first, as the portal's table does.
      setSort(NEAREST_FIRST);
      fireAndForget(start(values, seq), logs.mobileApp, 'crm-app/LeadList', 'nearby');
    },
    [start, seq],
  );
  const clearNearby = useCallback(() => {
    clear();
    setSort(FOLLOW_UP_FIRST);
    setFilters((current) => ({ ...current, distanceMax: null }));
  }, [clear]);
  const applyFilters = useCallback((values: LeadListFilterValues) => {
    const next = fromFilterValues(values);
    setFilters(next.filters);
    setSort(next.sort);
  }, []);
  const clearFilters = useCallback(() => {
    setFilters(EMPTY_LEAD_FILTERS);
    setSort(nearbyOn ? NEAREST_FIRST : FOLLOW_UP_FIRST);
  }, [nearbyOn]);

  const filterValues = useMemo(
    () => toFilterValues(filters, effectiveSort(sort, nearbyOn)),
    [filters, sort, nearbyOn],
  );

  return {
    definition,
    search,
    setSearch,
    list,
    nearbyOn,
    nearbySearch: nearby.search,
    nearbyLabel: nearby.near && nearby.search ? nearbyLabel(nearby.search, t) : null,
    scan: nearby.scanOf(list.summary, list.error, t),
    filterValues,
    filterCount: activeFilterCount(filters, definition, nearbyOn),
    startNearby,
    clearNearby,
    applyFilters,
    clearFilters,
  };
}

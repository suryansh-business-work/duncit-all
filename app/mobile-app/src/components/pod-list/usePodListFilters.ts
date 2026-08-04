import { useState } from 'react';

import { DEFAULT_HOME_FILTERS, activeFilterCount, type HomeFilters } from '@/utils/home-filters';

/**
 * Category + price/date/sort state for the full pod lists (Happening Nearby,
 * Previous Pods). The same shape Home keeps, so both screens hand it straight
 * to `useHomeFeed` and to the same filter sheet — no second filtering rule.
 */
export function usePodListFilters() {
  const [categoryId, setCategoryId] = useState('');
  const [filters, setFilters] = useState<HomeFilters>(DEFAULT_HOME_FILTERS);
  const [open, setOpen] = useState(false);

  const reset = () => {
    setFilters(DEFAULT_HOME_FILTERS);
    setCategoryId('');
  };

  return {
    categoryId,
    setCategoryId,
    filters,
    setFilters,
    open,
    setOpen,
    reset,
    count: activeFilterCount(filters, categoryId),
  };
}

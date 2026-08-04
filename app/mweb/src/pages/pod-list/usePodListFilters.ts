import { useState } from 'react';
import type { DateFilter, PriceFilter, SortBy } from '../home-page/queries';

/**
 * Category + price/date/sort state for the full pod lists (Happening nearby,
 * Previous Pods). The same shape Home keeps, so both pages hand it straight to
 * `useHomeData` and to the same FilterMenu — no second filtering rule.
 * Native twin: components/pod-list/usePodListFilters.
 */
export function usePodListFilters() {
  const [categoryId, setCategoryId] = useState('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('DATE_ASC');
  const [open, setOpen] = useState(false);

  return {
    categoryId,
    setCategoryId,
    priceFilter,
    setPriceFilter,
    dateFilter,
    setDateFilter,
    sortBy,
    setSortBy,
    open,
    setOpen,
  };
}

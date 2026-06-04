import { useEffect, useMemo } from 'react';

import { useSuperCategoryStore } from '@/stores/super-category.store';

/** Loads the super categories and exposes the selected slug + its id (for
 * filtering the feeds by the club's `super_category_id`). */
export function useSuperCategories() {
  const data = useSuperCategoryStore((s) => s.data);
  const isLoading = useSuperCategoryStore((s) => s.isLoading);
  const selectedSlug = useSuperCategoryStore((s) => s.selectedSlug);
  const select = useSuperCategoryStore((s) => s.select);
  const fetch = useSuperCategoryStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const superCats = useMemo(() => data?.categories ?? [], [data?.categories]);
  const selectedSuperId = useMemo(
    () => superCats.find((c) => c.slug === selectedSlug)?.id ?? null,
    [superCats, selectedSlug],
  );

  return { superCats, selectedSlug, selectedSuperId, isLoading, select };
}

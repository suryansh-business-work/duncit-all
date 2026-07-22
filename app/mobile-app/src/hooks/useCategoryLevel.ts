import { useEffect, useState } from 'react';

import { graphqlRequest } from '@/services/graphql.client';
import {
  CategoriesDocument,
  type CategoriesResult,
  type CategoryLevel,
  type CategoryOption,
} from '@/graphql/onboarding-survey';

/**
 * Active categories for one taxonomy level under a parent, sorted for display
 * (sort_order then name). Shared by the onboarding gate's CategoryPhase and the
 * pod-idea Super → Category → Sub cascade so the fetch/sort lives in one place.
 */
export function useCategoryLevel(level: CategoryLevel, parentId: string, enabled: boolean) {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      return;
    }
    let alive = true;
    graphqlRequest<CategoriesResult, { level: CategoryLevel; parent_id: string | null }>(
      CategoriesDocument,
      { level, parent_id: level === 'SUPER' ? null : parentId },
      { auth: true },
    )
      .then((r) => {
        if (!alive) return;
        setOptions(
          (r.categories ?? [])
            .filter((c) => c.is_active !== false)
            .sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
            ),
        );
      })
      .catch(() => alive && setOptions([]));
    return () => {
      alive = false;
    };
  }, [level, parentId, enabled]);
  return options;
}

import { useEffect, useMemo } from 'react';

import { useSurveyStore } from '@/stores/survey.store';

export interface SurveyCategory {
  id: string;
  name: string;
  icon?: string | null;
  parent_id?: string | null;
  is_active?: boolean;
}

/** Fetches the category tree + the user's existing picks (auth required). */
export function useSurveyData() {
  const data = useSurveyStore((s) => s.data);
  const isLoading = useSurveyStore((s) => s.isLoading);
  const error = useSurveyStore((s) => s.error);
  const fetch = useSurveyStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error };
}

export interface SurveyTree {
  supers: SurveyCategory[];
  childrenByParent: Map<string | null, SurveyCategory[]>;
  total: number;
  superIds: Set<string>;
}

/** Groups the flat category tree into super-categories + their children, and
 * counts the selectable leaves — identical logic to mWeb's SignupSurveyPage. */
export function useSurveyTree(tree: SurveyCategory[] | undefined): SurveyTree {
  return useMemo(() => {
    const map = new Map<string | null, SurveyCategory[]>();
    const active = (tree ?? []).filter((c) => c.is_active !== false);
    active.forEach((c) => {
      const key = c.parent_id ?? null;
      map.set(key, [...(map.get(key) ?? []), c]);
    });
    const supers = map.get(null) ?? [];
    return {
      supers,
      childrenByParent: map,
      total: active.length - supers.length,
      superIds: new Set(supers.map((s) => s.id)),
    };
  }, [tree]);
}

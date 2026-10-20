import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { EnvCategoryCounts } from '@duncit/gql-types';
import type { EnvCategoryDef } from '../queries';

/** The fixed sections beside the categories. Anything else in the URL is a category key. */
export const OVERVIEW = 'overview';
export const MAPPING = 'mapping';
export const SETTINGS = 'settings';
export const CONFIG_GROUP = 'CONFIGURATION';

const PARAM = 'section';

export interface SectionItem {
  value: string;
  label: string;
  description: string | null;
  counts: EnvCategoryCounts | null;
}

export interface SectionGroup {
  key: string;
  label: string;
  description: string | null;
  items: SectionItem[];
  total: number;
  failing: number;
}

const matches = (needle: string, ...haystack: (string | null | undefined)[]) =>
  haystack.some((text) => text?.toLowerCase().includes(needle));

/** Categories in their server-defined groups, narrowed by the search box. */
function buildGroups(
  categories: readonly EnvCategoryDef[],
  counts: ReadonlyMap<string, EnvCategoryCounts>,
  query: string
): SectionGroup[] {
  const needle = query.trim().toLowerCase();
  const groups = new Map<string, SectionGroup>();
  for (const def of categories) {
    const groupHit = matches(needle, def.groupLabel, def.groupDescription);
    if (needle && !groupHit && !matches(needle, def.label, def.category, def.description)) continue;
    const group = groups.get(def.groupKey) ?? {
      key: def.groupKey,
      label: def.groupLabel,
      description: def.groupDescription ?? null,
      items: [],
      total: 0,
      failing: 0,
    };
    const count = counts.get(def.category) ?? null;
    group.items.push({ value: def.category, label: def.label, description: def.description ?? null, counts: count });
    group.total += count?.total ?? 0;
    group.failing += count?.failing ?? 0;
    groups.set(def.groupKey, group);
  }
  return [...groups.values()];
}

/** Sidebar state: which section is open (in the URL), the search, and which groups are folded. */
export function useEnvSections(categories: readonly EnvCategoryDef[], counts: readonly EnvCategoryCounts[]) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const countMap = useMemo(() => new Map(counts.map((c) => [c.category as string, c])), [counts]);
  const groups = useMemo(() => buildGroups(categories, countMap, query), [categories, countMap, query]);
  const allKeys = useMemo(() => [...categories.map((c) => c.groupKey), CONFIG_GROUP], [categories]);

  const known = new Set<string>([OVERVIEW, MAPPING, SETTINGS, ...categories.map((c) => c.category)]);
  const requested = params.get(PARAM) ?? OVERVIEW;
  // A stale or mistyped link lands on the overview rather than on nothing.
  const selected = known.has(requested) || categories.length === 0 ? requested : OVERVIEW;

  const select = useCallback(
    (value: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(PARAM, value);
          return next;
        },
        { replace: false }
      ),
    [setParams]
  );

  const toggle = useCallback(
    (key: string) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    []
  );

  return {
    groups,
    selected,
    select,
    query,
    setQuery,
    // While searching, every group that still has a hit is open.
    isOpen: (key: string) => query.trim() !== '' || !collapsed.has(key),
    toggle,
    expandAll: () => setCollapsed(new Set()),
    collapseAll: () => setCollapsed(new Set(allKeys)),
    category: categories.find((c) => c.category === selected) ?? null,
    countOf: (category: string) => countMap.get(category) ?? null,
  };
}

import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { useRefreshRegistration } from '@/components/PullToRefresh';
import { CategoryTreeDocument } from '@/graphql/category-tree';
import { graphqlRequest } from '@/services/graphql.client';
import type { CategoryTreeItem } from '@/utils/category-tree';

type CategoryTreeNode = ResultOf<typeof CategoryTreeDocument>['categories'][number];

/**
 * The admin category tree, read once for a form that has to show a SAVED
 * category — the levels are derived from it rather than fetched one at a time,
 * because a record keeps only its Super and its Sub and the middle level has to
 * be recovered from the Sub's parent.
 *
 * Categories an admin has retired are dropped: they still tag existing records
 * but must not be offered as a new pick.
 */
export function useCategoryTree() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    graphqlRequest(CategoryTreeDocument, undefined, { auth: true })
      .then((result) => {
        if (!alive) return;
        setCategories(result.categories.filter((item: CategoryTreeNode) => item.is_active));
      })
      .catch(() => alive && setCategories([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [attempt]);

  useRefreshRegistration(refetch);
  return { categories, loading };
}

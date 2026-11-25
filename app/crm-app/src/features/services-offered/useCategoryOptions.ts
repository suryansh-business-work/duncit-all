import { useMemo } from 'react';
import type { VariablesOf } from '@graphql-typed-document-node/core';
import { crmSortManagedOptions } from '@duncit/utils';

import type { ChoiceOption } from '@/components/ChoiceField';
import { CrmAppCategoriesByParentDocument } from '@/graphql/servicesOffered';
import { useGqlQuery } from '@/hooks/useGqlQuery';

/** SUPER, CATEGORY or SUB — the taxonomy level the API reads. */
export type CategoryLevel = VariablesOf<typeof CrmAppCategoriesByParentDocument>['level'];

/**
 * Active categories at a level, scoped to a parent — one step of the cascading
 * Super → Category → Sub pickers, as the portal's useCategoriesByParent reads
 * them: by place, then by name. Below SUPER nothing is read until a parent is
 * chosen, so an unscoped list is never fetched.
 */
export function useCategoryOptions(level: CategoryLevel, parentId: string, fallbackError: string) {
  const skip = level !== 'SUPER' && !parentId;
  const query = useGqlQuery(
    CrmAppCategoriesByParentDocument,
    { level, parent_id: parentId || null },
    { skip, fallbackError },
  );
  const options: ChoiceOption[] = useMemo(
    () =>
      crmSortManagedOptions((query.data?.categories ?? []).filter((c) => c.is_active)).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [query.data],
  );
  return { options, loading: query.loading, error: query.error, refetch: query.refetch };
}

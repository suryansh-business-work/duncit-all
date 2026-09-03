import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import type { VariablesOf } from '@graphql-typed-document-node/core';

import {
  CreateSlotTemplateDocument,
  DeleteSlotTemplateDocument,
  MySlotTemplatesDocument,
} from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';

export type SlotTemplate = ResultOf<typeof MySlotTemplatesDocument>['mySlotTemplates'][number];
export type SlotTemplateInput = VariablesOf<typeof CreateSlotTemplateDocument>['input'];

/**
 * The owner's saved recurring-slot templates for one venue: the list, plus the
 * two writes the "Save as template" section fires. Both auto-extend (which
 * needs a default template to roll forward) and the template section read the
 * same list, so it is fetched once here rather than once per section.
 */
export function useSlotTemplates(venueId: string | null) {
  const [templates, setTemplates] = useState<SlotTemplate[]>([]);
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!venueId) return undefined;
    let active = true;
    graphqlRequest(MySlotTemplatesDocument, { venue_id: venueId }, { auth: true })
      .then((data) => active && setTemplates(data.mySlotTemplates))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [venueId, attempt]);

  const create = useCallback(
    async (input: SlotTemplateInput) => {
      await graphqlRequest(CreateSlotTemplateDocument, { input }, { auth: true });
      refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      await graphqlRequest(DeleteSlotTemplateDocument, { id }, { auth: true });
      refetch();
    },
    [refetch],
  );

  const hasDefault = templates.some((template) => template.is_default);

  return { templates, hasDefault, refetch, create, remove };
}

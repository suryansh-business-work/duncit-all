import { useEffect, useState } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  DUPLICATE_CHECK_DEBOUNCE_MS,
  duplicateCheckKey,
  type DuplicateCheckValues,
} from '@duncit/forms/schemas';
import { fireAndForget, logs } from '@duncit/logs';

import { CrmAppLeadDuplicatesDocument } from '@/graphql/leadEditor';
import type { LeadKind } from '@/features/leads/leadKinds';
import { gqlRequest } from '@/services/graphql.client';
import type { LeadFormValues } from './values';

export type DuplicateMatch = ResultOf<
  typeof CrmAppLeadDuplicatesDocument
>['crmLeadDuplicates'][number];

export interface DuplicateCheckState {
  matches: DuplicateMatch[];
  checking: boolean;
  failed: boolean;
}

const IDLE: DuplicateCheckState = { matches: [], checking: false, failed: false };

/**
 * The portal's live duplicate check: once typing pauses, ask which of the
 * typed phones, emails or website another lead (any kind) already has. The
 * lead being edited never matches itself. Only the latest answer is kept.
 */
export function useDuplicateCheck(
  kind: LeadKind,
  leadId: string | null,
  control: Control<LeadFormValues>,
): DuplicateCheckState {
  const contacts = useWatch({ control, name: 'contacts' });
  const website = useWatch({ control, name: 'website' as never });
  const key = duplicateCheckKey(contacts, website);
  const [state, setState] = useState<DuplicateCheckState>(IDLE);

  useEffect(() => {
    if (!key) {
      setState(IDLE);
      return undefined;
    }
    let current = true;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, checking: true, failed: false }));
      const input = {
        entity_type: kind,
        lead_id: leadId,
        ...(JSON.parse(key) as DuplicateCheckValues),
      };
      const run = gqlRequest(CrmAppLeadDuplicatesDocument, { input })
        .then((data) => {
          if (current)
            setState({ matches: data.crmLeadDuplicates, checking: false, failed: false });
        })
        .catch((error: unknown) => {
          // The server checks again on save, so a failed live check only warns.
          logs.mobileApp.warn('crm-app/leadEditor', 'duplicateCheck', {
            error,
            msg: 'Live duplicate check failed',
          });
          if (current) setState({ matches: [], checking: false, failed: true });
        });
      fireAndForget(run, logs.mobileApp, 'crm-app/leadEditor', 'duplicateCheck');
    }, DUPLICATE_CHECK_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [key, kind, leadId]);

  return state;
}

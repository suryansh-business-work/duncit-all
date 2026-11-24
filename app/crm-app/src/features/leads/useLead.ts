import { useMemo } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { CrmAppLeadDocument } from '@/graphql/leads';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { LEAD_QUERY_FIELD, leadQueryFlags, type LeadKind } from './leadKinds';

type LeadResult = ResultOf<typeof CrmAppLeadDocument>;
/** Any of the five kinds — each reads the same card fields, so every field below is common to all. */
export type Lead = NonNullable<LeadResult[keyof LeadResult]>;
export type LeadContact = Lead['contacts'][number];

/** One entry of a lead's timeline, as every kind returns it. */
export interface LeadActivity {
  id?: string | null;
  type: string;
  summary?: string | null;
  body_text?: string | null;
  created_at?: string | null;
  is_deleted: boolean;
}

/** The live notes on a lead's timeline (manual logs), newest first. */
export function notesOf(lead: { activity_log: readonly LeadActivity[] } | null): LeadActivity[] {
  return (lead?.activity_log ?? []).filter((a) => a.type === 'NOTE' && !a.is_deleted).reverse();
}

/** One lead's card, whatever its kind. */
export function useLead(kind: LeadKind, id: string, fallbackError: string) {
  const variables = useMemo(() => ({ id, ...leadQueryFlags(kind) }), [id, kind]);
  const query = useGqlQuery(CrmAppLeadDocument, variables, { fallbackError, skip: true });
  const lead: Lead | null = query.data?.[LEAD_QUERY_FIELD[kind]] ?? null;
  return { ...query, lead };
}

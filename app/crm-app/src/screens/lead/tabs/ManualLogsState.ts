import { useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmLogPeopleIds } from '@duncit/utils';

import {
  CrmAppAddManualLogDocument,
  CrmAppDeleteManualLogDocument,
  CrmAppLeadLogsDocument,
  CrmAppUpdateManualLogDocument,
  CrmAppUsersByIdsDocument,
} from '@/graphql/leadTabsB';
import { LEAD_QUERY_FIELD, type LeadKind } from '@/features/leads/leadKinds';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { manualLogHtml, type LogMention } from './ManualLogsHtml';
import { kindVars } from './parts/tabTypes';

type LogsResult = ResultOf<typeof CrmAppLeadLogsDocument>;
export type LogActivity = NonNullable<LogsResult['venue']>['activity_log'][number];
export type StaffUser = ResultOf<typeof CrmAppUsersByIdsDocument>['crmUsersByIds'][number];

export interface LogContent {
  summary: string;
  body: string;
  mentions: readonly LogMention[];
}

/**
 * A lead's timeline as the Manual Logs tab reads it (every log with its
 * author, edits, deletes and who may change it), the names behind those
 * user ids in one request, and create / edit / delete — each re-reads the
 * timeline, so the list and its history come straight from the server.
 */
export function useManualLogs(kind: LeadKind, id: string, onChanged: () => void) {
  const { t } = useTranslation();
  const fallbackError = t('crmApp.common.loadFailed');
  const variables = useMemo(() => kindVars(kind, id), [id, kind]);
  const query = useGqlQuery(CrmAppLeadLogsDocument, variables, { fallbackError });
  const activities: readonly LogActivity[] = useMemo(
    () => query.data?.[LEAD_QUERY_FIELD[kind]]?.activity_log ?? [],
    [query.data, kind],
  );
  const ids = useMemo(() => crmLogPeopleIds(activities), [activities]);
  const peopleVars = useMemo(() => ({ ids }), [ids]);
  const people = useGqlQuery(CrmAppUsersByIdsDocument, peopleVars, {
    skip: ids.length === 0,
    fallbackError,
  });
  const byId = useMemo(
    () => new Map((people.data?.crmUsersByIds ?? []).map((user) => [user.id, user])),
    [people.data],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const target = { entity_type: kind, entity_id: id };
  const content = ({ summary, body, mentions }: LogContent) => ({
    summary: summary.trim(),
    body_html: manualLogHtml(body, mentions),
    body_text: body.trim(),
  });
  const after = async () => {
    await query.refetch();
    onChanged();
  };
  const busy = async (flag: (v: boolean) => void, work: () => Promise<unknown>) => {
    flag(true);
    try {
      await work();
      await after();
    } finally {
      flag(false);
    }
  };

  return {
    activities,
    byId,
    loading: query.loading && !query.data,
    error: query.data ? null : query.error,
    refetch: query.refetch,
    saving,
    deleting,
    /** Rejects with the server's reason; the composer shows it. */
    create: (value: LogContent) =>
      busy(setSaving, () =>
        gqlRequest(CrmAppAddManualLogDocument, { input: { ...target, ...content(value) } }),
      ),
    update: (logId: string, value: LogContent) =>
      busy(setSaving, () =>
        gqlRequest(CrmAppUpdateManualLogDocument, {
          input: { ...target, log_id: logId, ...content(value) },
        }),
      ),
    remove: (logId: string) =>
      busy(setDeleting, () =>
        gqlRequest(CrmAppDeleteManualLogDocument, { ...target, log_id: logId }),
      ),
  };
}

import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmListedRefusals } from '@duncit/utils';
import type { LeadEvidenceDecision } from '@duncit/forms/schemas';

import type { LeadKind } from '@/features/leads/leadKinds';
import {
  CrmAppLeadQualityDocument,
  CrmAppRecalculateLeadQualityDocument,
  CrmAppRecordLeadEvidenceDocument,
} from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { ApiError, errorMessage } from '@/utils/errors';

export type QualityDetails = ResultOf<typeof CrmAppLeadQualityDocument>['crmLeadQuality'];
export type QualityResult = NonNullable<QualityDetails['result']>;
export type QualityCriterion = QualityResult['criteria'][number];
export type QualityItem = QualityCriterion['items'][number];
export type QualityEvidence = QualityDetails['evidence'][number];

/** A plain recalculation, or a reverify that also reruns the Instagram, Google Maps and website checks. */
export type RecalcMode = 'recalculate' | 'reverify';

/**
 * One lead's quality score and its actions — the portal's useLeadQualityDetails
 * and useLeadQualityActions. Each write answers with the lead's new details,
 * which replace the shown ones (no second request), and bumps `historyVersion`
 * so the history reads its new events.
 */
export function useLeadQuality(kind: LeadKind, id: string) {
  const { t } = useTranslation();
  const vars = { entity_type: kind, lead_id: id };
  const query = useGqlQuery(CrmAppLeadQualityDocument, vars, {
    fallbackError: t('crm.leadQualityTab.loadFailed'),
  });
  const [details, setDetails] = useState<QualityDetails | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [running, setRunning] = useState<RecalcMode | null>(null);
  const [recording, setRecording] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (query.data) setDetails(query.data.crmLeadQuality);
  }, [query.data]);

  const recalculate = useCallback(
    async (mode: RecalcMode) => {
      setError('');
      setNotice('');
      setRunning(mode);
      try {
        const data = await gqlRequest(CrmAppRecalculateLeadQualityDocument, {
          entity_type: kind,
          lead_id: id,
          external: mode === 'reverify',
        });
        setDetails(data.recalculateCrmLeadQuality.details);
        setSkipped(data.recalculateCrmLeadQuality.skipped_checks);
        setNotice(t('crm.leadQualityTab.recalculated'));
        setHistoryVersion((v) => v + 1);
      } catch (err) {
        setError(
          t('crm.leadQualityTab.actionFailed', {
            vars: { reason: errorMessage(err, t('crmApp.common.saveFailed')) },
          }),
        );
      } finally {
        setRunning(null);
      }
    },
    [kind, id, t],
  );

  /** Saves one decision; resolves with the server's refusals, empty when it was saved. */
  const record = useCallback(
    async (decision: LeadEvidenceDecision): Promise<string[]> => {
      setRecording(true);
      setNotice('');
      try {
        const data = await gqlRequest(CrmAppRecordLeadEvidenceDocument, {
          entity_type: kind,
          lead_id: id,
          decisions: [decision],
        });
        setDetails(data.recordCrmLeadEvidence.details);
        setSkipped(data.recordCrmLeadEvidence.skipped_checks);
        setNotice(t('crm.leadQualityTab.evidenceSaved'));
        setHistoryVersion((v) => v + 1);
        return [];
      } catch (err) {
        const listed = crmListedRefusals(err instanceof ApiError ? err.extensions : undefined);
        return listed ?? [errorMessage(err, t('crmApp.common.saveFailed'))];
      } finally {
        setRecording(false);
      }
    },
    [kind, id, t],
  );

  return {
    query,
    details,
    recalculate,
    record,
    running,
    recording,
    skipped,
    error,
    notice,
    historyVersion,
  };
}

export type LeadQualityState = ReturnType<typeof useLeadQuality>;

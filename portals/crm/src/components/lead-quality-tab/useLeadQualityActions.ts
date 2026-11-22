import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { ApolloCache } from '@apollo/client';
import type {
  CrmLeadEvidenceDecisionInput,
  MutationRecalculateCrmLeadQualityArgs,
  MutationRecordCrmLeadEvidenceArgs,
  QueryCrmLeadQualityArgs,
} from '@duncit/gql-types';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { LEAD_QUALITY, RECALCULATE_LEAD_QUALITY, RECORD_LEAD_EVIDENCE, type LeadQualityDetails } from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';
import { leadQualityVars, type LeadQualityData } from './useLeadQuality';
import { refusalMessages } from './qualityFormat';

interface ScoreResponse {
  skipped_checks: string[];
  details: LeadQualityDetails;
}

/** The history list refetches by name after every write, so it shows the new events. */
const HISTORY_QUERY = 'CrmLeadQualityHistory';

/** Which recalculation is running: a plain one, or a reverify that also calls Instagram, Maps and the website. */
export type RecalcMode = 'recalculate' | 'reverify';

/**
 * Recalculate, reverify and record evidence for one lead. Each write answers
 * with the lead's new details, which replace the cached ones the ring, the
 * breakdown and the qualification read — no second request.
 */
export function useLeadQualityActions(entity: CrmLeadEntityType, leadId: string) {
  const { t } = useTranslation();
  const variables = leadQualityVars(entity, leadId);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [running, setRunning] = useState<RecalcMode | null>(null);
  const writeDetails = (cache: ApolloCache, details: LeadQualityDetails | undefined) => {
    if (!details) return;
    cache.writeQuery<LeadQualityData, QueryCrmLeadQualityArgs>({ query: LEAD_QUALITY, variables, data: { crmLeadQuality: details } });
  };
  const [recalcMutation] = useMutation<{ recalculateCrmLeadQuality: ScoreResponse }, MutationRecalculateCrmLeadQualityArgs>(
    RECALCULATE_LEAD_QUALITY,
    {
      refetchQueries: [HISTORY_QUERY],
      update: (cache, { data }) => writeDetails(cache, data?.recalculateCrmLeadQuality.details),
    },
  );
  const [recordMutation, { loading: recording }] = useMutation<{ recordCrmLeadEvidence: ScoreResponse }, MutationRecordCrmLeadEvidenceArgs>(
    RECORD_LEAD_EVIDENCE,
    {
      refetchQueries: [HISTORY_QUERY],
      update: (cache, { data }) => writeDetails(cache, data?.recordCrmLeadEvidence.details),
    },
  );

  const recalculate = async (mode: RecalcMode): Promise<void> => {
    setError('');
    setRunning(mode);
    try {
      const { data } = await recalcMutation({ variables: { ...variables, external: mode === 'reverify' } });
      setSkipped(data?.recalculateCrmLeadQuality.skipped_checks ?? []);
      notifySuccess(t('crm.leadQualityTab.recalculated'));
    } catch (err) {
      setError(t('crm.leadQualityTab.actionFailed', { vars: { reason: parseApiError(err) } }));
    } finally {
      setRunning(null);
    }
  };

  /** Saves one decision; resolves with the server's refusals, empty when it was saved. */
  const record = async (decision: CrmLeadEvidenceDecisionInput): Promise<string[]> => {
    try {
      const { data } = await recordMutation({ variables: { ...variables, decisions: [decision] } });
      setSkipped(data?.recordCrmLeadEvidence.skipped_checks ?? []);
      notifySuccess(t('crm.leadQualityTab.evidenceSaved'));
      return [];
    } catch (err) {
      return refusalMessages(err);
    }
  };

  return { recalculate, running, record, recording, skipped, error };
}

export type LeadQualityActions = ReturnType<typeof useLeadQualityActions>;

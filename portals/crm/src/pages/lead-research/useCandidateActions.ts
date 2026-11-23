import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { MutationApproveCrmLeadCandidatesArgs, MutationRejectCrmLeadCandidatesArgs } from '@duncit/gql-types';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import {
  APPROVE_LEAD_CANDIDATES,
  REJECT_LEAD_CANDIDATES,
  type LeadCandidate,
  type LeadCandidateApproval,
} from '../../api/leadResearch.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';

export type DecisionKind = 'approve' | 'reject';

/** The candidates a confirmation dialog is open for. */
export interface PendingDecision {
  kind: DecisionKind;
  ids: string[];
}

/** The last approval's outcomes, with each candidate's lead type so an added lead can be opened. */
export interface ApprovalResults {
  outcomes: LeadCandidateApproval[];
  leadTypes: Record<string, CrmLeadEntityType>;
}

const NO_RESULTS: ApprovalResults = { outcomes: [], leadTypes: {} };

/**
 * Add to CRM and Reject for one candidate or a ticked set: which dialog is
 * open, the mutation in flight, its error (shown in the dialog, which stays
 * open), and every approval outcome the server returned. `onSettled` runs
 * after either decision lands, to reload the queue and the open candidate.
 */
export function useCandidateActions(onSettled: () => void) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [leadTypes, setLeadTypes] = useState<Record<string, CrmLeadEntityType>>({});
  const [error, setError] = useState('');
  const [results, setResults] = useState<ApprovalResults>(NO_RESULTS);
  const [approveMutation, { loading: approving }] = useMutation<
    { approveCrmLeadCandidates: LeadCandidateApproval[] },
    MutationApproveCrmLeadCandidatesArgs
  >(APPROVE_LEAD_CANDIDATES);
  const [rejectMutation, { loading: rejecting }] = useMutation<{ rejectCrmLeadCandidates: number }, MutationRejectCrmLeadCandidatesArgs>(
    REJECT_LEAD_CANDIDATES
  );
  const busy = approving || rejecting;

  const request = useCallback((kind: DecisionKind, candidates: readonly LeadCandidate[]) => {
    if (candidates.length === 0) return;
    setError('');
    setLeadTypes(Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate.lead_type])));
    setPending({ kind, ids: candidates.map((candidate) => candidate.id) });
  }, []);

  const close = useCallback(() => {
    if (!busy) setPending(null);
  }, [busy]);

  const approve = async (allowUnqualified: boolean) => {
    if (!pending) return;
    setError('');
    try {
      const { data } = await approveMutation({ variables: { ids: pending.ids, allow_unqualified: allowUnqualified } });
      setResults({ outcomes: data?.approveCrmLeadCandidates ?? [], leadTypes });
      setPending(null);
      onSettled();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const reject = async (note: string) => {
    if (!pending) return;
    setError('');
    try {
      const { data } = await rejectMutation({ variables: { ids: pending.ids, note: note.trim() || null } });
      notifySuccess(t('crm.leadResearch.rejectedCount', { count: data?.rejectCrmLeadCandidates ?? 0 }));
      setPending(null);
      onSettled();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const clearResults = useCallback(() => setResults(NO_RESULTS), []);

  return { pending, error, busy, results, request, close, approve, reject, clearResults };
}

export type CandidateActions = ReturnType<typeof useCandidateActions>;

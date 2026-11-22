import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import BlockIcon from '@mui/icons-material/Block';
import type { QueryCrmLeadCandidateArgs } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { LEAD_CANDIDATE, LEAD_CANDIDATES_TABLE, type LeadCandidate } from '../../api/leadResearch.gql';
import ApprovalOutcomes from './ApprovalOutcomes';
import CandidateDrawer from './CandidateDrawer';
import DecisionDialogs from './DecisionDialogs';
import { buildCandidateColumns } from './candidateColumns';
import { useCandidateActions } from './useCandidateActions';

const getRowId = (row: LeadCandidate) => row.id;
const NEWEST_FIRST = { field: 'created_at', dir: 'desc' } as const;

interface Props {
  /** The discovery the queue is narrowed to, from the URL. */
  jobId: string | null;
  onClearJob: () => void;
}

/**
 * The review queue: every researched candidate with its Quality Score, searched,
 * filtered and sorted on the server. A row opens the candidate; ticked rows can
 * be added to the CRM or rejected together.
 */
export default function ReviewQueue({ jobId, onClearJob }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<LeadCandidate>(client, LEAD_CANDIDATES_TABLE, 'crmLeadCandidatesTable');
  const refetchRef = useRef<(() => void) | null>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<LeadCandidate[]>([]);
  const [openRow, setOpenRow] = useState<LeadCandidate | null>(null);
  const columns = useMemo(() => buildCandidateColumns(t, setOpenRow), [t]);
  const externalFilters = useMemo<TableFilterValue[]>(() => (jobId ? [{ field: 'job_id', op: 'eq', value: jobId }] : []), [jobId]);
  const selection = useMemo(() => ({ onChange: setSelected, clearRef }), []);

  // The open candidate is re-read so its status and outcome stay current after a decision.
  const detail = useQuery<{ crmLeadCandidate: LeadCandidate | null }, QueryCrmLeadCandidateArgs>(LEAD_CANDIDATE, {
    variables: { id: openRow?.id ?? '' },
    skip: !openRow,
    fetchPolicy: 'cache-and-network',
  });
  const candidate = openRow ? (detail.data?.crmLeadCandidate ?? openRow) : null;
  const { refetch: refetchDetail } = detail;
  const isOpen = openRow !== null;

  const onSettled = useCallback(() => {
    refetchRef.current?.();
    clearRef.current?.();
    if (isOpen) fireAndForget(refetchDetail(), logs.portal.crm, 'LeadResearch', 'refreshCandidate');
  }, [isOpen, refetchDetail]);
  const actions = useCandidateActions(onSettled);

  const bulk =
    selected.length > 0 ? (
      <Stack direction="row" spacing={1}>
        <DuncitButton size="small" color="error" startIcon={<BlockIcon />} onClick={() => actions.request('reject', selected)} data-testid="bulk-reject">
          {t('crm.leadResearch.rejectSelected', { count: selected.length })}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="contained"
          startIcon={<PlaylistAddCheckIcon />}
          onClick={() => actions.request('approve', selected)}
          data-testid="bulk-approve"
        >
          {t('crm.leadResearch.approveSelected', { count: selected.length })}
        </DuncitButton>
      </Stack>
    ) : null;

  return (
    <Stack spacing={2}>
      {jobId ? (
        <Alert
          severity="info"
          data-testid="job-filter"
          action={
            <DuncitButton color="inherit" size="small" onClick={onClearJob}>
              {t('crm.leadResearch.showAllCandidates')}
            </DuncitButton>
          }
        >
          {t('crm.leadResearch.filteredByJob')}
        </Alert>
      ) : null}
      <ApprovalOutcomes results={actions.results} onDismiss={actions.clearResults} />
      <DuncitTable<LeadCandidate>
        ariaLabel={t('crm.leadResearch.tabQueue')}
        tableId="crm-lead-candidates"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={setOpenRow}
        externalFilters={externalFilters}
        selection={selection}
        toolbarActions={bulk}
        defaultSort={NEWEST_FIRST}
        emptyText={t('crm.leadResearch.queueEmpty')}
        searchPlaceholder={t('crm.leadResearch.queueSearch')}
        refetchRef={refetchRef}
      />
      <CandidateDrawer
        candidate={candidate}
        results={actions.results}
        busy={actions.busy}
        onClose={() => setOpenRow(null)}
        onApprove={(row) => actions.request('approve', [row])}
        onReject={(row) => actions.request('reject', [row])}
      />
      <DecisionDialogs actions={actions} />
    </Stack>
  );
}

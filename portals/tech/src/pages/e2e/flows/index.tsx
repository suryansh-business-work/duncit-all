import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useApolloTableFetch } from '@duncit/table';
import FlowsTable from './FlowsTable';
import FlowDialog from './FlowDialog';
import { DELETE_E2E_FLOW, E2E_FLOWS_TABLE, errorText, type E2eFlowRow } from './queries';

/** Which flow the dialog edits; `flow: null` adds one. The whole state null means closed. */
type DialogState = { flow: E2eFlowRow | null } | null;

/**
 * E2E Flows — the main journeys the suite should cover, e.g. User
 * Authentication. A row opens the flow's own page, which lists its sub flows.
 */
export default function E2eFlowsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteFlow] = useMutation<any>(DELETE_E2E_FLOW);
  const fetchRows = useApolloTableFetch<E2eFlowRow>(client, E2E_FLOWS_TABLE, 'e2eFlowsTable');

  const openFlow = useCallback((row: E2eFlowRow) => navigate(`/e2e/flows/${row.id}`), [navigate]);
  const editFlow = useCallback((row: E2eFlowRow) => setDialog({ flow: row }), []);
  const refetch = useCallback(() => refetchRef.current?.(), []);

  const removeFlow = useCallback(
    async (row: E2eFlowRow) => {
      const ok = await confirm({
        title: t('tech.e2eFlows.deleteFlowTitle'),
        message: t('tech.e2eFlows.deleteFlowMessage', { vars: { name: row.name } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteFlow({ variables: { id: row.id } });
        notifySuccess(t('tech.e2eFlows.flowDeleted'));
        refetch();
      } catch (err) {
        notifyError(errorText(err));
      }
    },
    [confirm, deleteFlow, refetch, t]
  );

  return (
    <Stack spacing={2}>
      <PageHeader title={t('tech.e2eFlows.title')} subtitle={t('tech.e2eFlows.subtitle')} />
      <FlowsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ flow: null })}
          >
            {t('tech.e2eFlows.addFlow')}
          </DuncitButton>
        }
        onOpen={openFlow}
        onEdit={editFlow}
        onDelete={removeFlow}
      />
      {dialog && (
        <FlowDialog flow={dialog.flow} onClose={() => setDialog(null)} onSaved={refetch} />
      )}
    </Stack>
  );
}
